// author: 叙白
// date: 2024-09-22

async function googleTranslate(source, targets, text) {
  try {
    const translations = await Promise.all(targets.map(async (target) => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
      const resp = await $http({
        url,
        header: {
          "Content-Type": "application/json",
        }
      });

      if (resp.response.statusCode !== 200) {
        return "翻译失败";
      }
      const jsonDict = JSON.parse(resp.data);
      const translatedText = jsonDict[0][0][0]; // 直接获取第一个翻译结果
      return translatedText;
    }));

    return translations;

  } catch (error) {
    $log(error);
    return ["翻译失败"];
  }
}

async function output() {
  var text = $searchText || $pasteboardContent;
  if (!text) {
    return "请输入要翻译的文本";
  }
  text = text.trim(); // 确保文本是完整的

  // 自动检测源语言
  const detectLanguageUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const detectResp = await $http({
    url: detectLanguageUrl,
    header: {
      "Content-Type": "application/json",
    }
  });

  if (detectResp.response.statusCode !== 200) {
    return "语言检测失败";
  }
  const detectJsonDict = JSON.parse(detectResp.data);
  const sourceLanguage = detectJsonDict[2]; // 获取检测到的源语言

  // 根据源语言设置目标语言数组
  let targetLanguages;
  if (sourceLanguage === "en") {
    targetLanguages = ["zh-CN", "ja", "ko"]; // 英文源语言，目标语言为中文、日文、韩文
  } else if (sourceLanguage === "zh-CN") {
    targetLanguages = ["en", "ja", "ko"]; // 中文源语言，目标语言为英文、日文、韩文
  } else if (sourceLanguage === "ja") {
    targetLanguages = ["zh-CN", "en", "ko"]; // 日文源语言，目标语言为中文、英文、韩文
  } else {
    targetLanguages = ["zh-CN", "en", "ja", "ko"]; // 其他源语言，目标语言为英文、中文、日文、韩文
  }

  const translatedTexts = await googleTranslate(sourceLanguage, targetLanguages, text);
  return translatedTexts;
}
