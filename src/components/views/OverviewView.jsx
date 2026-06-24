import { useMemo, useState } from "react";
import { CircleGauge, Droplets, TrendingUp, Zap } from "lucide-react";
import { OVERVIEW_METRICS, OVERVIEW_ZONES } from "../../config/dashboardConfig.js";

const ICON_MAP = {
  "circle-gauge": CircleGauge,
  zap: Zap,
  droplets: Droplets,
  "trending-up": TrendingUp,
};

function resolveMetricIcon(metricConfig) {
  return ICON_MAP[metricConfig.iconName] || CircleGauge;
}

function formatMetricValue(value, { decimals, useGrouping = false }) {
  const numberValue = Number(value ?? 0);

  if (useGrouping) {
    return numberValue.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return numberValue.toFixed(decimals);
}

function getOverviewRows(metricConfig, zoneReadings) {
  if (!zoneReadings.length) {
    return [];
  }

  if (metricConfig.key === "flowrate") {
    const totalValue = zoneReadings.reduce(
      (sum, zoneReading) => sum + (Number(zoneReading.metrics?.flowrate?.value) || 0),
      0,
    );
    const latestUpdatedAt = zoneReadings
      .map((zoneReading) => zoneReading.updatedAt)
      .filter(Boolean)
      .at(-1);

    return [
      {
        id: "flow-total",
        label: "Flow total",
        updatedAt: latestUpdatedAt,
        metrics: {
          flowrate: {
            value: totalValue,
            unit: metricConfig.unit,
            source: "DC1 + DC2 + PC",
          },
        },
      },
      ...zoneReadings,
    ];
  }

  if (metricConfig.key !== "efficiency") {
    return zoneReadings;
  }

  const totalValue = zoneReadings.reduce(
    (sum, zoneReading) => sum + (Number(zoneReading.metrics?.efficiency?.value) || 0),
    0,
  ) / 3;
  const latestUpdatedAt = zoneReadings
    .map((zoneReading) => zoneReading.updatedAt)
    .filter(Boolean)
    .at(-1);

  return [
    {
      id: "efficiency-total",
      label: "Efficiency total",
      updatedAt: latestUpdatedAt,
      metrics: {
        efficiency: {
          value: totalValue,
          unit: metricConfig.unit,
          source: "(DC1 + DC2 + PC)/3",
        },
      },
    },
    ...zoneReadings,
  ];
}

function getZoneColor(zoneId) {
  const colors = {
    "zone-1": "#06b6d4",
    "zone-2": "#22c55e",
    "zone-3": "#a855f7",
    "flow-total": "#0891b2",
    "efficiency-total": "#059669",
  };
  return colors[zoneId] || "#1d72e0";
}

function OverviewReadingRow({ zoneReading, metricConfig }) {
  const reading = zoneReading.metrics?.[metricConfig.key];
  const zoneColor = getZoneColor(zoneReading.id);

  return (
    <article className="overview-pressure-row" style={{ "--row-accent": zoneColor }}>
      <div className="overview-pressure-name">
        <strong>{zoneReading.label}</strong>
      </div>
      <div className="overview-pressure-value">
        <strong style={{ color: zoneColor }}>{formatMetricValue(reading?.value, metricConfig)}</strong>
        <span>{reading?.unit || metricConfig.unit}</span>
      </div>
    </article>
  );
}

function OverviewMetricTab({ metricConfig, isActive, onSelect, zoneCount }) {
  const Icon = resolveMetricIcon(metricConfig);

  return (
    <button
      type="button"
      id={`overview-tab-${metricConfig.key}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={`overview-panel-${metricConfig.key}`}
      tabIndex={isActive ? 0 : -1}
      className={`overview-metric-tab${isActive ? " active" : ""}`}
      style={{ "--metric-accent": metricConfig.accent }}
      onClick={() => onSelect(metricConfig.key)}
    >
      <span className="overview-metric-tab-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="overview-metric-tab-copy">
        <strong>{metricConfig.title}</strong>
        <span>{metricConfig.unit} · {zoneCount} zones</span>
      </span>
    </button>
  );
}

function OverviewMetricPanel({ metricConfig, zoneReadings }) {
  const readingRows = getOverviewRows(metricConfig, zoneReadings);
  const maxValue = Math.max(1, ...readingRows.map((r) => Number(r.metrics?.[metricConfig.key]?.value) || 0));

  return (
    <section
      id={`overview-panel-${metricConfig.key}`}
      role="tabpanel"
      aria-labelledby={`overview-tab-${metricConfig.key}`}
      className="overview-focus-card"
      style={{ "--overview-accent": metricConfig.accent }}
    >
      <div className="overview-focus-head">
        <div>
          <span className="overview-kicker">Live reading</span>
          <h3>{metricConfig.title} ({metricConfig.unit})</h3>
          <p>{metricConfig.description}</p>
        </div>
        <span className="overview-metric-unit-badge">{metricConfig.unit}</span>
      </div>

      <div className="overview-pressure-list">
        {readingRows.map((zoneReading) => (
          <OverviewReadingRow
            key={`${metricConfig.key}-${zoneReading.id}`}
            zoneReading={zoneReading}
            metricConfig={metricConfig}
            maxValue={maxValue}
          />
        ))}
      </div>
    </section>
  );
}

function mergePressureFromSensors(zoneReadings, sensors) {
  if (!sensors?.length || !zoneReadings?.length) return zoneReadings;
  const pressureSensors = sensors.filter((s) => s.type === "pressure");
  if (!pressureSensors.length) return zoneReadings;

  const sensorByZoneId = new Map();
  for (const sensor of pressureSensors) {
    const zone = OVERVIEW_ZONES.find((z) => sensor.name?.includes(z.title.replace("Zone ", "")));
    if (zone) sensorByZoneId.set(zone.id, sensor);
  }

  return zoneReadings.map((zr) => {
    const sensor = sensorByZoneId.get(zr.id);
    if (!sensor) return zr;
    return {
      ...zr,
      metrics: {
        ...zr.metrics,
        pressure: {
          ...(zr.metrics?.pressure || {}),
          value: sensor.pressureValue ?? zr.metrics?.pressure?.value ?? 0,
          unit: sensor.pressureUnit || zr.metrics?.pressure?.unit || "Bar",
        },
      },
    };
  });
}

function getCompressorPower(compressor) {
  const metric = (compressor?.metrics || []).find((m) => m.label === "Power" || m.label === "Current");
  return Number(metric?.value) || 0;
}

function mergePowerFromCompressors(zoneReadings, compressors) {
  if (!compressors?.length || !zoneReadings?.length) return zoneReadings;

  const getPowerByIndex = (index) => {
    const compressor = compressors.find((c) => {
      const idx = Number(c.id?.match(/\d+$/)?.[0]) || 0;
      return idx === index;
    });
    return getCompressorPower(compressor);
  };

  return zoneReadings.map((zr) => {
    let powerValue = 0;
    if (zr.id === "zone-1") {
      powerValue = getPowerByIndex(1) + getPowerByIndex(2);
    } else if (zr.id === "zone-2") {
      powerValue = getPowerByIndex(3) + getPowerByIndex(4) + getPowerByIndex(5);
    } else if (zr.id === "zone-3") {
      powerValue = getPowerByIndex(6) + getPowerByIndex(7);
    }
    if (!powerValue) return zr;
    return {
      ...zr,
      metrics: {
        ...zr.metrics,
        power: {
          ...(zr.metrics?.power || {}),
          value: powerValue,
          unit: "kW",
        },
      },
    };
  });
}

function mergeFlowrateFromSensors(zoneReadings, sensors) {
  if (!sensors?.length || !zoneReadings?.length) return zoneReadings;
  const flowSensors = sensors.filter((s) => s.type === "flow");
  if (!flowSensors.length) return zoneReadings;

  const sensorByZoneId = new Map();
  for (const sensor of flowSensors) {
    const zone = OVERVIEW_ZONES.find((z) => sensor.name?.includes(z.title.replace("Zone ", "")));
    if (zone) sensorByZoneId.set(zone.id, sensor);
  }

  return zoneReadings.map((zr) => {
    const sensor = sensorByZoneId.get(zr.id);
    if (!sensor) return zr;
    return {
      ...zr,
      metrics: {
        ...zr.metrics,
        flowrate: {
          ...(zr.metrics?.flowrate || {}),
          value: sensor.flowRate ?? zr.metrics?.flowrate?.value ?? 0,
          unit: sensor.flowUnit || zr.metrics?.flowrate?.unit || "L/min",
        },
      },
    };
  });
}

function mergeEfficiencyFromCalculations(zoneReadings) {
  if (!zoneReadings?.length) return zoneReadings;
  return zoneReadings.map((zr) => {
    const power = Number(zr.metrics?.power?.value) || 0;
    const flowrate = Number(zr.metrics?.flowrate?.value) || 0;
    if (!power || !flowrate) return zr;
    const efficiencyValue = power / (flowrate / 60);
    return {
      ...zr,
      metrics: {
        ...zr.metrics,
        efficiency: {
          ...(zr.metrics?.efficiency || {}),
          value: efficiencyValue,
          unit: "kW/L/min",
        },
      },
    };
  });
}

export default function OverviewView({ zoneReadings, sensors, compressors }) {
  const mergedZoneReadings = useMemo(() => {
    const withPressure = mergePressureFromSensors(zoneReadings, sensors);
    const withPower = mergePowerFromCompressors(withPressure, compressors);
    const withFlowrate = mergeFlowrateFromSensors(withPower, sensors);
    return mergeEfficiencyFromCalculations(withFlowrate);
  }, [zoneReadings, sensors, compressors]);
  const [activeMetricKey, setActiveMetricKey] = useState(OVERVIEW_METRICS[0].key);
  const activeMetric = OVERVIEW_METRICS.find((metricConfig) => metricConfig.key === activeMetricKey) || OVERVIEW_METRICS[0];

  return (
    <div className="overview-redesign">
      <div className="overview-metric-tabs" role="tablist" aria-label="Overview metrics">
        {OVERVIEW_METRICS.map((metricConfig) => (
          <OverviewMetricTab
            key={metricConfig.key}
            metricConfig={metricConfig}
            isActive={metricConfig.key === activeMetric.key}
            onSelect={setActiveMetricKey}
            zoneCount={mergedZoneReadings.length}
          />
        ))}
      </div>

      <OverviewMetricPanel metricConfig={activeMetric} zoneReadings={mergedZoneReadings} />
    </div>
  );
}
