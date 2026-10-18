import { OPT_TRANS_OLLAMA } from "../config/apiConstants";

// Legacy vendor SSE extraction stays compiled; common framing/translation IDs remain in the host SDK.
export function getStreamDelta(json, apiType) {
  switch (apiType) {
    case OPT_TRANS_OLLAMA:
      // OpenAI 兼容协议的大模型 delta 提取逻辑
      return json.choices?.[0]?.delta?.content || "";
    default:
      return "";
  }
}
