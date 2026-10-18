# main.user.js Project Structure Analysis Report

## Overview

- **Filename**: `main.user.js`
- **Total Lines**: 3246 lines
- **Script Name**: Text Selection Toolbar (划词工具栏)
- **Version**: 2026.03.05
- **License**: GPL-3.0
- **Run At**: `document-start`
- **Injection**: `content` (injected directly into the page)

## Module Breakdown

### 1. Metadata & License Declaration (Lines 1-47)
- UserScript header (name, version, description, permissions, match rules, etc.)
- Multi-language non-original content disclaimer

### 2. Async Compatibility Layer (Lines 49-76)
- `safeGetValue` / `safeSetValue`: Compatible with both GM.getValue (async standard) and GM_getValue (Tampermonkey sync)
- `safeOpenTab`: Compatible with both GM.openInTab and GM_openInTab

### 3. Configuration & State Management (Lines 78-152)
- `DEFAULT_CONFIG`: Default configuration (17 items: language, position mode, offset, timeout, button style, theme, search engine, etc.)
- `SCROLL_REPAINT_MODE`: Scroll repaint mode enum
- `SEARCH_ENGINES`: Search engine registry (Google, Baidu, Bing, Brave)
- Runtime state variables (cached selection, UI timers, Shadow DOM, etc.)
- `configCache` in-memory config cache + `getConfig`/`setConfig` sync-read/async-write

### 4. I18N Multi-language System (Lines 154-385)
- Three languages: `zh-CN`, `en`, `ru`
- Covers all UI text: menu items, buttons, prompts, festival messages, etc.
- `t(key, ...args)`: Translation function with auto language detection

### 5. Edit Mode & Compliance Banner (Lines 387-536)
- `isEditMode` / `hasEditSessionStarted` state
- `ensureComplianceBanner()`: Canvas anti-tampering text + MutationObserver self-repair
- `toggleEditMode(enable)`: Toggle `document.designMode`

### 6. Menu System (Lines 538-768)
- `initConfiguration()`: Parallel load all config items
- `initDefaultSearchEngine()`: Timezone-based auto-set default search engine
- `registerMenus()`: Registers ~18 `GM_registerMenuCommand` entries (language, position, offset, timeout, style, theme, search engine, smart engine, fallback engine, cache, toast, hotkey, lightning paste, drag preview, delete button, blocker, edit mode, reset)

### 7. Link & Password Extraction (Lines 774-823)
- URL extraction: Chinese noise cleanup, regex matching, domain validation, private IP filtering
- Cloud drive extraction code regex extraction

### 8. Selection Geometry Calculator (Lines 826-909)
- `getSmartSelectionState()`: Three-tier fallback strategy
  - Tier A: Smart Rect (direction-aware + vertical writing mode detection)
  - Tier B: Classic bounding box (`getBoundingClientRect`)
  - Tier C: Mouse position fallback (construct virtual Rect)

### 9. Shadow DOM Container & Styles (Lines 910-1193)
- `initContainer()`: Create/rebuild Shadow DOM host (mounted on `<html>` not `<body>`, SPA-proof)
- `getStyles()`: Dynamic stylesheet generation (row/column, light/dark, liquid glass effect, dividers, Toast styles)

### 10. Drag Link Preview (Lines 1196-1294)
- `handleLinkDragStart()` / `handleLinkDragEnd()`: Opens preview window when drag distance > 30px
- `openPreviewWindow()`: Golden ratio window size (61.8% of screen)

### 11. Unlock Mode / Super Selection (Lines 1296-1721)
- `getUnlockCSS()`: Force text-selectable + disable dragging + overlay piercing
- `cleanInlineEvents()`: Remove inline event handlers (onselectstart, oncopy, etc.)
- `toggleUnlockMode()`: Inject/remove CSS and event interceptors
- `handleExpandHover()`: Auto-expand truncated text on hover (single-line ellipsis / multi-line line-clamp)
- Keyboard listeners (keydown to activate, keyup to deactivate)
- `modifiedElements` set: Tracks and restores modified input attributes

### 12. Clipboard & Toast (Lines 1724-1769)
- `copyToClipboard()`: Three-tier fallback (ClipboardItem → writeText → GM_setClipboard)
- `showToast()`: Toast notification inside Shadow DOM

### 13. Background Brightness Detection (Lines 1770-1813)
- `getBestContrastTheme()`: YIQ formula to calculate background brightness, returns 'theme-light-ui' or 'theme-dark-ui'

### 14. Button Renderer (Lines 1815-2246)
- `renderButton()`: Core UI rendering function, supports three modes:
  - **Edit Mode**: Delete, Bold, Highlight buttons
  - **Default Mode**: Copy + Cut(input) + Delete(input) + Search(short text) + Chain Button(links) + Correct(Chinese input) + Paste(three-button mode)
  - **Paste Mode**: Single paste button (cloud drive code priority)
- Position calculation: forward/backward selection, vertical writing mode, edge detection

