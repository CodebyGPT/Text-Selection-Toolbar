import { OPT_TRANS_OLLAMA } from "../config/apiConstants";

// Compiled vendor/model metadata shared by request adapters and settings.
const THINKING_EFFORT_LABELS = {
  max: "Max",
  xhigh: "X-High",
  high: "High",
  medium: "Medium",
  low: "Low",
  minimal: "Minimal",
};
const THINKING_EFFORT_RANK = {
  none: 0,
  minimal: 1,
  low: 2,
  medium: 3,
  high: 4,
  xhigh: 5,
  max: 6,
};

const toThinkingEffortOptions = (efforts = []) =>
  efforts.map((effort) => ({
    value: effort,
    label: THINKING_EFFORT_LABELS[effort] || effort,
  }));

const createThinkingCapability = (efforts, extra = {}) => ({
  efforts: efforts ? toThinkingEffortOptions(efforts) : null,
  ...extra,
});

const createOpenAIThinkingCapability = (efforts, defaults = {}) =>
  createThinkingCapability(efforts, {
    enable: "effort",
    disable: "none",
    ...defaults,
  });

const normalizeOpenAIModelName = (model = "") =>
  String(model)
    .trim()
    .toLowerCase()
    .replace(/^openai\//, "");

export const isGPT6Astra = (model = "") =>
  normalizeOpenAIModelName(model) === "gpt-6-astra";

const getOpenAIThinkingCapability = (model = "") => {
  const normalizedModel = normalizeOpenAIModelName(model);

  if (normalizedModel === "gpt-6-astra") {
    return createOpenAIThinkingCapability(
      ["max", "xhigh", "high", "medium", "low"],
      { disable: null }
    );
  }

  if (/^gpt-5\.6(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability([
      "max",
      "xhigh",
      "high",
      "medium",
      "low",
    ]);
  }
  if (/^gpt-5\.(?:4|2)-pro(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["xhigh", "high", "medium"]);
  }
  if (/^gpt-5-pro(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["high"]);
  }
  if (/^gpt-5\.[23]-codex(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["xhigh", "high", "medium", "low"]);
  }
  if (/^gpt-5\.(?:5|4|2)(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["xhigh", "high", "medium", "low"]);
  }
  if (/^gpt-5\.1(?:-\d{4}-\d{2}-\d{2})?$/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["high", "medium", "low"], {
      defaultEnabled: false,
      defaultEffort: "none",
    });
  }
  if (/^gpt-5\.1(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["high", "medium", "low"]);
  }
  if (/^gpt-5(?:-|$)/.test(normalizedModel)) {
    return createOpenAIThinkingCapability(["high", "medium", "low", "minimal"]);
  }

  return null;
};

// 只保留 Ollama；Custom 由用户自行决定协议字段。
export const THINKING_API_REGISTRY = {
  [OPT_TRANS_OLLAMA]: {
    adapter: "openai",
    resolveCapability: ({ model }) => getOpenAIThinkingCapability(model),
  },
};

export const getThinkingCapability = ({ apiType, model = "" }) => {
  const registration = THINKING_API_REGISTRY[apiType];
  if (!registration) return null;

  const capability = registration.resolveCapability({ apiType, model });
  return capability ? { adapter: registration.adapter, ...capability } : null;
};

export const normalizeThinkingEffort = (effort, supportedEfforts = []) => {
  const supported = supportedEfforts.map((item) => item.value);
  if (!supported.length) return null;
  if (effort === null || effort === undefined || effort === "_default") {
    return null;
  }
  if (supported.includes(effort)) return effort;

  const targetRank = THINKING_EFFORT_RANK[effort];
  if (targetRank === undefined) return null;
  return supported.reduce((closest, candidate) => {
    const distance = Math.abs(THINKING_EFFORT_RANK[candidate] - targetRank);
    const closestDistance = Math.abs(
      THINKING_EFFORT_RANK[closest] - targetRank
    );
    return distance < closestDistance ? candidate : closest;
  });
};

const getDefaultThinkingEffort = (capability) => {
  const efforts = capability.efforts || [];
  const lowestEffort = efforts[efforts.length - 1]?.value ?? null;
  if (
    capability.defaultEnabled === false ||
    capability.defaultEffort === "none"
  ) {
    return lowestEffort;
  }
  if (capability.defaultEffort === null) return null;
  if (typeof capability.defaultEffort === "number") {
    return capability.defaultEffort;
  }
  return efforts.some((effort) => effort.value === capability.defaultEffort)
    ? capability.defaultEffort
    : null;
};

export const normalizeThinkingSettings = ({
  apiType,
  model = "",
  thinkingMode = "disabled",
  thinkingEffort = "_default",
}) => {
  if (thinkingMode === "auto") {
    return { thinkingMode, thinkingEffort: "_default" };
  }

  const capability = getThinkingCapability({ apiType, model });
  if (!capability) {
    return { thinkingMode, thinkingEffort: "_default" };
  }

  const hasExplicitEffort =
    thinkingEffort !== null &&
    thinkingEffort !== undefined &&
    thinkingEffort !== "_default";
  const normalizedEffort =
    hasExplicitEffort && thinkingEffort === capability.defaultEffort
      ? thinkingEffort
      : normalizeThinkingEffort(thinkingEffort, capability.efforts || []);
  if (thinkingMode === "enabled") {
    return {
      thinkingMode,
      thinkingEffort:
        capability.enable === "explicit" && !hasExplicitEffort
          ? null
          : hasExplicitEffort
            ? normalizedEffort
            : getDefaultThinkingEffort(capability),
    };
  }

  const efforts = capability.efforts || [];
  return {
    thinkingMode,
    thinkingEffort:
      capability.disable === "explicit" || capability.disable === "omit"
        ? null
        : (capability.disable ?? efforts[efforts.length - 1]?.value ?? null),
  };
};

export const normalizeApiThinkingSetting = (apiSetting = {}) => {
  if (!THINKING_API_REGISTRY[apiSetting.apiType]) return apiSetting;

  const normalized = normalizeThinkingSettings(apiSetting);
  if (
    normalized.thinkingMode === apiSetting.thinkingMode &&
    normalized.thinkingEffort === apiSetting.thinkingEffort
  ) {
    return apiSetting;
  }
  return { ...apiSetting, ...normalized };
};

export const normalizeApiThinkingSettings = (transApis = []) => {
  if (!Array.isArray(transApis)) return transApis;

  let hasChanges = false;
  const normalizedApis = transApis.map((apiSetting) => {
    const normalized = normalizeApiThinkingSetting(apiSetting);
    if (normalized !== apiSetting) hasChanges = true;
    return normalized;
  });
  return hasChanges ? normalizedApis : transApis;
};

export const isThinkingMinimumFallback = ({ capability, thinkingMode }) =>
  Boolean(
    capability &&
      thinkingMode === "disabled" &&
      capability.disable === null &&
      capability.efforts?.length
  );
