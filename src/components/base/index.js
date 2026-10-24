/**
 * Small Preact UI primitives that replace the MUI components used by the
 * translation panel. They intentionally implement only the props this project
 * uses, keeping the single-file userscript small.
 */
import { createElement } from "preact";
import { forwardRef } from "preact/compat";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

const UNITLESS = new Set([
  "aspectRatio",
  "columns",
  "columnCount",
  "flex",
  "flexGrow",
  "flexShrink",
  "fontWeight",
  "gridColumn",
  "gridRow",
  "lineHeight",
  "opacity",
  "order",
  "zIndex",
  "animationIterationCount",
]);

const textKeys = new Set([
  "color",
  "background",
  "backgroundColor",
  "border",
  "borderColor",
  "borderStyle",
  "boxShadow",
  "fontFamily",
  "gridTemplateColumns",
  "transform",
]);

function toCssValue(key, value) {
  if (typeof value !== "number") return value;
  if (textKeys.has(key) || UNITLESS.has(key)) return value;
  return `${value}px`;
}

function expandShortkey(key) {
  const map = {
    m: ["margin"],
    mt: ["marginTop"],
    mb: ["marginBottom"],
    ml: ["marginLeft"],
    mr: ["marginRight"],
    mx: ["marginLeft", "marginRight"],
    my: ["marginTop", "marginBottom"],
    p: ["padding"],
    pt: ["paddingTop"],
    pb: ["paddingBottom"],
    pl: ["paddingLeft"],
    pr: ["paddingRight"],
    px: ["paddingLeft", "paddingRight"],
    py: ["paddingTop", "paddingBottom"],
  };
  return map[key] || [key];
}

export function sxToStyle(sx) {
  if (!sx) return {};
  if (Array.isArray(sx)) {
    return Object.assign({}, ...sx.map(sxToStyle).filter(Boolean));
  }
  if (typeof sx !== "object") return {};
  const style = {};
  Object.entries(sx).forEach(([key, value]) => {
    if (value == null) return;
    // Pseudo selectors and media queries are handled by the static stylesheet.
    if (key.includes("&") || key.startsWith("@") || key.includes(">")) return;
    expandShortkey(key).forEach((cssKey) => {
      style[cssKey] = toCssValue(cssKey, value);
    });
  });
  return style;
}

export const Box = forwardRef(function Box(
  { component: Component = "div", sx, style, ...props },
  ref
) {
  return createElement(Component, {
    ...props,
    ref,
    style: { ...sxToStyle(sx), ...style },
  });
});

export const Paper = forwardRef(function Paper(
  { component: Component = "div", sx, style, elevation, ...props },
  ref
) {
  return createElement(Component, {
    ...props,
    ref,
    style: { ...sxToStyle(sx), ...style },
  });
});

export const Typography = forwardRef(function Typography(
  { component: Component = "p", sx, style, variant, ...props },
  ref
) {
  return createElement(Component, {
    ...props,
    ref,
    style: { margin: 0, ...sxToStyle(sx), ...style },
  });
});

export const Stack = forwardRef(function Stack(
  {
    direction = "column",
    spacing = 0,
    alignItems,
    justifyContent,
    sx,
    style,
    useFlexGap,
    ...props
  },
  ref
) {
  return createElement("div", {
    ...props,
    ref,
    style: {
      display: "flex",
      flexDirection: direction,
      gap: spacing ? `${spacing * 8}px` : undefined,
      alignItems,
      justifyContent,
      ...sxToStyle(sx),
      ...style,
    },
  });
});

export const Grid = forwardRef(function Grid(
  { container, item, xs, md, spacing, sx, style, columns, ...props },
  ref
) {
  const layout = container
    ? {
        display: "flex",
        flexWrap: "wrap",
        gap: spacing ? `${spacing * 8}px` : undefined,
      }
    : {};
  const itemStyle = item
    ? { minWidth: 0, flex: props.className ? undefined : "1 1 140px" }
    : {};
  return createElement("div", {
    ...props,
    ref,
    style: { ...layout, ...itemStyle, ...sxToStyle(sx), ...style },
  });
});

export const MenuItem = ({ value, children, ...props }) =>
  createElement("option", { value, ...props }, children);

export const IconButton = forwardRef(function IconButton(
  { size, edge, color, sx, style, className = "", children, ...props },
  ref
) {
  return createElement(
    "button",
    {
      type: "button",
      ...props,
      ref,
      className: `MuiIconButton-root kt-icon-button ${size || ""} ${className}`,
      style: { ...sxToStyle(sx), ...style },
    },
    children
  );
});

export const CircularProgress = ({ size = 20, sx, style, ...props }) =>
  createElement("span", {
    role: "progressbar",
    ...props,
    className: `kt-spinner ${props.className || ""}`,
    style: {
      width: size,
      height: size,
      ...sxToStyle(sx),
      ...style,
    },
  });

export const Alert = ({ severity = "info", sx, style, children, ...props }) =>
  createElement(
    "div",
    {
      role: "alert",
      ...props,
      className: `kt-alert kt-alert--${severity} ${props.className || ""}`,
      style: {
        padding: "10px 12px",
        borderRadius: 12,
        background:
          severity === "error"
            ? "rgba(220, 80, 80, 0.12)"
            : "rgba(128, 128, 128, 0.12)",
        color: "inherit",
        ...sxToStyle(sx),
        ...style,
      },
    },
    children
  );

