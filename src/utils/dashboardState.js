import { COMPRESSOR_LIMIT } from "../data/dashboardData.js";
import { getCompressorAccent, normalizeCompressorStatus } from "./compressorStatus.js";
import { formatTime } from "./formatters.js";

export function patchCollectionById(collection, incomingItems, limit = collection.length + incomingItems.length) {
  const existingItems = new Map(collection.map((item) => [item.id, item]));

  incomingItems.forEach((incomingItem) => {
    existingItems.set(incomingItem.id, {
      ...existingItems.get(incomingItem.id),
      ...incomingItem,
    });
  });

  return Array.from(existingItems.values()).slice(0, limit);
}

export function updateMetricValue(metrics, label, value) {
  return (metrics || []).map((metricItem) => {
    if (metricItem.label !== label) return metricItem;
    return { ...metricItem, value };
  });
}

export function updateValveMetric(metrics, label, value) {
  return (metrics || []).map((metricItem) => {
    if (metricItem[0] !== label) return metricItem;
    return [metricItem[0], value];
  });
}

export function getNextCompressorIndex(compressors) {
  const usedIndexes = new Set(
    compressors
      .map((compressor) => Number(compressor.id.match(/\d+$/)?.[0]))
      .filter(Boolean),
  );

  for (let index = 1; index <= COMPRESSOR_LIMIT; index += 1) {
    if (!usedIndexes.has(index)) {
      return index;
    }
  }

  return null;
}

export function createAlarmEntry(alarm) {
  return {
    id: alarm.id || `al-${Date.now()}`,
    severity: alarm.severity || "info",
    title: alarm.title || "Backend alarm",
    message: alarm.message || "New event from backend.",
    source: alarm.source || "backend",
    time: alarm.time || formatTime(),
    acknowledged: Boolean(alarm.acknowledged),
    compressorId: alarm.compressorId || null,
    compressorStatus: alarm.compressorStatus || alarm.statusImpact || null,
  };
}

export function normalizeIncomingCompressorPatch(compressor) {
  if (!compressor?.status) return compressor;

  const status = normalizeCompressorStatus(compressor.status);

  return {
    ...compressor,
    status,
    accent: compressor.accent || getCompressorAccent(status),
  };
}
