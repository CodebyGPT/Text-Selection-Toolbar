import { getBuiltinServiceDefinition } from "./definitions";

/** Shared model intersection for actual invocation and capability test choices. */
export function resolveBuiltinCapabilities(api) {
  const definition = getBuiltinServiceDefinition(api.apiType);
  if (!definition) return {};
  // Legacy user Hooks can receive nested request arguments. Never hand them
  // a reference to compiled descriptors shared with other service instances.
  return JSON.parse(JSON.stringify(definition.capabilities));
}
