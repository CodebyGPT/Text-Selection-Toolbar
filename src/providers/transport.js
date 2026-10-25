import { providerError } from "./capabilities";
import { projectInstanceConfig } from "./instances";
import { createSSEParser } from "./sdk/stream";
import { signHmac } from "./sdk/encoding";
import { createNDJSONParser } from "./sdk/segments";
import { getFetchPool } from "../libs/pool";

const RESPONSE_LIMIT = 8 * 1024 * 1024;

/** A task-owned store. Asset IDs never grant access outside this invocation. */
export function createAssetStore() {
  const assets = new Map();
  let sequence = 0;
  return {
    put(blob) {
      const ref = {
        assetId: `asset-${++sequence}`,
        mimeType: blob.type || "application/octet-stream",
      };
      if (blob.name) ref.filename = blob.name;
      assets.set(ref.assetId, blob);
      return ref;
    },
    get(ref) {
      const blob = assets.get(ref?.assetId);
      if (!blob)
        throw providerError(
          "ASSET_UNAVAILABLE",
          "Asset is not owned by this task."
        );
      return blob;
    },
    entries() {
      return [...assets.entries()];
    },
    import(ref, blob) {
      if (!/^asset-\d+$/.test(ref?.assetId) || assets.has(ref.assetId))
        throw providerError("INVALID_ASSET", "Invalid or duplicate asset ID.");
      assets.set(ref.assetId, blob);
      sequence = Math.max(sequence, Number(ref.assetId.slice(6)));
    },
    clear() {
      assets.clear();
    },
  };
}
