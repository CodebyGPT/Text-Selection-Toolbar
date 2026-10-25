import { resolveUiLang } from "../config/i18n";

/**
 * Settings UI messages. Values are ordered as [zh, en, ru].
 * Components call `t("key")`; no post-render DOM translation is used.
 */
const MESSAGES = {
  tabGeneral: ["通用", "General", "Общие"],
  tabTranslation: ["翻译", "Translation", "Перевод"],
  tabAbout: ["关于", "About", "О программе"],
  loadingSettings: ["加载设置…", "Loading settings…", "Загрузка настроек…"],
  closeSettings: ["关闭设置", "Close settings", "Закрыть настройки"],

  preset: ["预设", "Preset", "Пресет"],
  custom: ["自定义", "Custom", "Свой"],
  external: ["外部", "External", "Внешний"],
  expandCollapse: ["展开/收起", "Expand/Collapse", "Развернуть/Свернуть"],
  reset: ["重置", "Reset", "Сбросить"],
  delete: ["删除", "Delete", "Удалить"],
  name: ["名称", "Name", "Название"],
  modified: ["已修改", "Modified", "Изменено"],

  testLoading: ["测试中…", "Testing…", "Проверка…"],
  testApi: ["测试接口", "Test API", "Проверить API"],
  sentToStranslate: ["已发送到 STranslate", "Sent to STranslate", "Отправлено в STranslate"],
  testTimeout: [
    "测试超时（60 秒未返回结果）",
    "Test timed out (no result in 60s)",
    "Тест не завершился за 60 с",
  ],

  maxConcurrency: [
    "最大并发请求数量",
    "Maximum concurrent requests",
    "Максимум одновременных запросов",
  ],
  requestInterval: ["每次请求间隔 (ms)", "Request interval (ms)", "Интервал запросов (мс)"],
  requestTimeout: ["请求超时时间 (s)", "Request timeout (s)", "Таймаут запроса (с)"],
  temperature: ["温度", "Temperature", "Температура"],
  maxTokens: ["最大 Token 数", "Max tokens", "Максимум токенов"],
  thinkingMode: ["思考模式", "Thinking mode", "Режим рассуждений"],
  off: ["关闭", "Off", "Выкл."],
  auto: ["自动", "Auto", "Авто"],
  on: ["开启", "On", "Вкл."],

  customHeader: ["自定义请求头", "Custom headers", "Свои заголовки"],
  customHeaderPlaceholder: [
    '使用JSON格式，例如 "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0"',
    'JSON, e.g. "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0"',
    'JSON, например "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0"',
  ],
  customBody: ["自定义请求体", "Custom request body", "Своё тело запроса"],
  customBodyPlaceholder: [
    '使用JSON格式，例如 "top_p": 0.7',
    'JSON, e.g. "top_p": 0.7',
    'JSON, например "top_p": 0.7',
  ],
  translationPrompt: ["翻译提示词", "Translation prompt", "Промпт перевода"],
  fetchingModels: ["获取模型中…", "Fetching models…", "Загрузка моделей…"],
  noModelsFound: [
    "未找到模型，可手动输入。",
    "No models found. You can enter one manually.",
    "Модели не найдены. Можно ввести вручную.",
  ],
  fetchModelsFailed: [
    "获取模型失败：{message}",
    "Failed to fetch models: {message}",
    "Не удалось загрузить модели: {message}",
  ],
  keyPlaceholder: [
    "支持用英文逗号“,”分隔，轮询调用",
    'Supports polling calls separated by English commas ",".',
    "Поддерживается перебор значений через английскую запятую «,».",
  ],
  mtranKeyPlaceholder: [
    "MT_API_TOKEN（可选）",
    "MT_API_TOKEN (optional)",
    "MT_API_TOKEN (необязательно)",
  ],
  modelListUrl: ["模型列表 URL", "Model list URL", "URL списка моделей"],
  model: ["模型", "Model", "Модель"],
  port: ["端口", "Port", "Порт"],
  customApiName: ["自定义接口 {n}", "Custom API {n}", "Свой API {n}"],
  translationApi: ["翻译接口", "Translation API", "API перевода"],
  addCustomApi: ["+ 添加自定义接口", "+ Add custom API", "+ Добавить свой API"],

  uiLanguage: ["界面语言", "Interface language", "Язык интерфейса"],
  followSystem: ["跟随系统", "Follow system", "Как в системе"],
  simplifiedChinese: ["简体中文", "Simplified Chinese", "Китайский (упрощённый)"],
  interfaceTheme: ["界面主题", "Interface theme", "Тема интерфейса"],
  light: ["浅色", "Light", "Светлая"],
  dark: ["深色", "Dark", "Тёмная"],

  searchEngineN: ["搜索引擎 {index}", "Search engine {index}", "Поисковая система {index}"],
  searchEngineName: ["搜索引擎名称", "Search engine name", "Название поисковой системы"],
  searchKeywordPlaceholder: ["用 %s 代替关键词", "Use %s for the query", "Используйте %s вместо запроса"],
  addSearchEngine: ["+ 添加搜索引擎", "+ Add search engine", "+ Добавить поисковую систему"],
  maxSearchEngines: ["最多 8 个", "Up to 8", "Не более 8"],

  menuManagement: ["菜单管理", "Menu Management", "Управление меню"],
  menuTranslate: ["翻译面板", "Translation Panel", "Панель перевода"],
  menuBlock: ["隐藏网页元素", "Hide Page Elements", "Скрыть элементы страницы"],
  menuBlockHelp: [
    "用户可以利用该工具隐藏某些网页自带的划词栏",
    "Use this tool to hide page-owned toolbars that pop up when text is selected",
    "С помощью этого инструмента можно скрыть собственные панели сайта, появляющиеся при выделении текста",
  ],
  menuSettings: ["脚本设置", "Script Settings", "Настройки скрипта"],
  blockMenuWarning: [
    "关闭后不再注册菜单项，已保存的隐藏规则仍然生效",
    "Hiding this only unregisters the menu item; saved rules still apply.",
    "Скрывается только пункт меню; сохранённые правила продолжают работать",
  ],
  moveUp: ["上移", "Move up", "Вверх"],
  moveDown: ["下移", "Move down", "Вниз"],

  toolbarAppearance: ["工具栏外观", "Toolbar appearance", "Внешний вид панели"],
  offset: ["弹出时的偏移值 (px)", "Offset when shown (px)", "Смещение при появлении (px)"],
  offsetHelp: [
    "让工具栏与选区保持适当距离，避免遮挡选取的文本",
    "Keeps the toolbar a little away from the selection so it does not cover the selected text",
    "Держит панель на расстоянии от выделения, чтобы не закрывать выделенный текст",
  ],
  displayTime: ["停留时长 (ms)", "Display time (ms)", "Время показа (мс)"],
  neverAutoHide: ["0 表示不自动消失", "0 = never auto-hide", "0 = не скрывать автоматически"],
  buttonLayout: ["按钮布局", "Button layout", "Раскладка кнопок"],
  horizontalCapsule: ["横向胶囊", "Horizontal capsule", "Горизонтальная капсула"],
  verticalMenu: ["纵向菜单", "Vertical menu", "Вертикальное меню"],
  onScroll: [
    "当页面滚动或尺寸变化时",
    "When the page scrolls or resizes",
    "При прокрутке или изменении размера страницы",
  ],
  repaintWithSelection: [
    "始终刷新工具栏位置",
    "Always refresh the toolbar position",
    "Всегда обновлять положение панели",
  ],
  repaintViewport: [
    "锚点若仍在可视范围内则刷新工具栏位置，超出则隐藏",
    "Refresh the toolbar position while the selection stays visible; hide it otherwise",
    "Обновлять положение, пока выделение в зоне видимости; иначе скрывать",
  ],
  hideOnScroll: [
    "始终隐藏工具栏",
    "Always hide the toolbar",
    "Всегда скрывать панель",
  ],
  forceLightButtons: ["强制浅色按钮", "Force light toolbar", "Светлая панель принудительно"],
  showPendingPaste: ["显示待粘贴的文本", "Show pending paste text", "Показывать текст для вставки"],
  featureSwitches: ["功能开关", "Feature switches", "Переключатели функций"],
  showTranslateButton: ["显示翻译按钮", "Show translate button", "Показывать кнопку перевода"],
  translateHideThreshold: [
    "翻译按钮自动隐藏阈值",
    "Translate button auto-hide threshold",
    "Порог автоскрытия кнопки перевода",
  ],
  translateHideThresholdHelp: [
    "检测选取的文本中属于当前显示语言文字的占比，当占比达到阈值时不再在工具栏中显示翻译按钮",
    "Measures how much of the selection is written in the current display language; at the threshold the translate button is no longer shown",
    "Определяет долю текста выделения на текущем языке отображения; при достижении порога кнопка перевода больше не показывается",
  ],
  detectHiddenLinks: ["识别不可见的超链接", "Detect hidden hyperlinks", "Распознавать скрытые ссылки"],
  smartPaste: ["闪电粘贴", "Smart paste", "Быстрая вставка"],
  smartPasteHelp: [
    "启用后，在浏览器内复制任意文本并在闪电粘贴有效期内点击任意标签页中的文本框，会弹出粘贴按钮",
    "Once enabled, copy any text in the browser and click a text box on any tab within the TTL to get a paste button",
    "Если включено, скопируйте любой текст и в течение срока действия нажмите на поле ввода на любой вкладке — появится кнопка вставки",
  ],
  pasteTtl: ["闪电粘贴有效期 (s)", "Smart paste TTL (s)", "Срок быстрой вставки (с)"],
  linkDragPreview: [
    "链接拖拽预览",
    "Link drag preview",
    "Предпросмотр ссылки при перетаскивании",
  ],
  unlockHotkey: ["超级取词热键", "Super-selection hotkey", "Горячая клавиша супервыделения"],
  unlockHotkeyHelp: [
    "按住热键期间，脚本会临时解除网页对复制等行为的干扰，松开复原",
    "While the hotkey is held, the script temporarily lifts the page's copy restrictions and restores them on release",
    "Пока клавиша удерживается, скрипт временно снимает ограничения страницы на копирование и возвращает их после отпускания",
  ],
  hotkeyCtrlLeft: ["左 Ctrl", "Left Ctrl", "Левый Ctrl"],
  hotkeyCtrlRight: ["右 Ctrl", "Right Ctrl", "Правый Ctrl"],
  hotkeyAltLeft: ["左 Alt", "Left Alt", "Левый Alt"],
  hotkeyAltRight: ["右 Alt", "Right Alt", "Правый Alt"],
  hotkeyShiftLeft: ["左 Shift", "Left Shift", "Левый Shift"],
  hotkeyShiftRight: ["右 Shift", "Right Shift", "Правый Shift"],
  hotkeyMetaLeft: ["左 Win", "Left Win", "Левый Win"],
  hotkeyMetaRight: ["右 Win", "Right Win", "Правый Win"],
  hotkeyDisabled: ["禁用", "Disabled", "Отключено"],
  search: ["搜索管理", "Search management", "Управление поиском"],

  translationPanel: ["翻译面板", "Translation panel", "Панель перевода"],
  sourceLang: ["源语言", "Source language", "Исходный язык"],
  targetLang: ["目标语言", "Target language", "Целевой язык"],
  secondTargetLang: ["第二目标语言", "Second target language", "Второй целевой язык"],
  reverseTranslation: ["用于反向互译", "For reverse translation", "Для обратного перевода"],
  panelApiHelp: [
    "选择带“外部”标签的接口后，点击工具栏翻译按钮会直接把文本发送给外部程序，不打开翻译面板",
    "Selecting an interface tagged External sends the text directly from the toolbar button without opening the panel.",
    "При выборе внешнего интерфейса текст отправляется напрямую, без открытия панели.",
  ],
  minimalStyle: ["极简样式", "Minimal style", "Минималистичный стиль"],
  hideOnBlur: ["失焦自动隐藏", "Hide on blur", "Скрывать при потере фокуса"],
  followSelection: ["跟随选区", "Follow selection", "Следовать за выделением"],
  autoDetect: ["自动检测", "Auto detect", "Автоопределение"],

  promptManagement: ["翻译提示词", "Translation prompts", "Промпты перевода"],
  addCustomPrompt: ["+ 添加自定义提示词", "+ Add custom prompt", "+ Добавить промпт"],
  customPromptName: ["自定义提示词 {n}", "Custom prompt {n}", "Свой промпт {n}"],
  systemPrompt: ["系统提示词", "System prompt", "Системный промпт"],
  userPrompt: ["用户提示词", "User prompt", "Пользовательский промпт"],

  about: ["关于", "About", "О программе"],
  version: ["版本号", "Version", "Версия"],
  homepage: ["主页", "Homepage", "Домашняя страница"],
  openHomepage: ["打开主页", "Open homepage", "Открыть домашнюю страницу"],
  license: ["许可证", "License", "Лицензия"],
  disableFestival: ["禁用节日彩蛋", "Disable festival effects", "Отключить праздничные эффекты"],
  disableFestivalHelp: [
    "仅节日期间显示，关闭后所有节日点击特效都不再显示",
    "Only shown on festival days; turning it off disables every festival click effect.",
    "Показывается только в праздники; отключает все праздничные эффекты.",
  ],
  todayIsFestival: ["今天是{festival}！", "Today is {festival}!", "Сегодня {festival}!"],
};

const LANG_INDEX = { zh: 0, en: 1, ru: 2 };

// The settings overlay is a single-instance app. A module-level language keeps
// `t` available to every component without prop drilling or a missing hook.
let settingsLanguage = resolveUiLang("auto");

export function setSettingsLanguage(lang) {
  settingsLanguage = resolveUiLang(lang);
}

export function t(key, params) {
  const index = LANG_INDEX[settingsLanguage] ?? 1;
  const entry = MESSAGES[key];
  let text = entry ? entry[index] ?? entry[1] ?? entry[0] : key;
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      params[name] === undefined ? match : String(params[name])
    );
  }
  return text;
}
