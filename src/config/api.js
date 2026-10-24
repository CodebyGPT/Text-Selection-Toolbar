import { normalizeApiThinkingSetting } from "../builtin-plugins/thinkingCapabilities";
import {
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_FETCH_LIMIT,
  DEFAULT_FETCH_INTERVAL,
  INPUT_PLACE_TO,
  INPUT_PLACE_TEXT,
  INPUT_PLACE_TONE,
  INPUT_PLACE_TITLE,
  INPUT_PLACE_DESCRIPTION,
  INPUT_PLACE_SUMMARY,
  INPUT_PLACE_CONTEXT,
  INPUT_PLACE_GLOSSARY,
  INPUT_PLACE_SEGMENTS,
  OPT_TRANS_OLLAMA,
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_LOCAL_TRANSLATOR,
  OPT_ALL_TRANS_TYPES,
} from "./apiConstants";
import {
  NATIVE_PRESET_OVERRIDES,
  DEFAULT_ENABLED_API_TYPES,
} from "../builtin-plugins/presets";

export * from "./apiConstants";
export * from "../providers/sdk/languageDictionary";
export * from "../builtin-plugins/languageMappings";
export * from "../builtin-plugins/thinkingCapabilities";

/**
 * @file api.js
 * @description 兼容 API 配置出口与场景默认值；厂家预设、思考能力和语言差异由原生插件模块维护。
 */

export const BUILTIN_STONES = [
  "formal", // 正式风格
  "casual", // 口语风格
  "neutral", // 中性风格
  "technical", // 技术风格
  "marketing", // 营销风格
  "Literary", // 文学风格
  "academic", // 学术风格
  "legal", // 法律风格
  "literal", // 直译风格
  "idiomatic", // 意译风格
  "transcreation", // 创译风格
  "machine-like", // 机器风格
  "concise", // 简明风格
];
export const BUILTIN_PLACEHOLDERS = ["{ }", "{{ }}", "[ ]", "[[ ]]"];
export const BUILTIN_PLACETAGS = ["i", "a", "b", "x", "span"];
export const PLACETAG_FORMATS = ["compact", "attribute"]; // 占位符格式：简洁格式、属性格式

export const defaultNobatchPrompt = `You are a professional, authentic machine translation engine.
If the content to translate is a URL, code, or file path, do not translate it and output it as-is.`;
export const defaultNobatchUserPrompt = `# Context
Title: ${INPUT_PLACE_TITLE}
Description: ${INPUT_PLACE_DESCRIPTION}
Summary: ${INPUT_PLACE_SUMMARY}
Tone: ${INPUT_PLACE_TONE}

# Glossary:
${INPUT_PLACE_GLOSSARY}

# Task
Translate the Source Text below to ${INPUT_PLACE_TO}.
1. Use the Context to ensure accuracy.
2. Adapt the wording to match the specified Tone.
3. If a Source Text term exactly matches a Glossary entry, output ONLY that entry's value; never repeat the source term, never wrap the value in parentheses.
4. Output ONLY the translated text. No markdown, no explanations.

Source Text: ${INPUT_PLACE_TEXT}

Translated Text:`;

export const defaultNobatchPromptConcise = "";
export const defaultNobatchUserPromptConcise = `${INPUT_PLACE_GLOSSARY}
${INPUT_PLACE_TONE}
Translate the following text into ${INPUT_PLACE_TO}. Preserve all HTML-like tags. Output ONLY the translated text without any explanation:
${INPUT_PLACE_TEXT}`;

export const defaultSystemPrompt = `Act as a translation API. Output a single raw JSON object only. No extra text or fences.

Input:
{"targetLanguage":"<lang>","title":"<context>","description":"<context>","summary":"<context>","segments":[{"id":1,"text":"..."}],"glossary":{"sourceTerm":"targetTerm"},"tone":"<formal|casual>"}

Output:
{"translations":[{"id":1,"text":"...","sourceLanguage":"<detected>"}]}

Rules:
1.  Use title/description for context only; do not output them.
2.  Keep id, order, and count of segments.
3.  Preserve whitespace, HTML entities, and all HTML-like tags (e.g., <i1>, <a1>). Translate inner text only.
4.  Highest priority: Follow 'glossary'. Use value for translation; if value is "", keep the key. When a term matches the glossary, output ONLY the glossary value; never echo the source term alongside it and never wrap the value in parentheses.
5.  Do not translate: content in <code>, <pre>, text enclosed in backticks, or placeholders like {1}, {{1}}, [1], [[1]].
6.  Apply the specified tone to the translation.
7.  Detect sourceLanguage for each segment.
8.  Return empty or unchanged inputs as is.

Example:
Input: {"targetLanguage":"zh-CN","segments":[{"id":1,"text":"A <b>React</b> component."}],"glossary":{"component":"组件","React":""}}
Output: {"translations":[{"id":1,"text":"一个<b>React</b>组件","sourceLanguage":"en"}]}

Fail-safe: On any error, return {"translations":[]}.`;


