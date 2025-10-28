// ========================
// DeepSeek + 小鹤音形查询整合版
// ========================
// author: lguos
// date: 2025-10-29
// 注意：请在脚本中的变量管理中添加 deepseek_key 变量，值为 DeepSeek 的 API Key

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

const queryText = ($searchText || $pasteboardContent || "").trim();
/**
 * 判断输入类型（单字、词语、成语）
 */
function detectQueryType(text) {
  if (!text) return "未知";
  const clean = text.trim().replace(/[^\u4e00-\u9fa5]/g, "");
  if (clean.length === 1) return "单字";
  if (clean.length === 4) return "成语";
  if (clean.length > 1) return "词语";
  return "未知";
}
/**
 * 构建 DeepSeek Prompt
 */
function buildPrompt(text, type) {
  switch (type) {
    case "单字":
      return `请查询汉字「${text}」的详细信息，按以下格式返回：
[拼音]：如果该汉字是多音字，请在拼音字段中显示所有读音，用逗号分隔，例如 "kàn,kān"
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
请严格按照以上字段输出，不要增加额外文字。`;

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

/**
 * DeepSeek 查询
 */
async function deepseekQuery(text) {
  const type = detectQueryType(text);
  const prompt = buildPrompt(text, type);
  const systemPrompt = `你是一个专业的中文语言知识助手，擅长查询汉字、词语、成语等语言信息，请根据用户输入的类型输出规范格式结果。`;

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

    if (resp.response.statusCode !== 200)
      throw new Error(`HTTP状态码 ${resp.response.statusCode}`);

    const parsed =
      typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    if (!parsed.choices?.length) throw new Error("返回数据格式异常");

    return parsed.choices[0].message.content.trim();
  } catch (err) {
    $log(`❌ DeepSeek 错误: ${err.message || err}`);
    return `查询失败：${err.message || "未知错误"}`;
  }
}

/**
 * 校验单字输入
 */
function validateSingleChar(char) {
  if (!char || typeof char !== "string" || char.length !== 1) {
    return "请输入单个汉字进行小鹤查询";
  }
  if (!/^[\u4e00-\u9fa5]$/.test(char)) {
    return "不支持非汉字查询";
  }
  return true;
}

/**
 * 获取 MD5 签名（使用 hashify.net）
 */
async function getMD5(char) {
  const url = `https://api.hashify.net/hash/md5/hex?value=${encodeURIComponent(
    "fjc_xhup" + char
  )}`;
  try {
    const resp = await $http({ url });
    if (!resp) throw new Error("请求返回为空");

    let json;
    if (typeof resp.data === "string") {
      json = JSON.parse(resp.data);
    } else {
      json = resp.data;
    }

    if (!json || !json.Digest) throw new Error("返回数据缺少 Digest 字段");

    return json.Digest;
  } catch (err) {
    $log("获取 MD5 出错:", err);
    throw new Error(`获取 MD5 出错：${err.message || err}`);
  }
}

/**
 * 小鹤音形查询
 */
async function xiaoheQuery(char) {
  const valid = validateSingleChar(char);
  if (valid !== true) return valid;

  try {
    const md5 = await getMD5(char);
    const url = "http://www.xhup.club/Xhup/Search/searchCode";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://react.xhup.club",
      "Referer": "http://react.xhup.club/search",
      "User-Agent": "Mozilla/5.0"
    };
    const body = { search_word: char, sign: md5 };

    const resp = await $http({ url, method: "POST", header: headers, body });
    if (!resp || !resp.data) throw new Error("查询返回为空");

    const json =
      typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    if (!json.list_dz) throw new Error("接口未返回 list_dz");

    const arr = json.list_dz.toString().split(",");
    const lineOne = arr[0];
    const lineTwo = `● 拆分：${arr[1]}`;
    const lineThree = `● 首末：${arr[2]}${arr[3]}`;
    const lineFour = `● 编码：${arr[4]}${arr[5]}`;
    const note1 = "注：-号表示已有简码避让全码，*号表示生僻字&音";
    const note2 = "数据来源：xhup.club";

    return [lineOne, lineTwo, lineThree, lineFour, note1, note2].join("\n");
  } catch (err) {
    $log("小鹤查询错误:", err);
    return `查询失败：${err.message || "未知错误"}`;
  }
}

/**
 * 主函数
 */
async function output() {
  if (!queryText) {
    
    return "请输入查询的汉字，词语，成语\n小鹤音形查询方式: \"汉字(小鹤)\"";
  }

  // 检查是否为小鹤查询格式：字(小鹤)
  const match = queryText.match(/^(.{1})\(小鹤\)$/);
  if (match) {
    const char = match[1];
    return await xiaoheQuery(char);
  }

  // 否则走 DeepSeek 查询
  return await deepseekQuery(queryText);
}
