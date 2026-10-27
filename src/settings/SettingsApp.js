import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSettingWithDefault, putSetting } from "../libs/storage";
import { apiTranslate } from "../apis";
import { fetchData } from "../libs/fetch";
import { parseJsonObj } from "../libs/utils";
import { getFestivalInfo } from "../libs/festivals";
import { createBuiltinInstance } from "../builtin-plugins";
import {
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
  DEFAULT_API_LIST,
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_STRANSLATE,
  OPT_TRANS_MTRAN,
  OPT_TRANS_LOCAL_TRANSLATOR,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
  PRESET_PROMPTS,
  PROMPT_CATEGORY_SUBTITLE,
  PROMPT_CATEGORY_SUMMARY,
  isPresetPromptSlug,
  getAllPrompts,
  getNobatchPromptOptions,
  isExternalApi,
  isTranslatorAPISupported,
  resolveApiPromptSettings,
} from "../config";
import {
  invokeExternalApi,
  DEFAULT_STRANSLATE_PORT,
  DEFAULT_STRANSLATE_TIMEOUT,
} from "../libs/externalTranslate";
import {
  DEFAULT_TOOLBAR_SETTING,
  normalizeToolbarMenuOrder,
  TOOLBAR_SEARCH_ENGINES,
  PASTE_TTL_DEFAULT,
  PASTE_TTL_MIN,
  PASTE_TTL_MAX,
} from "../config/toolbar";
import { setSettingsLanguage, t } from "./i18n";

let saveQueue = Promise.resolve();

function persist(next) {
  saveQueue = saveQueue
    .then(() => putSetting(next))
    .catch((error) => console.error("[kiss settings] save failed", error));
  return saveQueue;
}


const TABS = [
  ["general", "tabGeneral"],
  ["translation", "tabTranslation"],
  ["about", "tabAbout"],
];

function pathToTab(path) {
  if (!path) return "general";
  if (
    path.includes("api") ||
    path.includes("tranbox") ||
    path.includes("panel") ||
    path.includes("prompt")
  )
    return "translation";
  return "general";
}

function readScriptMeta() {
  const info = typeof GM_info !== "undefined" ? GM_info : globalThis.GM_info;
  const script = info?.script || {};
  const meta = script.meta || {};
  const raw = info?.scriptSource || info?.scriptMetaStr || "";
  const read = (key) => {
    const match = raw.match(new RegExp(`^\\s*//\\s*@${key}\\s+(.+)$`, "m"));
    return match ? match[1].trim() : "";
  };
  return {
    name: read("name") || script.name || "Text Selection Toolbar",
    version: read("version") || script.version || "",
    homepage: read("homepageURL") || script.homepage || meta.homepageURL || "",
    license: read("license") || script.license || meta.license || "",
    icon: read("icon") || script.icon || meta.icon || "",
  };
}

function Section({ title, children, footer, className = "" }) {
  return (
    <section className="kiss-st-section">
      <h2>{title}</h2>
      <div className={`kiss-st-card ${className}`.trim()}>{children}</div>
      {footer}
    </section>
  );
}

function Row({ label, help, warn, children }) {
  return (
    <div className="kiss-st-row">
      <div className="kiss-st-row__label">
        <span>{label}</span>
        {warn && <small className="kiss-st-warn">{warn}</small>}
        {help && <small>{help}</small>}
      </div>
      <div className="kiss-st-row__control">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  list,
  onFocus,
  onClick,
}) {
  return (
    <input
      className="kiss-st-input"
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      list={list}
      onFocus={onFocus}
      onClick={onClick}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberInput({ value, onChange, onBlur, min, max, placeholder, disabled }) {
  return (
    <input
      className="kiss-st-input kiss-st-number"
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value === "" ? "" : Number(event.target.value))
      }
      onBlur={(event) => onBlur?.(event.target.value)}
    />
  );
}

function TextArea({ value, onChange, rows = 4, placeholder }) {
  return (
    <textarea
      className="kiss-st-textarea"
      style={{ minHeight: 90, minWidth: 260, width: "100%" }}
      rows={rows}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Select({ value, onChange, options, disabled }) {
  return (
    <select
      className="kiss-st-select"
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ value, onChange }) {
  return (
    <label className="kiss-st-switch">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span />
    </label>
  );
}

const PRESET_API_TYPES = new Set([
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_STRANSLATE,
  OPT_TRANS_MTRAN,
  OPT_TRANS_LOCAL_TRANSLATOR,
  OPT_TRANS_OLLAMA,
]);

// Presets backed by a real upstream project get a home button in the header.
const API_HOMEPAGES = {
  [OPT_TRANS_STRANSLATE]: "https://github.com/STranslate/STranslate",
  [OPT_TRANS_MTRAN]: "https://github.com/xxnuo/MTranServer",
  [OPT_TRANS_LOCAL_TRANSLATOR]:
    "https://github.com/CodebyGPT/Local-Translator-for-Chromium",
};

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V42H39V18L24 6L9 18Z" />
      <path d="M19 29V42H29V29H19Z" />
      <path d="M9 42H39" />
    </svg>
  );
}

