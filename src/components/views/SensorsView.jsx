import { formatValue } from "../../utils/formatters.js";

function formatLarge(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInt(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function SensorArcGauge({ value, max, color }) {
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
  const fillEnd = 180 + 180 * (pct / 100);
  const fillD = pct > 0.5 ? arcD(180, fillEnd >= 360 ? 359.9 : fillEnd) : null;
  const uid = `s-arc-${String(value).replace(/\W/g, "")}`;

  return (
    <div className="sensor-arc-wrap">
      <svg viewBox="0 0 100 62" className="sensor-arc-svg" aria-hidden="true">
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={arcD(180, 0)} fill="none" stroke="rgba(29,114,224,0.12)" strokeWidth={sw} strokeLinecap="round" />
        {fillD && <path d={fillD} fill="none" stroke={`url(#${uid})`} strokeWidth={sw} strokeLinecap="round" />}
      </svg>
      <div className="sensor-arc-center">
        <strong style={{ color }}>{formatValue(value)}</strong>
      </div>
    </div>
  );
}

function PressureCard({ sensor }) {
  return (
    <article className="device-card pressure-sensor-card" style={{ "--accent": sensor.accent }}>
      <p className="sensor-card-title">{sensor.name}</p>
      <SensorArcGauge value={sensor.pressureValue} max={sensor.gaugeMax || 10} color={sensor.accent || "#1d72e0"} />
      <p className="sensor-unit-label">{sensor.pressureUnit || "Bar"}</p>
    </article>
  );
}

function FlowCard({ sensor }) {
  return (
    <article className="device-card flow-zone-card" style={{ "--accent": sensor.accent }}>
      <p className="sensor-card-title">{sensor.name}</p>
      <div className="flow-readings">
        <div className="flow-reading-row">
          <span className="flow-reading-label">Flow rate</span>
          <div className="flow-reading-value-wrap">
            <strong style={{ color: sensor.accent }}>{formatLarge(sensor.flowRate)}</strong>
            <span className="flow-reading-unit">L/min</span>
          </div>
        </div>
        <div className="flow-reading-divider" />
        <div className="flow-reading-row">
          <span className="flow-reading-label">Flow consumption</span>
          <div className="flow-reading-value-wrap">
            <strong>{formatInt(sensor.flowConsumption)}</strong>
            <span className="flow-reading-unit">Liter</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function FlowSumCard({ sensor }) {
  return (
    <article className="device-card flow-sum-card" style={{ "--accent": sensor.accent }}>
      <p className="sensor-card-title">{sensor.name}</p>
      <div className="flow-sum-content">
        <div className="flow-sum-block">
          <span className="flow-reading-label">Flow rate Sumation</span>
          <div className="flow-reading-value-wrap">
            <strong style={{ color: sensor.accent }}>{formatLarge(sensor.flowRate)}</strong>
            <span className="flow-reading-unit">L/min</span>
          </div>
        </div>
        <div className="flow-sum-block">
          <span className="flow-reading-label">Flow total Sumation</span>
          <div className="flow-reading-value-wrap">
            <strong style={{ color: "#059669" }}>{formatInt(sensor.flowTotal)}</strong>
            <span className="flow-reading-unit">Liter</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SensorsView({ sensors }) {
  const pressureSensors = sensors.filter((s) => s.type === "pressure");
  const flowSensors = sensors.filter((s) => s.type === "flow");
  const flowSumSensor = sensors.find((s) => s.type === "flow-sum");

  if (!sensors.length) {
    return (
      <div className="empty-state">
        <p>รอข้อมูล sensor จาก Node-RED</p>
      </div>
    );
  }

  return (
    <>
      {pressureSensors.length > 0 && (
        <div className="pressure-sensor-grid">
          {pressureSensors.map((sensor) => (
            <PressureCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      )}
      {flowSensors.length > 0 && (
        <div className="flow-sensor-grid">
          {flowSensors.map((sensor) => (
            <FlowCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      )}
      {flowSumSensor && (
        <FlowSumCard sensor={flowSumSensor} />
      )}
    </>
  );
}
