# Changelog

## 2026.06.18 — Lightning Paste Cross-Tab Survival Optimization

### Improvements
- **Conditional visibilitychange cleanup**: Caches produced by copy/cut are no longer affected by tab switching; visibilitychange listener is only registered after paste resets the timestamp
- **Dynamic register/unregister**: `registerVisibilityCleanup()` / `unregisterVisibilityCleanup()` control listener lifecycle on demand
- **No active deletion**: All cache invalidation paths now write expired cache `{ text: '', timestamp: 0 }` as overwrite, never setting null, maintaining one-way overwrite semantics

### Technical Details
- `19-bootstrap.js`: Removed permanently registered visibilitychange listener; exposed dynamic register/unregister functions instead
- `13-renderer.js`: Copy/cut calls `unregisterVisibilityCleanup()` after write; paste timestamp reset calls `registerVisibilityCleanup()`
- `14-events.js`: Both right-click clear and 8-second expiration checks write expired cache overwrite, never actively setting null
- 8-second expiration changed to pure judgment logic (does not modify cache); cache is preserved until overwritten by a new copy/cut

## 2026.06.18 — URL Identifier Exact Matching + Anchor Position Fix

### Fixes
- **Password assignment now uses anchor position**: `extractLinkAndCode()` no longer re-searches via `indexOf(host)`, uses `anchorStart` (original text position) calculated by `extractUrlsFromText()` — eliminates position offset for same-domain URLs
- **Consumption matching now uses URL identifiers**: Added `extractPanUrlId()` function, extracts unique identifiers from each cloud drive URL (Baidu `/s/XXXXX`, Tianyi `/t/XXXXX`, Ali `/s/XXXXX`, etc.), enabling O(1) exact lookup on consumption, eliminating same-domain cross-contamination
- **Cross-redirect matching**: `/s/XXXXX` and `/share/init?surl=XXXXX` extract the same identifier, adapting to URL redirects from Baidu and similar cloud drives

### Technical Details
- `pan_code_map` key changed from full URL to `extractPanUrlId()` identifier
- `extractUrlsFromText()` return object now includes `anchorStart` field
- `checkPanCodeMap` changed from O(n) traversal + domain substring matching to O(1) identifier direct lookup
- Supports lanzou, 123pan, quark, etc. as generic fallback

## 2026.06.18 — Batch Multi-Link Independent Password Cache

### New Features
- **Password per URL**: When opening multiple cloud drive links in batch, each link carries its own extraction code without interference
- **`pan_code_map`**: Password mapping table keyed by full URL, replacing single `pan_code_cache` — isolates links under the same domain
- **1-hour auto-expiry cleanup**: Unconsumed password entries are automatically cleared after 1 hour to prevent storage pollution

### Fixes
- **Password length relaxed to 3 chars**: `{4,8}` → `{3,8}`, fixing issues with 3-character codes like `hka`
- **Multi-link password assignment**: `extractLinkAndCode()` added `extractAllCodesWithPositions()` stage, assigning each password to its nearest URL by text position
- **URL prefix match on consumption**: `checkPanCodeMap()` iterates all entries; matches when current page URL contains the stored URL; deletes the entry after consumption

### Technical Details
- `pan_code_map` storage format: `{ "http://pan.baidu.com/s/xxx": { code: "hka", ts: ... } }`
- Batch open writes all passwords at once; toast shows `已粘贴提取码 x3`
- Each tab independently consumes its own password entry; entry deleted after consumption

## 2026.06.18 — Cloud Drive Password Cache Restructure

### Fixes
- **Independent cloud drive password cache**: `pan_paste_handover` renamed to `pan_code_cache`, no longer mixed with lightning paste cache
- **Removed 15-second timeout**: Cloud drive password cache has no time limit, persists until manually pasted or right-click cleared
- **Cache priority**: Page hidden no longer clears cloud drive password cache (only lightning paste cache); cloud drive paste button takes priority over lightning paste
- **Toast notification optimization**: Respects `enableToast` setting; shows notification based on user config when caching and reading passwords

### Cache Lifecycle
- **Write**: Click link button with extraction code → write to `pan_code_cache`
- **Consume**: Click input field on target page → clear `sessionPanCode` after paste
- **Manual clear**: Right-click menu → clear all caches
- **Note**: Page hidden (visibilitychange) does not clear cloud drive password cache

