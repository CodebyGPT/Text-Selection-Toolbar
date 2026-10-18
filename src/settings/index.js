import React from "react";
import ReactDOM from "react-dom/client";
import SettingsApp from "./SettingsApp";
import { SETTINGS_APP_CSS, SETTINGS_TEXTAREA_CSS } from "./styles";
import { isolateShadowHost, mountShadowHost } from "../libs/shadowHost";

const HOST_ID = "kiss-settings-host";
const OPEN_EVENT = "kiss-settings-open";

let state = null;

function close() {
  if (!state) return;
  const current = state;
  state = null;
  current.cleanupHost?.();
  current.root?.unmount();
  current.host?.remove();
  document.documentElement.style.removeProperty("overflow");
  window.removeEventListener("keydown", current.onKeyDown, true);
}

function open(path = "/") {
  if (state) close();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-notranslate", "");
  isolateShadowHost(host);
  const cleanupHost = mountShadowHost(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    :host .kiss-settings-viewport {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      overflow: auto;
      background: Canvas;
      color: CanvasText;
      overscroll-behavior: contain;
    }
    :host .kiss-settings-close {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 10px;
      cursor: pointer;
      font: 22px/1 system-ui, sans-serif;
      color: CanvasText;
      background: color-mix(in srgb, Canvas 88%, CanvasText 12%);
      box-shadow: 0 2px 10px rgb(0 0 0 / 18%);
    }
    :host .kiss-settings-close:hover {
      background: color-mix(in srgb, Canvas 80%, CanvasText 20%);
    }
    ${SETTINGS_APP_CSS}
    ${SETTINGS_TEXTAREA_CSS}
  `;
  shadow.appendChild(style);

  const viewport = document.createElement("div");
  viewport.className = "kiss-settings-viewport";
  const rootElement = document.createElement("div");
  viewport.appendChild(rootElement);
  shadow.appendChild(viewport);

  const closeButton = document.createElement("button");
  closeButton.className = "kiss-settings-close";
  closeButton.type = "button";
  closeButton.title = "关闭设置";
  closeButton.setAttribute("aria-label", "关闭设置");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", close);
  shadow.appendChild(closeButton);

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <SettingsApp initialPath={path} />
    </React.StrictMode>
  );

  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    if (event.composedPath?.().includes(host)) {
      event.preventDefault();
      event.stopPropagation();
    }
    close();
  };
  window.addEventListener("keydown", onKeyDown, true);
  document.documentElement.style.setProperty("overflow", "hidden", "important");

  state = { host, root, cleanupHost, onKeyDown };
}

export function openSettings(path) {
  open(path);
}

export function closeSettings() {
  close();
}

export function isSettingsOpen() {
  return Boolean(state);
}

export { OPEN_EVENT };
