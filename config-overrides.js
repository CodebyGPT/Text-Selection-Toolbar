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
// @name:zh-CN    ${process.env.REACT_APP_NAME_CN}
// @namespace     https://github.com/CodebyGPT/Text_Selection_Toolbar
// @version       ${process.env.REACT_APP_VERSION}
// @description   A text selection toolbar with translation.
// @description:zh-CN 为浏览器增加一个带翻译功能的划词工具栏。
// @author        CodebyGPT
// @homepageURL   https://github.com/CodebyGPT/Text_Selection_Toolbar
// @supportURL    https://github.com/CodebyGPT/Text_Selection_Toolbar/issues
// @license       GPL-3.0
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