function Fields({ children }) {
  return <div className="kiss-st-grid">{children}</div>;
}

function RequestFields({ api, patch }) {
  return (
    <Fields>
      <label>
        {t("maxConcurrency")}
        <NumberInput
          value={api.fetchLimit}
          min={1}
          max={100}
          onChange={(v) => patch("fetchLimit", v)}
        />
      </label>
      <label>
        {t("requestInterval")}
        <NumberInput
          value={api.fetchInterval}
          min={0}
          max={5000}
          onChange={(v) => patch("fetchInterval", v)}
        />
      </label>
      <label>
        {t("requestTimeout")}
        <NumberInput
          value={api.httpTimeout}
          min={1}
          max={600}
          onChange={(v) => patch("httpTimeout", v)}
        />
      </label>
    </Fields>
  );
}

function ModelFields({ api, patch }) {
  return (
    <Fields>
      <label>
        {t("temperature")}
        <NumberInput
          value={api.temperature}
          min={0}
          max={2}
          placeholder="0.0-2.0"
          onChange={(v) => patch("temperature", v)}
        />
      </label>
      <label>
        {t("maxTokens")}
        <NumberInput
          value={api.maxTokens}
          min={0}
          max={100000}
          onChange={(v) => patch("maxTokens", v)}
        />
      </label>
      <label>
        {t("thinkingMode")}
        <Select
          value={api.thinkingMode || "disabled"}
          onChange={(v) => patch("thinkingMode", v)}
          options={[
            ["disabled", t("off")],
            ["auto", t("auto")],
            ["enabled", t("on")],
          ]}
        />
      </label>
    </Fields>
  );
}

function CodeFields({ api, patch }) {
  return (
    <div className="kiss-st-stack">
      <label>
        {t("customHeader")}
        <TextArea
          value={api.customHeader}
          placeholder={t("customHeaderPlaceholder")}
          onChange={(v) => patch("customHeader", v)}
        />
      </label>
      <label>
        {t("customBody")}
        <TextArea
          value={api.customBody}
          placeholder={t("customBodyPlaceholder")}
          onChange={(v) => patch("customBody", v)}
        />
      </label>
    </div>
  );
}

function PromptFields({ api, patch, prompts }) {
  const toOptions = (list) =>
    list.map((prompt) => [prompt.slug, prompt.name || prompt.slug]);

  return (
    <Fields>
      <label>
        {t("translationPrompt")}
        <Select
          value={api.nobatchPromptSlug}
          onChange={(v) => patch("nobatchPromptSlug", v)}
          options={toOptions(getNobatchPromptOptions(prompts))}
        />
      </label>
    </Fields>
  );
}

function extractModelIds(data) {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
        ? data.models
        : [];
  const ids = list
    .map((item) =>
      typeof item === "string" ? item : item?.id || item?.name || item?.model
    )
    .filter(Boolean);
  return [...new Set(ids)];
}

