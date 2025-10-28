const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// 判断输入类型（单字、词语、成语、特殊输入法）
function detectQueryType(text) {
  if (!text) return "未知";

  const clean = text.trim().replace(/[^\u4e00-\u9fa5（）()]/g, "");

  if (/（?小鹤）?|\(小鹤\)/.test(text)) return "单字-小鹤音形";
  if (/（?虎码）?|\(虎码\)/.test(text)) return "单字-虎码";

  const pure = clean.replace(/[（）]/g, "");
  if (pure.length === 1) return "单字";
  if (pure.length === 4) return "成语";
  if (pure.length > 1) return "词语";
  return "未知";
}

// 构造提示内容
function buildPrompt(text, type) {
  switch (type) {
    case "单字-小鹤音形": {
      const match = text.match(/([\u4e00-\u9fa5])/);
      const char = match ? match[1] : text;
      return `请查询汉字「${char}」在【小鹤音形输入法】中的完整编码信息。
小鹤音形是一种【双拼+形码】输入法，请提供以下内容：

输出格式如下，请严格照此排版：
${char}：<完整小鹤音形编码>
● 拆分：<详细字形拆分，用空格分隔部件>
● 首末：<首末部件>
● 形码：<形码部分，仅形码，不含音码>

要求：
1. 返回的编码为【小鹤音形方案】标准结果。
2. 格式必须与示例完全一致：
菅：kdcb
● 拆分：艹 比左 匕 白
● 首末：艹白
● 形码：cb
3. 不要添加任何解释。`;
    }

    case "单字-虎码": {
      const match = text.match(/([\u4e00-\u9fa5])/);
      const char = match ? match[1] : text;
      return `请查询汉字「${char}」在【虎码输入法】中的编码信息。
虎码是一种基于部件拆分的形码输入法，请提供以下内容：

输出格式如下，请严格照此排版：
${char}：<完整虎码编码>
● 拆分：<详细字形拆分，用空格分隔部件>
● 首末：<首末部件>
● 形码：<形码部分>

要求：
1. 使用【虎码输入法】的正式拆分与编码规则。
2. 格式必须与示例完全一致：
蒈：aibg
● 拆分：艹 比左 几 白
● 首末：艹白
● 形码：ibg
3. 不添加额外注释或说明。`;
    }

    case "单字":
      return `请查询汉字「${text}」的详细信息，按以下格式返回：
[拼音]：
[部首]：
[总笔画]：
[结构]：
[造字法]：
[五笔]：
[仓颉]：
[Unicode]：
[近义词]：
[反义词]：
[异体字]：
[基本解释]：
请严格按照以上字段输出。`;

    case "词语":
      return `请查询词语「${text}」的详细信息，按以下格式返回：
[拼音]：
[注音]：
[繁体]：
[词性]：
[近义词]：
[反义词]：
[基本解释]：
请严格按照以上字段输出。`;

    case "成语":
      return `请查询成语「${text}」的详细信息，按以下格式返回：
[拼音]：
[注音]：
[组合]：
[结构]：
[感情]：
[年代]：
[热度]：
[近义词]：
[反义词]：
[出处]：
[用法]：
[基本解释]：
请严格按照以上字段输出。`;

    default:
      return `请根据内容「${text}」提供详细解释。`;
  }
}

async function deepseekQuery(query) {
  const type = detectQueryType(query);
  const prompt = buildPrompt(query, type);

  const systemPrompt = `你是一个精通中文语言学与输入法编码的专家，熟悉小鹤音形、虎码、五笔、仓颉等方案。
请根据用户输入智能识别类型（单字、词语、成语或输入法查询），严格按指定格式输出结果，不添加多余说明。`;

  const body = {
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.6,
    max_tokens: 1024
  };

  try {
    const resp = await $http({
      url: DEEPSEEK_BASE_URL,
      method: "post",
      header: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${$deepseek_key}`
      },
      body,
      timeout: 30
    });

    const statusCode = resp.response.statusCode;
    if (statusCode !== 200) throw new Error(`HTTP状态码 ${statusCode}`);

    const parsedData = JSON.parse(resp.data);
    if (!parsedData.choices?.length) throw new Error("返回数据格式异常");

    return parsedData.choices[0].message.content.trim();
  } catch (error) {
    $log(`❌ DeepSeek API 错误: ${error.message || error}`);
    if (error.response) {
      $log(`响应详情: ${JSON.stringify(error.response)}`);
    }
    return `查询失败：${error.message || "未知错误"}`;
  }
}

async function output() {
  const query = $searchText || $pasteboardContent || "你好";
  return await deepseekQuery(query);
}
