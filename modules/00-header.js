// ==UserScript==
// @name               Text Selection Toolbar
// @name:en            Text Selection Toolbar
// @name:ru            Панель_выбора_текста
// @name:zh-CN         划词工具栏
// @namespace          https://github.com/CodebyGPT/Text_Selection_Toolbar
// @version            2026.06.19
// @description        Add a text selection toolbar to your browser.
// @description:en     Add a text selection toolbar to your browser.
// @description:ru     Добавьте панель инструментов для выделения текста в ваш браузер.
// @description:zh-CN  为你的浏览器增加一个划词工具栏。
// @author             CodebyGPT
// @license            GPL-3.0
// @license            https://www.gnu.org/licenses/gpl-3.0.txt
// @match              *://*/*
// @icon               data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjx0aXRsZSB4bWxucz0iIj50b3VjaC10cmlwbGU8L3RpdGxlPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0ibTE3Ljk3NSAzLjRsMS0xLjc1cTEuMTc1LjY1IDEuODUgMS44MjVUMjEuNSA2cTAgLjY3NS0uMTc1IDEuMzEzdC0uNSAxLjE4N2wtMS43MjUtMXEuMi0uMzUuMy0uNzEyVDE5LjUgNnEwLS44LS40MTItMS41dC0xLjExMy0xLjFtLTQgMGwxLTEuNzVxMS4xNzUuNjUgMS44NSAxLjgyNVQxNy41IDZxMCAuNjc1LS4xNzUgMS4zMTN0LS41IDEuMTg3bC0xLjcyNS0xcS4yLS4zNS4zLS43MTJUMTUuNSA2cTAtLjgtLjQxMy0xLjV0LTEuMTEyLTEuMW0tMy41IDE4LjZxLS43IDAtMS4zMTItLjN0LTEuMDM4LS44NWwtNS40NS02LjkyNWwuNDc1LS41cS41LS41MjUgMS4yLS42MjV0MS4zLjI3NUw3LjUgMTQuMlY2cTAtLjQyNS4yODgtLjcxMlQ4LjUgNXQuNzI1LjI4OHQuMy43MTJ2NUgxN3ExLjI1IDAgMi4xMjUuODc1VDIwIDE0djRxMCAxLjY1LTEuMTc1IDIuODI1VDE2IDIyem0tNi4zLTEzLjVxLS4zMjUtLjU1LS41LTEuMTg3VDMuNSA2cTAtMi4wNzUgMS40NjMtMy41MzdUOC41IDF0My41MzggMS40NjNUMTMuNSA2cTAgLjY3NS0uMTc1IDEuMzEzdC0uNSAxLjE4N2wtMS43MjUtMXEuMi0uMzUuMy0uNzEyVDExLjUgNnEwLTEuMjUtLjg3NS0yLjEyNVQ4LjUgM3QtMi4xMjUuODc1VDUuNSA2cTAgLjQyNS4xLjc4OHQuMy43MTJ6Ii8+PC9zdmc+
// @grant              GM_registerMenuCommand
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_openInTab
// @grant              GM_addStyle
// @grant              GM_setClipboard
// @sandbox            DOM
// @inject-into        content
// @run-at             document-start
// @supportURL         https://github.com/CodebyGPT/Text_Selection_Toolbar/issues
// ==/UserScript==

