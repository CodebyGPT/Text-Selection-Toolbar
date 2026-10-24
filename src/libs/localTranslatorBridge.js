/**
 * Page-context bridge to the "Local Translator for Chromium" extension.
 *
 * That extension's content script listens on `window.postMessage` for every
 * page it runs on, so the userscript needs no extension ID, no
 * `externally_connectable` entry and no extra host permissions. The request
 * carries a random id because the page itself can see the channel.
 */
export const LOCAL_TRANSLATOR_REQUEST_SOURCE = "text-selection-toolbar";
export const LOCAL_TRANSLATOR_RESPONSE_SOURCE =
  "local-translator-for-chromium";
export const DEFAULT_LOCAL_TRANSLATOR_TIMEOUT = 30; // seconds

const missingExtensionError = () =>
  new Error(
    "Local Translator for Chromium 未响应：请确认已安装并启用该扩展，或改用其它翻译接口。"
  );

/**
 * Ask the extension for one offline translation.
 * Rejects on timeout, on an extension-side error and when aborted.
 */
export function translateWithLocalTranslator({
  text,
  from = "auto",
  to,
  timeout = DEFAULT_LOCAL_TRANSLATOR_TIMEOUT,
  signal,
}) {
  const requestId = `tst-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const seconds = Number(timeout);
  const timeoutMs =
    (Number.isFinite(seconds) && seconds > 0
      ? seconds
      : DEFAULT_LOCAL_TRANSLATOR_TIMEOUT) * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const onMessage = (event) => {
      const data = event?.data;
      if (
        !data ||
        data.source !== LOCAL_TRANSLATOR_RESPONSE_SOURCE ||
        data.id !== requestId
      )
        return;
      if (data.error) {
        settle(reject, new Error(String(data.error)));
        return;
      }
      settle(resolve, String(data.text ?? ""));
    };
    const onAbort = () =>
      settle(reject, new DOMException("The operation was aborted.", "AbortError"));
    const settle = (done, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      signal?.removeEventListener?.("abort", onAbort);
      done(value);
    };

    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    timer = setTimeout(() => settle(reject, missingExtensionError()), timeoutMs);
    signal?.addEventListener?.("abort", onAbort, { once: true });
    window.addEventListener("message", onMessage);
    window.postMessage(
      {
        source: LOCAL_TRANSLATOR_REQUEST_SOURCE,
        type: "translate",
        id: requestId,
        text: String(text ?? ""),
        from,
        to,
      },
      "*"
    );
  });
}
