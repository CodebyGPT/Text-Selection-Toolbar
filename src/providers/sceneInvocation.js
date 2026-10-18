import { invokeService } from "./serviceRuntime";

/** Userscript-only dispatch: every provider runs through the compiled native runtime. */
export function invokeScene(api, capability, input, options = {}) {
  return invokeService(api, capability, input, options);
}
