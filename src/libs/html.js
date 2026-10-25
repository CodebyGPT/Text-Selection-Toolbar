import { trustedTypesHelper } from "./trustedTypes";

/**
 * Decode HTML entities back to plain text.
 * @param {string} str
 * @returns {string}
 */
export function decodeHTMLEntities(str) {
  if (!str || typeof str !== "string") return str;

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    trustedTypesHelper.createHTML(str),
    "text/html"
  );

  return doc.documentElement.textContent || "";
}