// 专家级AI词典系统提示词
export const defaultDictPrompt = createEnglishDictionaryPrompt({
  targetLanguage: "Chinese",
  translationExample: "用于 Web 和原生用户界面的库",
  labels: {
    entry: "词条",
    essentials: "基础形态与音标",
    pronunciation: "发音标注",
    meanings: "词性与核心义项",
    context: "语境精析",
    contextMeaning: "当前语义锁定",
    register: "语境色调",
    replacements: "原句平替词",
    deepDive: "词源深度解构与辨析",
    etymology: "词源与记忆锚点",
    collocations: "高频搭配",
    synonyms: "同义词微观辨析",
    examples: "语料库双解例句",
    translation: "中文翻译",
    scene: "场景标签",
  },
});

function createEnglishDictionaryPrompt({
  targetLanguage,
  translationExample,
  labels,
}) {
  return `# Role
You are an expert English-${targetLanguage} lexicographer specializing in contrastive linguistics and modern corpus linguistics. Analyze the user's English text with academic rigor and clear, elegant formatting, or translate it naturally into ${targetLanguage} when dictionary analysis is not appropriate.

# Execution Rules
1. **Smart routing (CRITICAL)**: Choose the mode strictly from the length and nature of \`[Target]\`:
   - **Dictionary mode**: Use the dictionary output format only when \`[Target]\` is clearly a single English word, an idiom, or a fixed collocation of no more than 3 words.
   - **Pure translation mode**: Use pure translation for complete sentences, clauses, natural-language phrases, paragraphs, long text, or any continuous text longer than 3 words. When uncertain, choose pure translation mode.
2. **Context first**: In dictionary mode, if \`[Context]\` contains useful information, put the contextually correct sense first.
3. **Target-language contract**: All headings, labels, definitions, explanations, usage notes, and example translations in dictionary mode must be written in ${targetLanguage}. Keep English only for the entry, English examples, pronunciation, and English words being compared.
4. **No extra framing**: Follow the selected format exactly. Do not add greetings, prefaces, or closing summaries.

---

# Pure Translation Output Contract (only for pure translation mode)

Your entire response must contain only the ${targetLanguage} translation itself:
- Do not output the source text, bilingual comparison, headings, labels, language names, quotation marks, Markdown, or explanations.
- Do not add prefixes such as "Translation:" or include pronunciation, etymology, collocations, examples, or acknowledgements.
- If the source has one paragraph, output one paragraph. Preserve paragraph breaks only when the source has multiple paragraphs.

Example:
- Input: The library for web and native user interfaces
- Correct output: ${translationExample}

# Output Format (only for dictionary mode)

## ${labels.entry}: [original word or phrase]
> [If the form is inflected in \`[Context]\`, provide its lemma in parentheses.]

### 1. ${labels.essentials}
- **${labels.pronunciation}**: 🇺🇸 [US IPA] ｜ 🇬🇧 [UK IPA]
- **${labels.meanings}**:
  - \`[part of speech]\` ① [primary ${targetLanguage} definition] ② [secondary ${targetLanguage} definition]
  - \`[part of speech]\` ① [primary ${targetLanguage} definition]

### 2. ${labels.context} *[include only when useful Context exists]*
- **${labels.contextMeaning}**: State the part of speech and precise meaning in the given context.
- **${labels.register}**: Describe sentiment, register, formality, and tone.
- **${labels.replacements}**: Give 1-2 English synonyms that can replace the entry in this context without changing the meaning.

### 3. ${labels.deepDive}
- **${labels.etymology}**: Explain roots, affixes, historical development, or provide a logical memory aid.
- **${labels.collocations}**:
  * \`[collocation 1]\` ➔ [precise ${targetLanguage} translation]
  * \`[collocation 2]\` ➔ [precise ${targetLanguage} translation]
- **${labels.synonyms}**:
  * **[entry] vs [synonym 1] vs [synonym 2]**: Explain their differences in context, intensity, register, or collocation habits in 1-2 sentences.

### 4. ${labels.examples}
[Provide 2-3 natural examples from publications, news, professional writing, or everyday English.]

1. **[natural English example]**
   - 💡 *${labels.translation}*: [accurate, idiomatic ${targetLanguage} translation]
   - 📌 *${labels.scene}*: \`[localized scene label]\``;
}

