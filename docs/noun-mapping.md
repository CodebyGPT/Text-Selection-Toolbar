# Chinese-English Noun Mapping Table

> Project: Text Selection Toolbar (划词工具栏)
> All identifiers (variables, functions, config keys, CSS classes, GM storage keys, I18N keys, filenames) — arranged by category.

---

## I. Configuration Keys (`02-config.js`)

| Config Key | Chinese (Original Meaning) | English Equivalent |
|---|---|---|
| `language` | 语言 | Language |
| `positionMode` | 定位模式 | Position Mode |
| `offset` | 偏移量 | Offset (px) |
| `timeout` | 停留时长 | Timeout (ms) |
| `buttonStyle` | 按钮样式 | Button Style |
| `forceWhiteBlack` | 强制黑白配色 | Force Light Theme |
| `searchEngine` | 搜索引擎 | Search Engine |
| `enableToast` | 开启通知 | Enable Toast |
| `enableCache` | 开启缓存 | Enable Cache |
| `enableDeleteBtn` | 显示删除按钮 | Enable Delete Button |
| `enableDragPreview` | 开启拖拽预览 | Enable Drag Preview |
| `enablePaste` | 闪电粘贴 | Lightning Paste (enable) |
| `unlockHotkey` | 超级取词键 | Unlock Hotkey |
| `scrollRepaintMode` | UI 重绘策略 | Scroll Repaint Mode |
| `smartEngine` | 智能分配搜索引擎 | Smart Engine |
| `fallbackEngine` | 备用搜索引擎 | Fallback Engine |
| `customTLDs` | 自定义顶级域名 | Custom TLDs |

### Position Mode Values

| Value | Chinese | English |
|---|---|---|
| `endchar` | 字符末尾 | End of Text |
| `mouse` | 光标附近 | Mouse Cursor |

### Button Style Values

| Value | Chinese | English |
|---|---|---|
| `row` | 横排胶囊 | Row (Capsule) |
| `col` | 纵排矩形 | Column (Rect) |

### Scroll Repaint Modes

| Value | Chinese | English |
|---|---|---|
| `always` | 始终重绘 | Always Repaint |
| `viewport` | 锚点在视口内重绘 | Repaint in Viewport |
| `hide` | 始终不重绘 | Hide on Scroll |

### Search Engine Keys

| Key | English Name |
|---|---|
| `google` | Google |
| `baidu` | Baidu |
| `bing` | Bing |
| `brave` | Brave |

---

## II. GM Storage Keys (persistent keys stored via `safeGetValue`/`safeSetValue`)

| Storage Key | Chinese Meaning | English Purpose |
|---|---|---|
| `smart_paste_cache` | 闪电粘贴缓存 | Lightning Paste Cache |
| `scrollRepaintMode` | UI 重绘策略 | Scroll Repaint Mode (persisted) |
| `blocked_elements` | 元素屏蔽规则 | Blocked Elements Rules |
| `engine_initialized` | 搜索引擎初始化标记 | Engine Initialized Flag |
| `searchEngine` | 搜索引擎 | Search Engine (persisted) |

### `smart_paste_cache` Shape

```
{
  text: string,        // cached text (extraction code or clipboard content)
  timestamp: number,   // Date.now() on write; forward-shifted for pan_code
  type?: 'pan_code'    // optional marker: 'pan_code' for cloud drive codes
}
```

### `smart_paste_cache` Lifecycle

| Event | Operation | Chinese Description |
|---|---|---|
| Copy/Cut click | write + unregister listener | 复制/剪切 → 写入缓存，注销 visibilitychange |
| Paste click | write + register listener | 粘贴 → 重置时间戳，注册监听 |
| Chain btn (single link + code) | write (type: pan_code, +22s) + unregister | 链按钮 → 写入提取码，前移22秒 |
| Key/Paste consumed | write {text:'', timestamp:0} + unregister | 消费后 → 覆盖为过期值 |
| Right-click | write {text:'', timestamp:0} + unregister | 右键清除 → 覆盖为过期值 |
| visibilitychange → hidden | write {text:'', timestamp:0} + unregister | 标签页隐藏 → 覆盖为过期值 |

