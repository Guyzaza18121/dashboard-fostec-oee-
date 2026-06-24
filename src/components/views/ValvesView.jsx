import { memo } from "react";
import valveImage from "../../../valve.png";
import Icon from "../shared/Icon.jsx";

function normalizeValveOpen(status) {
  const s = String(status || "").toLowerCase();
  return s === "open" || s === "on" || s === "true" || s === "1";
}

const ValveCard = memo(function ValveCard({ valve, onCommand }) {
  const isOpen = normalizeValveOpen(valve.status);
  const valveMetrics = valve.metrics || [];
  const statusProgram = valveMetrics.find(([label]) => label === "Status Program")?.[1];
  const isProgramOn = statusProgram === true || statusProgram === 1 || statusProgram === "ON" || statusProgram === "true";

  return (
    <article className="device-card valve-card" style={{ "--accent": valve.accent }}>
      <div className="device-head">
        <div>
          <p className="device-title">{valve.name}</p>
          <p className="device-subtitle">{valve.location}</p>
        </div>
        <span className={`pill ${isOpen ? "pill--open" : "pill--closed"}`}>
          {isOpen ? "ON" : "OFF"}
        </span>
      </div>
      <div className="valve-visual-card">
        <div className="valve-visual">
          <img className="valve-image" src={valveImage} alt={`${valve.name} visual`} loading="lazy" />
        </div>
        <div className="valve-stats">
          <div className="valve-stat">
            <span>Status</span>
            <strong style={{ color: isOpen ? "#059669" : "#64748b" }}>{isOpen ? "ON" : "OFF"}</strong>
          </div>
          <div className="valve-stat">
            <span>Status Program</span>
            <span className={`valve-program-dot ${isProgramOn ? "valve-program-dot--on" : ""}`} />
          </div>
        </div>
      </div>
      <div className="valve-actions">
        <button className="valve-action-button open" type="button" disabled={isOpen} onClick={() => onCommand(valve.id, "open")}>
          <Icon name="unlock" />
          <span>OPEN</span>
        </button>
        <button className="valve-action-button close" type="button" disabled={!isOpen} onClick={() => onCommand(valve.id, "close")}>
          <Icon name="lock" />
          <span>CLOSE</span>
        </button>
      </div>
    </article>
  );
});

export default function ValvesView({ valves, onCommand }) {
  return (
    <div className="valve-grid">
      {valves.map((valve) => (
        <ValveCard key={valve.id} valve={valve} onCommand={onCommand} />
      ))}
    </div>
  );
}
