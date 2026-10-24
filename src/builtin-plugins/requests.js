import {
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
  OPT_TRANS_MTRAN,
} from "../config";
import { genOllama } from "./ollama";

// 原生协议适配：Ollama、Custom 与 MTranServer 的请求构造器。
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
  [OPT_TRANS_MTRAN]: genCustom,
};

export { genReqFuncs as nativeRequestBuilders };
