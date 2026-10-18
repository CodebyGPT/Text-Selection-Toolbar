import { createInvocation } from "./invocation";
import { createAssetStore } from "./transport";

/** Userscript frontend dispatch: only compiled native providers are supported. */
export function invokeService(instance, capability, input, options = {}) {
  if (instance.provider && instance.provider.implementation.kind !== "native")
    throw new Error(
      "External provider plugins are not available in userscript mode."
    );
  const assets = options.assets || createAssetStore();
  const invocation = createInvocation(async (invocation) => {
    const { createNativeRegistry } = await import(
      "../builtin-plugins/runtime"
    );
    const call = createNativeRegistry(
      (id) => (id === instance.apiSlug ? instance : undefined),
      { assets, nativeOptions: options.nativeOptions }
    ).invoke(instance.apiSlug, capability, input, {
      ...options,
      signal: invocation.signal,
    });
    const events = (async () => {
      for await (const event of call.events) await invocation.emit(event);
    })();
    events.catch(() => {});
    let unsubscribe = () => {};
    if (instance.apiSlug) {
      const [
        { subscribeStorageInvalidation },
        { getSettingWithDefault },
        { STOKEY_SETTING },
      ] = await Promise.all([
        import("../libs/storageEvents"),
        import("../libs/storage"),
        import("../config/storage"),
      ]);
      unsubscribe = subscribeStorageInvalidation(STOKEY_SETTING, () => {
        getSettingWithDefault()
          .then((setting) => {
            if (
              !setting.transApis.some(
                (api) => api.apiSlug === instance.apiSlug && !api.isDisabled
              )
            )
              call.cancel();
          })
          .catch(() => {});
      });
      invocation.signal.addEventListener("abort", unsubscribe, {
        once: true,
      });
      if (invocation.signal.aborted) unsubscribe();
    }
    try {
      const result = await call.result;
      await events;
      return result;
    } finally {
      invocation.signal.removeEventListener("abort", unsubscribe);
      unsubscribe();
    }
  }, options);
  return { ...invocation, assets };
}
