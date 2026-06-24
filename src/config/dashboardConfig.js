export const COMPRESSOR_LIMIT = 8;

export const OVERVIEW_ZONES = [
  { id: "zone-1", title: "Zone DC1", subtitle: "AC-01, AC-02", compressorIndexes: [1, 2] },
  { id: "zone-2", title: "Zone DC2", subtitle: "AC-03, AC-04, AC-05", compressorIndexes: [3, 4, 5] },
  { id: "zone-3", title: "Zone PC", subtitle: "AC-06, AC-07", compressorIndexes: [6, 7] },
];

export const VIEW_META = {
  overview: {
    title: "Overview",
    subtitle: "ค่ารวมจากระบบ Air Compressor",
  },
  compressors: {
    title: "Air Compressors",
    subtitle: "CompCard สำหรับเครื่องอัดอากาศ",
  },
  sensors: {
    title: "Flow Sensors",
    subtitle: "CompCard สำหรับ sensor ที่ต่อ backend",
  },
  valves: {
    title: "Electric Valve",
    subtitle: "สถานะวาล์วไฟฟ้าและคำสั่งควบคุม",
  },
  alarms: {
    title: "Alarm",
    subtitle: "แจ้งเตือนจากระบบ backend",
  },
};

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "monitor-dot" },
  { id: "compressors", label: "Air", icon: "wind" },
  { id: "sensors", label: "Sensor", icon: "scan-line" },
  { id: "valves", label: "Valve", icon: "sliders-horizontal" },
  { id: "alarms", label: "Alarm", icon: "shield-alert" },
];

export const OVERVIEW_METRICS = [
  {
    key: "pressure",
    title: "Pressure",
    unit: "Bar",
    decimals: 2,
    description: "Direct zone pressure from field sensors",
    accent: "#1d72e0",
    iconName: "circle-gauge",
  },
  {
    key: "power",
    title: "Power",
    unit: "kW",
    decimals: 2,
    description: "Direct zone power reading",
    accent: "#d97706",
    iconName: "zap",
  },
  {
    key: "flowrate",
    title: "Flowrate",
    unit: "L/min",
    decimals: 2,
    description: "Direct zone flowrate reading",
    useGrouping: true,
    accent: "#0891b2",
    iconName: "droplets",
  },
  {
    key: "efficiency",
    title: "Efficiency",
    unit: "kW/L/min",
    decimals: 3,
    description: "Direct zone efficiency reading",
    accent: "#059669",
    iconName: "trending-up",
  },
];