---

## III. CSS Class Names (`08-shadow-dom.js`, `13-renderer.js`)

| Class | Chinese Purpose | English Purpose |
|---|---|---|
| `sc-container` | 按钮容器 | Button Container |
| `sc-container.visible` | 可见状态 | Visible State |
| `sc-btn` | 单个按钮 | Single Button |
| `sc-toast` | 通知提示 | Toast Notification |
| `sc-toast.show` | 显示通知 | Show Toast |
| `sc-icon-wrap` | 图标包装器（角标锚点） | Icon Wrapper (badge anchor) |
| `sc-badge` | 链接数量角标 | Link Count Badge |
| `sc-badge-key` | 钥匙图标角标 | Key Icon Badge |
| `theme-dark-ui` | 深色 UI 主题 | Dark UI Theme |
| `theme-light-ui` | 浅色 UI 主题 | Light UI Theme |
| `divider` | 按钮分割线 | Button Divider |
| `divider-v` | 垂直分割线 | Vertical Divider |
| `divider-h` | 水平分割线 | Horizontal Divider |

---

## IV. DOM Element IDs

| ID | Chinese Purpose | English Purpose |
|---|---|---|
| `tm-smart-copy-host` | Shadow DOM 宿主容器 | Shadow DOM Host Container |
| `tm-smart-copy-unlock-style` | 超级取词模式样式表 | Unlock Mode Style Element |
| `tm-sc-{random}` | 合规声明横幅 | Compliance Banner (random ID) |

---

## V. Data Attributes

| Attribute | Chinese Purpose | English Purpose |
|---|---|---|
| `data-tm-policy="protected"` | 保护标记（CSS 排除） | Protected Marker (CSS exclusion) |
| `data-btn-count` | 按钮计数（控制单按钮样式） | Button Count (single-btn styling) |
| `data-sc-original-type` | 原始 input type（密码还原） | Original Input Type (password restore) |
| `data-sc-was-disabled` | 原始 disabled 状态 | Original Disabled State |
| `data-sc-was-read-only` | 原始 readOnly 状态 | Original ReadOnly State |

---

## VI. Filenames / Module Names

| Module # | File | English Description |
|---|---|---|
| 00 | `00-header.js` | UserScript Metadata + License |
| 01 | `01-compat.js` | GM API Async Compat Layer |
| 02 | `02-config.js` | Config Constants + State Management |
| 03 | `03-i18n.js` | I18N System |
| 04 | `04-compliance.js` | Edit Mode + Compliance Banner |
| 05 | `05-menu.js` | GM Menu System |
| 06 | `06-extractors.js` | Link & Password Extractors |
| 07 | `07-selection.js` | Selection Geometry Calculator |
| 08 | `08-shadow-dom.js` | Shadow DOM Container + Styles |
| 09 | `09-drag-preview.js` | Drag Link Preview |
| 10 | `10-unlock-mode.js` | Unlock Mode / Super Selection |
| 11 | `11-clipboard.js` | Clipboard Operations + Toast |
| 12 | `12-theme.js` | Background Brightness Detection |
| 13 | `13-renderer.js` | Button Renderer |
| 14 | `14-events.js` | Event Handlers |
| 15 | `15-text-correct.js` | Smart Text Correction |
| 16 | `16-blocker.js` | Element Blocker |
| 17 | `17-festival.js` | Fireworks Particle Effects |
| 19 | `19-bootstrap.js` | Bootstrap (IIFE Entry) |

---

## VII. GM API Wrappers (`01-compat.js`)

