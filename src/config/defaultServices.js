import { DEFAULT_API_LIST } from "./api";
import { DEFAULT_ENABLED_API_TYPES } from "../builtin-plugins/presets";

/**
 * Installed settings keep their own list; these instances are only initial
 * defaults. Fresh installs ship with the presets only (BuiltinAI + Ollama);
 * custom endpoints are added on demand and never seeded.
 */
export function defaultServices() {
  return DEFAULT_API_LIST.filter((api) =>
    DEFAULT_ENABLED_API_TYPES.has(api.apiType)
  );
}
