import { OVERVIEW_ZONES } from "../config/dashboardConfig.js";

export {
  COMPRESSOR_LIMIT,
  OVERVIEW_ZONES,
  VIEW_META,
  NAV_ITEMS,
} from "../config/dashboardConfig.js";

const DEFAULT_ZONE_METRICS = {
  pressure: { value: 0, unit: "Bar" },
  power: { value: 0, unit: "kW" },
  flowrate: { value: 0, unit: "L/min" },
  efficiency: { value: 0, unit: "kW/L/min" },
};

function createDefaultZoneReadings() {
  return OVERVIEW_ZONES.map((zone) => ({
    id: zone.id,
    label: zone.title,
    metrics: { ...DEFAULT_ZONE_METRICS },
    updatedAt: null,
  }));
}

export function createInitialDashboardState() {
  return {
    activeView: "overview",
    activeCompressorZone: "all",
    pendingDeleteCompressorId: null,
    zoneReadings: createDefaultZoneReadings(),
    overview: [],
    compressors: [],
    sensors: [],
    valves: [],
    alarms: [],
  };
}
