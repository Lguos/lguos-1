function base64Encode(str) {
  const utf8Bytes = unescape(encodeURIComponent(str));
  let output = '';
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < utf8Bytes.length; i++) {
    buffer = (buffer << 8) | utf8Bytes.charCodeAt(i);
    bitsCollected += 8;

    while (bitsCollected >= 6) {
      bitsCollected -= 6;
      output += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[(buffer >> bitsCollected) & 0x3F];
    }
  }

  if (bitsCollected > 0) {
    buffer <<= (6 - bitsCollected);
    output += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='[(buffer & 0x3F)];
  }

  return output;
}

function base64Decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    if (char === '=') break;
    const charIndex = chars.indexOf(char);
    if (charIndex === -1) continue;

    buffer = (buffer << 6) | charIndex;
    bitsCollected += 6;

    while (bitsCollected >= 8) {
      bitsCollected -= 8;
      output += String.fromCharCode((buffer >> bitsCollected) & 0xFF);
    }
  }

  try {
    return decodeURIComponent(escape(output));
  } catch (e) {
    return "Base64解码失败: 输入的字符串可能不是有效的Base64编码格式";
  }
}

function urlEncode(str) {
  return encodeURIComponent(str);
}

function urlDecode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (e) {
    return "URL解码失败: 输入的字符串可能不是有效的URL编码格式";
  }
}

async function output() {
  const text = $searchText || $pasteboardContent;
  if (!text) {
    return ["请输入内容!"];
  }

  let result = [];

  if (text.startsWith("编")) {
    const content = text.slice(1);
    const base64Encoded = base64Encode(content);
    const urlEncoded = urlEncode(content);

    result.push("Base64编码:");
    result.push(base64Encoded);
    result.push("URL编码:");
    result.push(urlEncoded);
  } else if (text.startsWith("解")) {
    const content = text.slice(1);
    const base64Decoded = base64Decode(content);
    const urlDecoded = urlDecode(content);

    result.push("Base64解码:");
    result.push(base64Decoded);
    result.push("URL解码:");
    result.push(urlDecoded);
  } else {
    return ["请输入正确的指令"];
  }

  return result;
}