function collectOptions(children) {
  const options = [];
  const visit = (nodes) => {
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        visit(node);
        return;
      }
      if (node?.props && "value" in node.props) {
        options.push({ value: node.props.value, label: node.props.children });
      }
    });
  };
  visit(children);
  return options;
}

function MultiSelect({ options, value, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = Array.isArray(value) ? value : value == null ? [] : [value];
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () =>
      document.removeEventListener("mousedown", onPointerDown, true);
  }, [open]);

  const toggle = (optionValue) => {
    const next = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange?.({ target: { value: next } });
  };

  return createElement(
    "div",
    { className: "kt-multiselect", ref: rootRef },
    createElement(
      "button",
      {
        type: "button",
        className: "kt-multiselect__control",
        disabled,
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current),
      },
      selectedLabels.length
        ? selectedLabels.join("、")
        : placeholder || ""
    ),
    open &&
      createElement(
        "div",
        { className: "kt-multiselect__menu", role: "listbox" },
        options.map((option) =>
          createElement(
            "label",
            { key: String(option.value), className: "kt-multiselect__item" },
            createElement("input", {
              type: "checkbox",
              checked: selected.includes(option.value),
              onChange: () => toggle(option.value),
            }),
            createElement("span", null, option.label)
          )
        )
      )
  );
}

function assignRef(ref, node) {
  if (typeof ref === "function") ref(node);
  else if (ref && typeof ref === "object") ref.current = node;
}

// MUI's multiline TextField grows with its content through TextareaAutosize.
// Recreate that behaviour without pulling in the package: measure scrollHeight
// after every value change and clamp to minRows/maxRows.
function AutoSizeTextarea({ inputRef, minRows = 1, maxRows, locked, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (locked) {
      el.style.height = "";
      el.style.overflowY = "";
      return;
    }
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const padding =
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0);
    const minHeight = lineHeight * Math.max(1, minRows) + padding;
    const maxHeight = maxRows ? lineHeight * maxRows + padding : Infinity;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    const next = Math.max(minHeight, Math.min(el.scrollHeight, maxHeight));
    el.style.height = `${next}px`;
    if (el.scrollHeight > maxHeight) el.style.overflowY = "auto";
  }, [props.value, minRows, maxRows, locked]);

  return createElement("textarea", {
    ...props,
    ref: (node) => {
      ref.current = node;
      assignRef(inputRef, node);
    },
  });
}

export const TextField = forwardRef(function TextField(
  {
    select = false,
    multiline = false,
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    label,
    placeholder,
    helperText,
    error = false,
    fullWidth = false,
    size,
    className = "",
    sx,
    style,
    inputRef,
    inputProps = {},
    InputProps = {},
    InputLabelProps,
    SelectProps,
    children,
    name,
    disabled,
    type = "text",
    minRows,
    maxRows,
    ...props
  },
  ref
) {
  const options = select ? collectOptions(children) : [];
  const rootClassName = [
    "kt-field",
    "MuiInputBase-root",
    fullWidth ? "kt-field--full" : "",
    size ? `kt-field--${size}` : "",
    error ? "kt-field--error" : "",
    InputProps.className || "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inputCommon = {
    ...inputProps,
    className: `kt-field__input ${inputProps.className || ""}`,
    disabled,
    name,
    placeholder,
    readOnly: InputProps.readOnly,
    onFocus,
    onBlur,
    onKeyDown,
    style: inputProps.style,
  };

  let control;
  if (select) {
    if (SelectProps?.multiple) {
      control = createElement(MultiSelect, {
        options,
        value,
        disabled,
        placeholder: placeholder || "",
        onChange,
      });
    } else {
      control = createElement(
        "select",
        {
          ...inputCommon,
          className: `kt-field__input kt-field__select ${inputProps.className || ""}`,
          value: value ?? "",
          onChange,
        },
        options.map((option) =>
          createElement(
            "option",
            { key: String(option.value), value: option.value },
            option.label
          )
        )
      );
    }
  } else if (multiline) {
    const locked = String(InputProps.className || "").includes(
      "kt-height-locked"
    );
    control = createElement(AutoSizeTextarea, {
      ...inputCommon,
      inputRef,
      minRows,
      maxRows,
      locked,
      rows: minRows || 1,
      "data-max-rows": maxRows,
      value: value ?? "",
      onChange,
    });
  } else {
    control = createElement("input", {
      ...inputCommon,
      ref: (node) => assignRef(inputRef, node),
      type,
      value: value ?? "",
      onChange,
    });
  }

  return createElement(
    "div",
    {
      ...props,
      ref,
      className: rootClassName,
      style: {
        ...sxToStyle(sx),
        ...(InputProps.style || {}),
        ...style,
      },
    },
    label
      ? createElement("span", { className: "kt-field__label" }, label)
      : null,
    createElement(
      "div",
      { className: "kt-field__control" },
      InputProps.startAdornment
        ? createElement(
            "span",
            { className: "kt-field__start" },
            InputProps.startAdornment
          )
        : null,
      control,
      InputProps.endAdornment
        ? createElement(
            "span",
            { className: "kt-field__end" },
            InputProps.endAdornment
          )
        : null,
      InputProps.overlay || null
    ),
    helperText
      ? createElement("span", { className: "kt-field__helper" }, helperText)
      : null
  );
});

export { forwardRef };
