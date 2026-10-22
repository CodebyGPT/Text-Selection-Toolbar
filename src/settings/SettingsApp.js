import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getSettingWithDefault,
  putSetting,
  getRulesWithDefault,
  setRules as saveRulesToStorage,
} from "../libs/storage";
import { apiTranslate } from "../apis";
import { fetchData } from "../libs/fetch";
import { parseJsonObj } from "../libs/utils";
import { getFestivalInfo } from "../libs/festivals";
import { createBuiltinInstance } from "../builtin-plugins";
import {
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
  OPT_INPUT_TRANS_SIGNS,
  OPT_INPUT_DOT_DISABLE,
  OPT_INPUT_DOT_MOBILE,
  OPT_INPUT_DOT_ALWAYS,
  OPT_MOUSE_HOVER_DISPLAY_BILINGUAL,
  OPT_MOUSE_HOVER_DISPLAY_BUBBLE,
  OPT_MOUSE_HOVER_TRANS_PARAGRAPH,
  OPT_MOUSE_HOVER_TRANS_REGION,
  OPT_MOUSE_HOVER_TRANS_AREA,
  OPT_MOUSE_HOVER_TRANS_DISPLAY_INLINE,
  OPT_MOUSE_HOVER_TRANS_DISPLAY_BLOCK,
  OPT_ENHANCE_ON,
  OPT_ENHANCE_OFF,
  OPT_ENHANCE_MOBILE_OFF,
  GLOBAL_KEY,
  GLOBLA_RULE,
  DEFAULT_RULE,
  DEFAULT_API_LIST,
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_CUSTOMIZE,
  BUILTIN_PLACEHOLDERS,
  BUILTIN_PLACETAGS,
  PRESET_PROMPTS,
  isPresetPromptSlug,
  getAllPrompts,
  getBatchPromptOptions,
  getNobatchPromptOptions,
  getSubtitlePromptOptions,
  isTranslatorAPISupported,
  resolveApiPromptSettings,
} from "../config";
import {
  DEFAULT_TOOLBAR_SETTING,
  TOOLBAR_SEARCH_ENGINES,
  PASTE_TTL_DEFAULT,
  PASTE_TTL_MIN,
  PASTE_TTL_MAX,
} from "../config/toolbar";
import { translateDom } from "./translate";

let saveQueue = Promise.resolve();

function persist(next) {
  saveQueue = saveQueue
    .then(() => putSetting(next))
    .catch((error) => console.error("[kiss settings] save failed", error));
  return saveQueue;
}

const TABS = [
  ["general", "通用"],
  ["translation", "翻译"],
  ["about", "关于"],
];

