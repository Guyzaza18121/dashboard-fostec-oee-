import "./SummaryStrip.css";

export default function SummaryStrip({
  lastSync,
  runningCompressorCount,
  totalCompressorCount,
  alarmingMachineCount,
  onOpenAlarms,
}) {
  const syncTime = typeof lastSync === "string" ? lastSync : lastSync?.time;
  const syncDate = typeof lastSync === "string" ? "" : lastSync?.date;

  return (
    <section className="summary-strip" aria-label="System summary">
      <div className="summary-card">
        <span className="summary-card-value summary-card-value-strong">
          {`${runningCompressorCount}/${totalCompressorCount}`}
        </span>
        <span className="summary-card-label">A/C Running</span>
      </div>

      <button
        className="summary-card summary-card-button"
        type="button"
        onClick={onOpenAlarms}
        aria-label={`Open alarms view. ${alarmingMachineCount} machine${alarmingMachineCount === 1 ? "" : "s"} in alarm`}
      >
        <span className="summary-card-value summary-card-value-strong">
          {alarmingMachineCount}
        </span>
        <span className="summary-card-label">In Alarm</span>
      </button>

      <div className="summary-card">
        <div className="summary-card-top">
          <div className="summary-sync-meta">
            <span className="summary-card-value">{syncTime}</span>
            {syncDate ? <span className="summary-card-subvalue">{syncDate}</span> : null}
          </div>
        </div>
        <span className="summary-card-label">Last sync</span>
      </div>
    </section>
  );
}
