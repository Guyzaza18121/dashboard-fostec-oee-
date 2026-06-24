import { OVERVIEW_ZONES } from "../../data/dashboardData.js";
import { getCompressorZone, getGaugePercent } from "../../utils/dashboardMetrics.js";
import { getCompressorAssetTag, isCompressorInAlarm, isCompressorRunning } from "../../utils/compressorStatus.js";
import { formatRunningTime, formatValue } from "../../utils/formatters.js";
import Icon from "../shared/Icon.jsx";

function GaugeArc({ value, max, color, label, unit }) {
  const pct = Math.min(100, Math.max(0, (Number(value || 0) / Number(max || 1)) * 100));
  const r = 42, cx = 50, cy = 54, sw = 8;
  const toRad = (d) => (d * Math.PI) / 180;
  const pt = (d) => [cx + r * Math.cos(toRad(d)), cy + r * Math.sin(toRad(d))];
  const arcD = (from, to) => {
    const [sx, sy] = pt(from);
    const [ex, ey] = pt(to);
    const delta = ((to - from) + 360) % 360;
    const large = delta > 180 ? 1 : 0;
    return `M${sx.toFixed(2)},${sy.toFixed(2)} A${r},${r} 0 ${large},1 ${ex.toFixed(2)},${ey.toFixed(2)}`;
  };
  const bgD = arcD(180, 0);
  const fillEnd = 180 + 180 * (pct / 100);
  const fillD = pct > 0.5 ? arcD(180, fillEnd >= 360 ? 359.9 : fillEnd) : null;
  const uid = `ga-${(label || "x").replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

  return (
    <div className="gauge-arc-tile">
      <div className="gauge-arc-wrap">
        <svg viewBox="0 0 100 62" className="gauge-arc-svg" aria-hidden="true">
          <defs>
            <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d={bgD} fill="none" stroke="rgba(29,114,224,0.12)" strokeWidth={sw} strokeLinecap="round" />
          {fillD && (
            <path d={fillD} fill="none" stroke={`url(#${uid})`} strokeWidth={sw} strokeLinecap="round" />
          )}
        </svg>
        <div className="gauge-arc-center">
          <strong style={{ color }}>{formatValue(value)}</strong>
          <span>{unit}</span>
        </div>
      </div>
      <p className="gauge-arc-label">{label}</p>
    </div>
  );
}

function getCompressorAlarmText(compressor, alarms) {
  const compressorAssetTag = getCompressorAssetTag(compressor);
  const activeAlarm = alarms.find((alarm) => (
    !alarm.acknowledged
    && (
      alarm.compressorId === compressor.id
      || getCompressorAssetTag(alarm) === compressorAssetTag
    )
  ));

  if (activeAlarm) {
    return activeAlarm.title;
  }

  if (isCompressorInAlarm(compressor)) {
    return compressor.status;
  }

  return "Normal";
}

function getCompressorCommandState(commandStates, compressorId, action) {
  return commandStates?.[`compressor:${compressorId}:${action}`] || null;
}

function getCommandButtonLabel(baseLabel, action, commandState) {
  if (commandState?.status === "loading") {
    return action === "start" ? "STARTING" : "STOPPING";
  }

  if (commandState?.status === "success") {
    return action === "start" ? "STARTED" : "STOPPED";
  }

  if (commandState?.status === "error") {
    return "ERROR";
  }

  return baseLabel;
}

