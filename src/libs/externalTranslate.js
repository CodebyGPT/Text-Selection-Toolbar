/**
 * External translation handoff helpers.
 *
 * External services do not return a translation to the panel. The toolbar
 * sends the selected text and the external application shows the result in
 * its own window. STranslate is the first such service.
 */
import { OPT_TRANS_STRANSLATE } from "../config/apiConstants";

export const DEFAULT_STRANSLATE_PORT = 50020;
export const DEFAULT_STRANSLATE_TIMEOUT = 10; // seconds

/** Resolve the HTTP endpoint for an external API instance. */
export function getExternalEndpoint(api) {
  if (!api) return "";
  if (api.apiType === OPT_TRANS_STRANSLATE) {
    const port = Number(api.port) || DEFAULT_STRANSLATE_PORT;
    return `http://127.0.0.1:${port}/translate`;
  }
  return api.externalUrl || "";
}

/** Timeout in whole seconds; falls back to the STranslate default. */
export function getExternalTimeout(api) {
  const seconds = Number(api?.httpTimeout);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.floor(seconds)
    : DEFAULT_STRANSLATE_TIMEOUT;
}

function getGmRequest() {
  return (
    globalThis.GM?.xmlHttpRequest ||
    (typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : null)
  );
}

/**
 * Send the selected text to an external translation application.
 * Resolves when the external app acknowledges the call; it never returns a
 * translation. Success is intentionally silent at the call site.
 */
export function invokeExternalApi(api, text) {
  const url = getExternalEndpoint(api);
  if (!url) {
    return Promise.reject(new Error("外部翻译接口未配置地址。"));
  }

  const timeoutSeconds = getExternalTimeout(api);
  const timeoutMs = timeoutSeconds * 1000;
  const requestText = String(text ?? "");
  const gmRequest = getGmRequest();

  return new Promise((resolve, reject) => {
    const settleError = (message) => reject(new Error(message));

    if (!gmRequest) {
      // The userscript build always provides GM.xmlHttpRequest; this branch is
      // only a defensive fallback for unusual environments.
      if (typeof fetch !== "function") {
        settleError("当前环境不支持调用外部翻译接口。");
        return;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: requestText,
        signal: controller.signal,
      })
        .then(async (response) => {
          clearTimeout(timer);
          const body = await response.text();
          let payload = null;
          try {
            payload = JSON.parse(body.replace(/^\uFEFF/, ""));
          } catch {
            payload = null;
          }
          if (response.ok && Number(payload?.code) === 200) {
            resolve();
            return;
          }
          settleError(payload?.data || `STranslate 返回 HTTP ${response.status}`);
        })
        .catch((error) => {
          clearTimeout(timer);
          if (error?.name === "AbortError") {
            settleError(
              `STranslate 请求超时（${timeoutSeconds} 秒），未收到返回。`
            );
            return;
          }
          settleError("STranslate 调用失败，请确认程序已启动。");
        });
      return;
    }

    gmRequest({
      method: "POST",
      url,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      data: requestText,
      timeout: timeoutMs,
      onload: (response) => {
        let payload = null;
        try {
          payload = JSON.parse(
            String(response?.responseText || "").replace(/^\uFEFF/, "")
          );
        } catch {
          payload = null;
        }
        const status = Number(response?.status) || 0;
        if (status >= 200 && status < 300 && Number(payload?.code) === 200) {
          resolve();
          return;
        }
        settleError(
          payload?.data || `STranslate 返回 HTTP ${status || "未知"}`
        );
      },
      onerror: () =>
        settleError("STranslate 调用失败，请确认程序已启动并检查端口。"),
      ontimeout: () =>
        settleError(
          `STranslate 请求超时（${timeoutSeconds} 秒），未收到返回。`
        ),
    });
  });
}
