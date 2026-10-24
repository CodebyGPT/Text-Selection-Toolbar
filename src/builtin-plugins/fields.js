import { validateConfig, isSettingVisible } from "../providers/instances";
import { PROVIDER_CAPABILITIES } from "../providers/capabilities";

const fieldTasks = {
  translate: [
    "aiTerms",
    "tone",
    "placeholder",
    "placetag",
    "placetagFormat",
    "nobatchPromptSlug",
    "nobatchPrompt",
    "nobatchUserPrompt",
    "port",
  ],
  dictionary: [],
  segmentSubtitle: ["subtitlePromptSlug", "subtitlePrompt"],
  parseImage: ["vlmPromptSlug"],
};
const fieldCapabilities = (key) =>
  Object.entries(fieldTasks)
    .filter(([, keys]) => keys.includes(key))
    .map(([name]) => name);

// These are the existing root configuration fields. Describing them does not
// move data to pluginConfig or apply defaults to old saved records.
export const builtinSettingFields = [
  ...[
    "url",
    "model",
    "modelListUrl",
    "modelRef",
    "device",
    "region",
    "folderId",
    "customHeader",
    "customBody",
    "aiTerms",
    "tone",
    "placeholder",
    "placetag",
    "placetagFormat",
    "nobatchPromptSlug",
    "dictPromptSlug",
    "subtitlePromptSlug",
    "vlmPromptSlug",
    "nobatchPrompt",
    "nobatchUserPrompt",
    "dictPrompt",
    "dictUserPrompt",
    "subtitlePrompt",
    "thinkingMode",
    "thinkingEffort",
  ].map((key) => ({
    key,
    type: "text",
    ...(fieldCapabilities(key).length && {
      visibleForCapabilities: fieldCapabilities(key),
    }),
  })),
  { key: "key", type: "password", isSecret: true },
  ...[
    ["temperature", 0, 2],
    ["maxTokens", 0, 1000000],
    ["fetchLimit", 1, 100],
    ["fetchInterval", 0, 5000],
    ["httpTimeout", 1, 600],
    ["port", 1, 65535],
  ].map(([key, min, max]) => ({
    key,
    type: "number",
    min,
    max,
    ...(fieldCapabilities(key).length && {
      visibleForCapabilities: fieldCapabilities(key),
    }),
  })),
];

export const builtinFieldBounds = Object.fromEntries(
  builtinSettingFields
    .filter((field) => field.type === "number")
    .map(({ key, min, max }) => [key, { min, max }])
);

/** Validate edits only; reading/copying legacy values must not silently repair them. */
export function validateBuiltinSettingChanges(previous = {}, next = {}) {
  const edited = builtinSettingFields.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(next, field.key) &&
      isSettingVisible(
        field,
        next.enabledCapabilities ?? PROVIDER_CAPABILITIES
      ) &&
      next[field.key] !== previous[field.key]
  );
  validateConfig(edited, next);
  return next;
}
