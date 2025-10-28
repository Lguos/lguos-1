async function output() {
    let text = $searchText.trim();
    if (!text) return "请输入查询内容";

    const type = getQueryType(text);
    const searchUrl = `https://www.hanyuguoxue.com/${type}/search?words=${encodeURIComponent(text)}`;

    try {
        const resp = await $http({ url: searchUrl, method: 'GET' });
        let html = resp.data;

        const clean = (s) => s ? s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/&nbsp;/g, " ").trim() : "未找到";

        // ===== 单字逻辑 =====
        if (type === "zidian") {
            const match = html.match(/\/zidian\/zi-\d+/);
            if (!match) return `未找到「${text}」的详细信息`;

            const detailUrl = "https://www.hanyuguoxue.com" + match[0];
            const d = await $http({ url: detailUrl, method: "GET" });
            html = d.data;

            const get = (label) =>
                clean((html.match(new RegExp(`<label>\\s*${label}\\s*<\\/label>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`)) || [])[1]);

            const pinyin = clean((html.match(/拼音[^）]*（(.*?)）/) || [])[1]);
            const bushou = get("部首");
            const bihua = get("总笔画");
            const jiegou = get("结构");
            const wuhang = get("五行");
            const zaozifa = get("造字法");
            const wubi = get("五笔");
            const cangjie = get("仓颉");
            const sijihao = get("四角");
            const zhengma = get("郑码");
            const dianma = get("中文电码");
            const quweima = get("区位码");
            const unicode = get("统一码");
            const jinyici = get("近义词");
            const fanyici = get("反义词");
            const yitizi = get("异体字");

            // 基本解释
            let explanation = "未找到";
            const basicMatch = html.match(/<div class="zi-basic-explain">([\s\S]*?)<\/div>/);
            if (basicMatch) {
                const items = [...basicMatch[1].matchAll(/<p class="explain">([\s\S]*?)<\/p>/g)];
                if (items.length) {
                    explanation = items.map(m => {
                        const seg = m[1];
                        const no = (seg.match(/<span[^>]*class="no"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || "";
                        const txt = (seg.match(/<span[^>]*class="text"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || "";
                        let egRaw = (seg.match(/<span[^>]*class="eg"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || "";
                        egRaw = egRaw.replace(/<label[^>]*>例如<\/label>/, "");
                        const eg = clean(egRaw);
                        return `${no} ${txt}${eg ? " 例如：" + eg : ""}`;
                    }).join("\n");
                }
            }

            return `【${text}】

拼音：${pinyin}
部首：${bushou}
总笔画：${bihua}
结构：${jiegou}
五行：${wuhang}
造字法：${zaozifa}

五笔：${wubi}
仓颉：${cangjie}
四角：${sijihao}
郑码：${zhengma}
中文电码：${dianma}
区位码：${quweima}
Unicode：${unicode}

近义词：${jinyici}
反义词：${fanyici}
异体字：${yitizi}

基本解释：
${explanation}`;
        }

        // ===== 词语逻辑 =====
        if (type === "cidian") {
            const match = html.match(/\/cidian\/ci-[a-z0-9]+/);
            if (!match) return `未找到「${text}」的详细信息`;

            const detailUrl = "https://www.hanyuguoxue.com" + match[0];
            const d = await $http({ url: detailUrl, method: "GET" });
            html = d.data;

            // 调试：输出关键位置信息
            console.log("=== 调试信息 ===");
            console.log("近义词位置:", html.indexOf("近义词"));
            console.log("反义词位置:", html.indexOf("反义词"));
            console.log("ci-entries位置:", html.indexOf("ci-entries"));
            console.log("ci-list位置:", html.indexOf("ci-list"));

            // 方法1：直接字符串搜索提取
            const extractByDirectSearch = () => {
                const result = {
                    pinyin: "未找到",
                    zhuyin: "未找到", 
                    fanti: "未找到",
                    cixing: "未找到",
                    jinyi: "未找到",
                    fanyi: "未找到",
                    explanation: "未找到"
                };

                // 提取拼音
                const pinyinIndex = html.indexOf('<label>拼音</label>');
                if (pinyinIndex !== -1) {
                    const spanStart = html.indexOf('<span', pinyinIndex);
                    const spanEnd = html.indexOf('</span>', spanStart);
                    if (spanStart !== -1 && spanEnd !== -1) {
                        let content = html.substring(spanStart, spanEnd);
                        content = content.replace(/<[^>]+>/g, "").replace(/<img[^>]*>/g, "");
                        result.pinyin = clean(content);
                    }
                }

                // 提取注音
                const zhuyinIndex = html.indexOf('<label>注音</label>');
                if (zhuyinIndex !== -1) {
                    const spanStart = html.indexOf('<span', zhuyinIndex);
                    const spanEnd = html.indexOf('</span>', spanStart);
                    if (spanStart !== -1 && spanEnd !== -1) {
                        let content = html.substring(spanStart, spanEnd);
                        content = content.replace(/<[^>]+>/g, "").replace(/<img[^>]*>/g, "");
                        result.zhuyin = clean(content);
                    }
                }

                // 提取繁体
                const fantiIndex = html.indexOf('<label>繁体</label>');
                if (fantiIndex !== -1) {
                    const spanStart = html.indexOf('<span', fantiIndex);
                    const spanEnd = html.indexOf('</span>', spanStart);
                    if (spanStart !== -1 && spanEnd !== -1) {
                        let content = html.substring(spanStart, spanEnd);
                        content = content.replace(/<[^>]+>/g, "");
                        result.fanti = clean(content);
                    }
                }

                // 提取词性
                const cixingIndex = html.indexOf('<label>词性</label>');
                if (cixingIndex !== -1) {
                    const spanStart = html.indexOf('<span', cixingIndex);
                    const spanEnd = html.indexOf('</span>', spanStart);
                    if (spanStart !== -1 && spanEnd !== -1) {
                        let content = html.substring(spanStart, spanEnd);
                        content = content.replace(/<[^>]+>/g, "");
                        result.cixing = clean(content);
                    }
                }

                // 提取近义词 - 直接搜索ci-list
                const jinyiIndex = html.indexOf('近义词');
                if (jinyiIndex !== -1) {
                    const listStart = html.indexOf('class="ci-list"', jinyiIndex);
                    if (listStart !== -1) {
                        const listEnd = html.indexOf('</span>', listStart);
                        if (listEnd !== -1) {
                            let content = html.substring(listStart, listEnd);
                            // 提取所有文本
                            content = content
                                .replace(/<a[^>]*>/g, "")
                                .replace(/<\/a>/g, " ")
                                .replace(/<em>/g, "")
                                .replace(/<\/em>/g, " ")
                                .replace(/<[^>]+>/g, "");
                            result.jinyi = clean(content) || "未找到";
                        }
                    }
                }

                // 提取反义词 - 直接搜索ci-list
                const fanyiIndex = html.indexOf('反义词');
                if (fanyiIndex !== -1) {
                    const listStart = html.indexOf('class="ci-list"', fanyiIndex);
                    if (listStart !== -1) {
                        const listEnd = html.indexOf('</span>', listStart);
                        if (listEnd !== -1) {
                            let content = html.substring(listStart, listEnd);
                            // 提取所有文本
                            content = content
                                .replace(/<a[^>]*>/g, "")
                                .replace(/<\/a>/g, " ")
                                .replace(/<em>/g, "")
                                .replace(/<\/em>/g, " ")
                                .replace(/<[^>]+>/g, "");
                            result.fanyi = clean(content) || "未找到";
                        }
                    }
                }

                // 提取基本解释
                const entriesIndex = html.indexOf('class="ci-entries"');
                if (entriesIndex !== -1) {
                    const entriesEnd = html.indexOf('</div>', entriesIndex);
                    if (entriesEnd !== -1) {
                        const entriesContent = html.substring(entriesIndex, entriesEnd);
                        
                        // 提取所有解释
                        const explains = [];
                        let explainPos = entriesContent.indexOf('class="explain"');
                        
                        while (explainPos !== -1) {
                            const pStart = entriesContent.lastIndexOf('<p', explainPos);
                            const pEnd = entriesContent.indexOf('</p>', explainPos);
                            
                            if (pStart !== -1 && pEnd !== -1) {
                                let explain = entriesContent.substring(pStart, pEnd);
                                explain = explain.replace(/<[^>]+>/g, "").trim();
                                if (explain) {
                                    explains.push(explain);
                                }
                            }
                            
                            explainPos = entriesContent.indexOf('class="explain"', pEnd);
                        }
                        
                        if (explains.length > 0) {
                            result.explanation = explains.map((exp, idx) => `${idx + 1}. ${exp}`).join("\n");
                        }
                    }
                }

                return result;
            };

            const result = extractByDirectSearch();
            
            // 输出调试信息到控制台
            console.log("提取结果:", result);

            return `【${text}】

拼音：${result.pinyin}
注音：${result.zhuyin}
繁体：${result.fanti}
词性：${result.cixing}
近义词：${result.jinyi}
反义词：${result.fanyi}

基本解释：
${result.explanation}`;
        }

        // ===== 成语逻辑 =====
        if (type === "chengyu") {
            const match = html.match(/\/chengyu\/ci-[a-z0-9]+/);
            if (!match) return `未找到「${text}」的详细信息`;

            const detailUrl = "https://www.hanyuguoxue.com" + match[0];
            const d = await $http({ url: detailUrl, method: "GET" });
            html = d.data.replace(/<button[^>]*>复制<\/button>/g, "");

            const getLi = (label) => {
                const reg = new RegExp(`<li>\\s*<span>${label}<\\/span>\\s*<a[^>]*>([\\s\\S]*?)<\\/a>`);
                return clean((html.match(reg) || [])[1]);
            };

            const pinyin = clean((html.match(/<span>拼音[\s\S]*?<\/span>([^<]+)/) || [])[1]);
            const zhuyin = clean((html.match(/<span>注音[\s\S]*?<\/span>([^<]+)/) || [])[1]);
            const zuhe = getLi("组合");
            const jiegou = getLi("结构");
            const ganqing = getLi("感情");
            const niandai = getLi("年代");
            const redu = getLi("热度");

            const jinyiBlock = (html.match(/<span>近义词[\s\S]*?<\/span>([\s\S]*?)<\/p>/) || [])[1] || "";
            const fanyiBlock = (html.match(/<span>反义词[\s\S]*?<\/span>([\s\S]*?)<\/p>/) || [])[1] || "";
            const linkText = (s) => clean(s.replace(/<\/a>\s*&nbsp;?/g, " ").replace(/<a[^>]*>/g, ""));
            const jinyi = linkText(jinyiBlock) || "未找到";
            const fanyi = linkText(fanyiBlock) || "未找到";

            const shiyi = clean((html.match(/<p class="explain primary">([\s\S]*?)<\/p>/) || [])[1]);
            const chuchu = clean((html.match(/<span class="name">出处[\s\S]*?<\/span>([\s\S]*?)<\/p>/) || [])[1]);
            const yongfa = clean((html.match(/<span class="name">用法[\s\S]*?<\/span>([\s\S]*?)<\/p>/) || [])[1]);

            return `【${text}】

拼音：${pinyin}
注音：${zhuyin}
组合：${zuhe}
结构：${jiegou}
感情：${ganqing}
年代：${niandai}
热度：${redu}

近义词：${jinyi}
反义词：${fanyi}

出处：${chuchu}
用法：${yongfa}

基本解释：
${shiyi || "未找到"}`;
        }

        return `未找到「${text}」的详细信息`;
    } catch (error) {
        return "查询失败：" + (error.message || "网络请求异常");
    }
}

function getQueryType(text) {
    if (text.length === 1) return "zidian";
    if (text.length === 2) return "cidian";
    return "chengyu";
}