| Function | Chinese Description | English Description |
|---|---|---|
| `safeGetValue(key, def)` | 优先异步读取，降级同步 | Async-first read, fallback to sync |
| `safeSetValue(key, val)` | 优先异步写入，降级同步 | Async-first write, fallback to sync |
| `safeOpenTab(url, options)` | 优先异步开标签页，降级同步 | Async-first open tab, fallback to sync |

---

## VIII. Global State Variables (module-level `let` bindings)

| Variable | Module | Chinese Purpose | English Purpose |
|---|---|---|---|
| `cachedSelection` | 02-config | 缓存的选区文本+HTML | Cached Selection |
| `configCache` | 02-config | 运行时配置缓存 | Config Cache |
| `shadowRoot` | 02-config | Shadow DOM 根节点 | Shadow DOM Root |
| `hostElement` | 02-config | Shadow DOM 宿主元素 | Host Element |
| `uiTimer` | 02-config | UI 自动隐藏定时器 | UI Auto-hide Timer |
| `toastTimer` | 02-config | Toast 自动隐藏定时器 | Toast Auto-hide Timer |
| `isScrolling` | 02-config | 滚动中标记 | Scrolling Flag |
| `scrollTimeout` | 02-config | 滚动防抖定时器 | Scroll Debounce Timer |
| `isEditMode` | 04-compliance | 编辑模式状态 | Edit Mode Flag |
| `hasEditSessionStarted` | 04-compliance | 编辑模式已开启标记 | Edit Session Started |
| `complianceObserver` | 04-compliance | 合规声明 MutationObserver | Compliance Observer |
| `currentBannerId` | 04-compliance | 当前横幅 ID | Current Banner ID |
| `isUnlockMode` | 10-unlock | 超级取词模式状态 | Unlock Mode Flag |
| `unlockStyleEl` | 10-unlock | 超级取词模式样式元素 | Unlock Style Element |
| `modifiedElements` | 10-unlock | 被修改的输入框集合 | Modified Inputs Set |
| `startPos` | 10-unlock | 鼠标按下位置 | Mouse Down Position |
| `dragStartData` | 09-drag | 拖拽起点数据 | Drag Start Data |
| `pickerOverlay` | 16-blocker | 拾取模式高亮遮罩 | Picker Overlay |
| `visibilityChangeHandler` | 19-bootstrap | visibilitychange 监听器 | Visibility Change Handler |

---

## IX. Internal Config Constants (`02-config.js`)

| Constant | Chinese Purpose | English Purpose |
|---|---|---|
| `DEFAULT_CONFIG` | 默认配置表 | Default Configuration |
| `SCROLL_REPAINT_MODE` | 滚动重绘模式枚举 | Scroll Repaint Mode Enum |
| `PASTE_MODE_THREE_BTNS` | 闪电粘贴三按钮模式标记 | Three-button Paste Mode Marker |
| `SEARCH_ENGINES` | 搜索引擎列表 | Search Engine Registry |
| `TLD_SET` | 内置顶级域名白名单 | Built-in TLD Whitelist |
| `TLD_SET_EXTENDED` | 扩展 TLD 集合（合自定义） | Extended TLD Set |

---

## X. Key Functions (alphabetical)

