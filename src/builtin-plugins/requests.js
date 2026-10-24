import {
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
  OPT_TRANS_MTRAN,
} from "../config";
import { genOllama } from "./ollama";
import { buildSystemRoleMessages } from "./messages";

// 原生协议适配：Ollama、Custom 与 MTranServer 的请求构造器。
// Custom 同时兼容两类端点：
// - 配置了 model / URL 为 /chat/completions 的 OpenAI Chat 端点；
// - 未配置 model 的 KISS 风格简单 JSON 端点（{text, from, to}）。
const isChatEndpoint = (url, model) =>
  Boolean(model) || /\/chat\/completions(?:[/?#]|$)/.test(String(url || ""));

const genCustom = ({
  texts,
  fromLang,
  toLang,
  url,
  key,
  useBatchFetch,
  systemPrompt,
  userPrompt,
  model,
  temperature,
  maxTokens,
  hisMsgs = [],
  imageData,
}) => {
  const headers = {
    "Content-type": "application/json",
  };
  if (key) headers.Authorization = `Bearer ${key}`;

  if (isChatEndpoint(url, model)) {
    const userMsg = {
      role: "user",
      content: imageData
        ? [
            {
              type: "image_url",
              image_url: {
                url: `data:${imageData.type};base64,${imageData.base64}`,
              },
            },
            { type: "text", text: userPrompt },
          ]
        : userPrompt,
    };
    const body = {
      model,
      messages: [...buildSystemRoleMessages(systemPrompt), ...hisMsgs, userMsg],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };
    return { url, body, headers, userMsg };
  }

  const body = useBatchFetch
    ? { texts, from: fromLang, to: toLang }
    : { text: texts[0], from: fromLang, to: toLang };

  return {
    url,
    body,
    headers,
    userMsg: { role: "user", content: userPrompt || texts[0] },
  };
};

const genReqFuncs = {
  [OPT_TRANS_OLLAMA]: genOllama,
  [OPT_TRANS_CUSTOMIZE]: genCustom,
  [OPT_TRANS_MTRAN]: genCustom,
};

export { genReqFuncs as nativeRequestBuilders };
