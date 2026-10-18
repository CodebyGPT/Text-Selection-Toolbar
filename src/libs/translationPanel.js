import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { SettingProvider, useSetting } from "../hooks/Setting";
import ThemeProvider from "../hooks/M3Theme";
import TranBox from "../views/Selection/TranBox";
import useTranBoxState from "../hooks/useTranBoxState";
import { SELECTION_STYLES } from "../views/Selection/styles";
import { isolateShadowHost, mountShadowHost } from "./shadowHost";

let current = null;

function TranslationPanel({ text, rect, onClose }) {
  const { setting } = useSetting();
  const tranboxSetting = setting.tranboxSetting;
  const {
    boxSize,
    setBoxSize,
    boxPosition,
    setBoxPosition,
    simpleStyle,
    setSimpleStyle,
    hideClickAway,
    setHideClickAway,
    followSelection,
    setFollowSelection,
  } = useTranBoxState(tranboxSetting);
  const [currentText, setCurrentText] = useState(text);
  const [showBox, setShowBox] = useState(true);

  useEffect(() => {
    setCurrentText(text);
    setShowBox(true);
  }, [text]);

  useEffect(() => {
    if (!rect) return;
    setBoxPosition({
      x: Math.max(0, rect.left),
      y: Math.max(0, rect.bottom + 10),
    });
    // The toolbar's click is the positioning anchor; later drags stay free.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showBox) return null;

  const close = () => {
    setShowBox(false);
    onClose?.();
  };

  return (
    <>
      <style>{SELECTION_STYLES}</style>
      <TranBox
        showBox={showBox}
        text={currentText}
        setText={setCurrentText}
        boxSize={boxSize}
        setBoxSize={setBoxSize}
        boxPosition={boxPosition}
        setBoxPosition={setBoxPosition}
        tranboxSetting={tranboxSetting}
        transApis={setting.transApis}
        prompts={setting.prompts}
        subtitleSetting={setting.subtitleSetting}
        setShowBox={(next) => (next ? setShowBox(true) : close())}
        simpleStyle={simpleStyle}
        setSimpleStyle={setSimpleStyle}
        hideClickAway={hideClickAway}
        setHideClickAway={setHideClickAway}
        followSelection={followSelection}
        setFollowSelection={setFollowSelection}
        langDetector={setting.langDetector}
        translateVariants={setting.translateVariants}
        parseLatex={setting.parseLatex}
        selectionContext=""
      />
    </>
  );
}

export function showTranslationPanel(text, rect) {
  // An empty text opens a blank panel for manual input (menu entry).
  if (text == null) text = "";
  if (current) {
    current.text = text;
    current.rect = rect;
    current.render();
    return;
  }

  const host = document.createElement("div");
  host.id = "kiss-toolbar-translation-host";
  host.className = "notranslate";
  isolateShadowHost(host);
  const cleanupHost = mountShadowHost(host);

  // Same reason as the settings overlay: MUI menus and focus management work
  // reliably only in the normal document, so the React panel uses a scoped
  // light-DOM host. The vanilla toolbar itself stays in its Shadow DOM.
  const style = document.createElement("style");
  style.textContent = `#kiss-toolbar-translation-host { all: initial; }`;
  host.appendChild(style);

  const rootElement = document.createElement("div");
  host.appendChild(rootElement);

  const portalHost = document.createElement("div");
  portalHost.id = "kiss-toolbar-translation-portal";
  host.appendChild(portalHost);
  globalThis.__KISS_PORTAL_CONTAINER__ = portalHost;

  const cache = createCache({
    key: "kiss-toolbar-translation",
    prepend: true,
    container: document.head,
  });
  const root = ReactDOM.createRoot(rootElement);

  const handle = {
    text,
    rect,
    render() {
      root.render(
        <React.StrictMode>
          <CacheProvider value={cache}>
            <SettingProvider context="tranbox">
              <ThemeProvider disableCssBaseline>
                <TranslationPanel text={handle.text} rect={handle.rect} onClose={handle.close} />
              </ThemeProvider>
            </SettingProvider>
          </CacheProvider>
        </React.StrictMode>
      );
    },
    close() {
      current = null;
      cleanupHost?.();
      root.unmount();
      cache.sheet.flush();
      host.remove();
      if (globalThis.__KISS_PORTAL_CONTAINER__ === portalHost) {
        globalThis.__KISS_PORTAL_CONTAINER__ = null;
      }
    },
  };
  current = handle;
  handle.render();
}

export function closeTranslationPanel() {
  current?.close();
}
