const paths = require("react-scripts/config/paths");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const path = require("path");

// 纯油猴脚本构建：只打包 userscript.js，不生成扩展页面/后台脚本。
const userscriptWebpack = (config, env) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    [path.resolve(__dirname, "src/libs/interpreter.js")]: path.resolve(
      __dirname,
      "src/libs/stubs/interpreter-gm.js"
    ),
    "webextension-polyfill$": path.resolve(
      __dirname,
      "src/libs/stubs/empty-object.js"
    ),
  };

  const banner = `// ==UserScript==
// @name          ${process.env.REACT_APP_NAME}
// @name:en       ${process.env.REACT_APP_NAME}
// @name:zh-CN    ${process.env.REACT_APP_NAME_CN}
// @name:ru       Панель выделения текста
// @namespace     https://github.com/CodebyGPT/Text_Selection_Toolbar
// @version       ${process.env.REACT_APP_VERSION}
// @description   A text selection toolbar with translation.
// @description:en A text selection toolbar with translation.
// @description:zh-CN 为浏览器增加一个带翻译功能的划词工具栏。
// @description:ru Панель инструментов для выделения текста с переводом.
// @author        CodebyGPT
// @homepageURL   https://github.com/CodebyGPT/Text_Selection_Toolbar
// @supportURL    https://github.com/CodebyGPT/Text_Selection_Toolbar/issues
// @license       GPL-3.0
// @icon          data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjYzdjN2M3Ij48cGF0aCBkPSJNNDQyLjUtMTAzLjVRNDI3LTExOSA0MjctMTQxdDE1LjUtMzcuNVE0NTgtMTk0IDQ4MC0xOTR0MzcuNSAxNS41UTUzMy0xNjMgNTMzLTE0MXQtMTUuNSAzNy41UTUwMi04OCA0ODAtODh0LTM3LjUtMTUuNVptLTE3MCAwUTI1Ny0xMTkgMjU3LTE0MXQxNS41LTM3LjVRMjg4LTE5NCAzMTAtMTk0dDM3LjUgMTUuNVEzNjMtMTYzIDM2My0xNDF0LTE1LjUgMzcuNVEzMzItODggMzEwLTg4dC0zNy41LTE1LjVabS0xNjkgMFE4OC0xMTkgODgtMTQxdDE1LjUtMzcuNVExMTktMTk0IDE0MS0xOTR0MzcuNSAxNS41UTE5NC0xNjMgMTk0LTE0MXQtMTUuNSAzNy41UTE2My04OCAxNDEtODh0LTM3LjUtMTUuNVptMC0xNjlRODgtMjg4IDg4LTMxMHQxNS41LTM3LjVRMTE5LTM2MyAxNDEtMzYzdDM3LjUgMTUuNVExOTQtMzMyIDE5NC0zMTB0LTE1LjUgMzcuNVExNjMtMjU3IDE0MS0yNTd0LTM3LjUtMTUuNVptMC0xNzBRODgtNDU4IDg4LTQ4MHQxNS41LTM3LjVRMTE5LTUzMyAxNDEtNTMzdDM3LjUgMTUuNVExOTQtNTAyIDE5NC00ODB0LTE1LjUgMzcuNVExNjMtNDI3IDE0MS00Mjd0LTM3LjUtMTUuNVptMC0xNjlRODgtNjI3IDg4LTY0OXQxNS41LTM3LjVRMTE5LTcwMiAxNDEtNzAydDM3LjUgMTUuNVExOTQtNjcxIDE5NC02NDl0LTE1LjUgMzcuNVExNjMtNTk2IDE0MS01OTZ0LTM3LjUtMTUuNVptMzM5LTE3MFE0MjctNzk3IDQyNy04MTl0MTUuNS0zNy41UTQ1OC04NzIgNDgwLTg3MnQzNy41IDE1LjVRNTMzLTg0MSA1MzMtODE5dC0xNS41IDM3LjVRNTAyLTc2NiA0ODAtNzY2dC0zNy41LTE1LjVabS0xNzAgMFEyNTctNzk3IDI1Ny04MTl0MTUuNS0zNy41UTI4OC04NzIgMzEwLTg3MnQzNy41IDE1LjVRMzYzLTg0MSAzNjMtODE5dC0xNS41IDM3LjVRMzMyLTc2NiAzMTAtNzY2dC0zNy41LTE1LjVabS0xNjkgMFE4OC03OTcgODgtODE5dDE1LjUtMzcuNVExMTktODcyIDE0MS04NzJ0MzcuNSAxNS41UTE5NC04NDEgMTk0LTgxOXQtMTUuNSAzNy41UTE2My03NjYgMTQxLTc2NnQtMzcuNS0xNS41WiIvPjxwYXRoIGZpbGw9IiMwMDAwMDAiIHN0cm9rZT0iI2M3YzdjNyIgc3Ryb2tlLXdpZHRoPSI0OCIgcGFpbnQtb3JkZXI9InN0cm9rZSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTY1MC04OHEtMjIgMC0zNy41LTE1LjVUNTk3LTE0MXEwLTIyIDE1LjUtMzcuNVQ2NTAtMTk0aDMxdi01NzJoLTMxcS0yMiAwLTM3LjUtMTUuNVQ1OTctODE5cTAtMjIgMTUuNS0zNy41VDY1MC04NzJoMTY5cTIyIDAgMzcuNSAxNS41VDg3Mi04MTlxMCAyMi0xNS41IDM3LjVUODE5LTc2NmgtMzJ2NTcyaDMycTIyIDAgMzcuNSAxNS41VDg3Mi0xNDFxMCAyMi0xNS41IDM3LjVUODE5LTg4SDY1MFoiLz48L3N2Zz4K
// @match         *://*/*
// @grant         GM.xmlHttpRequest
// @grant         GM_xmlhttpRequest
// @grant         GM.registerMenuCommand
// @grant         GM_registerMenuCommand
// @grant         GM.unregisterMenuCommand
// @grant         GM_unregisterMenuCommand
// @grant         GM.setValue
// @grant         GM_setValue
// @grant         GM.getValue
// @grant         GM_getValue
// @grant         GM.deleteValue
// @grant         GM_deleteValue
// @grant         GM.addValueChangeListener
// @grant         GM_addValueChangeListener
// @grant         GM.removeValueChangeListener
// @grant         GM_removeValueChangeListener
// @grant         GM.info
// @grant         GM_info
// @grant         GM.openInTab
// @grant         GM_openInTab
// @grant         GM.setClipboard
// @grant         GM_setClipboard
// @grant         GM_addStyle
// @grant         unsafeWindow
// @connect       localhost
// @connect       127.0.0.1
// @sandbox       DOM
// @inject-into   content
// @run-at        document-end
// ==/UserScript==

`;

  config.entry = {
    "text-selection-toolbar.user": paths.appSrc + "/userscript.js",
  };

  config.output.filename = "[name].js";
  config.output.publicPath = env === "production" ? "./" : "/";
  config.optimization.splitChunks = { cacheGroups: { default: false } };
  config.optimization.runtimeChunk = false;
  config.optimization.minimize = env === "production";

  if (config.optimization.minimize) {
    config.optimization.minimizer = [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: {
            passes: 2,
            pure_funcs: ["console.debug"],
          },
          format: {
            comments: false,
            preamble: banner,
          },
        },
      }),
    ];
  }

  if (env === "production") config.devtool = false;

  const names = ["HtmlWebpackPlugin", "WebpackManifestPlugin"];
  config.plugins = config.plugins.filter(
    (plugin) => !names.includes(plugin.constructor.name)
  );
  // 动态 import 全部内联，保证 .user.js 是单文件。
  config.plugins.push(
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })
  );

  return config;
};

module.exports = {
  webpack: userscriptWebpack,
  jest: (config) => {
    process.env.REACT_APP_CLIENT = "userscript";
    config.testPathIgnorePatterns = [
      ...(config.testPathIgnorePatterns || []),
      "<rootDir>/src/localAi/",
    ];
    return config;
  },
};