function CompressorCard({ compressor, alarms, commandStates, onCommand, onDelete }) {
  const isRunning = isCompressorRunning(compressor);
  const isInAlarm = isCompressorInAlarm(compressor);
  const alarmText = getCompressorAlarmText(compressor, alarms);
  const startCommandState = getCompressorCommandState(commandStates, compressor.id, "start");
  const stopCommandState = getCompressorCommandState(commandStates, compressor.id, "stop");
  const isStartLoading = startCommandState?.status === "loading";
  const isStopLoading = stopCommandState?.status === "loading";
  const isCommandLoading = isStartLoading || isStopLoading;
  const isEffectivelyRunning = isRunning || isStartLoading;
  const startButtonState = startCommandState?.status || "idle";
  const stopButtonState = stopCommandState?.status || "idle";
  const startMachine = () => onCommand(compressor.id, "start");
  const stopMachine = () => onCommand(compressor.id, "stop");

  return (
    <article className="device-card compressor-card" style={{ "--accent": compressor.accent }}>
      <div className="device-head">
        <div>
          <p className="device-title">{compressor.name}</p>
          <p className="device-subtitle">{compressor.location}</p>
        </div>
        <div className="device-status-actions">
          <span className="pill">{compressor.status}</span>
          <button className="delete-compressor-button" type="button" onClick={() => onDelete(compressor.id)} aria-label={`Delete ${compressor.name}`}>
            <Icon name="x" />
          </button>
        </div>
      </div>
      <div className="gauge-grid">
        {(compressor.metrics || []).map((metric) => (
          <GaugeArc
            key={metric.label}
            value={metric.value}
            max={metric.max}
            color={metric.color}
            label={metric.label}
            unit={metric.unit}
          />
        ))}
      </div>
      <div className="compressor-status-grid">
        <div className="compressor-status-tile">
          <span className="compressor-status-label">Running times</span>
          <strong className="compressor-status-value">{formatRunningTime(compressor.runningHours)}</strong>
        </div>
        <div className={`compressor-status-tile ${isInAlarm ? "is-alarm" : ""}`}>
          <span className="compressor-status-label">Alarm</span>
          <strong className="compressor-status-value">{alarmText}</strong>
        </div>
      </div>
      <div className="compressor-actions">
        <button
          className={`control-button start command-${startButtonState}`}
          type="button"
          disabled={isRunning || isInAlarm || isCommandLoading}
          onClick={startMachine}
          aria-busy={isStartLoading}
          title={startCommandState?.message || undefined}
        >
          <Icon name="play-circle" />
          <span aria-live="polite">{getCommandButtonLabel("START", "start", startCommandState)}</span>
        </button>
        <button
          className={`control-button stop command-${stopButtonState}`}
          type="button"
          disabled={!isEffectivelyRunning || isInAlarm || isStopLoading}
          onClick={stopMachine}
          aria-busy={isStopLoading}
          title={stopCommandState?.message || undefined}
        >
          <Icon name="circle-stop" />
          <span aria-live="polite">{getCommandButtonLabel("STOP", "stop", stopCommandState)}</span>
        </button>
      </div>
    </article>
  );
}

function DeleteModal({ compressor, onCancel, onConfirm }) {
  if (!compressor) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-button" type="button" onClick={onCancel} aria-label="Close delete confirmation">
          <Icon name="x" />
        </button>
        <span className="modal-icon">
          <Icon name="trash-2" />
        </span>
        <h2 id="delete-modal-title">{`ลบ ${compressor.name}?`}</h2>
        <p>การลบนี้จะนำเครื่องออกจากหน้า Air Compressors และสามารถเพิ่มเครื่องใหม่ได้ภายหลังจนถึง 8 เครื่อง</p>
        <div className="modal-actions">
          <button className="modal-button secondary" type="button" onClick={onCancel}>ยกเลิก</button>
          <button className="modal-button danger" type="button" onClick={() => onConfirm(compressor.id)}>ลบ</button>
        </div>
      </section>
    </div>
  );
}

export default function CompressorsView({
  compressors,
  alarms,
  activeZone,
  pendingDeleteCompressorId,
  commandStates,
  onCommand,
  onConfirmDelete,
  onDeleteRequest,
  onDeleteCancel,
  onZoneChange,
}) {
  const visibleItems = activeZone === "all"
    ? compressors
    : compressors.filter((compressor) => getCompressorZone(compressor) === activeZone);
  const pendingCompressor = compressors.find((compressor) => compressor.id === pendingDeleteCompressorId);
  const zoneButtons = [{ id: "all", label: "All" }, ...OVERVIEW_ZONES.map((zone) => ({ id: zone.id, label: zone.title }))];

  return (
    <>
      <div className="compressor-zone-filter" role="tablist" aria-label="Filter compressor by zone">
        {zoneButtons.map((zoneButton) => (
          <button
            key={zoneButton.id}
            className={`zone-filter-button ${zoneButton.id === activeZone ? "active" : ""}`}
            type="button"
            onClick={() => onZoneChange(zoneButton.id)}
          >
            {zoneButton.label}
          </button>
        ))}
      </div>
      <div className="list-stack">
        {visibleItems.map((compressor) => (
          <CompressorCard
            key={compressor.id}
            compressor={compressor}
            alarms={alarms}
            commandStates={commandStates}
            onCommand={onCommand}
            onDelete={onDeleteRequest}
          />
        ))}
      </div>
      <DeleteModal compressor={pendingCompressor} onCancel={onDeleteCancel} onConfirm={onConfirmDelete} />
    </>
  );
}
