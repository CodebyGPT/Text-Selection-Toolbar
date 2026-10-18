import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import IconButton from "@mui/material/IconButton";
import Logo from "../../components/Logo";
import { useI18n } from "../../hooks/I18n";

export default function Header({
  onClose,
  openSeparateWindow,
  openSettings,
  children,
}) {
  const i18n = useI18n();
  const appName = process.env.REACT_APP_NAME || "Text Selection Toolbar";

  const handleHomepage = () => {
    window.open(
      process.env.REACT_APP_HOMEPAGE,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <header
      className={`kt-popup-header${onClose ? " kt-popup-header--content" : ""}`}
    >
      {onClose && (
        <span className="kt-popup-header__drag" aria-hidden="true">
          <DragIndicatorRoundedIcon fontSize="small" />
        </span>
      )}
      <button
        type="button"
        className="kt-popup-brand-button"
        onClick={handleHomepage}
        aria-label={appName}
        title={`${appName} v${process.env.REACT_APP_VERSION}`}
      >
        <Logo size={26} className="kt-popup-header__logo" />
      </button>
      {onClose && (
        <span className="kt-popup-header__identity">
          <span className="kt-popup-header__title">{appName}</span>
          <span className="kt-popup-header__version">
            v{process.env.REACT_APP_VERSION}
          </span>
        </span>
      )}
      {children}
      {onClose && <span className="kt-popup-header__spacer" />}
      {onClose ? (
        <IconButton onClick={onClose} aria-label={i18n("close")}>
          <CloseRoundedIcon />
        </IconButton>
      ) : (
        <>
          <span className="kt-popup-header__actions">
            <IconButton
              onClick={openSeparateWindow}
              aria-label={i18n("open_separate_window")}
              title={i18n("open_separate_window")}
            >
              <OpenInNewRoundedIcon />
            </IconButton>
            <IconButton
              onClick={openSettings}
              aria-label={i18n("setting")}
              title={i18n("setting")}
            >
              <SettingsRoundedIcon />
            </IconButton>
          </span>
        </>
      )}
    </header>
  );
}
