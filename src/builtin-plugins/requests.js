import { OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE } from "../config";
import { genOllama } from "./ollama";

// 原生协议适配：只保留 Ollama 与 Custom 两种请求构造器。
const genCustom = ({ texts, fromLang, toLang, url, key, useBatchFetch }) => {
  const body = useBatchFetch
    ? { texts, from: fromLang, to: toLang }
    : { text: texts[0], from: fromLang, to: toLang };
  const headers = {
    "Content-type": "application/json",
    Authorization: `Bearer ${key}`,
  };

  return { url, body, headers };
};

const genReqFuncs = {
  [OPT_TRANS_OLLAMA]: genOllama,
  [OPT_TRANS_CUSTOMIZE]: genCustom,
};

export { genReqFuncs as nativeRequestBuilders };
