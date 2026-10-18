import {
  OPT_TRANS_BUILTINAI,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
} from "../config/apiConstants";

// Vendor endpoints/models and compatibility Hook templates belong to compiled providers.
// The caller supplies scene defaults; these overrides never rewrite saved instances.
const defaultRequestHook = `async (args, { url, body, headers, userMsg, method } = {}) => {
  console.log("request hook args:", { args, url, body, headers, userMsg, method });
  // return { url, body, headers, userMsg, method };
};`;

const defaultResponseHook = `async ({ res, ...args }) => {
  console.log("reaponse hook args:", { res, args });
  // const translations = [["你好", "zh"]];
  // const modelMsg = "";
  // return { translations, modelMsg };
};`;

// AI 翻译接口默认参数
const defaultAiApiOpts = {
  useBatchFetch: true, // 是否启用聚合发送请求
  thinkingMode: "disabled", // 思考模式：auto | enabled | disabled
  thinkingEffort: "_default", // 思考强度：_default=接口默认,不注入参数
  useStream: true, // 是否启用流式传输
  streamRenderMode: "realtime", // 流式渲染模式：disabled/realtime/segment
};

export const NATIVE_PRESET_OVERRIDES = {
  [OPT_TRANS_BUILTINAI]: {
    sourceType: "builtin",
  },
  [OPT_TRANS_OLLAMA]: {
    url: "http://localhost:11434/v1/chat/completions",
    modelListUrl: "http://localhost:11434/v1/models",
    model: "llama3.1",
    ...defaultAiApiOpts,
  },
  [OPT_TRANS_CUSTOMIZE]: {
    reqHook: defaultRequestHook,
    resHook: defaultResponseHook,
  },
};

export const DEFAULT_ENABLED_API_TYPES = new Set([
  OPT_TRANS_BUILTINAI,
  OPT_TRANS_OLLAMA,
]);
