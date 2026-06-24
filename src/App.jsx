import { VIEW_META } from "./data/dashboardData.js";
import "./components/views/views.css";
import { getActiveAlarmCount, getInAlarmCompressorCount } from "./utils/dashboardMetrics.js";
import { useDashboardState } from "./hooks/useDashboardState.js";
import { isCompressorRunning } from "./utils/compressorStatus.js";
import BottomNav from "./components/BottomNav.jsx";
import SummaryStrip from "./components/SummaryStrip.jsx";
import TopBar from "./components/TopBar.jsx";
import AlarmsView from "./components/views/AlarmsView.jsx";
import CompressorsView from "./components/views/CompressorsView.jsx";
import OverviewView from "./components/views/OverviewView.jsx";
import SensorsView from "./components/views/SensorsView.jsx";
import ValvesView from "./components/views/ValvesView.jsx";

function renderActiveView(dashboard, actions, commandStates) {
  if (dashboard.activeView === "overview") {
    return (
      <OverviewView
        zoneReadings={dashboard.zoneReadings}
        sensors={dashboard.sensors}
        compressors={dashboard.compressors}
      />
    );
  }

  if (dashboard.activeView === "compressors") {
    return (
      <CompressorsView
        compressors={dashboard.compressors}
        alarms={dashboard.alarms}
        activeZone={dashboard.activeCompressorZone}
        pendingDeleteCompressorId={dashboard.pendingDeleteCompressorId}
        commandStates={commandStates}
        onCommand={actions.sendCompressorCommand}
        onConfirmDelete={actions.confirmDeleteCompressor}
        onDeleteCancel={actions.cancelDeleteCompressor}
        onDeleteRequest={actions.requestDeleteCompressor}
        onZoneChange={actions.setCompressorZone}
      />
    );
  }

  if (dashboard.activeView === "sensors") {
    return <SensorsView sensors={dashboard.sensors} zoneReadings={dashboard.zoneReadings} />;
  }

  if (dashboard.activeView === "valves") {
    return <ValvesView valves={dashboard.valves} onCommand={actions.sendValveCommand} />;
  }

  return <AlarmsView alarms={dashboard.alarms} onAcknowledge={actions.acknowledgeAlarm} />;
}

export default function App() {
  const { dashboard, lastSync, connectionStatus, commandStates, actions } = useDashboardState();
  const activeAlarmCount = getActiveAlarmCount(dashboard.alarms);
  const alarmingMachineCount = getInAlarmCompressorCount(dashboard.compressors);
  const runningCompressorCount = dashboard.compressors.filter(isCompressorRunning).length;
  const totalCompressorCount = dashboard.compressors.length;
  const title = VIEW_META[dashboard.activeView].title;

  return (
    <main className="app-shell">
      <div className="app-sticky-header">
        <TopBar
          title={title}
          alarms={dashboard.alarms}
          activeAlarmCount={activeAlarmCount}
          connectionStatus={connectionStatus}
          onRefresh={() => actions.refreshDashboardData()}
        />
        <SummaryStrip
          lastSync={lastSync}
          runningCompressorCount={runningCompressorCount}
          totalCompressorCount={totalCompressorCount}
          alarmingMachineCount={alarmingMachineCount}
          onOpenAlarms={() => actions.setView("alarms")}
        />
      </div>
      <section className="content-panel" aria-live="polite">
        {renderActiveView(dashboard, actions, commandStates)}
      </section>
      <BottomNav activeView={dashboard.activeView} onChangeView={actions.setView} />
    </main>
  );
}
