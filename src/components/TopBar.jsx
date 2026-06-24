import fostecLogo from "../../Logo.png";
import NotificationBell from "./NotificationBell.jsx";
import Icon from "./shared/Icon.jsx";
import styles from "./TopBar.module.css";

const STATUS_LABELS = {
  connecting: "Connecting",
  offline: "Offline",
  online: "Online",
};

export default function TopBar({ title, alarms, activeAlarmCount, connectionStatus, onRefresh }) {
  const statusState = connectionStatus?.state || "offline";
  const statusLabel = STATUS_LABELS[statusState] || "Unknown";

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <div className={styles.brandRow}>
          <div className={styles.logoWrap}>
            <img className={styles.logo} src={fostecLogo} alt="FOSTEC" />
          </div>
          <span
            className={`summary-status-pill ${styles.statusPill} ${statusState}`}
            title={connectionStatus?.message || statusLabel}
          >
            <span className="status-dot"></span>
            <span>{statusLabel}</span>
          </span>
        </div>
        <h1>{title}</h1>
      </div>
      <div className={styles.actions}>
        <NotificationBell alarms={alarms} activeAlarmCount={activeAlarmCount} />
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="Refresh data">
          <Icon name="rotate-cw" />
        </button>
      </div>
    </header>
  );
}
