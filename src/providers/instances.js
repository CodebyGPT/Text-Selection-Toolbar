import {
  PROVIDER_CAPABILITIES,
  providerError,
  supportedCapabilities,
  validateEnabledCapabilities,
} from "./capabilities";
import { providerHelpers } from "./sdk";
import { validateDefaultPrompts } from "./defaultPrompts";

const copy = (value) => JSON.parse(JSON.stringify(value));
const forbidden = new Set(["__proto__", "constructor", "prototype"]);

export const isSettingVisible = (field, enabled) =>
  !field.visibleForCapabilities ||
  field.visibleForCapabilities.some((name) => enabled.includes(name));

export function projectInstanceConfig(instance) {
  const config = { ...instance.pluginConfig };
  const secrets = {};
  for (const field of instance.provider.settings || []) {
    if (field.isSecret || field.type === "password") {
      secrets[field.key] = config[field.key];
      delete config[field.key];
    }
  }
  return { config, secrets };
}

/** Create and edit use the same validation, so saving cannot bypass template constraints. */
export function validateConfig(fields, values) {
  const config = {};
  for (const field of fields) {
    const value = values?.[field.key] ?? field.defaultValue;
    if (
      field.required &&
      (value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim()))
    )
      throw providerError("INVALID_CONFIG", `Required field: ${field.key}`);
    if (value !== undefined) config[field.key] = copy(value);
    if (value !== undefined) {
      if (
        field.type === "number" &&
        (!Number.isFinite(value) ||
          (field.min !== undefined && value < field.min) ||
          (field.max !== undefined && value > field.max))
      )
        throw providerError("INVALID_CONFIG", `Invalid number: ${field.key}`);
      if (field.type === "boolean" && typeof value !== "boolean")
        throw providerError("INVALID_CONFIG", `Invalid boolean: ${field.key}`);
      if (
        ["text", "password"].includes(field.type) &&
        typeof value !== "string"
      )
        throw providerError("INVALID_CONFIG", `Invalid text: ${field.key}`);
      if (
        field.type === "select" &&
        !getSettingOptions(field).some((option) => option.value === value)
      )
        throw providerError(
          "INVALID_CONFIG",
          `Invalid selection: ${field.key}`
        );
    }
  }
  return config;
}

/** Dictionary names refer to bundled data, never to a remote schema or shared instance values. */
export function getSettingOptions(field) {
  if (field.options) {
    if (
      !Array.isArray(field.options) ||
      field.options.some(
        (option) =>
          !option || !["string", "number"].includes(typeof option.value)
      )
    )
      throw providerError("INVALID_MANIFEST", "Invalid select options.");
    return field.options;
  }
  if (field.optionsSource === "speech.voices.openai.tts-1")
    return providerHelpers.speech.voices.openai["tts-1"];
  throw providerError("INVALID_MANIFEST", "Unsupported select options source.");
}

export function validateServiceConfig(
  service,
  values,
  enabled = Object.keys(service.capabilities || {})
) {
  // Hidden values survive a toggle; validation resumes when the task is enabled.
  const retained = Object.fromEntries(
    (service.settings || [])
      .filter((field) => values?.[field.key] !== undefined)
      .map((field) => [field.key, copy(values[field.key])])
  );
  const config = {
    ...retained,
    ...validateConfig(
      (service.settings || []).filter((field) =>
        isSettingVisible(field, enabled)
      ),
      values
    ),
  };
  return config;
}
