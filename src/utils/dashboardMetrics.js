import { OVERVIEW_ZONES } from "../data/dashboardData.js";
import { isCompressorInAlarm, isCompressorRunning } from "./compressorStatus.js";

export function getGaugePercent(metric) {
  const value = Number(metric.value);
  const max = Number(metric.max) || 100;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

export function getCompressorIndex(compressor) {
  return Number(compressor.id.match(/\d+$/)?.[0]) || 0;
}

export function getCompressorZone(compressor) {
  return OVERVIEW_ZONES.find((zone) => zone.compressorIndexes.includes(getCompressorIndex(compressor)))?.id || "unassigned";
}

export function getMetricValue(compressor, label) {
  return Number((compressor.metrics || []).find((metricItem) => metricItem.label === label)?.value) || 0;
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getZoneCompressors(zone, compressors) {
  return compressors.filter((compressor) => zone.compressorIndexes.includes(getCompressorIndex(compressor)));
}

export function getCompressorEfficiency(compressor) {
  const power = Number(compressor.overviewMetrics?.power) || 0;
  const flowrate = Number(compressor.overviewMetrics?.flowrate) || 0;
  return flowrate ? power / flowrate : 0;
}

export function getZoneMetrics(zone, compressors) {
  const zoneCompressors = getZoneCompressors(zone, compressors);
  const expectedCount = zone.compressorIndexes.length;
  const runningCompressors = zoneCompressors.filter(isCompressorRunning);
  const totalPower = zoneCompressors.reduce((sum, compressor) => sum + (Number(compressor.overviewMetrics?.power) || 0), 0);
  const totalFlowrate = zoneCompressors.reduce((sum, compressor) => sum + (Number(compressor.overviewMetrics?.flowrate) || 0), 0);

  return {
    pressure: average(zoneCompressors.map((compressor) => getMetricValue(compressor, "Pressure"))),
    power: totalPower,
    flowrate: totalFlowrate,
    efficiency: average(zoneCompressors.map(getCompressorEfficiency)),
    efficiencySum: totalFlowrate ? totalPower / totalFlowrate : 0,
    activeCount: zoneCompressors.length,
    runningCount: runningCompressors.length,
    expectedCount,
  };
}

export function getActiveAlarmCount(alarms) {
  return alarms.filter((alarm) => !alarm.acknowledged).length;
}

export function getInAlarmCompressorCount(compressors) {
  return compressors.filter(isCompressorInAlarm).length;
}

export function getSystemOverviewStats(compressors) {
  const zoneMetricsList = OVERVIEW_ZONES.map((zone) => ({
    zone,
    metrics: getZoneMetrics(zone, compressors),
  }));
  const pressure = average(compressors.map((compressor) => getMetricValue(compressor, "Pressure")));
  const power = zoneMetricsList.reduce((sum, item) => sum + item.metrics.power, 0);
  const flowrate = zoneMetricsList.reduce((sum, item) => sum + item.metrics.flowrate, 0);
  const efficiency = average(compressors.map(getCompressorEfficiency));
  const efficiencySum = flowrate ? power / flowrate : 0;
  const runningCount = compressors.filter(isCompressorRunning).length;

  return {
    pressure,
    power,
    flowrate,
    efficiency,
    efficiencySum,
    runningCount,
    expectedCount: OVERVIEW_ZONES.reduce((sum, zone) => sum + zone.compressorIndexes.length, 0),
  };
}

export function getZoneHealth(zoneMetrics) {
  if (zoneMetrics.flowrate <= 0 || zoneMetrics.runningCount === 0) {
    return {
      label: "Alert",
      tone: "danger",
      note: "No active output in this zone",
    };
  }

  if (zoneMetrics.activeCount < zoneMetrics.expectedCount) {
    return {
      label: "Watch",
      tone: "warning",
      note: `${zoneMetrics.activeCount}/${zoneMetrics.expectedCount} compressors available`,
    };
  }

  return {
    label: "Stable",
    tone: "ok",
    note: `${zoneMetrics.runningCount} running compressors`,
  };
}

export function getOverviewAttentionItems(alarms, compressors) {
  const items = [];
  const activeAlarms = getActiveAlarmCount(alarms);

  if (activeAlarms) {
    items.push({
      tone: "danger",
      title: `${activeAlarms} active alarm${activeAlarms > 1 ? "s" : ""}`,
      detail: "Review the alarm view for pressure or temperature events.",
    });
  }

  OVERVIEW_ZONES.forEach((zone) => {
    const zoneMetrics = getZoneMetrics(zone, compressors);

    if (zoneMetrics.flowrate <= 0 || zoneMetrics.runningCount === 0) {
      items.push({
        tone: "danger",
        title: `${zone.title} has no flow output`,
        detail: `${zone.subtitle} is not delivering air right now.`,
      });
      return;
    }

    if (zoneMetrics.activeCount < zoneMetrics.expectedCount) {
      items.push({
        tone: "warning",
        title: `${zone.title} is below full capacity`,
        detail: `${zoneMetrics.activeCount}/${zoneMetrics.expectedCount} compressors are available.`,
      });
    }
  });

  if (!items.length) {
    items.push({
      tone: "ok",
      title: "All zones look healthy",
      detail: "No alarms and every zone is producing flow normally.",
    });
  }

  return items.slice(0, 4);
}

export function isFlowSensor(sensor) {
  const sensorId = String(sensor?.id || "").toLowerCase();
  const sensorType = String(sensor?.type || "").toLowerCase();
  const sensorName = String(sensor?.name || "").toLowerCase();

  return sensorType === "flow" || sensorId.startsWith("fs-") || sensorName.includes("flow");
}

function getZoneReadingMetricValue(zoneReadings, zoneId, metricKey) {
  return Number(
    zoneReadings.find((reading) => reading.id === zoneId)?.metrics?.[metricKey]?.value,
  ) || 0;
}

function getZoneReadingMetricSource(zoneReadings, zoneId, metricKey, fallbackLabel) {
  return (
    zoneReadings.find((reading) => reading.id === zoneId)?.metrics?.[metricKey]?.source
    || fallbackLabel
  );
}

export function getFlowSensorItems(sensors, zoneReadings) {
  const flowSensors = sensors.filter(isFlowSensor);
  const zoneFlowrateMap = new Map(
    OVERVIEW_ZONES.map((zone) => [zone.id, getZoneReadingMetricValue(zoneReadings, zone.id, "flowrate")]),
  );
  const totalFlowrate = OVERVIEW_ZONES.reduce((sum, zone) => sum + zoneFlowrateMap.get(zone.id), 0);
  const zoneFlowGaugeMax = Math.max(250, ...OVERVIEW_ZONES.map((zone) => zoneFlowrateMap.get(zone.id)), totalFlowrate / 2);
  const sumGaugeMax = Math.max(600, totalFlowrate * 1.2);

  return flowSensors.map((sensor) => {
    if (sensor.flowValue !== undefined) {
      return {
        flowUnit: "L/min",
        gaugeMax: zoneFlowGaugeMax,
        ...sensor,
      };
    }

    if (sensor.id === "fs-01") {
      return {
        ...sensor,
        flowValue: zoneFlowrateMap.get("zone-1"),
        flowUnit: "L/min",
        gaugeMax: zoneFlowGaugeMax,
        sourceLabel: getZoneReadingMetricSource(zoneReadings, "zone-1", "flowrate", "Flow DC1"),
        zoneMembers: "AC-01, AC-02",
      };
    }

    if (sensor.id === "fs-02") {
      return {
        ...sensor,
        flowValue: zoneFlowrateMap.get("zone-2"),
        flowUnit: "L/min",
        gaugeMax: zoneFlowGaugeMax,
        sourceLabel: getZoneReadingMetricSource(zoneReadings, "zone-2", "flowrate", "Flow DC2"),
        zoneMembers: "AC-03, AC-04, AC-05",
      };
    }

    if (sensor.id === "fs-03") {
      return {
        ...sensor,
        flowValue: zoneFlowrateMap.get("zone-3"),
        flowUnit: "L/min",
        gaugeMax: zoneFlowGaugeMax,
        sourceLabel: getZoneReadingMetricSource(zoneReadings, "zone-3", "flowrate", "Flow PC"),
        zoneMembers: "AC-06, AC-07",
      };
    }

    return {
      ...sensor,
      flowValue: totalFlowrate,
      flowUnit: "L/min",
      gaugeMax: sumGaugeMax,
      sourceLabel: "Flow total",
      zoneMembers: "Zone DC1 + Zone DC2 + Zone PC",
    };
  });
}