export const defaultDictPromptEnJa = createEnglishDictionaryPrompt({
  targetLanguage: "Japanese",
  translationExample:
    "Webおよびネイティブのユーザーインターフェース向けライブラリ",
  labels: {
    entry: "見出し語",
    essentials: "基本情報と発音",
    pronunciation: "発音",
    meanings: "品詞と主要な意味",
    context: "文脈分析",
    contextMeaning: "文脈上の意味",
    register: "語調と使用域",
    replacements: "文脈に合う言い換え",
    deepDive: "語源・用法・類義語",
    etymology: "語源と記憶の手がかり",
    collocations: "頻出コロケーション",
    synonyms: "類義語の使い分け",
    examples: "コーパス用例",
    translation: "日本語訳",
    scene: "使用場面",
  },
});

export const defaultDictPromptEnKo = createEnglishDictionaryPrompt({
  targetLanguage: "Korean",
  translationExample: "웹 및 네이티브 사용자 인터페이스용 라이브러리",
  labels: {
    entry: "표제어",
    essentials: "기본 정보와 발음",
    pronunciation: "발음",
    meanings: "품사와 핵심 의미",
    context: "문맥 분석",
    contextMeaning: "문맥상 의미",
    register: "어조와 사용역",
    replacements: "문맥에 맞는 대체어",
    deepDive: "어원·용법·유의어",
    etymology: "어원과 기억 단서",
    collocations: "주요 연어",
    synonyms: "유의어 뉘앙스 비교",
    examples: "말뭉치 예문",
    translation: "한국어 번역",
    scene: "사용 상황",
  },
});

export const defaultDictPromptEnVi = createEnglishDictionaryPrompt({
  targetLanguage: "Vietnamese",
  translationExample: "Thư viện dành cho giao diện người dùng web và native",
  labels: {
    entry: "Mục từ",
    essentials: "Thông tin cơ bản và phát âm",
    pronunciation: "Phát âm",
    meanings: "Từ loại và nghĩa cốt lõi",
    context: "Phân tích ngữ cảnh",
    contextMeaning: "Nghĩa trong ngữ cảnh",
    register: "Sắc thái và phong cách",
    replacements: "Từ thay thế phù hợp",
    deepDive: "Từ nguyên, cách dùng và từ đồng nghĩa",
    etymology: "Từ nguyên và mẹo ghi nhớ",
    collocations: "Cụm từ thường gặp",
    synonyms: "Phân biệt từ đồng nghĩa",
    examples: "Ví dụ ngữ liệu",
    translation: "Bản dịch tiếng Việt",
    scene: "Ngữ cảnh sử dụng",
  },
});

export const defaultDictPromptEnRu = createEnglishDictionaryPrompt({
  targetLanguage: "Russian",
  translationExample:
    "Библиотека для веб-интерфейсов и нативных пользовательских интерфейсов",
  labels: {
    entry: "Словарная статья",
    essentials: "Основная информация и произношение",
    pronunciation: "Произношение",
    meanings: "Часть речи и основные значения",
    context: "Контекстный анализ",
    contextMeaning: "Значение в контексте",
    register: "Тональность и регистр",
    replacements: "Контекстные замены",
    deepDive: "Этимология, употребление и синонимы",
    etymology: "Этимология и подсказка для запоминания",
    collocations: "Частотные сочетания",
    synonyms: "Различия между синонимами",
    examples: "Корпусные примеры",
    translation: "Перевод на русский",
    scene: "Сфера употребления",
  },
});

// 专家级AI词典用户提示词
export const defaultDictUserPrompt = `# Input Data

## [Context] (Optional)
> Use this information to identify the target text's meaning in context:
- Document title: ${INPUT_PLACE_TITLE}
- Document description: ${INPUT_PLACE_DESCRIPTION}
- Document summary: ${INPUT_PLACE_SUMMARY}
- Surrounding paragraph: ${INPUT_PLACE_CONTEXT}

## [Target] (Required)
> Use this text to choose between dictionary mode and pure translation mode:
${INPUT_PLACE_TEXT}`;

// AI 字幕默认使用 boundary-v3：模型返回句末事件 ID、原文锚点和译文，最终原文与时间轴仍由程序重建。

