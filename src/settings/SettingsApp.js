import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getSettingWithDefault,
  putSetting,
  getRulesWithDefault,
  setRules,
} from "../libs/storage";
import { apiTranslate } from "../apis";
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
} from "../config";
import {
  DEFAULT_TOOLBAR_SETTING,
  TOOLBAR_SEARCH_ENGINES,
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
  ["advanced", "高级"],
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

function Section({ title, children }) {
  return (
    <section className="kiss-st-section">
      <h2>{title}</h2>
      <div className="kiss-st-card">{children}</div>
    </section>
  );
}

function Row({ label, help, children }) {
  return (
    <div className="kiss-st-row">
      <div className="kiss-st-row__label">
        <span>{label}</span>
        {help && <small>{help}</small>}
      </div>
      <div className="kiss-st-row__control">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      className="kiss-st-input"
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberInput({ value, onChange, min, max }) {
  return (
    <input
      className="kiss-st-input kiss-st-number"
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      onChange={(event) =>
        onChange(event.target.value === "" ? "" : Number(event.target.value))
      }
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

function Select({ value, onChange, options }) {
  return (
    <select
      className="kiss-st-select"
      value={value ?? ""}
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

function ApiEditor({ api, onChange, onDelete, canDelete }) {
  const [test, setTest] = useState({ loading: false, text: "", error: "" });
  const patch = (key, value) => onChange({ ...api, [key]: value });

  const runTest = async () => {
    setTest({ loading: true, text: "", error: "" });
    try {
      const result = await apiTranslate({
        text: "Hello, world!",
        fromLang: "auto",
        toLang: "zh-CN",
        apiSetting: api,
        useCache: false,
      });
      setTest({ loading: false, text: result.trText || "", error: "" });
    } catch (error) {
      setTest({ loading: false, text: "", error: error.message });
    }
  };

  return (
    <div className="kiss-st-api">
      <div className="kiss-st-api__head">
        <strong>{api.apiName || api.apiType}</strong>
        <span className="kiss-st-badge">{api.apiType}</span>
        <span className="kiss-st-spacer" />
        <Toggle
          value={!api.isDisabled}
          onChange={(enabled) => patch("isDisabled", !enabled)}
        />
        {canDelete && (
          <button className="kiss-st-btn kiss-st-btn--danger" onClick={onDelete}>
            删除
          </button>
        )}
      </div>
      <div className="kiss-st-grid">
        <label>
          名称
          <TextInput value={api.apiName} onChange={(v) => patch("apiName", v)} />
        </label>
        <label>
          URL
          <TextInput value={api.url} onChange={(v) => patch("url", v)} />
        </label>
        <label>
          Key
          <TextInput
            value={api.key}
            type="password"
            onChange={(v) => patch("key", v)}
          />
        </label>
        <label>
          模型
          <TextInput value={api.model} onChange={(v) => patch("model", v)} />
        </label>
        <label>
          模型列表 URL
          <TextInput
            value={api.modelListUrl}
            onChange={(v) => patch("modelListUrl", v)}
          />
        </label>
        <label>
          Temperature
          <NumberInput
            value={api.temperature}
            min={0}
            max={2}
            onChange={(v) => patch("temperature", v)}
          />
        </label>
        <label>
          Max Tokens
          <NumberInput
            value={api.maxTokens}
            min={0}
            max={100000}
            onChange={(v) => patch("maxTokens", v)}
          />
        </label>
        <label>
          超时（秒）
          <NumberInput
            value={api.httpTimeout}
            min={1}
            max={600}
            onChange={(v) => patch("httpTimeout", v)}
          />
        </label>
      </div>
      <div className="kiss-st-inline">
        <label className="kiss-st-check">
          <input
            type="checkbox"
            checked={Boolean(api.useBatchFetch)}
            onChange={(e) => patch("useBatchFetch", e.target.checked)}
          />
          批量合并
        </label>
        <label className="kiss-st-check">
          <input
            type="checkbox"
            checked={api.useStream !== false}
            onChange={(e) => patch("useStream", e.target.checked)}
          />
          流式
        </label>
        <label className="kiss-st-check">
          <input
            type="checkbox"
            checked={Boolean(api.useContext)}
            onChange={(e) => patch("useContext", e.target.checked)}
          />
          上下文
        </label>
        <button
          className="kiss-st-btn"
          onClick={runTest}
          disabled={test.loading}
        >
          {test.loading ? "测试中…" : "测试翻译"}
        </button>
      </div>
      {test.text && <div className="kiss-st-ok">→ {test.text}</div>}
      {test.error && <div className="kiss-st-error">{test.error}</div>}
    </div>
  );
}

function GeneralTab({ setting, update }) {
  return (
    <>
      <Section title="界面">
        <Row label="界面语言">
          <Select
            value={setting.uiLang}
            onChange={(v) => update({ uiLang: v })}
            options={[
              ["zh", "简体中文"],
              ["en", "English"],
              ["ru", "Русский"],
            ]}
          />
        </Row>
        <Row label="主题">
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
      </Section>
      <Section title="翻译">
        <Row label="默认翻译接口">
          <Select
            value={setting.apiSlug}
            onChange={(v) => update({ apiSlug: v })}
            options={(setting.transApis || []).map((api) => [
              api.apiSlug,
              api.apiName || api.apiType,
            ])}
          />
        </Row>
        <Row label="段落最小长度">
          <NumberInput
            value={setting.minLength}
            onChange={(v) => update({ minLength: v })}
          />
        </Row>
        <Row label="段落最大长度">
          <NumberInput
            value={setting.maxLength}
            onChange={(v) => update({ maxLength: v })}
          />
        </Row>
      </Section>
      <ToolbarTab setting={setting} update={update} />
    </>
  );
}

function ApisTab({ setting, update }) {
  const apis = setting.transApis || [];
  const updateApi = (index, next) =>
    update({
      transApis: apis.map((api, i) => (i === index ? next : api)),
    });
  const addCustom = () => {
    const used = new Set(apis.map((api) => api.apiSlug));
    let n = 1;
    while (used.has(`Custom-${n}`)) n += 1;
    const api = createBuiltinInstance("Custom", `Custom-${n}`, `Custom ${n}`);
    update({ transApis: [...apis, api] });
  };
  const removeApi = (index) =>
    update({ transApis: apis.filter((_, i) => i !== index) });

  return (
    <Section title="翻译接口">
      <div className="kiss-st-hint">
        只保留 BuiltinAI、Ollama、Custom。BuiltinAI 使用浏览器内置翻译，Ollama
        默认连接本地 11434，Custom 可填任意兼容接口。
      </div>
      {apis.map((api, index) => (
        <ApiEditor
          key={api.apiSlug}
          api={api}
          onChange={(next) => updateApi(index, next)}
          onDelete={() => removeApi(index)}
          canDelete={api.apiType === "Custom" && apis.length > 1}
        />
      ))}
      <button className="kiss-st-btn kiss-st-btn--primary" onClick={addCustom}>
        + 添加 Custom
      </button>
    </Section>
  );
}

function ToolbarTab({ setting, update }) {
  const value = { ...DEFAULT_TOOLBAR_SETTING, ...(setting.toolbarSetting || {}) };
  const patch = (changes) =>
    update({ toolbarSetting: { ...value, ...changes } });

  return (
    <>
      <Section title="工具栏外观">
        <Row label="界面语言">
          <Select
            value={value.language}
            onChange={(v) => patch({ language: v })}
            options={[
              ["auto", "跟随页面"],
              ["zh-CN", "简体中文"],
              ["en", "English"],
              ["ru", "Русский"],
            ]}
          />
        </Row>
        <Row label="弹出位置">
          <Select
            value={value.positionMode}
            onChange={(v) => patch({ positionMode: v })}
            options={[
              ["endchar", "选区字符末尾"],
              ["mouse", "鼠标位置"],
            ]}
          />
        </Row>
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
              ["col", "纵排矩形"],
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
      </Section>

      <Section title="行为">
        <Row label="显示翻译按钮" help="调用 KISS 翻译面板">
          <Toggle
            value={value.enableTranslate !== false}
            onChange={(v) => patch({ enableTranslate: v })}
          />
        </Row>
        <Row label="选中即缓存">
          <Toggle
            value={value.enableCache}
            onChange={(v) => patch({ enableCache: v })}
          />
        </Row>
        <Row label="闪电粘贴">
          <Toggle
            value={value.enablePaste}
            onChange={(v) => patch({ enablePaste: v })}
          />
        </Row>
        <Row label="操作反馈">
          <Toggle
            value={value.enableToast}
            onChange={(v) => patch({ enableToast: v })}
          />
        </Row>
        <Row label="显示删除按钮">
          <Toggle
            value={value.enableDeleteBtn}
            onChange={(v) => patch({ enableDeleteBtn: v })}
          />
        </Row>
        <Row label="链接拖拽预览">
          <Toggle
            value={value.enableDragPreview}
            onChange={(v) => patch({ enableDragPreview: v })}
          />
        </Row>
        <Row label="超级取词键" help="如 ControlLeft / AltLeft / ShiftLeft，留空禁用">
          <TextInput
            value={value.unlockHotkey}
            onChange={(v) => patch({ unlockHotkey: v })}
          />
        </Row>
      </Section>

      <Section title="搜索">
        <Row label="搜索引擎">
          <Select
            value={
              TOOLBAR_SEARCH_ENGINES[value.searchEngine]
                ? value.searchEngine
                : "__custom__"
            }
            onChange={(v) => {
              if (v !== "__custom__") patch({ searchEngine: v });
            }}
            options={[
              ...Object.entries(TOOLBAR_SEARCH_ENGINES).map(([key, engine]) => [
                key,
                engine.name,
              ]),
              ["__custom__", "自定义"],
            ]}
          />
        </Row>
        {!TOOLBAR_SEARCH_ENGINES[value.searchEngine] && (
          <Row label="自定义 URL" help="用 %s 代替关键词">
            <TextInput
              value={value.searchEngine}
              onChange={(v) => patch({ searchEngine: v })}
            />
          </Row>
        )}
        <Row label="智能引擎" help="纯英文时使用备用引擎">
          <Toggle
            value={value.smartEngine}
            onChange={(v) => patch({ smartEngine: v })}
          />
        </Row>
        {value.smartEngine && (
          <Row label="备用引擎">
            <Select
              value={value.fallbackEngine}
              onChange={(v) => patch({ fallbackEngine: v })}
              options={Object.entries(TOOLBAR_SEARCH_ENGINES).map(
                ([key, engine]) => [key, engine.name]
              )}
            />
          </Row>
        )}
      </Section>

      <Section title="高级">
        <div className="kiss-st-row">
          <span className="kiss-st-spacer" />
          <button
            className="kiss-st-btn"
            onClick={() => patch({ ...DEFAULT_TOOLBAR_SETTING })}
          >
            重置工具栏设置
          </button>
        </div>
      </Section>
    </>
  );
}

function PanelTab({ setting, update }) {
  const panel = setting.tranboxSetting || {};
  const updatePanel = (patch) =>
    update({ tranboxSetting: { ...panel, ...patch } });
  const apis = (setting.transApis || []).filter((api) => !api.isDisabled);

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
          value={(panel.apiSlugs || [])[0] || setting.apiSlug}
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
  const options = (setting.transApis || []).map((api) => [
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
    await setRules(rules);
    setStatus("网页规则已保存");
  };

  const boolOptions = [
    ["true", "开启"],
    ["false", "关闭"],
    [GLOBAL_KEY, "继承"],
  ];

  return (
    <Section title="网页翻译规则">
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

      <div className="kiss-st-inline">
        <button className="kiss-st-btn" onClick={addRule}>
          + 添加自定义规则
        </button>
        <button className="kiss-st-btn kiss-st-btn--primary" onClick={save}>
          保存网页规则
        </button>
      </div>
      {status && <div className="kiss-st-ok">{status}</div>}
    </Section>
  );
}

function PromptsSection({ setting, update }) {
  const prompts = setting.prompts || [];
  const patch = (index, changes) =>
    update({
      prompts: prompts.map((prompt, i) =>
        i === index ? { ...prompt, ...changes } : prompt
      ),
    });
  const add = () =>
    update({
      prompts: [
        ...prompts,
        {
          slug: `custom-${Date.now()}`,
          name: `自定义提示词 ${prompts.length + 1}`,
          category: "custom",
          systemPrompt: "",
          userPrompt: "",
        },
      ],
    });
  const remove = (index) =>
    update({ prompts: prompts.filter((_, i) => i !== index) });

  return (
    <Section title="提示词">
      <div className="kiss-st-hint">
        这里管理自定义提示词；KISS 内置提示词仍然可用，不需要重复创建。
      </div>
      {prompts.map((prompt, index) => (
        <div key={prompt.slug || index} className="kiss-st-api">
          <div className="kiss-st-api__head">
            <strong>{prompt.name || prompt.slug}</strong>
            <span className="kiss-st-badge">{prompt.category || "custom"}</span>
            <span className="kiss-st-spacer" />
            <button
              className="kiss-st-btn kiss-st-btn--danger"
              onClick={() => remove(index)}
            >
              删除
            </button>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            名称
            <TextInput
              value={prompt.name}
              onChange={(v) => patch(index, { name: v })}
            />
          </label>
          <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
            System Prompt
            <TextArea
              value={prompt.systemPrompt}
              onChange={(v) => patch(index, { systemPrompt: v })}
            />
          </label>
          <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
            User Prompt
            <TextArea
              value={prompt.userPrompt}
              onChange={(v) => patch(index, { userPrompt: v })}
            />
          </label>
        </div>
      ))}
      <div className="kiss-st-inline">
        <button className="kiss-st-btn kiss-st-btn--primary" onClick={add}>
          + 添加自定义提示词
        </button>
      </div>
    </Section>
  );
}

function StylesSection({ setting, update }) {
  const styles = setting.customStyles || [];
  const patch = (index, changes) =>
    update({
      customStyles: styles.map((style, i) =>
        i === index ? { ...style, ...changes } : style
      ),
    });
  const add = () =>
    update({
      customStyles: [
        ...styles,
        {
          styleSlug: `custom-${Date.now()}`,
          styleName: `自定义样式 ${styles.length + 1}`,
          styleCode: "color: #209CEE;",
        },
      ],
    });
  const remove = (index) =>
    update({ customStyles: styles.filter((_, i) => i !== index) });

  return (
    <Section title="译文样式">
      <div className="kiss-st-hint">
        每条样式是一段 CSS；保存后可以在网页规则的“译文样式”中引用。
      </div>
      {styles.map((style, index) => (
        <div key={style.styleSlug || index} className="kiss-st-api">
          <div className="kiss-st-api__head">
            <strong>{style.styleName || style.styleSlug}</strong>
            <span className="kiss-st-spacer" />
            <button
              className="kiss-st-btn kiss-st-btn--danger"
              onClick={() => remove(index)}
            >
              删除
            </button>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            名称
            <TextInput
              value={style.styleName}
              onChange={(v) => patch(index, { styleName: v })}
            />
          </label>
          <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
            CSS
            <TextArea
              value={style.styleCode}
              onChange={(v) => patch(index, { styleCode: v })}
            />
          </label>
        </div>
      ))}
      <div className="kiss-st-inline">
        <button className="kiss-st-btn kiss-st-btn--primary" onClick={add}>
          + 添加自定义样式
        </button>
      </div>
    </Section>
  );
}

function TranslationTab({ setting, update }) {
  return (
    <>
      <ApisTab setting={setting} update={update} />
      <PanelTab setting={setting} update={update} />
      <SubtitleTab setting={setting} update={update} />
      <RulesSection setting={setting} />
      <PromptsSection setting={setting} update={update} />
      <StylesSection setting={setting} update={update} />
    </>
  );
}

function AdvancedTab({ setting, replaceSetting }) {
  const [text, setText] = useState(() => JSON.stringify(setting, null, 2));
  const [rules, setRulesText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    getRulesWithDefault().then((value) =>
      setRulesText(JSON.stringify(value, null, 2))
    );
  }, []);

  const saveSetting = async () => {
    try {
      const next = JSON.parse(text);
      replaceSetting(next);
      setStatus("设置已保存");
    } catch (error) {
      setStatus(`JSON 错误：${error.message}`);
    }
  };

  const saveRules = async () => {
    try {
      await setRules(JSON.parse(rules));
      setStatus("规则已保存");
    } catch (error) {
      setStatus(`JSON 错误：${error.message}`);
    }
  };

  return (
    <Section title="高级设置（JSON）">
      <div className="kiss-st-hint">
        这里可以直接编辑完整设置和网页翻译规则，确保原版 KISS 的所有选项都仍然可改。
      </div>
      <div className="kiss-st-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <strong>完整设置</strong>
          <textarea
            className="kiss-st-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="kiss-st-inline">
          <button className="kiss-st-btn kiss-st-btn--primary" onClick={saveSetting}>
            保存设置 JSON
          </button>
          <button className="kiss-st-btn" onClick={() => setText(JSON.stringify(setting, null, 2))}>
            还原
          </button>
        </div>
      </div>
      <div className="kiss-st-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <strong>网页翻译规则</strong>
          <textarea
            className="kiss-st-textarea"
            value={rules}
            onChange={(event) => setRulesText(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="kiss-st-inline">
          <button className="kiss-st-btn kiss-st-btn--primary" onClick={saveRules}>
            保存规则 JSON
          </button>
        </div>
      </div>
      {status && <div className="kiss-st-ok">{status}</div>}
    </Section>
  );
}

export default function SettingsApp({ initialPath = "/" }) {
  const [tab, setTab] = useState(() => pathToTab(initialPath));
  const [setting, setSetting] = useState(null);
  const [saved, setSaved] = useState(true);
  const themeRef = useRef(null);

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
      setSaved(false);
      persist(next).then(() => setSaved(true));
      return next;
    });
  };

  const replaceSetting = (next) => {
    setSetting(next);
    setSaved(false);
    persist(next).then(() => setSaved(true));
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
        <h1>Text Selection Toolbar</h1>
        <span className="kiss-st-saved">{saved ? "已保存" : "保存中…"}</span>
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
        {tab === "advanced" && (
          <AdvancedTab setting={setting} replaceSetting={replaceSetting} />
        )}
      </main>
    </div>
  );
}
