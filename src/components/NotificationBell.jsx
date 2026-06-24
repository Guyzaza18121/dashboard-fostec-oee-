import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./shared/Icon.jsx";
import "./NotificationBell.css";

function getSeverityTone(severity) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "info";
}

function NotificationItem({ alarm }) {
  const tone = getSeverityTone(alarm.severity);

  return (
    <article className={`summary-notification-item summary-notification-item-${tone}`}>
      <div className="summary-notification-item-head">
        <div className="summary-notification-title-wrap">
          <span className={`summary-notification-dot summary-notification-dot-${tone}`}></span>
          <strong>{alarm.title}</strong>
        </div>
        <span>{alarm.time}</span>
      </div>
      <p>{alarm.message}</p>
      <small>{`${alarm.source} | ${alarm.severity}`}</small>
    </article>
  );
}

export default function NotificationBell({ alarms, activeAlarmCount }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  const latestActiveAlarms = useMemo(
    () => alarms.filter((alarm) => !alarm.acknowledged).slice(0, 5),
    [alarms],
  );

  useEffect(() => {
    if (!isNotificationOpen) return undefined;

    function handlePointerDown(event) {
      if (notificationRef.current?.contains(event.target)) return;
      setIsNotificationOpen(false);
    }

    function handleScroll(event) {
      if (notificationRef.current?.contains(event.target)) return;
      setIsNotificationOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationOpen]);

  return (
    <div className="notification-bell-wrap" ref={notificationRef}>
      <button
        className="notification-bell-button"
        type="button"
        aria-expanded={isNotificationOpen}
        aria-haspopup="dialog"
        aria-label={activeAlarmCount ? `${activeAlarmCount} active alarms` : "No active alarms"}
        onClick={() => setIsNotificationOpen((previousState) => !previousState)}
      >
        <span className="summary-alarm-icon-wrap">
          <span className="summary-alarm-icon">
            <Icon name="bell-dot" />
          </span>
          {activeAlarmCount > 0 ? (
            <span className="summary-alarm-badge">
              <span className="summary-alarm-badge-dot"></span>
              <strong>{activeAlarmCount > 99 ? "99+" : activeAlarmCount}</strong>
            </span>
          ) : null}
        </span>
      </button>

      {isNotificationOpen ? (
        <section
          className="summary-notification-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-panel-title"
        >
          <button className="modal-close-button" type="button" aria-label="Close notifications" onClick={() => setIsNotificationOpen(false)}>
            <Icon name="x" />
          </button>

          <div className="summary-notification-header">
            <div className="summary-notification-title-row">
              <span className="summary-alarm-icon summary-alarm-icon-large">
                <Icon name="bell-dot" />
              </span>
              <div>
                <h2 id="notification-panel-title">Notifications</h2>
                <p>Latest 5 active alarms</p>
              </div>
            </div>
            <span className="summary-notification-count">{activeAlarmCount > 99 ? "99+" : activeAlarmCount}</span>
          </div>

          {latestActiveAlarms.length ? (
            <div className="summary-notification-list">
              {latestActiveAlarms.map((alarm) => (
                <NotificationItem key={alarm.id} alarm={alarm} />
              ))}
            </div>
          ) : (
            <div className="summary-notification-empty">
              <strong>No active alarms</strong>
              <span>Notifications will appear here when the system raises a new alarm.</span>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
