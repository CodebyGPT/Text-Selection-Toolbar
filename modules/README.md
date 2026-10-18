# Text Selection Toolbar - Modular Development

## Directory Structure

```
modules/
├── 00-header.js          # UserScript metadata + multi-language declaration
├── 01-compat.js          # GM API async compatibility layer
├── 02-config.js          # Config constants + state management
├── 03-i18n.js            # Three-language I18N system (zh-CN/en/ru)
├── 04-compliance.js      # Edit mode + Canvas anti-tampering banner
├── 05-menu.js            # GM menu registration system
├── 06-extractors.js      # URL extraction + cloud drive password extraction
├── 07-selection.js       # Three-tier selection positioning
├── 08-shadow-dom.js      # Shadow DOM + liquid glass styles
├── 09-drag-preview.js    # Link drag preview window
├── 10-unlock-mode.js     # Unlock mode / super selection
├── 11-clipboard.js       # Clipboard operations + Toast
├── 12-theme.js           # Background brightness adaptive theme
├── 13-renderer.js        # Button renderer (default/edit/paste three modes)
├── 14-events.js          # Mouse/keyboard/scroll event handling
├── 15-text-correct.js    # 9 Chinese typography correction rules
├── 16-blocker.js         # Element picker + blocker
├── 17-festival.js        # CNY/Christmas particle effects
├── 19-bootstrap.js       # Bootstrap (IIFE entry point)
└── build.js              # Build script (concatenate modules)
```

## Module Dependency Graph

```
01-compat.js (no dependencies, lowest level)
    ↓
02-config.js (depends on compat's safeGetValue/safeSetValue)
    ↓
03-i18n.js  (depends on config's getConfig)
    ↓
04-19*.js   (parallel dependencies on config + i18n + compat)
    ↓
19-bootstrap.js (depends on all above, IIFE entry)
```

## Build

```bash
node modules/build.js
```

The build script concatenates all modules in dependency order to generate `main.user.js` in the project root directory.

## Development Conventions

1. Each module has a comment header indicating the module number and function
2. Modules communicate via global variables (maintaining compatibility with the original script)
3. After modifying a single module, run the build script to verify
4. New modules must be added to the module list in `build.js`