// 翻译接口默认参数
const defaultApi = {
  apiSlug: "", // 唯一标识
  apiName: "", // 接口名称
  apiType: "", // 接口类型
  sourceType: "network", // 内置、本地或外部接口

  modelRef: "", // 本地模型引用，仅标识符随配置同步
  device: "webgpu", // 本地模型运行设备：webgpu / wasm
  url: "",
  key: "",
  model: "", // 模型名称
  modelListUrl: "", // 模型列表接口地址
  systemPrompt: "",
  subtitlePrompt: "",
  subtitlePromptSlug: "subtitle-segmentation",
  nobatchPrompt: "",
  nobatchUserPrompt: "",
  nobatchPromptSlug: "nobatch-translation-concise",
  userPrompt: "",
  tone: BUILTIN_STONES[0], // 翻译风格
  placeholder: BUILTIN_PLACEHOLDERS[0], // 占位符
  placetag: BUILTIN_PLACETAGS[0], // 占位标签
  aiTerms: "", // AI智能专业术语（apiSetting.aiTerms，全路径生效：整页/划词/输入框/字幕；与规则级 #glossary 逐 key 合并时接口级覆盖同名）
  customHeader: "",
  customBody: "",
  fetchLimit: DEFAULT_FETCH_LIMIT, // 最大请求数量
  fetchInterval: DEFAULT_FETCH_INTERVAL, // 请求间隔时间
  httpTimeout: DEFAULT_HTTP_TIMEOUT, // 请求超时时间
  transAllnow: false, // 是否立即全部翻译
  rootMargin: 2000, // 滚动加载提前触发距离
  temperature: 0.0,
  maxTokens: 20480,
  thinkingMode: "disabled", // 思考模式：auto | enabled | disabled
  thinkingEffort: "_default", // 思考强度：_default=接口默认,不注入参数
  isDisabled: false, // 是否不显示,
  region: "", // Azure 专用
  sortOrder: 0, // 排序权重，数值越小越靠前
  placetagFormat: "compact", // 占位符格式：compact(<a1>) 或 attribute(<a i=1>)
};

// Built-in presets remain available for explicit activation in settings.
// Display-only names; the slug stays machine-readable.
const API_DISPLAY_NAMES = {
  [OPT_TRANS_TRANSLATOR_API]: "Translator API",
  [OPT_TRANS_LOCAL_TRANSLATOR]: "Local Translator",
};

export const DEFAULT_API_LIST = OPT_ALL_TRANS_TYPES.map((apiType) =>
  normalizeApiThinkingSetting({
    ...defaultApi,
    ...NATIVE_PRESET_OVERRIDES[apiType],
    apiSlug: apiType,
    apiName: API_DISPLAY_NAMES[apiType] || apiType,
    apiType,
    isDisabled: !DEFAULT_ENABLED_API_TYPES.has(apiType),
    sortOrder: DEFAULT_ENABLED_API_TYPES.has(apiType) ? 0 : 999,
  })
);

/**
 * 为单个翻译接口补齐模型列表 URL。
 *
 * 这里专门用来兼容旧版本保存的数据：旧数据里没有 `modelListUrl` 字段，
 * 读取到的值会是 `undefined`。如果用户已经显式保存为空字符串，说明用户
 * 选择不配置模型列表接口，不能再用默认值覆盖。
 *
 * @param {object} apiSetting 单个翻译接口配置
 * @returns {object} 补齐后的接口配置；如果无需修改，则返回原对象引用
 */
export function fillDefaultApiModelListUrl(apiSetting) {
  if (!apiSetting || typeof apiSetting !== "object") {
    return apiSetting;
  }
  // 只有 undefined 才代表旧数据缺字段；空字符串或自定义 URL 都应原样保留。
  if (apiSetting.modelListUrl !== undefined) {
    return apiSetting;
  }

  // 按接口类型查找内置默认配置，未查到官方模型列表接口时补为空字符串。
  const defaultApiOpt =
    DEFAULT_API_LIST.find((item) => item.apiType === apiSetting.apiType) || {};
  return {
    ...apiSetting,
    modelListUrl: defaultApiOpt.modelListUrl || "",
  };
}

/**
 * 批量补齐翻译接口列表中的模型列表 URL。
 *
 * 该函数保持不可变更新：只有发现旧数据缺少 `modelListUrl` 时才创建新数组
 * 和新接口对象；没有任何变更时返回原数组引用，方便调用方用引用比较避免
 * 多余的设置写回和 React 重渲染。
 *
 * @param {Array<object>} transApis 翻译接口配置列表
 * @returns {Array<object>} 归一化后的接口配置列表
 */
export function normalizeApiModelListUrls(transApis = []) {
  if (!Array.isArray(transApis)) {
    return transApis;
  }

  let hasChanges = false;
  const nextApis = transApis.map((api) => {
    const nextApi = fillDefaultApiModelListUrl(api);
    // helper 返回新对象时，说明该 API 是需要补字段的旧数据。
    if (nextApi !== api) {
      hasChanges = true;
    }
    return nextApi;
  });

  // 无变更时保留原数组引用，避免触发不必要的持久化更新。
  return hasChanges ? nextApis : transApis;
}

export const DEFAULT_API_TYPE = OPT_TRANS_TRANSLATOR_API;
export const DEFAULT_API_SETTING = DEFAULT_API_LIST.find(
  (a) => a.apiType === DEFAULT_API_TYPE
);
