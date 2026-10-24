import {
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
  OPT_TRANS_MTRAN,
} from "../config";

function parseOllamaResponse(
  res,
  { history, userMsg, useBatchFetch, batchProtocol, textFormat },
  { parseAIRes }
) {
  const modelMsg = res?.choices?.[0]?.message;
  if (history && userMsg) {
    history.addPair(userMsg, modelMsg);
  }
  return parseAIRes(
    modelMsg?.content,
    useBatchFetch,
    batchProtocol,
    textFormat
  );
}

function parseCustomizeResponse(res, ctx, helpers) {
  // OpenAI-compatible /chat/completions response.
  if (Array.isArray(res?.choices) && res.choices.length) {
    return parseOllamaResponse(res, ctx, helpers);
  }
  const { useBatchFetch } = ctx;
  if (useBatchFetch) {
    return (res?.translations ?? res)?.map((item) => [item.text, item.src]);
  }
  return [[res.text, res.src || res.from]];
}

export const nativeResponseParsers = {
  [OPT_TRANS_OLLAMA]: parseOllamaResponse,
  [OPT_TRANS_CUSTOMIZE]: parseCustomizeResponse,
  [OPT_TRANS_MTRAN]: parseCustomizeResponse,
};