function pathToTab(path) {
  if (!path) return "general";
  if (
    path.includes("api") ||
    path.includes("tranbox") ||
    path.includes("panel") ||
    path.includes("input") ||
    path.includes("mousehover") ||
    path.includes("subtitle") ||
    path.includes("rules")
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

const PRESET_API_TYPES = new Set([OPT_TRANS_TRANSLATOR_API, OPT_TRANS_OLLAMA]);

function Fields({ children }) {
  return <div className="kiss-st-grid">{children}</div>;
}

function RuntimeFields({ api, patch }) {
  const autoTranslate = api.transAllnow === true;

  return (
    <Fields>
      <label>
        触发方式
        <Select
          value={String(api.transAllnow === true)}
          onChange={(v) => patch("transAllnow", v === "true")}
          options={[
            ["false", "滚动到才翻译"],
            ["true", "打开页面即翻译"],
          ]}
        />
      </label>
      <label>
        滚动加载提前触发 (px)
        <NumberInput
          value={api.rootMargin}
          min={0}
          max={10000}
          disabled={autoTranslate}
          onChange={(v) => patch("rootMargin", v)}
        />
      </label>
      <label>
        占位符
        <Select
          value={api.placeholder}
          onChange={(v) => patch("placeholder", v)}
          options={BUILTIN_PLACEHOLDERS.map((item) => [item, item])}
        />
      </label>
      <label>
        占位标签
        <Select
          value={api.placetag}
          onChange={(v) => patch("placetag", v)}
          options={BUILTIN_PLACETAGS.map((item) => [item, `<${item}>`])}
        />
      </label>
      <label>
        占位符格式
        <Select
          value={api.placetagFormat}
          onChange={(v) => patch("placetagFormat", v)}
          options={[
            ["compact", "简洁格式 <a1>"],
            ["attribute", "属性格式 <a i=1>"],
          ]}
        />
      </label>
    </Fields>
  );
}

function RequestFields({ api, patch }) {
  return (
    <Fields>
      <label>
        最大并发请求数量
        <NumberInput
          value={api.fetchLimit}
          min={1}
          max={100}
          onChange={(v) => patch("fetchLimit", v)}
        />
      </label>
      <label>
        每次请求间隔 (ms)
        <NumberInput
          value={api.fetchInterval}
          min={0}
          max={5000}
          onChange={(v) => patch("fetchInterval", v)}
        />
      </label>
      <label>
        请求超时时间 (s)
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

function BatchFields({ api, patch }) {
  const batchOff = !api.useBatchFetch;

  return (
    <Fields>
      <label>
        聚合发送翻译请求
        <Select
          value={String(Boolean(api.useBatchFetch))}
          onChange={(v) => patch("useBatchFetch", v === "true")}
          options={[
            ["true", "启用"],
            ["false", "禁用"],
          ]}
        />
      </label>
      <label>
        聚合批次并发数
        <NumberInput
          value={api.batchConcurrency}
          min={1}
          max={100}
          disabled={batchOff}
          onChange={(v) => patch("batchConcurrency", v)}
        />
      </label>
      <label>
        聚合请求等待时间 (ms)
        <NumberInput
          value={api.batchInterval}
          min={10}
          max={10000}
          disabled={batchOff}
          onChange={(v) => patch("batchInterval", v)}
        />
      </label>
      <label>
        聚合请求最大段落数
        <NumberInput
          value={api.batchSize}
          min={1}
          max={100}
          disabled={batchOff}
          onChange={(v) => patch("batchSize", v)}
        />
      </label>
      <label>
        聚合请求最大文本长度
        <NumberInput
          value={api.batchLength}
          min={1000}
          max={100000}
          disabled={batchOff}
          onChange={(v) => patch("batchLength", v)}
        />
      </label>
    </Fields>
  );
}

function StreamFields({ api, patch }) {
  const streamOff = api.useStream === false;

  return (
    <Fields>
      <label>
        流式响应
        <Select
          value={String(api.useStream !== false)}
          onChange={(v) => patch("useStream", v === "true")}
          options={[
            ["true", "启用"],
            ["false", "禁用"],
          ]}
        />
      </label>
      <label>
        流式渲染模式
        <Select
          value={api.streamRenderMode || "disabled"}
          disabled={streamOff}
          onChange={(v) => patch("streamRenderMode", v)}
          options={[
            ["disabled", "关闭"],
            ["realtime", "实时追加"],
            ["segment", "按段渲染"],
          ]}
        />
      </label>
    </Fields>
  );
}

function ModelFields({ api, patch }) {
  return (
    <Fields>
      <label>
        温度
        <NumberInput
          value={api.temperature}
          min={0}
          max={2}
          placeholder="0.0-2.0"
          onChange={(v) => patch("temperature", v)}
        />
      </label>
      <label>
        最大 Token 数
        <NumberInput
          value={api.maxTokens}
          min={0}
          max={100000}
          onChange={(v) => patch("maxTokens", v)}
        />
      </label>
      <label>
        思考模式
        <Select
          value={api.thinkingMode || "disabled"}
          onChange={(v) => patch("thinkingMode", v)}
          options={[
            ["disabled", "关闭"],
            ["auto", "自动"],
            ["enabled", "开启"],
          ]}
        />
      </label>
    </Fields>
  );
}

function ContextFields({ api, patch }) {
  const contextOff = !api.useContext;

  return (
    <Fields>
      <label>
        智能上下文
        <Select
          value={String(Boolean(api.useContext))}
          onChange={(v) => patch("useContext", v === "true")}
          options={[
            ["true", "启用"],
            ["false", "禁用"],
          ]}
        />
      </label>
      <label>
        上下文会话数量
        <NumberInput
          value={api.contextSize}
          min={1}
          max={20}
          disabled={contextOff}
          onChange={(v) => patch("contextSize", v)}
        />
      </label>
    </Fields>
  );
}

function CodeFields({ api, patch }) {
  return (
    <div className="kiss-st-stack">
      <label>
        自定义请求头
        <TextArea
          value={api.customHeader}
          placeholder={`使用JSON格式，例如 "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0"`}
          onChange={(v) => patch("customHeader", v)}
        />
      </label>
      <label>
        自定义请求体
        <TextArea
          value={api.customBody}
          placeholder={`使用JSON格式，例如 "top_p": 0.7`}
          onChange={(v) => patch("customBody", v)}
        />
      </label>
      <label>
        请求钩子
        <TextArea
          value={api.reqHook}
          placeholder={`1、第一个参数包含如下字段：'texts', 'from', 'to', 'url', 'key', 'model', 'systemPrompt', ...
2、返回值必须是包含以下字段的对象： 'url', 'body', 'headers', 'method'
3、如返回空值，则hook函数不会产生任何效果。

// 示例
async (args, { url, body, headers, userMsg, method } = {}) => {
  return { url, body, headers, userMsg, method };
}`}
          onChange={(v) => patch("reqHook", v)}
        />
      </label>
      <label>
        响应钩子
        <TextArea
          value={api.resHook}
          placeholder={`1、第一个参数包含如下字段：'res', ...
2、返回值必须是包含以下字段的对象： 'translations'
  （'translations' 应为一个二维数组：[[译文, 原文语言]]）
3、如返回空值，则hook函数不会产生任何效果。

// 示例
async ({ res, ...args }) => {
  const translations = [["你好", "en"]];
  const modelMsg = {}; // 用于AI上下文
  return { translations, modelMsg };
}`}
          onChange={(v) => patch("resHook", v)}
        />
      </label>
    </div>
  );
}

function PromptFields({ api, patch, prompts }) {
  const toOptions = (list) =>
    list.map((prompt) => [prompt.slug, prompt.name || prompt.slug]);
  const batchMode = Boolean(api.useBatchFetch);

  return (
    <Fields>
      <label>
        聚合翻译提示词
        <Select
          value={api.batchPromptSlug}
          disabled={!batchMode}
          onChange={(v) => patch("batchPromptSlug", v)}
          options={toOptions(getBatchPromptOptions(prompts))}
        />
      </label>
      <label>
        单句翻译提示词
        <Select
          value={api.nobatchPromptSlug}
          disabled={batchMode}
          onChange={(v) => patch("nobatchPromptSlug", v)}
          options={toOptions(getNobatchPromptOptions(prompts))}
        />
      </label>
      <label>
        字幕翻译提示词
        <Select
          value={api.subtitlePromptSlug}
          onChange={(v) => patch("subtitlePromptSlug", v)}
          options={toOptions(getSubtitlePromptOptions(prompts))}
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
  subtitleSetting,
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
    setModelNote("获取模型中…");
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
      setModelNote(ids.length ? "" : "未找到模型，可手动输入。");
    } catch (error) {
      modelsUrlRef.current = "";
      setModels([]);
      setModelNote(`获取模型失败：${error.message}`);
    }
  };

  const isTranslatorAPI = api.apiType === OPT_TRANS_TRANSLATOR_API;
  const isPreset = PRESET_API_TYPES.has(api.apiType);
  const isCustom = api.apiType === OPT_TRANS_CUSTOMIZE;
  const isOllama = api.apiType === OPT_TRANS_OLLAMA;

  const runTest = async () => {
    if (testAbortRef.current) return;
    const controller = new AbortController();
    testAbortRef.current = controller;
    let timer = null;
    setOpen(true);
    setTest({ loading: true, text: "", error: "" });
    try {
      // 与正式翻译走同一套配置解析：补齐提示词并附带 provider 描述，
      // 否则测试会绕过 provider 的超时控制，在流不结束时永久挂起。
      const apiSetting = resolveApiPromptSettings(
        { ...api },
        prompts,
        subtitleSetting
      );
      const result = await Promise.race([
        apiTranslate({
          text: "Hello, world!",
          fromLang: "auto",
          toLang: "zh-CN",
          apiSetting,
          useCache: false,
          usePool: false,
          signal: controller.signal,
        }),
        new Promise((_, reject) => {
          // 兜底超时：请求链路（尤其是 SSE 长连接）异常时也必须让按钮恢复。
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("测试超时（60 秒未返回结果）"));
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
        {isPreset && <span className="kiss-st-badge">预设</span>}
        <span className="kiss-st-badge">{api.apiType}</span>
        <span className="kiss-st-spacer" />
        <span className="kiss-st-chev">展开/收起</span>
        <button
          className="kiss-st-btn"
          onClick={(event) => {
            event.stopPropagation();
            runTest();
          }}
          disabled={test.loading}
        >
          {test.loading ? "测试中…" : "测试接口"}
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
            重置
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
            删除
          </button>
        )}
      </div>

      {open && (
        <div className="kiss-st-stack">
          {test.text && <div className="kiss-st-ok">→ {test.text}</div>}
          {test.error && <div className="kiss-st-error">{test.error}</div>}
          <Fields>
            <label>
              名称
              <TextInput
                value={api.apiName}
                onChange={(v) => patch("apiName", v)}
              />
            </label>
            {(isCustom || isOllama) && (
              <>
                <label>
                  URL
                  <TextInput
                    value={api.url}
                    placeholder="http://localhost:port/v1/chat/completions"
                    onChange={(v) => patch("url", v)}
                  />
                </label>
                <label>
                  Key
                  <TextInput
                    value={api.key}
                    type="password"
                    placeholder="支持用英文逗号“,”分隔，轮询调用"
                    onChange={(v) => patch("key", v)}
                  />
                </label>
                <label>
                  模型列表 URL
                  <TextInput
                    value={api.modelListUrl}
                    placeholder="http://localhost:port/v1/models"
                    onChange={(v) => patch("modelListUrl", v)}
                  />
                </label>
                <label>
                  模型
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

          <RuntimeFields api={api} patch={patch} />
          <RequestFields api={api} patch={patch} />
          {!isTranslatorAPI && <BatchFields api={api} patch={patch} />}
          {!isTranslatorAPI && <StreamFields api={api} patch={patch} />}
          {!isTranslatorAPI && <ModelFields api={api} patch={patch} />}
          {!isTranslatorAPI && <ContextFields api={api} patch={patch} />}
          {!isTranslatorAPI && (
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
        <Row label="界面语言">
          <Select
            value={setting.uiLang}
            onChange={setUiLang}
            options={[
              ["auto", "跟随系统"],
              ["zh", "简体中文"],
              ["en", "English"],
              ["ru", "Русский"],
            ]}
          />
        </Row>
        <Row label="界面主题">
          <Select
            value={setting.darkMode}
            onChange={(v) => update({ darkMode: v })}
            options={[
              ["auto", "跟随系统"],
              ["light", "浅色"],
              ["dark", "深色"],
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
    const api = createBuiltinInstance("Custom", `Custom-${n}`, `自定义接口 ${n}`);
    update({ transApis: [...apis, api] });
  };
  const removeApi = (index) =>
    update({ transApis: apis.filter((_, i) => i !== index) });

  return (
    <Section
      title="翻译接口"
      footer={
        <div className="kiss-st-inline">
          <button className="kiss-st-btn kiss-st-btn--primary" onClick={addCustom}>
            + 添加自定义接口
          </button>
        </div>
      }
    >
      {visible.map(({ api, index }) => (
        <ApiEditor
          key={api.apiSlug}
          api={api}
          prompts={prompts}
          subtitleSetting={setting.subtitleSetting}
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
    <Row label={`搜索引擎 ${index + 1}`}>
      <div className="kiss-st-inline">
        <div
          className="kiss-st-combo"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
          }}
        >
          <TextInput
            value={engine.name}
            placeholder="搜索引擎名称"
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
          placeholder="用 %s 代替关键词"
          onChange={(v) => onChange({ ...engine, url: v })}
        />
        {index > 0 && (
          <button
            type="button"
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={onRemove}
          >
            删除
          </button>
        )}
      </div>
    </Row>
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
      <Section title="工具栏外观">
        <Row label="偏移量 (px)">
          <NumberInput
            value={value.offset}
            min={0}
            max={200}
            onChange={(v) => patch({ offset: v })}
          />
        </Row>
        <Row label="停留时长 (ms)" help="0 表示不自动消失">
          <NumberInput
            value={value.timeout}
            min={0}
            max={60000}
            onChange={(v) => patch({ timeout: v })}
          />
        </Row>
        <Row label="按钮布局">
          <Select
            value={value.buttonStyle}
            onChange={(v) => patch({ buttonStyle: v })}
            options={[
              ["row", "横排胶囊"],
              ["col", "竖向菜单"],
            ]}
          />
        </Row>
        <Row label="滚动时">
          <Select
            value={value.scrollRepaintMode}
            onChange={(v) => patch({ scrollRepaintMode: v })}
            options={[
              ["always", "跟随重绘"],
              ["viewport", "仅视口内重绘"],
              ["hide", "滚动即隐藏"],
            ]}
          />
        </Row>
        <Row label="强制浅色按钮">
          <Toggle
            value={value.forceWhiteBlack}
            onChange={(v) => patch({ forceWhiteBlack: v })}
          />
        </Row>
        <Row label="显示待粘贴的文本">
          <Toggle
            value={value.showPastePreview}
            onChange={(v) => patch({ showPastePreview: v })}
          />
        </Row>
      </Section>

      <Section title="功能开关">
        <Row label="显示翻译按钮">
          <Toggle
            value={value.enableTranslate !== false}
            onChange={(v) => patch({ enableTranslate: v })}
          />
        </Row>
        <Row
          label="翻译按钮隐藏阈值"
          help="检测当前语言在选取文本中的占比，当占比达到阈值时隐藏工具栏中的翻译按钮"
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
        <Row label="识别不可见超链接">
          <Toggle
            value={value.enableHiddenLinks}
            onChange={(v) => patch({ enableHiddenLinks: v })}
          />
        </Row>
        <Row label="闪电粘贴">
          <Toggle
            value={value.enablePaste}
            onChange={(v) => patch({ enablePaste: v })}
          />
        </Row>
        <Row label="闪电粘贴有效期 (s)">
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
        <Row label="链接拖拽预览">
          <Toggle
            value={value.enableDragPreview}
            onChange={(v) => patch({ enableDragPreview: v })}
          />
        </Row>
        <Row
          label="显示网页自带划词栏隐藏工具"
          warn={
            hasBlockRules && value.showBlockMenu === false
              ? "此选项仅影响功能入口的可见性，不会清空或禁用现存规则"
              : null
          }
        >
          <Toggle
            value={value.showBlockMenu !== false}
            onChange={(v) => patch({ showBlockMenu: v })}
          />
        </Row>
        <Row label="显示网页编辑工具">
          <Toggle
            value={value.showEditMenu !== false}
            onChange={(v) => patch({ showEditMenu: v })}
          />
        </Row>
        <Row label="超级取词键" help="如 ControlLeft / AltLeft / ShiftLeft，留空禁用">
          <TextInput
            value={value.unlockHotkey}
            onChange={(v) => patch({ unlockHotkey: v })}
          />
        </Row>
      </Section>

      <Section title="搜索" className="kiss-st-card--overflow">
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
          + 添加搜索引擎
        </button>
        {engines.length >= 8 && <small>最多 8 个</small>}
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

  return (
    <Section title="翻译面板">
      <Row label="源语言">
        <Select
          value={panel.fromLang || "auto"}
          onChange={(v) => updatePanel({ fromLang: v })}
          options={[["auto", "自动检测"], ...OPT_LANGS_FROM]}
        />
      </Row>
      <Row label="目标语言">
        <Select
          value={panel.toLang || "zh-CN"}
          onChange={(v) => updatePanel({ toLang: v })}
          options={OPT_LANGS_TO}
        />
      </Row>
      <Row label="第二目标语言" help="用于反向互译">
        <Select
          value={panel.toLang2 || "en"}
          onChange={(v) => updatePanel({ toLang2: v })}
          options={OPT_LANGS_TO}
        />
      </Row>
      <Row label="翻译接口">
        <Select
          value={(panel.apiSlugs || [])[0] || apis[0]?.apiSlug}
          onChange={(v) => updatePanel({ apiSlugs: [v] })}
          options={apis.map((api) => [
            api.apiSlug,
            api.apiName || api.apiType,
          ])}
        />
      </Row>
      <Row label="极简样式">
        <Toggle
          value={panel.simpleStyle}
          onChange={(v) => updatePanel({ simpleStyle: v })}
        />
      </Row>
      <Row label="失焦自动隐藏">
        <Toggle
          value={panel.hideClickAway}
          onChange={(v) => updatePanel({ hideClickAway: v })}
        />
      </Row>
      <Row label="跟随选区">
        <Toggle
          value={panel.followSelection}
          onChange={(v) => updatePanel({ followSelection: v })}
        />
      </Row>
    </Section>
  );
}

function apiOptions(setting, includeGlobal = false) {
  const options = (setting.transApis || [])
    .filter(
      (api) =>
        !api.isDisabled &&
        (api.apiType !== OPT_TRANS_TRANSLATOR_API || isTranslatorAPISupported())
    )
    .map((api) => [
    api.apiSlug,
    api.apiName || api.apiType,
  ]);
  return includeGlobal ? [[GLOBAL_KEY, "跟随网页规则"], ...options] : options;
}


function SubtitleTab({ setting, update }) {
  const sub = setting.subtitleSetting || {};
  const patch = (changes) =>
    update({ subtitleSetting: { ...sub, ...changes } });
  return (
    <Section title="字幕翻译">
      <Row label="启用字幕翻译">
        <Toggle value={sub.enabled} onChange={(v) => patch({ enabled: v })} />
      </Row>
      <Row label="翻译接口">
        <Select
          value={sub.apiSlug}
          onChange={(v) => patch({ apiSlug: v })}
          options={apiOptions(setting)}
        />
      </Row>
      <Row label="目标语言">
        <Select
          value={sub.toLang || "zh-CN"}
          onChange={(v) => patch({ toLang: v })}
          options={OPT_LANGS_TO}
        />
      </Row>
      <Row label="自动翻译">
        <Toggle
          value={sub.autoTranslate}
          onChange={(v) => patch({ autoTranslate: v })}
        />
      </Row>
      <Row label="双语显示">
        <Toggle
          value={sub.isBilingual !== false}
          onChange={(v) => patch({ isBilingual: v })}
        />
      </Row>
      <Row label="显示顺序">
        <Select
          value={sub.displayOrder || "original-first"}
          onChange={(v) => patch({ displayOrder: v })}
          options={[
            ["original-first", "原文在前"],
            ["translation-first", "译文在前"],
          ]}
        />
      </Row>
      <Row label="模糊译文">
        <Toggle
          value={sub.blurTranslation}
          onChange={(v) => patch({ blurTranslation: v })}
        />
      </Row>
      <Row label="跳过广告">
        <Toggle value={sub.skipAd} onChange={(v) => patch({ skipAd: v })} />
      </Row>
      <Row label="断句方式">
        <Select
          value={sub.useAlgorithmBreaker || "rule"}
          onChange={(v) => patch({ useAlgorithmBreaker: v })}
          options={[
            ["rule", "规则断句"],
            ["statistical", "统计断句"],
          ]}
        />
      </Row>
      <Row label="长句阈值">
        <NumberInput
          value={sub.longSentenceThreshold}
          onChange={(v) => patch({ longSentenceThreshold: v })}
        />
      </Row>
      <Row label="分块长度">
        <NumberInput
          value={sub.chunkLength}
          onChange={(v) => patch({ chunkLength: v })}
        />
      </Row>
      <Row label="提前翻译 (ms)">
        <NumberInput
          value={sub.preTrans}
          onChange={(v) => patch({ preTrans: v })}
        />
      </Row>
      <Row label="字幕悬浮查词">
        <Select
          value={sub.hoverLookupMode || OPT_ENHANCE_MOBILE_OFF}
          onChange={(v) => patch({ hoverLookupMode: v })}
          options={[
            [OPT_ENHANCE_ON, "开启"],
            [OPT_ENHANCE_OFF, "关闭"],
            [OPT_ENHANCE_MOBILE_OFF, "移动端关闭"],
          ]}
        />
      </Row>
      <Row label="字幕列表">
        <Select
          value={sub.showList || OPT_ENHANCE_MOBILE_OFF}
          onChange={(v) => patch({ showList: v })}
          options={[
            [OPT_ENHANCE_ON, "开启"],
            [OPT_ENHANCE_OFF, "关闭"],
            [OPT_ENHANCE_MOBILE_OFF, "移动端关闭"],
          ]}
        />
      </Row>
    </Section>
  );
}

function RulesSection({ setting }) {
  const [rules, setRules] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getRulesWithDefault().then(setRules);
  }, []);

  if (!rules) return null;

  const global = rules.find((rule) => rule.pattern === "*") || {
    ...GLOBLA_RULE,
  };
  const custom = rules.filter((rule) => rule.pattern !== "*");

  const patchGlobal = (patch) =>
    setRules((current) =>
      current.map((rule) =>
        rule.pattern === "*" ? { ...rule, ...patch } : rule
      )
    );

  const patchCustom = (index, patch) =>
    setRules((current) => {
      const list = current.filter((rule) => rule.pattern !== "*");
      list[index] = { ...list[index], ...patch };
      return [current.find((rule) => rule.pattern === "*") || global, ...list];
    });

  const addRule = () =>
    setRules((current) => [
      ...current,
      { ...DEFAULT_RULE, pattern: "example.com" },
    ]);

  const removeRule = (index) =>
    setRules((current) => {
      const list = current.filter((rule) => rule.pattern !== "*");
      list.splice(index, 1);
      return [current.find((rule) => rule.pattern === "*") || global, ...list];
    });

  const save = async () => {
    await saveRulesToStorage(rules);
    setStatus("网页规则已保存");
  };

  const boolOptions = [
    ["true", "开启"],
    ["false", "关闭"],
    [GLOBAL_KEY, "继承"],
  ];

  return (
    <Section
      title="网页翻译"
      footer={
        <>
          <div className="kiss-st-inline">
            <button className="kiss-st-btn" onClick={addRule}>
              + 添加自定义规则
            </button>
            <button className="kiss-st-btn kiss-st-btn--primary" onClick={save}>
              保存网页规则
            </button>
          </div>
          {status && <div className="kiss-st-ok">{status}</div>}
        </>
      }
    >
      <div className="kiss-st-hint">
        全局规则决定默认的网页翻译行为；下面的自定义规则按网址覆盖全局。
      </div>
      <Row label="全局：翻译接口">
        <Select
          value={global.apiSlug || GLOBAL_KEY}
          onChange={(v) => patchGlobal({ apiSlug: v })}
          options={apiOptions(setting, true)}
        />
      </Row>
      <Row label="全局：源语言">
        <Select
          value={global.fromLang || "auto"}
          onChange={(v) => patchGlobal({ fromLang: v })}
          options={[["auto", "自动检测"], ...OPT_LANGS_FROM]}
        />
      </Row>
      <Row label="全局：目标语言">
        <Select
          value={global.toLang || "zh-CN"}
          onChange={(v) => patchGlobal({ toLang: v })}
          options={OPT_LANGS_TO}
        />
      </Row>
      <Row label="全局：自动开启翻译">
        <Select
          value={String(global.transOpen)}
          onChange={(v) => patchGlobal({ transOpen: v })}
          options={boolOptions}
        />
      </Row>
      <Row label="全局：翻译元素选择器">
        <TextInput
          value={global.selector}
          onChange={(v) => patchGlobal({ selector: v })}
        />
      </Row>
      <Row label="全局：忽略选择器">
        <TextInput
          value={global.ignoreSelector}
          onChange={(v) => patchGlobal({ ignoreSelector: v })}
        />
      </Row>
      <Row label="全局：根节点选择器">
        <TextInput
          value={global.rootsSelector}
          onChange={(v) => patchGlobal({ rootsSelector: v })}
        />
      </Row>

      {custom.map((rule, index) => (
        <div key={`${rule.pattern}-${index}`} className="kiss-st-api">
          <div className="kiss-st-api__head">
            <strong>自定义规则 {index + 1}</strong>
            <span className="kiss-st-spacer" />
            <button
              className="kiss-st-btn kiss-st-btn--danger"
              onClick={() => removeRule(index)}
            >
              删除
            </button>
          </div>
          <div className="kiss-st-grid">
            <label>
              网址匹配
              <TextInput
                value={rule.pattern}
                onChange={(v) => patchCustom(index, { pattern: v })}
              />
            </label>
            <label>
              翻译元素选择器
              <TextInput
                value={rule.selector}
                onChange={(v) => patchCustom(index, { selector: v })}
              />
            </label>
            <label>
              忽略选择器
              <TextInput
                value={rule.ignoreSelector}
                onChange={(v) => patchCustom(index, { ignoreSelector: v })}
              />
            </label>
            <label>
              翻译接口
              <Select
                value={rule.apiSlug || GLOBAL_KEY}
                onChange={(v) => patchCustom(index, { apiSlug: v })}
                options={apiOptions(setting, true)}
              />
            </label>
            <label>
              源语言
              <Select
                value={rule.fromLang || GLOBAL_KEY}
                onChange={(v) => patchCustom(index, { fromLang: v })}
                options={[[GLOBAL_KEY, "继承"], ["auto", "自动检测"], ...OPT_LANGS_FROM]}
              />
            </label>
            <label>
              目标语言
              <Select
                value={rule.toLang || GLOBAL_KEY}
                onChange={(v) => patchCustom(index, { toLang: v })}
                options={[[GLOBAL_KEY, "继承"], ...OPT_LANGS_TO]}
              />
            </label>
            <label>
              自动翻译
              <Select
                value={String(rule.transOpen)}
                onChange={(v) => patchCustom(index, { transOpen: v })}
                options={boolOptions}
              />
            </label>
          </div>
        </div>
      ))}
    </Section>
  );
}

function PromptRow({ prompt, isPreset, dirty, onPatch, onReset, onDelete }) {
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
        {isPreset && <span className="kiss-st-badge">预设</span>}
        {dirty && <span className="kiss-st-badge kiss-st-badge--warn">已修改</span>}
        <span className="kiss-st-spacer" />
        <span className="kiss-st-chev">展开/收起</span>
        {isPreset ? (
          dirty && (
            <button
              className="kiss-st-btn"
              onClick={(event) => {
                event.stopPropagation();
                onReset();
              }}
            >
              重置
            </button>
          )
        ) : (
          <button
            className="kiss-st-btn kiss-st-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            删除
          </button>
        )}
      </div>

      {open && (
        <div className="kiss-st-stack">
          <label>
            名称
            <TextInput
              value={prompt.name}
              onChange={(v) => onPatch({ name: v })}
            />
          </label>
          <label>
            系统提示词
            <TextArea
              value={prompt.systemPrompt}
              onChange={(v) => onPatch({ systemPrompt: v })}
            />
          </label>
          <label>
            用户提示词
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
          name: `自定义提示词 ${customPrompts.length + 1}`,
          category: "custom",
          systemPrompt: "",
          userPrompt: "",
        },
      ],
    });

  return (
    <Section
      title="提示词管理"
      footer={
        <div className="kiss-st-inline">
          <button className="kiss-st-btn kiss-st-btn--primary" onClick={add}>
            + 添加自定义提示词
          </button>
        </div>
      }
    >
      {PRESET_PROMPTS.map((preset) => {
        const override = overrides.get(preset.slug);
        return (
          <PromptRow
            key={preset.slug}
            isPreset
            dirty={Boolean(override)}
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
      <RulesSection setting={setting} />
      <SubtitleTab setting={setting} update={update} />
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
  const uiLang = String(setting?.uiLang || "auto").toLowerCase();
  const isChineseUi =
    uiLang === "zh" ||
    uiLang.startsWith("zh-") ||
    (uiLang === "auto" &&
      String(navigator.language || "").toLowerCase().startsWith("zh"));
  const aboutTitle = festivalInfo
    ? `${meta.name} - 今天是${festivalInfo.name}${isChineseUi ? "！" : "!"}`
    : meta.name;

  return (
    <Section title="关于">
      <div className="kiss-st-about">
        {meta.icon && (
          <img className="kiss-st-about__icon" src={meta.icon} alt="" />
        )}
        <div className="kiss-st-about__meta">
          <strong>{aboutTitle}</strong>
        </div>
      </div>
      <Row label="版本号">{meta.version || "—"}</Row>
      <Row label="主页">
        {meta.homepage ? (
          <a href={meta.homepage} target="_blank" rel="noreferrer">
            {meta.homepage}
          </a>
        ) : (
          "—"
        )}
      </Row>
      <Row label="许可证">{meta.license || "—"}</Row>
      {festivalInfo && (
        <Row
          label="禁用节日彩蛋"
          help="仅节日期间显示，关闭后所有节日点击特效都不再显示"
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

  const dark = useMemo(() => {
    if (!setting) return true;
    if (setting.darkMode === "dark") return true;
    if (setting.darkMode === "light") return false;
    return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches;
  }, [setting]);

  useEffect(() => {
    if (!themeRef.current || !setting) return undefined;
    return translateDom(themeRef.current, setting.uiLang);
  }, [setting?.uiLang, setting, tab]);

  if (!setting) {
    return <div className="kiss-st-loading">加载设置…</div>;
  }

  return (
    <div className="kiss-st-app" data-theme={dark ? "dark" : "light"} ref={themeRef}>
      <header className="kiss-st-header">
        {meta.icon && (
          <img className="kiss-st-logo" src={meta.icon} alt="" />
        )}
        <h1>{meta.name}</h1>
        <button
          className="kiss-st-close"
          type="button"
          title="关闭设置"
          aria-label="关闭设置"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <nav className="kiss-st-tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
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
