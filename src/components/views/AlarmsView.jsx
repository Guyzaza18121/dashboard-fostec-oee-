function AlarmCard({ alarm, onAcknowledge }) {
  const isAck = alarm.acknowledged;
  return (
    <article className={`alarm-card ${isAck ? "is-ack" : ""}`} style={{ "--accent": alarm.severity === "critical" ? "#dc2626" : alarm.severity === "warning" ? "#d97706" : "#1d72e0" }}>
      <div className="alarm-head">
        <div>
          <p className="alarm-title">{alarm.title}</p>
          <p className="alarm-meta">{`${alarm.source} • ${alarm.time} • ${alarm.severity}`}</p>
        </div>
        <span className={`pill ${isAck ? "pill-muted" : ""}`}>{isAck ? "Acknowledged" : "Active"}</span>
      </div>
      <p className="device-subtitle">{alarm.message}</p>
      {!isAck && (
        <div className="alarm-actions">
          <button className="text-button" type="button" onClick={() => onAcknowledge(alarm.id)}>
            Acknowledge
          </button>
        </div>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div>
        <h2>No alarms</h2>
        <p>พื้นที่นี้จะรอรับ alarm event จาก backend ผ่าน IoTDashboardBridge.pushAlarm()</p>
      </div>
    </div>
  );
}

export default function AlarmsView({ alarms, onAcknowledge }) {
  const sortedAlarms = [...alarms].sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged));

  return (
    <>
      <div className="list-stack">
        {sortedAlarms.length ? (
          sortedAlarms.map((alarm) => (
            <AlarmCard key={alarm.id} alarm={alarm} onAcknowledge={onAcknowledge} />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  );
}