### 15. Event Handler System (Lines 2259-2690)
- `handleSelectionMouseUp()`: Main selection event entry point (10ms delay)
- `handleGlobalMouseDown()`: Hide UI on external click
- `handleResizeOrScroll()`: Scroll/resize repaint (always/viewport/hide strategies)
- `handleContextMenu()`: Clear cache on right-click
- `handleKeydownHideUI()`: Keypress hide (except unlock mode)
- `handleInputPasteMouseUp()`: Input paste entry point (20ms delay)

### 16. Smart Text Correction (Lines 2389-2548)
- `smartCorrectText()`: 9 Chinese typography rules
  - Rule 1: Add space between Chinese and English
  - Rule 2: Add space between Chinese and numbers (math-context-aware)
  - Rule 3: Remove space before punctuation
  - Rule 4: Number + unit handling
  - Rule 5: Deduplicate Chinese periods
  - Rule 6: English punctuation → Chinese in pure Chinese environment
  - Rule 7: Chinese colon → English colon between numbers
  - Rule 8: Fix quote pairing
  - Rule 9: Line break / whitespace removal
- `handleTextCorrection()`: Execute correction (execCommand insertText or fallback paste)
- `performPaste()`: Generic paste logic (execCommand → contentEditable/text → native value setter)

### 17. Element Blocker (Lines 2692-2848)
- `activateElementPicker()`: Red highlight overlay + click-to-block
- `disablePicker()`: Exit picker mode
- `generateCssSelector()`: Generate shortest unique CSS selector
- `saveBlockRule()` / `applySavedBlockingRules()`: Rule persistence

### 18. Fireworks Particle Effects (Lines 2850-2971)
- `getFestivalType()`: Lunar/solar calendar festival detection (CNY/Christmas)
- `triggerSpringFestivalEffect()`: Canvas-free particle animation (20-40 particles, gravity + friction)
- `getSpringFestivalToastText()`: Festival toast message

### 19. Bootstrap (Lines 2973+)
- `main()`: Async startup sequence
  1. Load configuration
  2. Initialize default search engine
  3. Register menus
  4. Apply blocking rules
  5. Register Ctrl+scroll interception
  6. Register all event listeners
  7. Register drag preview events
  8. Register page-hide lightning paste cache cleanup (visibilitychange)
  9. Check cloud drive password handover

## Technical Features

| Feature | Implementation |
|---------|---------------|
| UI Isolation | Shadow DOM (mounted on documentElement) |
| Style Injection | Dynamic CSS string generation (liquid glass effect) |
| Config Storage | GM_setValue/GM_getValue + memory cache |
| Selection Positioning | Three-tier fallback: Smart Rect → Bounding Box → Mouse Position |
| Clipboard | Three-tier fallback: ClipboardItem → writeText → GM_setClipboard |
| Compatibility | Async/sync GM API compat layer |
| SPA Protection | Container rebuild + mount on `<html>` |
| Compliance Banner | Canvas anti-tampering text + MutationObserver self-repair |

## Module Dependency Graph

```
main()
 ├── initConfiguration() → safeGetValue × N
 ├── initDefaultSearchEngine() → safeGetValue / safeSetValue
 ├── registerMenus() → GM_registerMenuCommand × N
 ├── applySavedBlockingRules() → configCache
 ├── [Event Listeners]
 │    ├── handleSelectionMouseUp → getSmartSelectionState / initContainer / renderButton
 │    ├── handleInputPasteMouseUp → renderButton
 │    ├── handleResizeOrScroll → renderButton
 │    ├── handleContextMenu → hideUI / safeSetValue
 │    ├── keydown/keyup → toggleUnlockMode / toggleEditMode
 │    └── wheel → Ctrl+scroll interception
 ├── [Drag Preview] → handleLinkDragStart/handleLinkDragEnd → openPreviewWindow
 └── [Pan Code Handover] → checkPanHandover
```

## Proposed Module Split Plan

| Module File | Content | Est. Lines |
|---|---|---|
| `header.js` | UserScript metadata + license | ~50 |
| `compat.js` | GM API compat layer | ~30 |
| `config.js` | Config management + state + constants | ~80 |
| `i18n.js` | Multi-language system | ~230 |
| `compliance.js` | Edit mode + compliance banner | ~150 |
| `menu.js` | GM menu system | ~230 |
| `extractors.js` | Link extraction + cloud drive password extraction | ~50 |
| `selection.js` | Selection geometry calculator | ~85 |
| `shadow-dom.js` | Shadow DOM container + styles | ~285 |
| `drag-preview.js` | Drag link preview | ~100 |
| `unlock-mode.js` | Super selection mode | ~425 |
| `clipboard.js` | Clipboard ops + Toast | ~50 |
| `theme.js` | Background brightness detection | ~45 |
| `renderer.js` | Button renderer | ~430 |
| `events.js` | Event handler system | ~70 |
| `text-correct.js` | Smart text correction | ~160 |
| `blocker.js` | Element blocker | ~155 |
| `festival.js` | Fireworks particle effects | ~120 |
| `bootstrap.js` | Bootstrap | ~105 |
| `build.js` | Build script (concatenate modules) | ~30 |
