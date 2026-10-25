 // 打开独立的翻译悬浮窗口

// --- 扩展运行中的内部通信 Message Action 常量 ---
export const MSG_FETCH = "kiss_fetch"; // 请求后台脚本动态更新内容安全策略(CSP)及请求头 Origin
export const MSG_BUILTINAI_DETECT = "builtinai_detect"; // 调用内置 AI 执行语言检测
export const MSG_BUILTINAI_TRANSLATE = "builtinai_translte"; // 调用内置 AI 执行文本翻译
export const MSG_BUILTINAI_SUMMARIZE = "builtinai_summarize";
export const MSG_SET_LOGLEVEL = "set_loglevel"; // 设置当前会话的日志等级
export const MSG_OPEN_SEPARATE_WINDOW = "open_separate_window"; // Cache the actual separate window bounds.
export const PORT_STREAM_FETCH = "kiss_stream_fetch";