## 2026.06.17 — Text Selection Major Improvements

### New Features
- **TLD Domain Whitelist Validation**: Embedded Top 100 TLD list; only matching domains are recognized as URL links, reducing false positives
- **Email Detection & @ Button**: When selected text contains `@`, shows the @ button; click copies the full email address to clipboard
- **Custom TLD Menu Option**: Custom TLDs can be added via script manager menu; supports i18n (Chinese/English/Russian)

### Improvements
- **Complete rewrite of cloud drive access code extraction**: New `extractLinkAndCode()` function unified URL and password extraction
  - Supports Chinese noise words (e.g., "删、去、这几个字" etc.) mixed within URLs
  - Extended password detection keywords: 提取码, 密码, 访问码, 分享码, 口令, code, pwd, key, pw, pass
  - Supports bracket format extraction: `(访问码:cpn0)` and `(:cpn0)` and `(cpn0)`
  - Password length expanded to 4-8 characters
  - Enhanced URL trailing character cleanup
  - Excludes private IP addresses (10.x, 172.16-31.x, 192.168.x, 127.x, 0.x)

### Technical Details
- Added `TLD_SET` collection containing 100 TLDs
- Added `getEffectiveTLDs()` to merge built-in and user-defined TLDs
- Deprecated old `extractLinkFromText()` and `extractPanCode()` and `PAN_CODE_REGEX`
- @ button uses SVG icon from at-sign.txt
- Email detection takes priority over link detection (both @ and URL present → show @ button first)

## 2026.06.18 — Cloud Drive URL Extraction Precision Fix

### Fixes
- **Fixed URL path over-consumption**: Dual-strategy URL extraction
  - Strategy A: Character-by-character scan in original text; Chinese character immediately sets boundary; content after Chinese is not part of URL
  - Strategy B: If no anchor in original text, search in Chinese-cleaned text (handles extreme cases of Chinese embedded inside URLs)
  - Fixed `(访问码:cpn0)` being mistakenly absorbed into URL — detects `(` before Chinese as comment boundary and backtracks
- **RFC 3986 strict character filtering**: Only URL-safe characters (`a-zA-Z0-9._~:/?#[]@!$&'()*+,;=%\-`) allowed in path
- **Non-ASCII characters rejected**: Chinese, emoji, full-width symbols, etc. will not be mixed into URLs

### Test Cases
- Case 1: `【天翼云盘：https://cloud.189.cn/t/3yqYreieuUFv(访问码:cpn0) 】` → URL correctly extracted as `https://cloud.189.cn/t/3yqYreieuUFv`, password `cpn0`
- Case 2: `5日iPhone 历代壁纸https://www.aliyundrive.com/s/rxUp6HNpwP8点击链接...` → URL correctly extracted as `https://www.aliyundrive.com/s/rxUp6HNpwP8`
- Case 3: `htt删p:/去/pan这.bai几du.co个m/s/hff字H57gb?...（提取码:5u8m）` → URL extracted as `http://pan.baidu.com/s/hffH57gb?=yhgfdxcc54`, password `5u8m`

## 2026.06.18 — Protocol-less URL + Multi-Link + Password Extraction Enhancement

### New Features
- **Multi-link detection and batch open**: Selected text containing multiple URLs shows link count badge; click to open all links (200ms interval to avoid popup blocking)
- **Protocol-less URL detection**: Supports `cloud.189.cn/t/xxx` format (without `http://` prefix) for automatic domain recognition

### Fixes
- **`码` keyword password extraction**: Added `/码\s*[:：\s]*([a-zA-Z0-9]{4,8})/` pattern, supporting shorthand formats like `码 7515`
- **Multi-anchor dedup optimization**: Uses actual URL scan end position for anchor deduplication, preventing incorrect URL merging

### Technical Details
- `extractLinkAndCode()` return type changed to `{ urls: [...], password }` supporting multi-URL
- Added `extractUrlsFromText()` function to unify protocol anchors and domain anchors
- Link button shows red number badge in multi-link mode (e.g., "x3")
- Added `DOMAIN_ANCHOR_PATTERN` regex for protocol-less domain matching
