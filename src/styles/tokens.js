/**
 * Shared design tokens for the settings overlay and the translation panel.
 * Keep control geometry and spacing here instead of scattering magic numbers
 * across component CSS.
 */
export const UI_TOKENS = Object.freeze({
  // Text/feedback buttons in the settings overlay.
  controlHeight: 36,
  controlPaddingX: 14,
  controlRadius: 9,

  // Text inputs and selects in the settings overlay.
  inputHeight: 38,
  inputPaddingX: 12,
  inputPaddingY: 10,
  inputMinWidth: 220,

  // Translation panel controls (Preact primitives).
  panelControlHeight: 38,
  panelControlPaddingX: 12,
  panelControlRadius: 12,
  panelIconButtonSize: 34,

  // Panel surface geometry.
  panelRadius: 8,
  panelHeaderHeight: 56,
  panelContentPadding: 14,

  // Shared typography sizes.
  fontSizeLabel: 11,
  fontSizeControl: 12.5,
  fontSizeBody: 12,

  // Common spacing steps.
  space4: 4,
  space5: 5,
  space6: 6,
  space8: 8,
  space10: 10,
  space12: 12,
  space14: 14,
});

/** Convert a numeric token to a CSS pixel value. */
export const px = (value) => `${value}px`;