| Function | Module | Chinese Purpose | English Purpose |
|---|---|---|---|
| `activateElementPicker()` | 16-blocker | 激活拾取模式 | Activate Element Picker |
| `applySavedBlockingRules()` | 16-blocker | 应用已保存的屏蔽规则 | Apply Saved Block Rules |
| `cleanInlineEvents()` | 10-unlock | 清理行内事件 | Clean Inline Events |
| `cleanupExpandedElements()` | 10-unlock | 清理展开的截断文本 | Cleanup Expanded Text |
| `copyToClipboard(text, html)` | 11-clipboard | 复制到剪贴板（三级降级） | Copy to Clipboard (3-tier fallback) |
| `disablePicker()` | 16-blocker | 退出拾取模式 | Disable Element Picker |
| `ensureComplianceBanner()` | 04-compliance | 创建/重建合规声明 | Ensure Compliance Banner |
| `extractAllCodesWithPositions(text)` | 06-extractors | 提取所有密码及位置 | Extract All Extraction Codes |
| `extractEmailFromText(text)` | 06-extractors | 提取邮箱地址 | Extract Email Address |
| `extractLinkAndCode(text)` | 06-extractors | 智能提取链接+密码 | Extract Links + Extraction Codes |
| `extractUrlsFromText(text)` | 06-extractors | 从文本提取所有URL | Extract All URLs |
| `generateCssSelector(el)` | 16-blocker | 生成最短唯一CSS选择器 | Generate Minimal CSS Selector |
| `generateRandomId()` | 04-compliance | 生成随机ID（防拦截） | Generate Random ID |
| `getBestContrastTheme()` | 12-theme | 获取最佳对比主题 | Get Best Contrast Theme |
| `getConfig(key)` | 02-config | 同步读取配置 | Synchronous Config Read |
| `getEffectiveTLDs()` | 06-extractors | 获取合并TLD集合 | Get Effective TLD Set |
| `getFestivalType()` | 17-festival | 检测节日彩蛋类型 | Get Festival Type |
| `getSmartSelectionState()` | 07-selection | 智能获取选区定位 | Get Smart Selection State |
| `getSpringFestivalToastText()` | 17-festival | 获取节日 Toast 文案 | Get Spring Festival Toast Text |
| `getStyles()` | 08-shadow-dom | 获取样式表字符串 | Get Stylesheet String |
| `getUnlockCSS()` | 10-unlock | 获取超级取词CSS | Get Unlock Mode CSS |
| `handleCaptureClick(e)` | 10-unlock | 拦截点击事件 | Capture Click Handler |
| `handleCaptureCopy(e)` | 10-unlock | 拦截复制事件 | Capture Copy Handler |
| `handleCaptureDragStart(e)` | 10-unlock | 拦截拖拽开始 | Capture Drag Start Handler |
| `handleCaptureMouseDown(e)` | 10-unlock | 拦截鼠标按下 | Capture Mouse Down Handler |
| `handleCaptureSelectStart(e)` | 10-unlock | 拦截选择开始 | Capture Select Start Handler |
| `handleCaptureSelectionChange(e)` | 10-unlock | 拦截选区变化 | Capture Selection Change Handler |
| `handleContextMenu(e)` | 14-events | 右键菜单处理 | Context Menu Handler |
| `handleExpandHover(e)` | 10-unlock | 悬停展开截断文本 | Expand Truncated Text on Hover |
| `handleGlobalMouseDown(e)` | 14-events | 全局鼠标按下 | Global Mouse Down |
| `handleInputPasteMouseUp(e)` | 14-events | 输入框粘贴检测 | Input Paste Detection |
| `handleKeydownHideUI(e)` | 14-events | 按键隐藏 UI | Keydown Hide UI |
| `handleLinkDragEnd(e)` | 09-drag | 拖拽结束处理 | Link Drag End Handler |
| `handleLinkDragStart(e)` | 09-drag | 拖拽开始处理 | Link Drag Start Handler |
| `handleResizeOrScroll()` | 14-events | 滚动/窗口变化处理 | Scroll/Resize Handler |
| `handleSelectionMouseUp(e)` | 14-events | 选区鼠标抬起处理 | Selection Mouse Up Handler |
| `handleTextCorrection(target, text)` | 15-text-correct | 执行文本校正 | Execute Text Correction |
| `hideUI()` | 13-renderer | 隐藏 UI 按钮 | Hide UI |
| `initConfiguration()` | 05-menu | 初始化加载所有配置 | Initialize Configuration |
| `initContainer()` | 08-shadow-dom | 初始化 Shadow DOM 容器 | Initialize Container |
| `initDefaultSearchEngine()` | 05-menu | 首次运行设置默认引擎 | Initialize Default Search Engine |
| `isProtectedElement(target)` | 10-unlock | 检查是否为受保护元素 | Check Protected Element |
| `openPreviewWindow(url)` | 09-drag | 打开预览窗口 | Open Preview Window |
| `performPaste(target, text)` | 15-text-correct | 执行粘贴（三级降级） | Perform Paste (3-tier fallback) |
| `registerMenus()` | 05-menu | 注册 GM 菜单 | Register GM Menus |
| `registerVisibilityCleanup()` | 19-bootstrap | 注册 visibilitychange 清理 | Register Visibility Cleanup |
| `renderButton(rect, mouseX, mouseY, text, html, mode, ...)` | 13-renderer | 渲染 UI 按钮 | Render UI Buttons |
| `safeGetValue(key, def)` | 01-compat | 安全异步读取 | Safe Async Get |
| `safeSetValue(key, val)` | 01-compat | 安全异步写入 | Safe Async Set |
| `safeOpenTab(url, options)` | 01-compat | 安全打开标签页 | Safe Open Tab |
| `saveBlockRule(selector)` | 16-blocker | 保存屏蔽规则 | Save Block Rule |
| `scanUrlPath(text, startPos)` | 06-extractors | 扫描URL路径 | Scan URL Path |
| `setConfig(key, val)` | 02-config | 异步写入配置 | Asynchronous Config Write |
| `showToast(msg)` | 11-clipboard | 显示 Toast 通知 | Show Toast |
| `smartCorrectText(text, isInputType)` | 15-text-correct | 智能校正中文文本 | Smart Text Correction |
| `toggleEditMode(enable)` | 04-compliance | 切换编辑模式 | Toggle Edit Mode |
| `toggleUnlockMode(active)` | 10-unlock | 切换超级取词模式 | Toggle Unlock Mode |
| `triggerSpringFestivalEffect(x, y, shadowRoot)` | 17-festival | 触发烟花特效 | Trigger Fireworks Effect |
| `trimUrlTail(url)` | 06-extractors | 清理URL末尾字符 | Trim URL Tail |
| `unregisterVisibilityCleanup()` | 19-bootstrap | 注销 visibilitychange 清理 | Unregister Visibility Cleanup |

