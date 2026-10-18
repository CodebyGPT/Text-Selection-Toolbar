# <img src="https://api.iconify.design/material-symbols:touch-triple.svg" width="32"> Text Selection Toolbar - 划词工具栏

> [🇨🇳 中文版](README.md) | [🇬🇧 English](readme_en.md)

![GitHub License](https://img.shields.io/github/license/CodebyGPT/Text_Selection_Toolbar)
![GitHub Repo stars](https://img.shields.io/github/stars/CodebyGPT/Text_Selection_Toolbar)
![Greasy Fork Downloads](https://img.shields.io/greasyfork/dt/558720)
![Greasy Fork Rating](https://img.shields.io/greasyfork/rating-count/558720)

![demo](https://github.com/user-attachments/assets/f119f59d-fca7-4364-b2e0-c556f2501c7f)

## What is this?

https://github.com/user-attachments/assets/fb64dc93-37e7-421f-bc5d-89a8ef43b7c8

A UserScript for mouse and trackpad users, aiming to replicate Microsoft Edge's built-in text selection toolbar. It enables quick copy, search, and other operations on selected text without repeatedly opening the right-click context menu.

## How to Install?

It is recommended to install from [👉**Greasy Fork**👈](https://greasyfork.org/zh-CN/scripts/558720) for automatic updates. Alternatively, download from [**GitHub Releases**](https://github.com/CodebyGPT/word_selection_toolbar/releases) and import manually into your script manager.

> If this is your first time installing a UserScript, you must first install a script manager in your browser: Chromium 138+ recommended: [ScriptCat](https://docs.scriptcat.org/); older Chromium and Firefox browsers recommended: [Violentmonkey](https://violentmonkey.github.io/), [Legacy ScriptCat (v0.16.x)](https://github.com/scriptscat/scriptcat/releases/tag/v0.16.11).

## Basic Features

* Toolbar UI inspired by Apple Inc.'s Liquid Glass style (future plans: hover highlights, click-bounce effects cross-browser, lens refraction via CSS and SVG filters for Chromium-based browsers)
* Multi-language support (machine-translated)
* Low memory footprint
* 100% event-driven
* Runs in an isolated context, makes no modifications to the webpage by default — does not affect normal page operation
* 100% offline (script auto-updates are handled by the script manager reading metadata)
* No obfuscated code
* Built according to the latest [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web) for maximum compatibility

## Implemented Features

| Feature | Details |
| :------ | :------ |
| 🖱️ Text Selection | Shows quick copy and search toolbar on text selection. If the text contains hyperlinks, shows an Open Link (new tab) button. For common cloud drive links with access passwords and "Lightning Paste" enabled, the password can be quickly pasted when clicking an input field on the target page. |
| ⌨️ Inline Selection | Shows quick copy and cut buttons in input fields. In Chinese environments, if built-in rules match (e.g., missing spaces between CJK and Latin characters not enclosed in quotes), shows a correction button. |
| ⚡ Lightning Paste | After copying, clicking any input field on any tab shows a paste button directly. |
| 🔓 Unlock Mode | Hold the hotkey (default: Left Ctrl) to temporarily remove JS/CSS restrictions on selection, copying, Ctrl+C, etc. Reveals masked passwords in plain text, enables selection of truncated text. Releasing the hotkey restores everything. |
| 🔗 Drag Preview | Drag any hyperlink to open a small preview window. |
| 🚫 Block Native Toolbar | Block annoying built-in text selection toolbars on websites. |

## Language

This project is primarily developed in Chinese with full English translation of code comments and documentation assets. For the complete bilingual noun mapping reference, see [docs/noun-mapping.md](docs/noun-mapping.md).

## License

GPL-3.0
