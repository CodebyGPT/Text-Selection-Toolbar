import { OPT_TRANS_OLLAMA, OPT_TRANS_CUSTOMIZE } from "../config/apiConstants";

// Vendor text shapes are compiled adapters; the scene receives Markdown/text/cues.
export function parseNativeDictionaryResponse(res, apiType) {
  switch (apiType) {
    case OPT_TRANS_OLLAMA:
      return res?.choices?.[0]?.message?.content || "";
    case OPT_TRANS_CUSTOMIZE:
      if (typeof res === "string") return res;
      return res?.text || res?.result || "";
    default:
  }

  throw new Error("parse dictionary result: apiType not matched", apiType);
}

export function parseNativeSummaryResponse(res, apiType) {
  switch (apiType) {
    case OPT_TRANS_OLLAMA:
      return res?.choices?.[0]?.message?.content?.trim() || "";
    case OPT_TRANS_CUSTOMIZE:
      if (typeof res === "string") return res.trim();
      return (
        res?.choices?.[0]?.message?.content?.trim() ||
        res?.content?.[0]?.text?.trim() ||
        ""
      );
    default:
      return "";
  }
}

export async function parseNativeSubtitleResponse(
  res,
  { apiSetting, events, from },
  { parseSTRes }
) {
  switch (apiSetting.apiType) {
    case OPT_TRANS_OLLAMA:
      return parseSTRes(
        res?.choices?.[0]?.message?.content ?? "",
        events,
        from
      );
    case OPT_TRANS_CUSTOMIZE:
      return res;
    default:
  }

  return [];
}