---

## XI. I18N Key Mapping (`03-i18n.js`)

| I18N Key (code) | Chinese (zh-CN) | English (en) |
|---|---|---|
| `lang_name` | 简体中文 | English |
| `menu_lang` | 🌐 语言/Language | 🌐 Language |
| `menu_pos` | 📍 UI 弹出位置 | 📍 Position |
| `val_endchar` | 字符末尾 | End of Text |
| `val_mouse` | 光标附近 | Mouse Cursor |
| `menu_offset` | 📏 UI 弹出偏移量 | 📏 Offset |
| `prompt_offset` | 请输入 UI 距离锚点的偏移量 (px): | Enter offset distance (px): |
| `menu_timeout` | ⏱️ UI 停留时长 | ⏱️ Timeout |
| `val_infinite` | 不消失 | Infinite |
| `prompt_timeout` | 请输入 UI 停留时长 (ms, 0表示不自动消失): | Enter timeout (ms, 0 = infinite): |
| `menu_style` | 🎨 UI 布局 | 🎨 Layout |
| `val_row` | 横排胶囊 | Row (Capsule) |
| `val_col` | 纵排矩形 | Column (Rect) |
| `menu_theme` | 🌓 UI 配色 | 🌓 Theme |
| `val_light` | 强制浅色 | Force Light |
| `val_auto` | 自动反色 | Auto Contrast |
| `menu_search` | 🔍 搜索引擎 | 🔍 Engine |
| `prompt_search` | 请输入搜索引擎代码 (...) 或完整URL (%s 代替关键词): | Enter engine code (...) or URL with %s: |
| `err_search` | 无效的输入。自定义URL需包含 %s | Invalid input. Custom URL must contain %s |
| `menu_cache` | 💾 选中即缓存 | 💾 Cache Selection |
| `val_on` | 开启 | On |
| `val_off` | 关闭 | Off |
| `menu_toast` | 🔔 操作反馈 | 🔔 Toast Notification |
| `menu_hotkey` | 🔑 超级取词键 | 🔑 Unlock Hotkey |
| `val_disabled` | 已禁用 | Disabled |
| `prompt_hotkey` | 请指定快捷键 (如 Ctrl, Alt, Shift) 或输入 "NONE" 以禁用: | Press a key (Ctrl, Alt...) or type "NONE" to disable: |
| `menu_paste` | ⚡ 闪电粘贴 | ⚡ Smart Paste |
| `menu_block` | 🚫 屏蔽网页自建划词栏 | 🚫 Block Page Element |
| `menu_clear` | 🗑️ 清除当前域名屏蔽规则 | 🗑️ Clear Block Rules |
| `confirm_clear` | 确定要清除 %s 下所有屏蔽规则吗？ | Clear all rules for %s? |
| `alert_cleared` | 规则已清除，请刷新。 | Rules cleared. Please refresh. |
| `alert_no_rules` | 当前域名无已保存的规则。 | No rules found for this domain. |
| `menu_reset` | ⚙️ 重置全部设置 | ⚙️ Reset Settings |
| `confirm_reset` | 确定要重置所有的设置吗？ | Reset all settings? |
| `toast_unlock` | 🔓 超级取词已激活 | 🔓 Unlock Mode Active |
| `toast_copied` | 已复制 | Copied |
| `toast_pasted` | 已粘贴 | Pasted |
| `toast_paste_compat` | 已粘贴 (兼容模式) | Pasted (Compat) |
| `toast_paste_fail` | 粘贴失败 | Paste Failed |
| `picker_active` | 已进入拾取模式；按 ESC 退出 | Picker Mode Active (ESC to exit) |
| `picker_cant_block_self` | 不能屏蔽脚本自身的按钮！ | Cannot block script UI! |
| `picker_confirm` | 确定屏蔽该元素吗？(按Esc退出)\n\n选择器: %s | Block this element? (ESC to cancel)\n\nSelector: %s |
| `picker_saved` | 元素已屏蔽并保存规则 | Element blocked & saved. |
| `picker_exit` | 已退出拾取模式 | Picker Mode Exited |
| `btn_copy` | 复制 | Copy |
| `btn_search` | 搜索 | Search |
| `btn_paste` | 粘贴 | Paste |
| `festival_cny` | 🏮已复制🏮 | 🏮 Copied 🏮 |
| `festival_xmas` | 🎄已复制🎄 | 🎄 Copied 🎄 |
| `btn_open_link` | 打开链接 | Open Link |
| `btn_email` | @ 复制邮箱 | @ Copy Email |
| `toast_email_copied` | 邮箱地址已复制 | Email Copied |
| `toast_password_pasted` | 已粘贴提取码 | Code Pasted |
| `menu_tld_add` | ➕ 添加自定义顶级域名 | ➕ Add Custom TLD |
| `prompt_tld_add` | 请输入要添加的顶级域名 (如 xyz 或 .xyz): | Enter TLD to add (e.g. xyz or .xyz): |
| `toast_tld_added` | 已添加域名: %s | TLD added: %s |
| `err_tld_invalid` | 无效的域名格式。请输入如 xyz 或 .xyz | Invalid TLD format. Use e.g. xyz or .xyz |
| `menu_drag_preview` | 🔗 拖拽预览 | 🔗 Drag Link Preview |
| `btn_cut` | 剪切 | Cut |
| `menu_edit` | ✏️ 编辑网页 | ✏️ Edit Page |
| `menu_exit_edit` | 已退出编辑 | Exit Edit Mode |
| `btn_delete` | 删除 | Delete |
| `btn_bold` | 加粗 | Bold |
| `btn_highlight` | 标记 | Highlight |
| `disclaimer_text` | 此网页内容已经过 <SCRIPT_NAME> 编辑 | Content edited by <SCRIPT_NAME> for simplification purposes only. |
| `scroll_repaint` | 📜 UI 重绘策略 | 📜 UI redrawing |
| `scroll_always` | 始终重绘 | Always redraw |
| `scroll_viewport` | 锚点在视口内重绘 | Redraw anchor points within the viewport |
| `scroll_hide` | 始终不重绘 | Never redraw |
| `menu_smart_engine` | 🧠 智能分配搜索引擎 | 🧠 Smart Engine |
| `menu_fallback_engine` | 🔍 备用搜索引擎 | 🔍 Fallback Engine |
| `val_smart_on` | 开启 | On |
| `val_smart_off` | 关闭 | Off |
| `menu_delete_btn` | 🗑️ 删除按钮可见性 | 🗑️ Visibility of the delete button |
| `val_show` | 显示 | Show |
| `val_hide` | 隐藏 | Hide |

