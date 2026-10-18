/**
 * @file navigation.js
 * @description 页面导航与独立窗口/标签页打开工具函数
 */

export async function openOptionsPage(path = "") {
  const target = path && !path.startsWith("/") ? `/${path}` : path || "/";
  const { openSettings } = await import("../settings");
  openSettings(target);
}
