import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SelectAllRoundedIcon from "@mui/icons-material/SelectAllRounded";
import { useI18n } from "../../hooks/I18n";
import { usePopupFeatureToggles } from "./usePopupFeatureToggles";

const FEATURE_LABELS = {
  selection: "selection_translate",
};
const FEATURE_ICONS = {
  selection: SelectAllRoundedIcon,
};

/** Independent global preferences remain available when the site is disabled. */
export default function GlobalFeatures(props) {
  const i18n = useI18n();
  const { features, handleTransboxToggle } = usePopupFeatureToggles(props);
  const actions = {
    selection: handleTransboxToggle,
  };
  if (!features.length) return null;

  return (
    <div
      className="kt-popup-global-features"
      role="group"
      aria-label={i18n("popup_global_features")}
    >
      {features.map((feature) => {
        const label = i18n(FEATURE_LABELS[feature.name]);
        const FeatureIcon = feature.enabled
          ? CheckRoundedIcon
          : FEATURE_ICONS[feature.name];
        return (
          <button
            type="button"
            className="kt-popup-global-feature"
            key={feature.name}
            data-feature={feature.name}
            data-error={feature.failed}
            aria-label={label}
            aria-pressed={feature.enabled}
            aria-busy={feature.pending}
            aria-disabled={feature.pending || props.isVisible === false}
            title={i18n("popup_global_feature_scope").replace(
              "{feature}",
              label
            )}
            disabled={props.isVisible === false}
            onClick={() => {
              if (!feature.pending && props.isVisible !== false) {
                void actions[feature.name](!feature.enabled);
              }
            }}
          >
            <FeatureIcon aria-hidden="true" />
            <span role={feature.failed ? "status" : undefined}>
              {i18n(
                feature.failed
                  ? "popup_global_toggle_failed"
                  : FEATURE_LABELS[feature.name]
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