function ApiEditor({
  api,
  onChange,
  onDelete,
  canDelete,
  prompts = [],
}) {
  const [open, setOpen] = useState(false);
  const [test, setTest] = useState({ loading: false, text: "", error: "" });
  const [models, setModels] = useState([]);
  const [modelNote, setModelNote] = useState("");
  const [modelsOpen, setModelsOpen] = useState(false);
  const modelsUrlRef = useRef("");
  const testAbortRef = useRef(null);
  const patch = (key, value) => onChange({ ...api, [key]: value });

  useEffect(
    () => () => {
      testAbortRef.current?.abort();
      testAbortRef.current = null;
    },
    []
  );

  const loadModels = async () => {
    const url = (api.modelListUrl || "").trim();
    if (!url || modelsUrlRef.current === url) return;
    modelsUrlRef.current = url;
    setModelNote(t("fetchingModels"));
    try {
      const headers = {};
      const key = (api.key || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)[0];
      if (key) headers.Authorization = `Bearer ${key}`;
      Object.assign(headers, parseJsonObj(api.customHeader));
      const data = await fetchData(url, { headers });
      const ids = extractModelIds(data);
      setModels(ids);
      setModelNote(ids.length ? "" : t("noModelsFound"));
    } catch (error) {
      modelsUrlRef.current = "";
      setModels([]);
      setModelNote(t("fetchModelsFailed", { message: error.message }));
    }
  };

  const isTranslatorAPI = api.apiType === OPT_TRANS_TRANSLATOR_API;
  const isSTranslate = api.apiType === OPT_TRANS_STRANSLATE;
  const isMTran = api.apiType === OPT_TRANS_MTRAN;
  const isLocalTranslator = api.apiType === OPT_TRANS_LOCAL_TRANSLATOR;
  const isExternal = isExternalApi(api);
  const isPreset = PRESET_API_TYPES.has(api.apiType);
  const isCustom = api.apiType === OPT_TRANS_CUSTOMIZE;
  const isOllama = api.apiType === OPT_TRANS_OLLAMA;
  const homepage = API_HOMEPAGES[api.apiType];

  const runTest = async () => {
    if (isExternal) {
      setOpen(true);
      setTest({ loading: true, text: "", error: "" });
      try {
        await invokeExternalApi(api, "Hello, world!");
        setTest({ loading: false, text: t("sentToStranslate"), error: "" });
      } catch (error) {
        setTest({
          loading: false,
          text: "",
          error: error?.message || String(error),
        });
      }
      return;
    }

    if (testAbortRef.current) return;
    const controller = new AbortController();
    testAbortRef.current = controller;
    let timer = null;
    setOpen(true);
    setTest({ loading: true, text: "", error: "" });
    try {
      // 与正式翻译走同一套配置解析：补齐提示词并附带 provider 描述，
      // 否则测试会绕过 provider 的超时控制，在流不结束时永久挂起。
      const apiSetting = resolveApiPromptSettings({ ...api }, prompts);
      const result = await Promise.race([
        apiTranslate({
          text: "Hello, world!",
          fromLang: "auto",
          toLang: "zh-CN",
          apiSetting,
          usePool: false,
          signal: controller.signal,
        }),
        new Promise((_, reject) => {
          // 兜底超时：请求链路（尤其是 SSE 长连接）异常时也必须让按钮恢复。
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error(t("testTimeout")));
          }, 60000);
        }),
      ]);
      if (controller.signal.aborted) return;
      setTest({ loading: false, text: result.trText || "", error: "" });
    } catch (error) {
      setTest({
        loading: false,
        text: "",
        error: error?.message || String(error),
      });
    } finally {
      clearTimeout(timer);
      if (testAbortRef.current === controller) testAbortRef.current = null;
    }
  };

  const resetPreset = () => {
    const preset = DEFAULT_API_LIST.find((item) => item.apiType === api.apiType);
    onChange({
      ...createBuiltinInstance(
        api.apiType,
        api.apiSlug,
        preset?.apiName || api.apiType
      ),
      isDisabled: api.isDisabled,
    });
  };

  return (
    <div className="kiss-st-api">
      <div
        className="kiss-st-api__head"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <strong>{api.apiName || api.apiType}</strong>
        {isPreset && <span className="kiss-st-badge">{t("preset")}</span>}
        {isExternal && (
          <span className="kiss-st-badge kiss-st-badge--external">{t("external")}</span>
        )}
        {isCustom && <span className="kiss-st-badge">{t("custom")}</span>}
        <span className="kiss-st-spacer" />
        <span className="kiss-st-chev">{t("expandCollapse")}</span>
        {homepage && (
          <a
            className="kiss-st-btn kiss-st-btn--icon"
            href={homepage}
            target="_blank"
            rel="noreferrer"
            title={t("openHomepage")}
            aria-label={t("openHomepage")}
            onClick={(event) => event.stopPropagation()}
          >
            <HomeIcon />
          </a>
        )}
        <button
          className="kiss-st-btn"
          onClick={(event) => {
            event.stopPropagation();
            runTest();
          }}
          disabled={test.loading}
        >
          {test.loading ? t("testLoading") : t("testApi")}
        </button>
        <span
          onClick={(event) => event.stopPropagation()}
          style={{ display: "inline-flex" }}
        >
          <Toggle
            value={!api.isDisabled}
            onChange={(enabled) => patch("isDisabled", !enabled)}
          />
        </span>
        {isPreset && (
          <button
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              resetPreset();
            }}
          >
            {t("reset")}
          </button>
        )}
        {canDelete && (
          <button
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            {t("delete")}
          </button>
        )}
      </div>

      {open && (
        <div className="kiss-st-stack">
          {test.text && <div className="kiss-st-ok">✓ {test.text}</div>}
          {test.error && <div className="kiss-st-error">{test.error}</div>}
          <Fields>
            {!isPreset && (
              <label>
                {t("name")}
                <TextInput
                  value={api.apiName}
                  onChange={(v) => patch("apiName", v)}
                />
              </label>
            )}
            {isSTranslate && (
              <label>
                {t("port")}
                <NumberInput
                  value={api.port ?? DEFAULT_STRANSLATE_PORT}
                  min={1}
                  max={65535}
                  onChange={(v) => patch("port", v)}
                />
              </label>
            )}
            {(isSTranslate || isMTran || isLocalTranslator) && (
              <label>
                {t("requestTimeout")}
                <NumberInput
                  value={
                    api.httpTimeout ??
                    (isSTranslate ? DEFAULT_STRANSLATE_TIMEOUT : 30)
                  }
                  min={1}
                  max={600}
                  onChange={(v) => patch("httpTimeout", v)}
                />
              </label>
            )}
            {(isCustom || isOllama || isMTran) && (
              <>
                <label>
                  URL
                  <TextInput
                    value={api.url}
                    placeholder={
                      isMTran
                        ? "http://127.0.0.1:8989/kiss"
                        : "http://localhost:port/v1/chat/completions"
                    }
                    onChange={(v) => patch("url", v)}
                  />
                </label>
                <label>
                  Key
                  <TextInput
                    value={api.key}
                    type="password"
                    placeholder={
                      isMTran
                        ? t("mtranKeyPlaceholder")
                        : t("keyPlaceholder")
                    }
                    onChange={(v) => patch("key", v)}
                  />
                </label>
              </>
            )}
            {(isCustom || isOllama) && (
              <>
                <label>
                  {t("modelListUrl")}
                  <TextInput
                    value={api.modelListUrl}
                    placeholder="http://localhost:port/v1/models"
                    onChange={(v) => patch("modelListUrl", v)}
                  />
                </label>
                <label>
                  {t("model")}
                  <div
                    className="kiss-st-combo"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setModelsOpen(false);
                      }
                    }}
                  >
                    <TextInput
                      value={api.model}
                      onFocus={() => {
                        loadModels();
                        setModelsOpen(true);
                      }}
                      onClick={() => {
                        loadModels();
                        setModelsOpen(true);
                      }}
                      onChange={(v) => patch("model", v)}
                    />
                    {modelsOpen && models.length > 0 && (
                      <div className="kiss-st-combo__list" role="listbox">
                        {models.map((model) => (
                          <button
                            type="button"
                            key={model}
                            role="option"
                            aria-selected={model === api.model}
                            className="kiss-st-combo__item"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              patch("model", model);
                              setModelsOpen(false);
                            }}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {modelNote && <small>{modelNote}</small>}
                </label>
              </>
            )}
          </Fields>

          {!isExternal && !isMTran && !isLocalTranslator && (
            <RequestFields api={api} patch={patch} />
          )}
          {!isTranslatorAPI && !isExternal && !isMTran && !isLocalTranslator && (
            <ModelFields api={api} patch={patch} />
          )}
          {!isTranslatorAPI && !isExternal && !isMTran && !isLocalTranslator && (
            <PromptFields api={api} patch={patch} prompts={prompts} />
          )}
          {(isCustom || isOllama) && <CodeFields api={api} patch={patch} />}

        </div>
      )}
    </div>
  );
}

