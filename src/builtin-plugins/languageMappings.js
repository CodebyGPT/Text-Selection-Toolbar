import {
  OPT_TRANS_BUILTINAI,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
} from "../config/apiConstants";
import {
  OPT_LANGS_SPEC_NAME,
  OPT_LANGS_SPEC_DEFAULT,
} from "../providers/sdk/languageDictionary";

// Vendor code aliases stay with compiled adapters; SDK exposes the common dictionary.
export const OPT_LANGS_TO_SPEC = {
  [OPT_TRANS_BUILTINAI]: new Map([
    ...OPT_LANGS_SPEC_DEFAULT,
    ["zh-CN", "zh-Hans"],
    ["zh-TW", "zh-Hant"],
  ]),
  [OPT_TRANS_OLLAMA]: OPT_LANGS_SPEC_NAME,
  [OPT_TRANS_CUSTOMIZE]: OPT_LANGS_SPEC_NAME,
};

export const OPT_LANGS_FROM_SPEC = {
  ...OPT_LANGS_TO_SPEC,
};

const specToCode = (m) =>
  new Map(
    Array.from(m.entries()).map(([k, v]) => {
      if (v === "") {
        return ["auto", "auto"];
      }
      if (v === "zh" || v === "ZH") {
        return [v, "zh-CN"];
      }
      return [v, k];
    })
  );

// 名称->CODE
export const OPT_LANGS_TO_CODE = {};
Object.entries(OPT_LANGS_TO_SPEC).forEach(([t, m]) => {
  OPT_LANGS_TO_CODE[t] = specToCode(m);
});
