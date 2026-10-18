export const SETTINGS_APP_CSS = String.raw`
:host .kiss-st-app {
  --st-bg: #f7f7f9;
  --st-panel: #ffffff;
  --st-text: #1b1b1f;
  --st-muted: #6b6b76;
  --st-border: #d9d9e3;
  --st-input: #ffffff;
  --st-accent: #0b57d0;
  --st-accent-text: #ffffff;
  --st-danger: #c62828;
  min-height: 100vh;
  box-sizing: border-box;
  background: var(--st-bg);
  color: var(--st-text);
  font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 0 24px 48px;
}
:host .kiss-st-app[data-theme="dark"] {
  --st-bg: #121316;
  --st-panel: #1d1f24;
  --st-text: #ececf1;
  --st-muted: #a1a1ad;
  --st-border: #34363d;
  --st-input: #25272d;
  --st-accent: #8ab4f8;
  --st-accent-text: #0b1b33;
  --st-danger: #ff8a80;
  color-scheme: dark;
}
:host .kiss-st-app * { box-sizing: border-box; }
:host .kiss-st-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 0 10px;
  max-width: 1040px;
  margin: 0 auto;
}
:host .kiss-st-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
:host .kiss-st-tabs {
  display: flex;
  gap: 6px;
  max-width: 1040px;
  margin: 0 auto 22px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--st-border);
  overflow-x: auto;
}
:host .kiss-st-tabs button {
  border: 0;
  background: transparent;
  color: var(--st-muted);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
}
:host .kiss-st-tabs button.active {
  background: var(--st-accent);
  color: var(--st-accent-text);
}
:host .kiss-st-main {
  max-width: 1040px;
  margin: 0 auto;
}
:host .kiss-st-section { margin-bottom: 26px; }
:host .kiss-st-section h2 {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--st-muted);
}
:host .kiss-st-card {
  background: var(--st-panel);
  border: 1px solid var(--st-border);
  border-radius: 14px;
  overflow: hidden;
}
:host .kiss-st-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--st-border);
}
:host .kiss-st-row:last-child { border-bottom: 0; }
:host .kiss-st-row__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  font-weight: 600;
}
:host .kiss-st-row__label small {
  font-weight: 400;
  color: var(--st-muted);
  font-size: 12px;
}
:host .kiss-st-row__control { flex: 0 0 auto; }
:host .kiss-st-input,
:host .kiss-st-select {
  min-width: 220px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--st-border);
  border-radius: 9px;
  background: var(--st-input);
  color: var(--st-text);
  font: inherit;
}
:host .kiss-st-number { min-width: 120px; width: 120px; }
:host .kiss-st-input:focus,
:host .kiss-st-select:focus {
  outline: 2px solid var(--st-accent);
  outline-offset: 1px;
}
:host .kiss-st-switch {
  position: relative;
  display: inline-flex;
  width: 46px;
  height: 26px;
  cursor: pointer;
}
:host .kiss-st-switch input { position: absolute; opacity: 0; }
:host .kiss-st-switch span {
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: var(--st-border);
  transition: background .15s ease;
}
:host .kiss-st-switch span::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform .15s ease;
  box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
}
:host .kiss-st-switch input:checked + span { background: var(--st-accent); }
:host .kiss-st-switch input:checked + span::after { transform: translateX(20px); }
:host .kiss-st-btn {
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--st-border);
  border-radius: 9px;
  background: var(--st-panel);
  color: var(--st-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
:host .kiss-st-btn:hover { border-color: var(--st-accent); }
:host .kiss-st-btn:disabled { opacity: .5; cursor: default; }
:host .kiss-st-btn--primary {
  background: var(--st-accent);
  border-color: var(--st-accent);
  color: var(--st-accent-text);
}
:host .kiss-st-btn--danger { color: var(--st-danger); }
:host .kiss-st-api {
  padding: 16px 18px;
  border-bottom: 1px solid var(--st-border);
}
:host .kiss-st-api:last-of-type { border-bottom: 0; }
:host .kiss-st-api__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
:host .kiss-st-badge {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--st-border);
  color: var(--st-muted);
  font-size: 11px;
  font-weight: 600;
}
:host .kiss-st-spacer { flex: 1; }
:host .kiss-st-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
:host .kiss-st-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--st-muted);
}
:host .kiss-st-grid .kiss-st-input { min-width: 0; width: 100%; }
:host .kiss-st-inline {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 12px;
}
:host .kiss-st-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--st-muted);
  font-size: 12px;
  cursor: pointer;
}
:host .kiss-st-hint {
  padding: 12px 18px;
  border-bottom: 1px solid var(--st-border);
  color: var(--st-muted);
  font-size: 12px;
}
:host .kiss-st-ok,
:host .kiss-st-error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
}
:host .kiss-st-ok { background: rgb(46 125 50 / 12%); color: #2e7d32; }
:host .kiss-st-error { background: rgb(198 40 40 / 12%); color: var(--st-danger); }
:host .kiss-st-loading {
  padding: 80px;
  text-align: center;
  color: var(--st-muted);
}
@media (max-width: 640px) {
  :host .kiss-st-app { padding: 0 12px 32px; }
  :host .kiss-st-row { flex-direction: column; align-items: stretch; gap: 8px; }
  :host .kiss-st-row__control { width: 100%; }
  :host .kiss-st-input,
  :host .kiss-st-select { width: 100%; min-width: 0; }
}
`;

export const SETTINGS_TEXTAREA_CSS = String.raw`
:host .kiss-st-textarea {
  width: 100%;
  min-height: 220px;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--st-border);
  border-radius: 9px;
  background: var(--st-input);
  color: var(--st-text);
  font: 12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace;
}
:host .kiss-st-textarea:focus {
  outline: 2px solid var(--st-accent);
  outline-offset: 1px;
}
`;