function GeneralTab({ setting, update }) {
  // The toolbar keeps its own language key; keep it in step with the global one
  // so there is a single "interface language" switch.
  const setUiLang = (v) => {
    const toolbarLang = v === "zh" ? "zh-CN" : v;
    update({
      uiLang: v,
      toolbarSetting: {
        ...DEFAULT_TOOLBAR_SETTING,
        ...(setting.toolbarSetting || {}),
        language: toolbarLang,
      },
    });
  };

  return (
    <>
      <div className="kiss-st-card">
        <Row label={t("uiLanguage")}>
          <Select
            value={setting.uiLang}
            onChange={setUiLang}
            options={[
              ["auto", t("followSystem")],
              ["zh", t("simplifiedChinese")],
              ["en", "English"],
              ["ru", "Русский"],
            ]}
          />
        </Row>
        <Row label={t("interfaceTheme")}>
          <Select
            value={setting.darkMode}
            onChange={(v) => update({ darkMode: v })}
            options={[
              ["auto", t("followSystem")],
              ["light", t("light")],
              ["dark", t("dark")],
            ]}
          />
        </Row>
      </div>
      <ToolbarTab setting={setting} update={update} />
    </>
  );
}

function ApisTab({ setting, update }) {
  const apis = setting.transApis || [];
  const prompts = getAllPrompts(setting.prompts);
  // Browser translation needs Chromium 138+; hide the preset elsewhere.
  const visible = apis
    .map((api, index) => ({ api, index }))
    .filter(
      ({ api }) => api.apiType !== OPT_TRANS_TRANSLATOR_API || isTranslatorAPISupported()
    );
  const updateApi = (index, next) =>
    update({
      transApis: apis.map((api, i) => (i === index ? next : api)),
    });

  // Custom endpoints are added on demand; fresh installs only ship presets.
  const addCustom = () => {
    const used = new Set(apis.map((api) => api.apiSlug));
    let n = 1;
    while (used.has(`Custom-${n}`)) n += 1;
    const api = createBuiltinInstance(
      "Custom",
      `Custom-${n}`,
      t("customApiName", { n })
    );
    update({ transApis: [...apis, api] });
  };
  const removeApi = (index) =>
    update({ transApis: apis.filter((_, i) => i !== index) });

  return (
    <Section
      title={t("translationApi")}
      footer={
        <div className="kiss-st-inline">
          <button className="kiss-st-btn kiss-st-btn--primary" onClick={addCustom}>
            {t("addCustomApi")}
          </button>
        </div>
      }
    >
      {visible.map(({ api, index }) => (
        <ApiEditor
          key={api.apiSlug}
          api={api}
          prompts={prompts}
          onChange={(next) => updateApi(index, next)}
          onDelete={() => removeApi(index)}
          canDelete={api.apiType === OPT_TRANS_CUSTOMIZE}
        />
      ))}
    </Section>
  );
}

function legacySearchEngine(value) {
  const preset = TOOLBAR_SEARCH_ENGINES[value.searchEngine];
  if (preset) return { ...preset };
  if (typeof value.searchEngine === "string" && value.searchEngine.includes("%s")) {
    return { name: "Custom", url: value.searchEngine };
  }
  return { ...TOOLBAR_SEARCH_ENGINES.baidu };
}

