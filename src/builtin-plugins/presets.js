import {
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_STRANSLATE,
  OPT_TRANS_MTRAN,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
} from "../config/apiConstants";

// Vendor endpoints/models belong to compiled providers. The caller supplies
// scene defaults; these overrides never rewrite saved instances.
export const NATIVE_PRESET_OVERRIDES = {
  [OPT_TRANS_TRANSLATOR_API]: {
    sourceType: "builtin",
  },
  // External application handoff. Only the port is configurable; the path and
  // loopback host are fixed by STranslate.
  [OPT_TRANS_STRANSLATE]: {
    external: true,
    port: 50020,
    httpTimeout: 10,
  },
  // MTranServer exposes a KISS-compatible single-text endpoint at /kiss.
  [OPT_TRANS_MTRAN]: {
    url: "http://127.0.0.1:8989/kiss",
    sourceType: "network",
  },
  // The Ollama preset is no longer shipped, but its defaults stay here so a
  // legacy saved instance would still have a valid endpoint if it reappears.
  [OPT_TRANS_OLLAMA]: {
    url: "http://localhost:11434/v1/chat/completions",
    modelListUrl: "http://localhost:11434/v1/models",
    model: "llama3.1",
  },
  [OPT_TRANS_CUSTOMIZE]: {},
};

// Browser translator, STranslate handoff and MTranServer ship as enabled
// presets. The Ollama preset was removed; the provider implementation stays so
// existing saved Ollama instances keep working and remain editable.
export const DEFAULT_ENABLED_API_TYPES = new Set([
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_STRANSLATE,
  OPT_TRANS_MTRAN,
]);