---

## XII. Domain-Specific Terminology

| Chinese Term | English Translation | Meaning in Project Context |
|---|---|---|
| 划词工具栏 | Text Selection Toolbar | Root project name |
| 划词 | Text Selection | Selecting text on a webpage |
| 闪电粘贴 | Lightning Paste | One-click paste from cached clipboard |
| 超级取词模式 | Unlock Mode / Super Selection | Force-enable text selection on restricted pages |
| 网盘提取码 | Cloud Drive Extraction Code (pan_code) | Password for cloud storage links (e.g., Baidu Pan, 189 Cloud) |
| 拾取模式 | Picker Mode | Point-and-click to block elements on a page |
| 角标 | Badge | Overlay indicator (number or key icon) on chain button |
| 链按钮 | Chain / Link Button | Button that opens detected URLs |
| 合规声明 | Compliance Banner | "Content edited by XXX" disclaimer banner |
| 智能校正 | Smart Text Correction | Chinese typography auto-correction (9 rules) |
| 烟花特效 | Fireworks / Festival Particles | CNY/Christmas particle burst on copy |
| 胶囊按钮 | Capsule Button | Row layout button style |
| 矩形按钮 | Rect Button | Column layout button style |
| 锁定模式 / 编辑模式 | Edit Mode | document.designMode editing |
| 拖拽预览 | Drag Preview | Link preview popup on drag |
| 元素屏蔽器 | Element Blocker | Element blocking subsystem |
| 三按钮模式 | Three-button Mode | Copy + Search + Paste for lightning paste |
| 玻璃折射效果 | Glass Refraction Effect | UI frosted glass + refraction CSS effect |
| HDR 辉光 | HDR Glow | Button hover glow effect |
| 临时缓存 / 持久缓存 | Temporary / Persistent Cache | Categorized by lifecycle |

---

## XIII. Memory Document Index

| Memory File | Chinese Title (original) | English Title |
|---|---|---|
| `coding-iron-rules.md` | 编码铁律（最高优先级） | Coding Iron Rules |
| `user_profile.md` | 用户档案 | User Profile |
| `project_architecture.md` | 项目架构 | Project Architecture |
| `lightning_paste_cache.md` | 闪电粘贴缓存设计 | Lightning Paste Cache Design |
| `no_ai_annotations.md` | 注释规范（禁AI标记） | Comment Conventions (No AI Annotations) |
| `gh_auth.md` | GitHub/网络认证经验 | GitHub & Network Auth Lessons |
| `edit-safety.md` | 编辑安全自检 | Edit Safety Self-Check |

---

*Generated on 2026-06-21. Maintained by project maintainer — update when new identifiers are introduced.*