function SearchEngineRow({ engine, index, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const presets = Object.entries(TOOLBAR_SEARCH_ENGINES);

  return (
    <Row label={t("searchEngineN", { index: index + 1 })}>
      <div className="kiss-st-inline">
        <div
          className="kiss-st-combo"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
          }}
        >
          <TextInput
            value={engine.name}
            placeholder={t("searchEngineName")}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(v) => {
              setOpen(true);
              onChange({ ...engine, name: v });
            }}
          />
          {open && (
            <div className="kiss-st-combo__list" role="listbox">
              {presets.map(([key, preset]) => (
                <button
                  type="button"
                  key={key}
                  role="option"
                  aria-selected={engine.name === preset.name}
                  className="kiss-st-combo__item"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange({ name: preset.name, url: preset.url });
                    setOpen(false);
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <TextInput
          value={engine.url}
          placeholder={t("searchKeywordPlaceholder")}
          onChange={(v) => onChange({ ...engine, url: v })}
        />
        {index > 0 && (
          <button
            type="button"
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={onRemove}
          >
            {t("delete")}
          </button>
        )}
      </div>
    </Row>
  );
}

// Keys the super-selection hotkey can listen for; codes keep left and right apart.
const UNLOCK_HOTKEY_OPTIONS = [
  ["ControlLeft", "hotkeyCtrlLeft"],
  ["ControlRight", "hotkeyCtrlRight"],
  ["AltLeft", "hotkeyAltLeft"],
  ["AltRight", "hotkeyAltRight"],
  ["ShiftLeft", "hotkeyShiftLeft"],
  ["ShiftRight", "hotkeyShiftRight"],
  ["MetaLeft", "hotkeyMetaLeft"],
  ["MetaRight", "hotkeyMetaRight"],
];

const TOOLBAR_MENU_LABELS = {
  translate: "menuTranslate",
  block: "menuBlock",
  settings: "menuSettings",
};

const TOOLBAR_MENU_TOGGLES = {
  translate: "showTranslateMenu",
  block: "showBlockMenu",
};

function MenuManagementSection({ value, patch, hasBlockRules }) {
  const order = normalizeToolbarMenuOrder(value.menuOrder);

  const moveMenu = (id, delta) => {
    const index = order.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = order.slice();
    next.splice(index, 1);
    next.splice(target, 0, id);
    patch({ menuOrder: next });
  };

  return (
    <Section title={t("menuManagement")}>
      {order.map((id, index) => {
        const toggleKey = TOOLBAR_MENU_TOGGLES[id];
        const enabled = !toggleKey || value[toggleKey] !== false;
        return (
          <Row
            key={id}
            label={t(TOOLBAR_MENU_LABELS[id])}
            warn={
              id === "block" && hasBlockRules && !enabled
                ? t("blockMenuWarning")
                : null
            }
            help={id === "block" ? t("menuBlockHelp") : null}
          >
            <div className="kiss-st-inline">
              {toggleKey && (
                <Toggle
                  value={enabled}
                  onChange={(next) => patch({ [toggleKey]: next })}
                />
              )}
              <button
                type="button"
                className="kiss-st-btn kiss-st-btn--icon"
                title={t("moveUp")}
                aria-label={t("moveUp")}
                disabled={index === 0}
                onClick={() => moveMenu(id, -1)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 15 6-6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="kiss-st-btn kiss-st-btn--icon"
                title={t("moveDown")}
                aria-label={t("moveDown")}
                disabled={index === order.length - 1}
                onClick={() => moveMenu(id, 1)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </Row>
        );
      })}
    </Section>
  );
}

function ToolbarTab({ setting, update }) {
  const value = { ...DEFAULT_TOOLBAR_SETTING, ...(setting.toolbarSetting || {}) };
  const patch = (changes) =>
    update({ toolbarSetting: { ...value, ...changes } });
  const engines =
    Array.isArray(value.searchEngines) && value.searchEngines.length > 0
      ? value.searchEngines
      : [legacySearchEngine(value)];
  const updateEngines = (next) => patch({ searchEngines: next.slice(0, 8) });
  // Saved block rules live in the same toolbar settings object.
  const hasBlockRules = Object.values(value.blocked_elements || {}).some(
    (selectors) => Array.isArray(selectors) && selectors.length > 0
  );

  return (
    <>
      <Section title={t("toolbarAppearance")}>
        <Row label={t("offset")} help={t("offsetHelp")}>
          <NumberInput
            value={value.offset}
            min={0}
            max={200}
            onChange={(v) => patch({ offset: v })}
          />
        </Row>
        <Row label={t("displayTime")} help={t("neverAutoHide")}>
          <NumberInput
            value={value.timeout}
            min={0}
            max={60000}
            onChange={(v) => patch({ timeout: v })}
          />
        </Row>
        <Row label={t("buttonLayout")}>
          <Select
            value={value.buttonStyle}
            onChange={(v) => patch({ buttonStyle: v })}
            options={[
              ["row", t("horizontalCapsule")],
              ["col", t("verticalMenu")],
            ]}
          />
        </Row>
        <Row label={t("onScroll")}>
          <Select
            value={value.scrollRepaintMode}
            onChange={(v) => patch({ scrollRepaintMode: v })}
            options={[
              ["always", t("repaintWithSelection")],
              ["viewport", t("repaintViewport")],
              ["hide", t("hideOnScroll")],
            ]}
          />
        </Row>
        <Row label={t("forceLightButtons")}>
          <Toggle
            value={value.forceWhiteBlack}
            onChange={(v) => patch({ forceWhiteBlack: v })}
          />
        </Row>
        <Row label={t("showPendingPaste")}>
          <Toggle
            value={value.showPastePreview}
            onChange={(v) => patch({ showPastePreview: v })}
          />
        </Row>
      </Section>

      <Section title={t("featureSwitches")}>
        <Row label={t("showTranslateButton")}>
          <Toggle
            value={value.enableTranslate !== false}
            onChange={(v) => patch({ enableTranslate: v })}
          />
        </Row>
        <Row
          label={t("translateHideThreshold")}
          help={t("translateHideThresholdHelp")}
        >
          <Select
            value={value.translateHideThreshold ?? 15}
            disabled={value.enableTranslate === false}
            onChange={(v) => patch({ translateHideThreshold: Number(v) })}
            options={[
              [15, "15%"],
              [35, "35%"],
              [55, "55%"],
              [75, "75%"],
            ]}
          />
        </Row>
        <Row label={t("detectHiddenLinks")}>
          <Toggle
            value={value.enableHiddenLinks}
            onChange={(v) => patch({ enableHiddenLinks: v })}
          />
        </Row>
        <Row label={t("smartPaste")} help={t("smartPasteHelp")}>
          <Toggle
            value={value.enablePaste}
            onChange={(v) => patch({ enablePaste: v })}
          />
        </Row>
        <Row label={t("pasteTtl")}>
          <NumberInput
            value={value.pasteTtl ?? PASTE_TTL_DEFAULT}
            min={PASTE_TTL_MIN}
            max={PASTE_TTL_MAX}
            placeholder="3-30"
            disabled={value.enablePaste === false}
            onChange={(v) => patch({ pasteTtl: v })}
            onBlur={(raw) => {
              const seconds = Number(raw);
              patch({
                pasteTtl:
                  Number.isInteger(seconds) &&
                  seconds >= PASTE_TTL_MIN &&
                  seconds <= PASTE_TTL_MAX
                    ? seconds
                    : PASTE_TTL_DEFAULT,
              });
            }}
          />
        </Row>
        <Row label={t("safeCopyAlarm")} help={t("safeCopyAlarmHelp")}>
          <Toggle
            value={value.enableSafeCopyAlarm === true}
            onChange={(v) => patch({ enableSafeCopyAlarm: v })}
          />
        </Row>
        <Row label={t("safeCopyLinkScope")} help={t("safeCopyLinkScopeHelp")}>
          <Select
            value={value.safeCopyLinkScope ?? "domain"}
            onChange={(v) => patch({ safeCopyLinkScope: v })}
            options={[
              ["domain", t("safeCopyScopeDomain")],
              ["sld", t("safeCopyScopeSld")],
              ["full", t("safeCopyScopeFull")],
              ["off", t("safeCopyScopeOff")],
            ]}
          />
        </Row>
        <Row label={t("linkDragPreview")}>
          <Toggle
            value={value.enableDragPreview}
            onChange={(v) => patch({ enableDragPreview: v })}
          />
        </Row>
        <Row label={t("unlockHotkey")} help={t("unlockHotkeyHelp")}>
          <Select
            value={value.unlockHotkey ?? ""}
            onChange={(v) => patch({ unlockHotkey: v })}
            options={[
              ...UNLOCK_HOTKEY_OPTIONS.map(([code, key]) => [code, t(key)]),
              // Keep a hand-typed value from an older build selectable.
              ...(value.unlockHotkey &&
              !UNLOCK_HOTKEY_OPTIONS.some(
                ([code]) => code === value.unlockHotkey
              )
                ? [[value.unlockHotkey, value.unlockHotkey]]
                : []),
              ["", t("hotkeyDisabled")],
            ]}
          />
        </Row>
      </Section>

      <MenuManagementSection
        value={value}
        patch={patch}
        hasBlockRules={hasBlockRules}
      />

      <Section title={t("search")} className="kiss-st-card--overflow">
        {engines.map((engine, index) => (
          <SearchEngineRow
            key={index}
            engine={engine}
            index={index}
            onChange={(next) => {
              const list = engines.slice();
              list[index] = next;
              updateEngines(list);
            }}
            onRemove={() => {
              updateEngines(engines.filter((_, i) => i !== index));
            }}
          />
        ))}
      </Section>
      <div className="kiss-st-inline kiss-st-search-actions">
        <button
          type="button"
          className="kiss-st-btn kiss-st-btn--primary"
          disabled={engines.length >= 8}
          onClick={() => updateEngines([...engines, { name: "", url: "" }])}
        >
          {t("addSearchEngine")}
        </button>
        {engines.length >= 8 && <small>{t("maxSearchEngines")}</small>}
      </div>
    </>
  );
}

function PanelTab({ setting, update }) {
  const panel = setting.tranboxSetting || {};
  const updatePanel = (patch) =>
    update({ tranboxSetting: { ...panel, ...patch } });
  const apis = (setting.transApis || []).filter(
    (api) =>
      !api.isDisabled &&
      (api.apiType !== OPT_TRANS_TRANSLATOR_API || isTranslatorAPISupported())
  );
  const storedApiSlugs = Array.isArray(panel.apiSlugs) ? panel.apiSlugs : [];
  const validStoredApiSlugs = storedApiSlugs.filter((slug) =>
    apis.some((api) => api.apiSlug === slug)
  );
  // Keep a non-external service as the implicit default; external services
  // such as STranslate must be chosen explicitly in this single-select.
  const fallbackApi = apis.find((api) => !isExternalApi(api)) || apis[0];
  const selectedApiSlug = validStoredApiSlugs[0] || fallbackApi?.apiSlug;

  // The old default points at TranslatorAPI, which is unavailable in browsers
  // without the built-in translation API. Persist the effective fallback so
  // the panel and this single-select never disagree about the chosen service.
  useEffect(() => {
    if (validStoredApiSlugs.length || !selectedApiSlug) return;
    updatePanel({ apiSlugs: [selectedApiSlug] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApiSlug, validStoredApiSlugs.length]);

  return (
    <Section title={t("menuTranslate")}>
      <Row label={t("sourceLang")}>
        <Select
          value={panel.fromLang || "auto"}
          onChange={(v) => updatePanel({ fromLang: v })}
          options={[["auto", t("autoDetect")], ...OPT_LANGS_FROM]}
        />
      </Row>
      <Row label={t("targetLang")}>
        <Select
          value={panel.toLang || "zh-CN"}
          onChange={(v) => updatePanel({ toLang: v })}
          options={OPT_LANGS_TO}
        />
      </Row>
      <Row label={t("secondTargetLang")} help={t("reverseTranslation")}>
        <Select
          value={panel.toLang2 || "en"}
          onChange={(v) => updatePanel({ toLang2: v })}
          options={OPT_LANGS_TO}
        />
      </Row>
      <Row
        label={t("translationApi")}
        help={t("panelApiHelp")}
      >
        <Select
          value={selectedApiSlug}
          onChange={(v) => updatePanel({ apiSlugs: [v] })}
          options={apis.map((api) => [
            api.apiSlug,
            `${api.apiName || api.apiType}${isExternalApi(api) ? ` (${t("external")})` : ""}`,
          ])}
        />
      </Row>
      <Row label={t("minimalStyle")}>
        <Toggle
          value={panel.simpleStyle}
          onChange={(v) => updatePanel({ simpleStyle: v })}
        />
      </Row>
      <Row label={t("hideOnBlur")}>
        <Toggle
          value={panel.hideClickAway}
          onChange={(v) => updatePanel({ hideClickAway: v })}
        />
      </Row>
      <Row label={t("followSelection")}>
        <Toggle
          value={panel.followSelection}
          onChange={(v) => updatePanel({ followSelection: v })}
        />
      </Row>
    </Section>
  );
}

function PromptRow({ prompt, isPreset, onPatch, onReset, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="kiss-st-api">
      <div
        className="kiss-st-api__head"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <strong>{prompt.name || prompt.slug}</strong>
        {isPreset && <span className="kiss-st-badge">{t("preset")}</span>}
        <span className="kiss-st-spacer" />
        <span className="kiss-st-chev">{t("expandCollapse")}</span>
        {isPreset ? (
          <button
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              onReset();
            }}
          >
            {t("reset")}
          </button>
        ) : (
          <button
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            {t("delete")}
          </button>
        )}
      </div>

      {open && (
        <div className="kiss-st-stack">
          <label>
            {t("name")}
            <TextInput
              value={prompt.name}
              onChange={(v) => onPatch({ name: v })}
            />
          </label>
          <label>
            {t("systemPrompt")}
            <TextArea
              value={prompt.systemPrompt}
              onChange={(v) => onPatch({ systemPrompt: v })}
            />
          </label>
          <label>
            {t("userPrompt")}
            <TextArea
              value={prompt.userPrompt}
              onChange={(v) => onPatch({ userPrompt: v })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function PromptsSection({ setting, update }) {
  const stored = setting.prompts || [];
  const overrides = new Map(
    stored
      .filter((prompt) => isPresetPromptSlug(prompt.slug))
      .map((prompt) => [prompt.slug, prompt])
  );
  const customPrompts = stored.filter(
    (prompt) => !isPresetPromptSlug(prompt.slug)
  );
  // Subtitle/summary prompts belonged to the removed subtitle feature.
  const presetPrompts = PRESET_PROMPTS.filter(
    (prompt) =>
      prompt.category !== PROMPT_CATEGORY_SUBTITLE &&
      prompt.category !== PROMPT_CATEGORY_SUMMARY
  );

  const upsert = (prompt, changes) => {
    const next = { ...prompt, ...changes };
    const exists = stored.some((item) => item.slug === prompt.slug);
    update({
      prompts: exists
        ? stored.map((item) => (item.slug === prompt.slug ? next : item))
        : [...stored, next],
    });
  };
  const resetPreset = (slug) =>
    update({ prompts: stored.filter((item) => item.slug !== slug) });
  const removeCustom = (slug) =>
    update({ prompts: stored.filter((item) => item.slug !== slug) });
  const add = () =>
    update({
      prompts: [
        ...stored,
        {
          slug: `custom-${Date.now()}`,
          name: t("customPromptName", {
            n: customPrompts.length + 1,
          }),
          category: "custom",
          systemPrompt: "",
          userPrompt: "",
        },
      ],
    });

  return (
    <Section
      title={t("promptManagement")}
      footer={
        <div className="kiss-st-inline">
          <button className="kiss-st-btn kiss-st-btn--primary" onClick={add}>
            {t("addCustomPrompt")}
          </button>
        </div>
      }
    >
      {presetPrompts.map((preset) => {
        const override = overrides.get(preset.slug);
        return (
          <PromptRow
            key={preset.slug}
            isPreset
            prompt={{ ...preset, ...(override || {}) }}
            onPatch={(changes) => upsert(preset, changes)}
            onReset={() => resetPreset(preset.slug)}
          />
        );
      })}
      {customPrompts.map((prompt) => (
        <PromptRow
          key={prompt.slug}
          prompt={prompt}
          onPatch={(changes) => upsert(prompt, changes)}
          onDelete={() => removeCustom(prompt.slug)}
        />
      ))}
    </Section>
  );
}

function TranslationTab({ setting, update }) {
  return (
    <>
      <ApisTab setting={setting} update={update} />
      <PromptsSection setting={setting} update={update} />
      <PanelTab setting={setting} update={update} />
    </>
  );
}

function AboutTab({ setting, update }) {
  const meta = readScriptMeta();
  const value = { ...DEFAULT_TOOLBAR_SETTING, ...(setting.toolbarSetting || {}) };
  const patch = (changes) =>
    update({ toolbarSetting: { ...value, ...changes } });
  // The festival toggle is only meaningful on a festival day.
  const festivalInfo = useMemo(() => getFestivalInfo(), []);
  const aboutTitle = festivalInfo
    ? `${meta.name} - ${t("todayIsFestival", {
        festival: festivalInfo.name,
      })}`
    : meta.name;

  return (
    <Section title={t("tabAbout")}>
      <div className="kiss-st-about">
        {meta.icon && (
          <img className="kiss-st-about__icon" src={meta.icon} alt="" />
        )}
        <div className="kiss-st-about__meta">
          <strong>{aboutTitle}</strong>
        </div>
      </div>
      <Row label={t("version")}>{meta.version || "—"}</Row>
      <Row label={t("homepage")}>
        {meta.homepage ? (
          <a href={meta.homepage} target="_blank" rel="noreferrer">
            {meta.homepage}
          </a>
        ) : (
          "—"
        )}
      </Row>
      <Row label={t("license")}>{meta.license || "—"}</Row>
      {festivalInfo && (
        <Row
          label={t("disableFestival")}
          help={t("disableFestivalHelp")}
        >
          <Toggle
            value={value.disableFestivalEffect === true}
            onChange={(v) => patch({ disableFestivalEffect: v })}
          />
        </Row>
      )}
    </Section>
  );
}

export default function SettingsApp({ initialPath = "/", onClose }) {
  const [tab, setTab] = useState(() => pathToTab(initialPath));
  const [setting, setSetting] = useState(null);
  // Keep the module-level translator in sync before rendering descendants.
  setSettingsLanguage(setting?.uiLang || "auto");
  const themeRef = useRef(null);
  const meta = useMemo(readScriptMeta, []);

  useEffect(() => {
    let active = true;
    getSettingWithDefault().then((value) => {
      if (active) setSetting(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = (patch) => {
    setSetting((previous) => {
      const next = { ...previous, ...patch };
      persist(next);
      return next;
    });
  };

  if (!setting) {
    return <div className="kiss-st-loading">{t("loadingSettings")}</div>;
  }

  return (
    <div className="kiss-st-app" ref={themeRef}>
        <header className="kiss-st-header">
          {meta.icon && (
            <img className="kiss-st-logo" src={meta.icon} alt="" />
          )}
          <h1>{t("appTitle")}</h1>
          <button
            className="kiss-st-close"
            type="button"
            title={t("closeSettings")}
            aria-label={t("closeSettings")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <nav className="kiss-st-tabs">
          {TABS.map(([key, labelKey]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>
        <main className="kiss-st-main">
          {tab === "general" && (
            <GeneralTab setting={setting} update={update} />
          )}
          {tab === "translation" && (
            <TranslationTab setting={setting} update={update} />
          )}
          {tab === "about" && (
            <AboutTab setting={setting} update={update} />
          )}
        </main>
      </div>
  );
}
