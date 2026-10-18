import { THINKING_API_REGISTRY } from "./thinkingCapabilities";

// 原生协议适配：Ollama/Custom 只保留 OpenAI 兼容的 reasoning_effort 字段。
const applyOpenAIThinking = (body, { thinkingEffort }) => {
  if (thinkingEffort !== null) body.reasoning_effort = thinkingEffort;
};

const THINKING_ADAPTERS = {
  openai: applyOpenAIThinking,
};

const applyThinkingParameters = (body, options) => {
  const registration = THINKING_API_REGISTRY[options.apiType];
  if (
    !registration ||
    options.thinkingMode === "auto" ||
    options.thinkingEffort === "_default" ||
    options.thinkingEffort === undefined
  ) {
    return;
  }

  THINKING_ADAPTERS[registration.adapter]?.(body, options);
};

export { applyThinkingParameters, THINKING_ADAPTERS, applyOpenAIThinking };
