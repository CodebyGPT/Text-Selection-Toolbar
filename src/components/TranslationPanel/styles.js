import { UI_TOKENS as T, px } from "../../styles/tokens";

export const TRANSLATION_PANEL_STYLES = String.raw`
.kt-translation-panel { overflow: visible; border: 1px solid var(--kt-linev); border-radius: ${px(T.panelRadius)} !important; background: var(--kt-sf0) !important; color: var(--kt-on); box-shadow: var(--kt-shadow-2); }
.kt-translation-panel__body { min-width: 0; border-radius: 0 0 ${px(T.panelRadius)} ${px(T.panelRadius)}; background: var(--kt-sf0); overflow-x: hidden; word-break: break-word; scrollbar-width: thin; scrollbar-color: var(--kt-onv) var(--kt-sf0); }
.kt-translation-panel__body::-webkit-scrollbar { width: 10px; height: 10px; }
.kt-translation-panel__body::-webkit-scrollbar-track { background: var(--kt-sf0); }
.kt-translation-panel__body::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--kt-on) 24%, transparent); border-radius: 999px; border: 2px solid var(--kt-sf0); }
.kt-translation-panel__body::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--kt-on) 36%, transparent); }
.kt-translation-panel--embedded { border: 0; border-radius: 0 !important; box-shadow: none; }
.kt-translation-panel--embedded .kt-translation-panel__body { border-radius: 0; }
.kt-tranbox-header { min-height: ${px(T.panelHeaderHeight)}; display: flex; align-items: center; gap: ${px(T.space6)}; position: relative; padding: 7px 8px 7px 10px; border-bottom: 1px solid var(--kt-linev); border-radius: ${px(T.panelRadius)} ${px(T.panelRadius)} 0 0; background: var(--kt-sf0); color: var(--kt-on); }
.kt-tranbox-header__drag { display: flex; color: var(--kt-onv); cursor: move; }
.kt-tranbox-header__drag svg { width: 19px; height: 19px; }
.kt-tranbox-header__brand { min-width: 0; flex: 1; display: flex; align-items: center; gap: 7px; overflow: hidden; }
.kt-tranbox-header__logo { width: 22px; height: 22px; flex: none; display: grid; place-items: center; border-radius: 7px; background: var(--kt-sf1); }
.kt-tranbox-header__title { min-width: 0; overflow: hidden; color: var(--kt-onv); font-size: 11.5px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.kt-tranbox-header__actions { display: flex; flex: none; align-items: center; gap: 1px; }
.kt-tranbox-header .MuiIconButton-root { width: ${px(T.panelIconButtonSize)}; height: ${px(T.panelIconButtonSize)}; }
.kt-tranbox-header .MuiIconButton-root svg { width: 18px; height: 18px; }
.kt-tranbox-header--compact { flex: none; min-height: 0; padding: 8px 0; border: 0; border-radius: 0; }
.kt-tranbox-header--compact .MuiIconButton-root { width: 40px; height: 40px; }
.kt-tranbox-header .MuiIconButton-root[aria-pressed="true"] { background: var(--kt-pric); color: var(--kt-onpric); }
@media (hover: hover) {
  .kt-tranbox-header .MuiIconButton-root[aria-pressed="true"]:hover { background: color-mix(in srgb, var(--kt-onpric) 8%, var(--kt-pric)); }
}
.kt-tranbox-header .MuiIconButton-root[aria-pressed="true"].Mui-focusVisible,
.kt-tranbox-header .MuiIconButton-root[aria-pressed="true"]:active { background: color-mix(in srgb, var(--kt-onpric) 10%, var(--kt-pric)); }
.kt-tranbox-header__menu { box-sizing: border-box; min-width: min(206px, calc(100vw - 16px)); max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); display: flex; flex-direction: column; position: absolute; top: 48px; right: 42px; z-index: 4; overflow-x: hidden; overflow-y: auto; padding: 6px; border: 1px solid var(--kt-linev); border-radius: 4px; background: var(--kt-sf0); box-shadow: var(--kt-shadow-2); }
.kt-tranbox-header__menu button { min-height: 39px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 0 11px; border: 0; border-radius: 8px; background: transparent; color: var(--kt-on); cursor: pointer; font: inherit; font-size: 11.5px; text-align: left; }
.kt-tranbox-header__menu button[aria-checked="true"] { background: var(--kt-pric); color: var(--kt-onpric); }
.kt-tranbox-header__menu button:disabled { opacity: .5; cursor: default; }
@media (hover: hover) {
  .kt-tranbox-header__menu button:hover { background: var(--kt-pric); color: var(--kt-onpric); }
}
.kt-tranbox-header__menu svg { width: 18px; height: 18px; flex: none; }

.kt-tranbox-content { container-type: inline-size; container-name: kt-translation-content; padding: ${px(T.panelContentPadding)} !important; background: var(--kt-sf0) !important; color: var(--kt-on) !important; }
.kt-translation-config-row { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.kt-translation-config-row > .kt-translation-config { flex: 1; min-width: 0; }
.kt-translation-config-actions { display: flex; justify-content: flex-end; }
.kt-translation-config-actions .kt-tranbox-header--compact { padding: 0; }
.kt-translation-panel__body .MuiGrid-container { width: 100%; margin: 0; padding: 5px; border-radius: 12px; background: var(--kt-sf1); }
.kt-translation-panel__body .MuiGrid-item { padding: 5px !important; }
@container kt-translation-content (width < 420px) {
  .kt-translation-config > .kt-translation-config__service { flex-basis: 100%; max-width: 100%; }
  .kt-translation-config > .kt-translation-config__language { flex-basis: 50%; max-width: 50%; }
}
@container kt-translation-content (width < 480px) {
  .kt-translation-config-row .kt-translation-config__service { flex-basis: 100%; max-width: 100%; }
  .kt-translation-config-row .kt-translation-config__language { flex-basis: 50%; max-width: 50%; }
}
.kt-translation-panel__body .MuiFilledInput-root { border-radius: 12px; }
.kt-translation-panel__body .MuiInputLabel-root { font-size: 12px; }
.kt-translation-panel__body .MuiInputBase-input { font-size: 12.5px; }
.kt-translation-panel__body .MuiTabs-root { min-height: 40px; }
.kt-translation-panel__body .MuiTab-root { min-height: 32px; padding: 5px 13px; font-size: 11.5px; }
.kt-translation-panel__body .MuiFormHelperText-root { margin-inline: 8px; }
.kt-translation-panel__body .MuiAlert-root { border-radius: 12px; }
.kt-translation-panel__body .MuiCircularProgress-root { color: var(--kt-pri); }

`;

