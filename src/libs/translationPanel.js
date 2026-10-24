import { StrictMode, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { SettingProvider, useSetting } from "../hooks/Setting";
import ThemeProvider from "../hooks/M3Theme";
import TranBox from "../views/Selection/TranBox";
import useTranBoxState from "../hooks/useTranBoxState";
import { SELECTION_STYLES } from "../views/Selection/styles";
import { isExternalApi } from "../config";
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

  // External handoff services are invoked straight from the toolbar button and
  // never appear in the panel's service selector.
  const panelApis = (setting.transApis || []).filter(
    (api) => !isExternalApi(api)
  );

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
        transApis={panelApis}
        prompts={setting.prompts}
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

  const root = ReactDOM.createRoot(rootElement);

  const handle = {
    text,
    rect,
    render() {
      root.render(
        <StrictMode>
          <SettingProvider context="tranbox">
            <ThemeProvider>
              <TranslationPanel
                text={handle.text}
                rect={handle.rect}
                onClose={handle.close}
              />
            </ThemeProvider>
          </SettingProvider>
        </StrictMode>
      );
    },
    close() {
      current = null;
      cleanupHost?.();
      root.unmount();
      host.remove();
    },
  };
  current = handle;
  handle.render();
}

export function closeTranslationPanel() {
  current?.close();
}
