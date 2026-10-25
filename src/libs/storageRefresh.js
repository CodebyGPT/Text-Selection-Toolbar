const subscribers = new Map();

/** Subscribe to explicit storage refreshes within the current page. */
export function subscribeStorageRefresh(key, callback) {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  const callbacks = subscribers.get(key);
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) subscribers.delete(key);
  };
}
