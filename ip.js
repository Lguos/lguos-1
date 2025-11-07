// --- 核心网络请求和数据处理函数 ---
// author: lguos
// date: 2025-11-07

/**
 * 使用 IP-API 服务查询指定 IP 地址或域名信息。
 * @param {string} target - 要查询的 IP 地址或域名。
 * @param {string} [domain=''] - 原始域名（如果输入是域名，用于显示）。
 * @returns {Promise<string>} 包含格式化查询结果的字符串。
 */
async function lookupIpInfo(target, domain = '') {
    // URL 包含：query, country, city, isp, org, mobile, proxy, as, hosting, reverse, lat, lon
    const apiUrl = `http://ip-api.com/json/${target}?fields=status,message,query,country,city,isp,org,mobile,proxy,as,hosting,reverse,lat,lon&lang=zh-CN`;

    try {
        const resp = await $http({
            url: apiUrl,
            header: { "Content-Type": "application/json" },
            timeout: 5000 
        });

        if (resp.response.statusCode !== 200) {
            $log(`IP-API HTTP 错误: ${resp.response.statusCode}`);
            return `❌ 查询失败: HTTP 错误 ${resp.response.statusCode}`;
        }

        const data = JSON.parse(resp.data);
        
        if (data.status === 'success') {
            
            // 构建数组，每项对应一行信息
            const resultLines = [
                `---------- IP 查询结果 ----------`,
                // 仅当传入了域名时，显示域名信息
                ...(domain ? [`🌐 域名:      ${domain}`] : []), 
                `🔌 IP 地址:   ${data.query}`,
                `📍 地区/城市: ${data.country || 'N/A'} / ${data.city || 'N/A'}`,
                `🏢 归属公司:  ${data.org || data.isp || 'N/A'}`,
                `🔗 运营商:     ${data.isp || 'N/A'}`,
                `📡 ASN/AS名:  ${data.as || 'N/A'}`,
                `☁️ 托管服务:  ${data.hosting ? '是 (数据中心)' : '否'}`,
                `📱 移动/代理: ${data.mobile ? '移动网络' : (data.proxy ? '代理/VPN' : '否')}`,
                `↩️ 反向 DNS:  ${data.reverse || 'N/A'}`,
                `🧭 经纬度:    ${data.lat}, ${data.lon}`,
            ];
            
            return resultLines.join('\n');

        } else {
            $log(`IP-API 报告失败: ${data.message}`);
            return `❌ 查询失败: ${data.message}`;
        }

    } catch (error) {
        $log(`查询过程中发生错误: ${error}`);
        return `❌ 致命错误：无法完成查询。`;
    }
}


// --- 输入法主入口函数 ---

async function output() {
    var text = $searchText || $pasteboardContent;
    
    if (!text) {
        $log("未指定输入，查询自身公网IP。");
        return await lookupIpInfo(''); 
    }
    
    let targetInput = text.trim(); 
    let finalTarget = targetInput;
    let originalDomain = ''; // 用于存储解析后的域名，如果输入是 URL

    // 1. URL/域名处理逻辑
    if (targetInput.includes('http://') || targetInput.includes('https://')) {
        try {
            let tempUrl = targetInput.replace(/^(https?:\/\/)/i, '');
            const slashIndex = tempUrl.indexOf('/');
            if (slashIndex !== -1) {
                tempUrl = tempUrl.substring(0, slashIndex);
            }
            const portIndex = tempUrl.indexOf(':');
            if (portIndex !== -1) {
                tempUrl = tempUrl.substring(0, portIndex);
            }
            
            finalTarget = tempUrl.trim();
            originalDomain = finalTarget; // 标记为域名查询
            $log(`从 URL 中提取目标: ${finalTarget}`);

        } catch (e) {
            $log(`URL 解析错误: ${e}`);
            return "❌ URL 解析失败，请直接输入域名或 IP。";
        }
    } else if (!targetInput.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}|[0-9a-fA-F:]+$/)) {
        // 如果输入不是明显的 IP 地址，则认为是域名
        originalDomain = targetInput;
    }
    
    // 2. 格式校验
    if (!/^[0-9a-zA-Z.:-]+$/.test(finalTarget)) {
        return "❌ 输入内容格式不正确，请确保是 IP 地址或域名。";
    }

    $log(`最终查询目标: ${finalTarget}`);
    
    // 3. 调用查询函数，并传递原始域名信息
    const result = await lookupIpInfo(finalTarget, originalDomain);
    
    return result;
}
