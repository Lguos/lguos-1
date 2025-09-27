const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

// 语言映射表
const LANGUAGE_MAP = {
  zh: "中文",
  en: "英文",
  ja: "日文",
  ko: "韩文",
};

// 后缀映射到语言代码
const SUFFIX_MAP = {
  "(中)": "zh",
  "(英)": "en", 
  "(日)": "ja",
  "(韩)": "ko",
  "(中文)": "zh",
  "(英文)": "en",
  "(日文)": "ja",
  "(韩文)": "ko"
};

// 检测源语言
async function detectLanguage(text) {
  // 如果文本过短，使用默认检测
  if (!text || text.trim().length < 2) {
    $log(`文本过短，使用默认语言检测`);
    return "default";
  }

  const url = DEEPSEEK_BASE_URL;
  const body = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `你是一个语言检测助手。请检测以下文本的源语言，并只返回语言代码（zh、en、ja、ko）。不要添加任何其他内容。`,
      },
      {
        role: "user",
        content: `请检测以下文本的源语言：${text}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 10,
  };

  try {
    const resp = await $http({
      url,
      method: "post",
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${$deepseek_key}`,
      },
      body: body,
      timeout: 30,
    });

    const statusCode = resp.response.statusCode;
    if (statusCode !== 200) {
      throw new Error(`API请求失败: HTTP状态码 ${statusCode}`);
    }

    const parsedData = JSON.parse(resp.data);
    $log(`检测语言的API返回: ${JSON.stringify(parsedData, null, 2)}`);

    if (!parsedData.choices || parsedData.choices.length === 0) {
      throw new Error('API返回数据格式错误: 没有找到有效的回复');
    }

    const messageContent = parsedData.choices[0].message.content;
    if (!messageContent) {
      throw new Error('API返回数据格式错误: 回复内容为空');
    }

    const detectedLanguage = messageContent.trim().toLowerCase();
    
    const cleanLanguage = detectedLanguage.replace(/[^a-z]/g, '');
    if (Object.keys(LANGUAGE_MAP).includes(cleanLanguage)) {
      $log(`成功检测到语言: ${cleanLanguage}`);
      return cleanLanguage;
    } else {
      $log(`未识别的语言代码: ${detectedLanguage}，清理后: ${cleanLanguage}`);
      return "default";
    }
  } catch (error) {
    $log(`语言检测失败: ${error.message}`);
    return "default";
  }
}

// 翻译文本到指定语言
async function translateToLanguage(text, targetLanguage) {
  if (!text || !targetLanguage) {
    return "无效的输入参数";
  }

  const targetLanguageName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
  
  const systemPrompt = `你是一个专业的翻译助手。请将以下文本准确翻译成${targetLanguageName}。要求：
1. 保持原意不变，翻译自然流畅
2. 不要添加任何额外说明或标记
3. 只返回翻译结果`;

  const url = DEEPSEEK_BASE_URL;
  const body = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `需要翻译的文本：${text}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  };

  try {
    const resp = await $http({
      url,
      method: "post",
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${$deepseek_key}`,
      },
      body: body,
      timeout: 30,
    });

    const statusCode = resp.response.statusCode;
    if (statusCode !== 200) {
      throw new Error(`API请求失败: HTTP状态码 ${statusCode}`);
    }

    const parsedData = JSON.parse(resp.data);
    $log(`翻译API返回的内容: ${JSON.stringify(parsedData, null, 2)}`);

    if (!parsedData.choices || parsedData.choices.length === 0) {
      throw new Error('API返回数据格式错误: 没有找到有效的回复');
    }

    const translatedText = parsedData.choices[0].message.content || "";
    return translatedText.trim();
  } catch (error) {
    $log(`翻译失败: ${error.message}`);
    return `翻译错误: ${error.message}`;
  }
}

// 检测并提取后缀
function extractSuffix(text) {
  for (const [suffix, langCode] of Object.entries(SUFFIX_MAP)) {
    if (text.endsWith(suffix)) {
      const cleanText = text.slice(0, -suffix.length).trim();
      return {
        cleanText: cleanText,
        targetLanguage: langCode,
        hasSuffix: true
      };
    }
  }
  
  return {
    cleanText: text,
    targetLanguage: null,
    hasSuffix: false
  };
}

// 主函数
async function output() {
  try {
    let textToTranslate = $searchText || $pasteboardContent || "你好，世界！";
    $log(`原始文本: ${textToTranslate}`);
    
    // 检测后缀
    const { cleanText, targetLanguage, hasSuffix } = extractSuffix(textToTranslate);
    $log(`清理后文本: ${cleanText}`);
    $log(`检测到后缀: ${hasSuffix ? targetLanguage : '无'}`);
    
    if (hasSuffix) {
      // 有后缀，直接翻译到指定语言
      $log(`直接翻译到: ${LANGUAGE_MAP[targetLanguage] || targetLanguage}`);
      const translation = await translateToLanguage(cleanText, targetLanguage);
      return [translation];
    } else {
      // 无后缀，检测源语言并决定翻译方向
      const sourceLanguage = await detectLanguage(cleanText);
      $log(`检测到的源语言: ${sourceLanguage}`);
      
      // 如果源语言不是中文，统一翻译为中文
      if (sourceLanguage !== "zh" && sourceLanguage !== "default") {
        $log(`非中文文本，翻译为中文`);
        const translation = await translateToLanguage(cleanText, "zh");
        return [translation];
      } else {
        // 中文文本，翻译为所有支持的语言
        $log(`中文文本，翻译为多语言`);
        const translations = await Promise.all([
          translateToLanguage(cleanText, "en"),
          translateToLanguage(cleanText, "ja"),
          translateToLanguage(cleanText, "ko")
        ]);
        return translations;
      }
    }
  } catch (error) {
    $log(`主函数执行错误: ${error.message}`);
    return [`程序执行错误: ${error.message}`];
  }
}
