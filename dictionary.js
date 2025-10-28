const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// 判断输入类型（单字、词语、成语）
function detectQueryType(text) {
  if (!text) return "未知";

  // 去掉空格和标点
  const clean = text.trim().replace(/[^\u4e00-\u9fa5]/g, "");

  if (clean.length === 1) return "单字";
  if (clean.length === 4) return "成语";
  if (clean.length > 1) return "词语";
  return "未知";
}

function buildPrompt(text, type) {
  switch (type) {
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

  const systemPrompt = `你是一个专业的中文语言知识助手，擅长查询汉字、词语、成语等语言信息，请根据用户输入的类型（单字、词语或成语）输出规范格式的结果。`;

  const body = {
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
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
