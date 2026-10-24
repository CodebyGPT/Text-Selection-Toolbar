import { DEFAULT_API_LIST } from "./api";
import { DEFAULT_ENABLED_API_TYPES } from "../builtin-plugins/presets";
import { OPT_TRANS_TRANSLATOR_API, isTranslatorAPISupported } from "./apiConstants";

/**
 * Installed settings keep their own list; these instances are only initial
 * defaults. Fresh installs ship with the enabled presets (TranslatorAPI and
 * the STranslate external handoff); custom endpoints are added on demand.
 */
export function defaultServices() {
  return DEFAULT_API_LIST.filter(
    (api) =>
      DEFAULT_ENABLED_API_TYPES.has(api.apiType) &&
      (api.apiType !== OPT_TRANS_TRANSLATOR_API || isTranslatorAPISupported())
  );
}
