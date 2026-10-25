/**
 * @file utils.js
 * @description 通用工具函数模块，包含类型判定、数字限制、字符串匹配、节流防抖、密码学加密等辅助方法。
 */

/**
 * 移除 Markdown 代码块标记（如 ```xml 译文 ```）
 * @param {string} text 原始文本
 * @param {boolean} startOnly 是否只处理开头
 * @returns {string} 移除代码块标记后的文本
 */
export function stripMarkdownCodeBlock(text, startOnly = false) {
  if (!text) return "";
  let result = text.replace(/^```[a-z]*\s*\n?/i, "");
  if (!startOnly) {
    result = result.replace(/\n?```$/i, "");
  }
  return result;
}

/**
 * 限制整数的边界范围
 * @param {*} num 输入值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number}
 */
export const limitNumber = (num, min = 0, max = 100) => {
  const number = parseInt(num);
  if (Number.isNaN(number) || number < min) {
    return min;
  } else if (number > max) {
    return max;
  }
  return number;
};

/**
 * 函数防抖（Debounce）
 * @param {Function} func 目标执行函数
 * @param {number} delay 延迟触发时间（毫秒）
 * @returns {Function} 防抖包装后的新函数
 */
export const debounce = (func, delay = 200) => {
  let timer = null;

  const debouncedFunc = (...args) => {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
      timer = null;
    }, delay);
  };

  // 提供手动取消未执行任务的方法
  debouncedFunc.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return debouncedFunc;
};

/**
 * 检测数据的实际 JavaScript 原生类型
 * @param {*} o 待检测对象
 * @returns {string} 小写的类型名称 (如 "string", "array", "object" 等)
 */
export const type = (o) => {
  const s = Object.prototype.toString.call(o);
  return s.match(/\[object (.*?)\]/)[1].toLowerCase();
};

/**
 * 判断字符串是否为合法的纯英文单词（仅支持字母及中划线，用于跳过单单词翻译或词典单独查词）
 * @param {string} str 待检测文本
 * @returns {boolean}
 */
export const isValidWord = (str) => {
  const regex = /^[a-zA-Z-]+$/;
  return regex.test(str);
};

/**
 * 将 Blob 文件数据异步转换为 Base64 编码的 DataURL
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

/**
 * 容错率极高的 JSON 字符串解析函数，支持自动补齐两端的花括号 "{}"
 * @param {string} str JSON 字符串
 * @returns {object} 解析成功的对象，若失败返回空对象 {}
 */
export const parseJsonObj = (str) => {
  if (!str || type(str) !== "string") {
    return {};
  }

  try {
    if (str.trim()[0] !== "{") {
      str = `{${str}}`; // 自动补齐缺失的首尾大括号
    }
    return JSON.parse(str);
  } catch (err) {
    // 解析静默失败
  }

  return {};
};

/**
 * 为异步 Promise 任务或待执行的闭包设置超时边界
 * @param {Promise|Function} task 异步任务
 * @param {number} timeout 超时时间（毫秒）
 * @param {string} [timeoutMsg] 超时错误描述
 * @returns {Promise}
 */
export const withTimeout = (task, timeout, timeoutMsg = "Task timed out") => {
  const promise = typeof task === "function" ? task() : task;
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMsg)), timeout)
    ),
  ]);
};

/**
 * 截短长句文本，并在末尾添加省略号 " …"
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateWords = (str, maxLength = 300) => {
  if (typeof str !== "string") return "";
  if (str.length <= maxLength) return str;
  const truncated = str.slice(0, maxLength);
  return truncated.slice(0, truncated.lastIndexOf(" ")) + " …";
};

/**
 * 辅助方法：根据文件名自动匹配导出/下载文件时的 MIME Content-Type
 * @param {string} filename 文件名
 * @returns {string} MIME 字符串
 */
function getMimeTypeFromFilename(filename) {
  const defaultType = "application/octet-stream";
  if (!filename || filename.indexOf(".") === -1) {
    return defaultType;
  }

  const extension = filename.split(".").pop().toLowerCase();
  const mimeMap = {
    // 文本
    txt: "text/plain;charset=utf-8",
    html: "text/html;charset=utf-8",
    css: "text/css;charset=utf-8",
    js: "text/javascript;charset=utf-8",
    json: "application/json;charset=utf-8",
    xml: "application/xml;charset=utf-8",
    md: "text/markdown;charset=utf-8",
    vtt: "text/vtt;charset=utf-8",

    // 图像
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",

    // 音频/视频
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    webm: "video/webm",
    wav: "audio/wav",

    // 应用程序/文档
    pdf: "application/pdf",
    zip: "application/zip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return mimeMap[extension] || defaultType;
}

/**
 * 解析用户输入的 AI 专业术语库字符串（格式：原文,译文 每行或以分号分隔一个词）
 * @param {string} termsString
 * @returns {Record<string, string>} 键值对字典对象
 */
export function parseAITerms(termsString) {
  if (typeof termsString !== "string" || termsString.trim() === "") return {};

  try {
    return Object.fromEntries(
      termsString
        .split(/\n|;/)
        .map((line) => {
          const [k = "", v = ""] = line.split(",").map((s) => s.trim());
          return [k, v];
        })
        .filter(([k]) => k)
    );
  } catch (err) {
    return {};
  }
}
