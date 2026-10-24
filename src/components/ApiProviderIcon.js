import { Box } from "./base";
import { ApiRoundedIcon } from "./icons";
import {
  API_SPE_TYPES,
  OPT_TRANS_TRANSLATOR_API,
  OPT_TRANS_OLLAMA,
} from "../config";
import { browser, isOptions } from "../libs/browser";
import { isGm } from "../libs/client";

const API_ICON_FILES = {
  [OPT_TRANS_TRANSLATOR_API]: "TranslatorAPI.svg",
  [OPT_TRANS_OLLAMA]: "Ollama.svg",
};

const LIGHT_SURFACE_FOREGROUND = "#1F1F1F";

export function resolveApiIconPresentation(
  apiType,
  { mode = "light", lightSurface = false } = {}
) {
  const shouldInvert = !lightSurface && mode === "dark" && API_SPE_TYPES.darkIcon.has(apiType);

  return {
    color: lightSurface ? LIGHT_SURFACE_FOREGROUND : undefined,
    filter: shouldInvert ? "invert(100%)" : "none",
    scale: 1,
  };
}

export function getApiIconSrc(
  apiType,
  {
    runtime = browser?.runtime,
    publicUrl = process.env.PUBLIC_URL || ".",
    allowPublicUrl = !isGm || isOptions(),
  } = {}
) {
  const fileName = API_ICON_FILES[apiType];
  if (!fileName) return "";

  const relativePath = `api/${fileName}`;
  if (runtime?.getURL) return runtime.getURL(relativePath);
  return allowPublicUrl ? `${publicUrl}/${relativePath}` : "";
}

export default function ApiProviderIcon({
  apiType,
  provider,
  label = "",
  size = 22,
  imageSize = 14,
  disabled = false,
  lightSurface = false,
  className = "",
  sx = {},
}) {
  const src = getApiIconSrc(apiType);
  const presentation = resolveApiIconPresentation(apiType, { lightSurface });

  return (
    <Box
      component="span"
      className={className}
      aria-hidden={label ? undefined : true}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "0 0 auto",
        opacity: disabled ? 0.5 : 1,
        filter: presentation.filter,
        ...sx,
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt={label}
          sx={{
            width: imageSize,
            height: imageSize,
            objectFit: "contain",
            transform: `scale(${presentation.scale})`,
            color: presentation.color,
          }}
        />
      ) : (
        <ApiRoundedIcon sx={{ fontSize: imageSize + 4, color: presentation.color }} />
      )}
    </Box>
  );
}
