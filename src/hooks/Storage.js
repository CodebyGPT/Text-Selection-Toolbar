import { useCallback, useEffect, useRef, useState } from "react";
import { getStorageState } from "../libs/storageState";
import { cloneStorageValue } from "../libs/storageEquality";
import { kissLog } from "../libs/log";

/** Subscribe to a page controller; persistence outlives views. */
export function useStorage(key, defaultVal = null) {
  const [snapshot, setSnapshot] = useState({
    data: defaultVal,
    isLoading: true,
  });
  const scopeRef = useRef(null);

  useEffect(() => {
    const state = getStorageState(key, defaultVal);
    const scope = { key, state, active: true };
    scopeRef.current = scope;
    const unsubscribe = state.subscribe((next) => {
      if (scope.active) setSnapshot(next);
    });
    state.ensureLoaded().catch((error) => {
      if (scope.active) kissLog("Storage load failed", key, error);
    });
    return () => {
      scope.active = false;
      unsubscribe();
    };
  }, [key, defaultVal]);

  const save = useCallback(
    (valueOrFn) => {
      const scope = scopeRef.current;
      if (!scope?.active || scope.key !== key) return Promise.resolve();
      const pending = scope.state.save(valueOrFn);
      // Observe fire-and-forget errors without converting rejection into success.
      pending.catch((error) => kissLog("Storage save failed", key, error));
      return pending;
    },
    [key]
  );

  const update = useCallback(
    (partialDataOrFn) => {
      const input =
        typeof partialDataOrFn === "function"
          ? partialDataOrFn
          : cloneStorageValue(partialDataOrFn);
      return save((previous) => {
        const partial = typeof input === "function" ? input(previous) : input;
        const base =
          typeof previous === "object" && previous !== null ? previous : {};
        return { ...base, ...partial };
      });
    },
    [save]
  );

  const remove = useCallback(() => {
    const scope = scopeRef.current;
    if (!scope?.active || scope.key !== key) return Promise.resolve();
    const pending = scope.state.remove();
    pending.catch((error) => kissLog("Storage removal failed", key, error));
    return pending;
  }, [key]);

  const reload = useCallback(() => {
    const scope = scopeRef.current;
    if (!scope?.active || scope.key !== key) return Promise.resolve();
    const pending = scope.state.load();
    return pending.catch((error) =>
      kissLog("Storage reload failed", key, error)
    );
  }, [key]);

  return { ...snapshot, save, update, remove, reload };
}
