import { builtinSettingFields } from "./fields";

// Explicit compiled contracts, independent of legacy vendor classification sets.
const textCapabilities = [
  "translate",
  "summarize",
  "segmentSubtitle",
  "chat",
];

const contracts = {
  TranslatorAPI: {
    names: ["translate", "summarize", "detectLanguage"],
    batch: false,
    stream: false,
    usesMessages: false,
  },
  Ollama: {
    names: textCapabilities,
    batch: true,
    stream: true,
    usesMessages: true,
  },
  Custom: {
    names: ["translate", "summarize", "segmentSubtitle"],
    batch: true,
    stream: false,
    usesMessages: true,
  },
};

export const builtinServiceDefinitions = Object.fromEntries(
  Object.entries(contracts).map(([id, contract]) => [
    id,
    {
      id,
      name: id,
      implementation: { kind: "native", entry: id },
      configLocation: "root",
      settings: JSON.parse(JSON.stringify(builtinSettingFields)),
      usesMessages: contract.usesMessages,
      supportsContext: contract.usesMessages,
      supportsSubtitleCallbackStream: contract.stream,
      capabilities: Object.fromEntries(
        contract.names.map((name) => {
          const descriptor = { handler: name, outputModes: ["complete"] };
          if (name === "translate")
            descriptor.batch = { supported: contract.batch };
          // Only these native handlers emit the standard streaming event contract.
          if (contract.stream && ["translate", "dictionary"].includes(name))
            descriptor.outputModes.push("stream");
          if (name === "parseImage") {
            descriptor.inputModalities = ["image"];
            descriptor.taskModes = ["doc", "table", "formula"];
          }
          if (name === "chat") descriptor.inputModalities = ["text"];
          return [name, descriptor];
        })
      ),
    },
  ])
);

export const getBuiltinServiceDefinition = (id) =>
  Object.prototype.hasOwnProperty.call(builtinServiceDefinitions, id)
    ? builtinServiceDefinitions[id]
    : undefined;
