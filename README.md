# IoT Mobile Dashboard

Mobile-first dashboard for Air Compressor and IoT monitoring, now migrated to `React + Vite`.

## Screenshots

| Overview | Compressors | Sensors |
|:---:|:---:|:---:|
| ![Overview](screenshots/overview.png) | ![Compressors](screenshots/compressors.png) | ![Sensors](screenshots/sensors.png) |

| Valves | Alarms |
|:---:|:---:|
| ![Valves](screenshots/valves.png) | ![Alarms](screenshots/alarms.png) |

## Stack

- React 19
- Vite 8
- lucide-react

## Project structure

```text
src/
  components/
    shared/
    views/
  data/
  hooks/
  utils/
```

- `src/hooks/useDashboardState.js` keeps dashboard state and actions together.
- `src/components/views/` separates `Overview`, `Air`, `Sensor`, `Valve`, and `Alarm` screens.
- `src/utils/` separates formatting, metric calculations, and state helpers.
- `src/data/dashboardData.js` keeps constants and view metadata.

## Run

```bash
npm install
npm run dev
```

Dev server runs on `http://127.0.0.1:4173`

To connect the app to Node-RED, set:

```bash
VITE_NODE_RED_BASE_URL=http://192.168.100.155:1880
VITE_NODE_RED_POLL_MS=2000
```

If `VITE_NODE_RED_BASE_URL` is empty, the app shows an offline state and does not load sample data.

## Build

```bash
npm run build
```

## Features

- Overview zone readings for Pressure, Power, Flowrate, and Efficiency using direct field readings
- Air compressor controls with start, stop, and delete
- Flow sensor cards by zone and total flow
- Electric valve controls with OPEN and CLOSE actions
- Alarm view with acknowledge flow
- Manual refresh and polling from Node-RED when configured

## Backend integration

### Node-RED HTTP integration

When `VITE_NODE_RED_BASE_URL` is configured, the app polls:

```text
GET /api/dashboard
```

Expected JSON shape:

```json
{
  "zoneReadings": [
    {
      "id": "zone-1",
      "metrics": {
        "pressure": { "value": 4.0, "unit": "Bar", "source": "PT-DC1" },
        "power": { "value": 193.63, "unit": "kW", "source": "Power DC1" },
        "flowrate": { "value": 27521.84, "unit": "L/min", "source": "Flow DC1" },
        "efficiency": { "value": 0.007, "unit": "kW/L/min", "source": "Eff DC1" }
      }
    }
  ],
  "compressors": [
    {
      "id": "ac-01",
      "status": "Running",
      "overviewMetrics": { "power": 21.8, "flowrate": 292 }
    }
  ],
  "valves": [
    {
      "id": "ev-01",
      "status": "Open",
      "metrics": [["Position", "100%"], ["Command", "Auto"]]
    }
  ],
  "alarms": []
}
```

The compressor Start and Stop buttons send:

```text
POST /api/machine/start
POST /api/machine/stop
```

Other compressor and valve buttons send:

```text
POST /api/command
Content-Type: application/json
```

```json
{
  "type": "valve",
  "id": "ev-01",
  "action": "open",
  "timestamp": "2026-06-16T01:57:00.000Z"
}
```

Because the app and Node-RED run on different hosts, Node-RED must allow CORS. Add response headers in the HTTP response flow, or set `httpNodeCors` in `settings.js`.

### Browser bridge

Frontend can still receive backend data through `window.IoTDashboardBridge`:

```js
window.IoTDashboardBridge.updateZoneReadings([
  {
    id: "zone-1",
    metrics: {
      pressure: { value: 4.0, source: "PT-DC1" },
      power: { value: 193.63, source: "Power DC1" },
      flowrate: { value: 27521.84, source: "Flow DC1" },
      efficiency: { value: 0.007, source: "Eff DC1" },
    },
  },
  {
    id: "zone-2",
    metrics: {
      pressure: { value: 4.1, source: "PT-DC2" },
      power: { value: 434.28, source: "Power DC2" },
      flowrate: { value: 81479.0, source: "Flow DC2" },
      efficiency: { value: 0.005, source: "Eff DC2" },
    },
  },
]);

window.IoTDashboardBridge.updateZonePressures([
  { id: "zone-1", value: 4.0, source: "PT-DC1" },
  { id: "zone-2", value: 4.1, source: "PT-DC2" },
  { id: "zone-3", value: 3.95, source: "PT-PC" },
]);

window.IoTDashboardBridge.updateOverview([
  { id: "pressure", value: 7.8, status: "High", trend: "+0.4" },
  { id: "power", value: 46.2, status: "Running", trend: "+1.1" },
]);

window.IoTDashboardBridge.updateCompressors([
  {
    id: "ac-01",
    overviewMetrics: {
      power: 21.8,
      flowrate: 292,
    },
    metrics: [
      { label: "Pressure", value: 7.5, unit: "Bar", max: 10, color: "#2563eb" },
      { label: "Temperature", value: 70, unit: "C", max: 100, color: "#d47b08" },
      { label: "Current", value: 34, unit: "A", max: 50, color: "#7c3aed" },
      { label: "Load", value: 80, unit: "%", max: 100, color: "#0f9f63" },
    ],
  },
]);

window.IoTDashboardBridge.pushAlarm({
  severity: "warning",
  title: "Pressure high",
  message: "Pressure is above the configured limit.",
  source: "PS-01",
});
```

`updateZonePressures()` is still supported for pressure-only updates.

Compressor buttons still dispatch `compressor-command`:

```js
window.addEventListener("compressor-command", (event) => {
  console.log(event.detail);
});
```