export const PANEL_BASE_STYLES = String.raw`
/* Lightweight Preact UI primitives (replace MUI) */
.kt-field { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kt-field--full { width: 100%; }
.kt-field__label { padding-inline: 2px; color: var(--kt-onv); font-size: 11px; line-height: 1.3; }
.kt-field__input { box-sizing: border-box; width: 100%; min-height: ${px(T.panelControlHeight)}; padding: 8px ${px(T.panelControlPaddingX)}; border: 1px solid var(--kt-linev); border-radius: ${px(T.panelControlRadius)}; outline: none; background: var(--kt-sf1); color: var(--kt-on); font: inherit; font-size: ${px(T.fontSizeControl)}; }
.kt-field__input:focus { border-color: var(--kt-pri); box-shadow: inset 0 0 0 1px var(--kt-pri); }
.kt-field__select { cursor: pointer; }
.kt-field textarea.kt-field__input { display: block; min-height: 40px; max-height: 260px; padding-inline-end: 38px; resize: none; line-height: 1.5; }
.kt-field.kt-height-locked .kt-field__input { height: 100%; }
.kt-field__helper { color: var(--kt-err); font-size: 11px; padding-inline: 4px; }
.kt-field__start { position: absolute; left: 10px; top: 50%; display: flex; transform: translateY(-50%); }
.kt-field:has(.kt-field__label) .kt-field__start { top: 22px; transform: none; }
.kt-field__start + .kt-field__input { padding-inline-start: 32px; }
/* End adornments position themselves against .kt-field; no wrapper context. */
.kt-resize-grip svg { position: absolute; right: 4px; bottom: 4px; opacity: .38; transform: scale(1); transition: opacity .2s cubic-bezier(.2, 0, 0, 1), transform .2s cubic-bezier(.2, 0, 0, 1); pointer-events: none; user-select: none; }
.kt-resize-grip:hover { color: var(--kt-on); }
.kt-resize-grip:hover svg { opacity: .9; transform: scale(1.08); }
.kt-resize-grip:active { color: var(--kt-pri); }
.kt-resize-grip:active svg { opacity: 1; transform: scale(.95); }
.kt-multiselect { position: relative; }
.kt-multiselect__control { width: 100%; min-height: ${px(T.panelControlHeight)}; padding: 8px ${px(T.panelControlPaddingX)}; border: 1px solid var(--kt-linev); border-radius: ${px(T.panelControlRadius)}; background: var(--kt-sf1); color: var(--kt-on); cursor: pointer; font: inherit; font-size: ${px(T.fontSizeControl)}; text-align: left; }
.kt-multiselect__control:focus-visible { outline: 2px solid var(--kt-pri); outline-offset: 1px; }
.kt-multiselect__menu { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 20; max-height: 240px; overflow: auto; padding: 5px; border: 1px solid var(--kt-linev); border-radius: 10px; background: var(--kt-sf0); box-shadow: var(--kt-shadow-2); }
.kt-multiselect__item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 7px; color: var(--kt-on); cursor: pointer; font-size: 12px; }
.kt-multiselect__item:hover { background: var(--kt-pric); color: var(--kt-onpric); }
.kt-multiselect__item input { accent-color: var(--kt-pri); }
.kt-icon-button.MuiIconButton-root { display: inline-grid; place-items: center; width: ${px(T.panelIconButtonSize)}; height: ${px(T.panelIconButtonSize)}; padding: 0; border: 0; border-radius: 999px; background: transparent; color: inherit; cursor: pointer; }
.kt-icon-button.MuiIconButton-root:hover { background: color-mix(in srgb, var(--kt-on) 8%, transparent); }
.kt-icon-button.MuiIconButton-root.Mui-disabled,
.kt-icon-button.MuiIconButton-root:disabled { opacity: .45; cursor: default; }
.kt-icon-button svg { width: 18px; height: 18px; }
.kt-spinner { display: inline-block; border: 2px solid color-mix(in srgb, var(--kt-pri) 30%, transparent); border-top-color: var(--kt-pri); border-radius: 50%; animation: kt-spin .7s linear infinite; }
@keyframes kt-spin { to { transform: rotate(360deg); } }
.kt-alert { padding: 10px ${px(T.panelControlPaddingX)}; border-radius: ${px(T.panelControlRadius)}; font-size: ${px(T.fontSizeBody)}; line-height: 1.5; }
.kt-alert--error { background: var(--kt-errc); color: var(--kt-onerrc); }
.kt-alert--info { background: var(--kt-sf2); color: var(--kt-on); }
.kt-translation-config { display: flex; flex-wrap: wrap; gap: ${px(T.space8)}; padding: ${px(T.space5)}; border-radius: ${px(T.panelControlRadius)}; background: var(--kt-sf1); }
.kt-translation-config__service { flex: 1 1 240px; min-width: 0; }
.kt-translation-config__language { flex: 1 1 140px; min-width: 0; }
.kt-playground-config__grid { display: flex; flex-wrap: wrap; gap: 8px; }
.kt-playground-config__service { flex: 1 1 220px; min-width: 0; }

`;
