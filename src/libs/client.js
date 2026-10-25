/**
 * @file client.js
 * @description 根据编译时的环境变量 (REACT_APP_CLIENT) 自动判定当前的运行客户端环境类型，对外暴露布尔判定变量。
 */

import {
  CLIENT_EXTS,
  CLIENT_USERSCRIPT,
  CLIENT_WEB,
  CLIENT_CHROME,
  CLIENT_FIREFOX,
} from "../config";

export const client = process.env.REACT_APP_CLIENT; // 获取当前的客户端标识
export const isExt = CLIENT_EXTS.includes(client); // 是否为浏览器插件扩展环境 (Chrome, Edge, Firefox, Thunderbird)
export const isGm = client === CLIENT_USERSCRIPT;
