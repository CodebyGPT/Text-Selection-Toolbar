import { nativeRequestBuilders } from "./requests";
import { fetchData } from "../libs/fetch";
import { parseJsonObj } from "../libs/utils";
import { parseChatResponse } from "../providers/sdk/openai";
import { providerError } from "../providers/capabilities";
import { selectNativeEndpoint } from "./credentials";

/** Chat uses supplied turns verbatim; translation templates/history are scene behavior. */
export async function chatNative(input, api, ctx) {
  if (input.messages.some((message) => typeof message.content !== "string"))
    throw providerError(
      "MODALITY_UNSUPPORTED",
      "This chat adapter accepts text; use parseImage for images."
    );
  const system = input.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n");
  const turns = input.messages.filter((message) => message.role !== "system");
  if (!turns.length)
    throw providerError(
      "INVALID_INPUT",
      "Chat requires a user or assistant turn."
    );
  const request = nativeRequestBuilders[api.apiType]({
    ...selectNativeEndpoint(api),
    useStream: false,
    systemPrompt: system,
    userPrompt: "",
    hisMsgs: [],
  });
  const { body, headers } = request;
  body.messages = input.messages;
  // Trusted built-ins retain the existing advanced header/body overrides.
  if (api.customHeader?.trim())
    Object.assign(headers, parseJsonObj(api.customHeader));
  if (api.customBody?.trim()) Object.assign(body, parseJsonObj(api.customBody));
  const data = await fetchData(
    request.url,
    { method: request.method || "POST", headers, body: JSON.stringify(body) },
    {
      usePool: true,
      fetchLimit: api.fetchLimit,
      fetchInterval: api.fetchInterval,
      httpTimeout: api.httpTimeout,
      signal: ctx.signal,
    }
  );
  if (data?.error)
    throw providerError(
      "PROVIDER_ERROR",
      data.error.message || "Chat request failed."
    );
  return parseChatResponse({ status: 200, body: data });
}
