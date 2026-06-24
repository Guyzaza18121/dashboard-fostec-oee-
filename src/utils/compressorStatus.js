export const COMPRESSOR_STATUSES = {
  running: "Running",
  standby: "Standby",
  alarm: "Alarm",
  fault: "Fault",
  trip: "Trip",
};

const NORMALIZED_STATUS_MAP = new Map([
  ["running", COMPRESSOR_STATUSES.running],
  ["run", COMPRESSOR_STATUSES.running],
  ["run load", COMPRESSOR_STATUSES.running],
  ["run unload", COMPRESSOR_STATUSES.running],
  ["online", COMPRESSOR_STATUSES.running],
  ["standby", COMPRESSOR_STATUSES.standby],
  ["stop", COMPRESSOR_STATUSES.standby],
  ["stopped", COMPRESSOR_STATUSES.standby],
  ["idle", COMPRESSOR_STATUSES.standby],
  ["alarm", COMPRESSOR_STATUSES.alarm],
  ["warning", COMPRESSOR_STATUSES.alarm],
  ["fault", COMPRESSOR_STATUSES.fault],
  ["trip", COMPRESSOR_STATUSES.trip],
  ["tripped", COMPRESSOR_STATUSES.trip],
]);

const ALARM_STATUS_SET = new Set([
  COMPRESSOR_STATUSES.alarm,
  COMPRESSOR_STATUSES.fault,
  COMPRESSOR_STATUSES.trip,
]);

function getStatusValue(compressorOrStatus) {
  return typeof compressorOrStatus === "string"
    ? compressorOrStatus
    : compressorOrStatus?.status;
}

export function normalizeCompressorStatus(status) {
  const rawStatus = String(status || "").trim();
  const collapsed = rawStatus.replace(/\s+/g, " ").toLowerCase();
  const normalizedStatus = NORMALIZED_STATUS_MAP.get(collapsed);

  if (normalizedStatus) return normalizedStatus;
  if (collapsed.startsWith("run")) return COMPRESSOR_STATUSES.running;
  if (collapsed.startsWith("stop")) return COMPRESSOR_STATUSES.standby;

  return rawStatus || COMPRESSOR_STATUSES.standby;
}

export function isCompressorRunning(compressorOrStatus) {
  return normalizeCompressorStatus(getStatusValue(compressorOrStatus)) === COMPRESSOR_STATUSES.running;
}

export function isCompressorInAlarm(compressorOrStatus) {
  return ALARM_STATUS_SET.has(normalizeCompressorStatus(getStatusValue(compressorOrStatus)));
}

export function getCompressorAccent(status) {
  const normalizedStatus = normalizeCompressorStatus(status);

  if (normalizedStatus === COMPRESSOR_STATUSES.running) return "#059669";
  if (normalizedStatus === COMPRESSOR_STATUSES.alarm) return "#d97706";
  if (normalizedStatus === COMPRESSOR_STATUSES.fault) return "#dc2626";
  if (normalizedStatus === COMPRESSOR_STATUSES.trip) return "#7c3aed";
  return "#64748b";
}

export function getCompressorAssetTag(compressorOrText) {
  const rawText = typeof compressorOrText === "string"
    ? compressorOrText
    : [
      compressorOrText?.compressorId,
      compressorOrText?.id,
      compressorOrText?.source,
      compressorOrText?.name,
      compressorOrText?.title,
      compressorOrText?.message,
    ]
      .filter(Boolean)
      .join(" ");

  const match = String(rawText || "").toUpperCase().match(/AC[-\s]?(\d{1,2})/);
  if (!match) return null;

  return `AC-${String(match[1]).padStart(2, "0")}`;
}

export function resolveAlarmCompressorId(alarm, compressors) {
  if (alarm?.compressorId) {
    return String(alarm.compressorId).toLowerCase();
  }

  const alarmAssetTag = getCompressorAssetTag(alarm);
  if (!alarmAssetTag) return null;

  return compressors.find((compressor) => getCompressorAssetTag(compressor) === alarmAssetTag)?.id || null;
}

export function getAlarmCompressorStatus(alarm) {
  if (alarm?.compressorStatus) {
    return normalizeCompressorStatus(alarm.compressorStatus);
  }

  if (alarm?.statusImpact) {
    return normalizeCompressorStatus(alarm.statusImpact);
  }

  if (alarm?.severity === "critical") {
    return COMPRESSOR_STATUSES.fault;
  }

  return COMPRESSOR_STATUSES.alarm;
}
