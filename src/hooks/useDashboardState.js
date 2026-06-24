import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { COMPRESSOR_LIMIT, createInitialDashboardState } from "../data/dashboardData.js";
import { createAlarmEntry, patchCollectionById, updateMetricValue, updateValveMetric, normalizeIncomingCompressorPatch } from "../utils/dashboardState.js";
import { getAlarmCompressorStatus, getCompressorAccent, isCompressorInAlarm, resolveAlarmCompressorId } from "../utils/compressorStatus.js";
import { formatLastSync, formatTime } from "../utils/formatters.js";
import { fetchDashboardSnapshot, isNodeRedEnabled, nodeRedPollMs, sendDashboardCommand, sendMachineStartCommand, sendMachineStopCommand } from "../services/nodeRedClient.js";
import { connectWebSocket, disconnectWebSocket, onWebSocketMessage } from "../services/websocketClient.js";

const COMMAND_FEEDBACK_TIMEOUT_MS = 2500;

function dispatchDashboardEvent(name, detail) {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail: {
        ...detail,
        timestamp: new Date().toISOString(),
      },
    }),
  );
}

function getCommandKey(type, id, action) {
  return `${type}:${id}:${action}`;
}

function patchZoneReadings(zoneReadings, items = []) {
  return zoneReadings.map((reading) => {
    const incoming = items.find((item) => item.id === reading.id);
    if (!incoming) return reading;

    const { metrics: incomingMetrics = {}, updatedAt, ...incomingReading } = incoming;
    const nextMetrics = {
      ...reading.metrics,
      ...Object.fromEntries(
        Object.entries(incomingMetrics).map(([metricKey, incomingMetric]) => [
          metricKey,
          {
            ...reading.metrics[metricKey],
            ...incomingMetric,
          },
        ]),
      ),
    };

    return {
      ...reading,
      ...incomingReading,
      metrics: nextMetrics,
      updatedAt: updatedAt || formatTime(),
    };
  });
}

function patchZonePressures(zoneReadings, items = []) {
  return zoneReadings.map((reading) => {
    const incoming = items.find((item) => item.id === reading.id);
    if (!incoming) return reading;

    return {
      ...reading,
      metrics: {
        ...reading.metrics,
        pressure: {
          ...reading.metrics.pressure,
          ...incoming,
          value: incoming.value ?? reading.metrics.pressure.value,
          unit: incoming.unit || reading.metrics.pressure.unit,
          source: incoming.source || reading.metrics.pressure.source,
        },
      },
      updatedAt: incoming.updatedAt || formatTime(),
    };
  });
}

function applyAlarmToCompressors(compressors, alarmEntry) {
  const compressorId = resolveAlarmCompressorId(alarmEntry, compressors);
  if (!compressorId) return compressors;

  const nextStatus = getAlarmCompressorStatus(alarmEntry);
  if (!isCompressorInAlarm(nextStatus)) return compressors;

  return compressors.map((compressor) => {
    if (compressor.id !== compressorId) return compressor;

    return {
      ...compressor,
      status: nextStatus,
      accent: getCompressorAccent(nextStatus),
      overviewMetrics: {
        ...compressor.overviewMetrics,
        power: 0,
        flowrate: 0,
      },
      metrics: updateMetricValue(updateMetricValue(compressor.metrics, "Current", 0), "Load", 0),
    };
  });
}

function applyDashboardSnapshot(previousState, snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") {
    return previousState;
  }

  let nextState = previousState;

  if (Array.isArray(snapshot.overview)) {
    nextState = {
      ...nextState,
      overview: patchCollectionById(nextState.overview, snapshot.overview),
    };
  }

  if (Array.isArray(snapshot.zoneReadings)) {
    nextState = {
      ...nextState,
      zoneReadings: patchZoneReadings(nextState.zoneReadings, snapshot.zoneReadings),
    };
  }

  if (Array.isArray(snapshot.zonePressures)) {
    nextState = {
      ...nextState,
      zoneReadings: patchZonePressures(nextState.zoneReadings, snapshot.zonePressures),
    };
  }

  if (Array.isArray(snapshot.compressors)) {
    nextState = {
      ...nextState,
      compressors: patchCollectionById(
        nextState.compressors,
        snapshot.compressors.map(normalizeIncomingCompressorPatch),
        COMPRESSOR_LIMIT,
      ),
    };
  }

  if (Array.isArray(snapshot.sensors)) {
    nextState = {
      ...nextState,
      sensors: patchCollectionById(nextState.sensors, snapshot.sensors),
    };
  }

  if (Array.isArray(snapshot.valves)) {
    const now = Date.now();
    const PROTECT_MS = 5000;
    const protectedValveIds = new Set(
      nextState.valves
        .filter((v) => v._commandTimestamp && now - v._commandTimestamp < PROTECT_MS)
        .map((v) => v.id),
    );
    const filteredValves = snapshot.valves.filter((v) => !protectedValveIds.has(v.id));
    if (filteredValves.length > 0) {
      nextState = {
        ...nextState,
        valves: patchCollectionById(nextState.valves, filteredValves),
      };
    }
  }

  if (Array.isArray(snapshot.alarms) && snapshot.alarms.length > 0) {
    nextState = {
      ...nextState,
      alarms: snapshot.alarms.map(createAlarmEntry),
    };
  }

  if (snapshot.alarm) {
    const alarmEntry = createAlarmEntry(snapshot.alarm);
    nextState = {
      ...nextState,
      alarms: [alarmEntry, ...nextState.alarms],
      compressors: applyAlarmToCompressors(nextState.compressors, alarmEntry),
    };
  }

  return nextState;
}

export function useDashboardState() {
  const [dashboard, setDashboard] = useState(() => createInitialDashboardState());
  const [lastSync, setLastSync] = useState(() => ({ time: "--:--", date: "" }));
  const [connectionStatus, setConnectionStatus] = useState(() => ({
    state: isNodeRedEnabled ? "connecting" : "offline",
    message: isNodeRedEnabled ? "Waiting for Node-RED" : "Node-RED URL is not configured",
  }));
  const [commandStates, setCommandStates] = useState({});
  const commandFeedbackTimeoutsRef = useRef({});
  const pendingCommandsRef = useRef(new Set());

  function commitState(updater, options = {}) {
    startTransition(() => {
      setDashboard((previousState) => updater(previousState));
      if (options.updateLastSync) {
        setLastSync(formatLastSync());
      }
    });
  }

  function setView(viewKey) {
    commitState((previousState) => ({
      ...previousState,
      activeView: viewKey,
      pendingDeleteCompressorId: null,
    }));
  }

  function setCompressorZone(zoneId) {
    commitState((previousState) => ({
      ...previousState,
      activeCompressorZone: zoneId,
    }));
  }

  function acknowledgeAlarm(alarmId) {
    const commandKey = getCommandKey("alarm", alarmId, "acknowledge");

    if (pendingCommandsRef.current.has(commandKey)) {
      return;
    }

    pendingCommandsRef.current.add(commandKey);
    setCommandState(commandKey, "loading", "Acknowledging alarm...");

    forwardDashboardCommand("alarm", alarmId, "acknowledge")
      .then(() => {
        setCommandState(commandKey, "success", "Acknowledged");
        commitState((previousState) => ({
          ...previousState,
          alarms: previousState.alarms.map((alarm) => (
            alarm.id === alarmId ? { ...alarm, acknowledged: true } : alarm
          )),
        }));
      })
      .catch((error) => {
        setCommandState(commandKey, "error", error.message);
      })
      .finally(() => {
        pendingCommandsRef.current.delete(commandKey);
        clearCommandStateAfterFeedback(commandKey);
      });
  }

  function requestDeleteCompressor(compressorId) {
    commitState((previousState) => ({
      ...previousState,
      pendingDeleteCompressorId: compressorId,
    }));
  }

  function cancelDeleteCompressor() {
    commitState((previousState) => ({
      ...previousState,
      pendingDeleteCompressorId: null,
    }));
  }

  function confirmDeleteCompressor(compressorId) {
    const commandKey = getCommandKey("compressor", compressorId, "delete");

    if (pendingCommandsRef.current.has(commandKey)) {
      return;
    }

    pendingCommandsRef.current.add(commandKey);
    setCommandState(commandKey, "loading", "Deleting compressor...");

    forwardDashboardCommand("compressor", compressorId, "delete")
      .then(() => {
        setCommandState(commandKey, "success", "Deleted");
        commitState((previousState) => ({
          ...previousState,
          compressors: previousState.compressors.filter((compressor) => compressor.id !== compressorId),
          pendingDeleteCompressorId: null,
        }));
      })
      .catch((error) => {
        setCommandState(commandKey, "error", error.message);
      })
      .finally(() => {
        pendingCommandsRef.current.delete(commandKey);
        clearCommandStateAfterFeedback(commandKey);
      });
  }

  function setCommandState(commandKey, status, message = "") {
    const timeoutId = commandFeedbackTimeoutsRef.current[commandKey];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete commandFeedbackTimeoutsRef.current[commandKey];
    }

    setCommandStates((previousStates) => ({
      ...previousStates,
      [commandKey]: { status, message },
    }));
  }

  function clearCommandStateAfterFeedback(commandKey) {
    commandFeedbackTimeoutsRef.current[commandKey] = window.setTimeout(() => {
      setCommandStates((previousStates) => {
        const nextStates = { ...previousStates };
        delete nextStates[commandKey];
        return nextStates;
      });
      delete commandFeedbackTimeoutsRef.current[commandKey];
    }, COMMAND_FEEDBACK_TIMEOUT_MS);
  }

  function forwardDashboardCommand(type, id, action) {
    dispatchDashboardEvent(`${type}-command`, { id, action });

    if (!isNodeRedEnabled) {
      return Promise.reject(new Error("Node-RED URL is not configured"));
    }

    const commandRequest = sendDashboardCommand({
      type,
      id,
      action,
      timestamp: new Date().toISOString(),
    });

    return commandRequest
      .then((response) => {
        setConnectionStatus({ state: "online", message: "Node-RED command accepted" });
        return response;
      })
      .catch((error) => {
        setConnectionStatus({ state: "offline", message: error.message });
        throw error;
      });
  }

  function sendValveCommand(valveId, action) {
    const commandKey = getCommandKey("valve", valveId, action);

    if (pendingCommandsRef.current.has(commandKey)) {
      return;
    }

    pendingCommandsRef.current.add(commandKey);
    setCommandState(commandKey, "loading", "Sending valve command");

    forwardDashboardCommand("valve", valveId, action)
      .then(() => {
        setCommandState(commandKey, "success", "Valve command accepted");
        commitState((previousState) => ({
          ...previousState,
          valves: previousState.valves.map((valve) => {
            if (valve.id !== valveId) return valve;

            if (action === "open") {
              return {
                ...valve,
                status: "Open",
                accent: "#059669",
                _commandTimestamp: Date.now(),
                metrics: updateValveMetric(updateValveMetric(valve.metrics, "Position", "100%"), "Command", "Open"),
              };
            }

            if (action === "close") {
              return {
                ...valve,
                status: "Closed",
                accent: "#64748b",
                _commandTimestamp: Date.now(),
                metrics: updateValveMetric(updateValveMetric(valve.metrics, "Position", "0%"), "Command", "Close"),
              };
            }

            return valve;
          }),
        }), { updateLastSync: true });
      })
      .catch((error) => {
        setCommandState(commandKey, "error", error.message);
      })
      .finally(() => {
        pendingCommandsRef.current.delete(commandKey);
        clearCommandStateAfterFeedback(commandKey);
      });
  }

  function applyCompressorCommandSuccess(compressorId, action) {
    const nextStatusByAction = {
      start: "Running",
      stop: "Standby",
    };
    const nextStatus = nextStatusByAction[action];
    if (!nextStatus) return;

    commitState((previousState) => ({
      ...previousState,
      compressors: previousState.compressors.map((compressor) => {
        if (compressor.id !== compressorId) return compressor;

        return {
          ...compressor,
          status: nextStatus,
          accent: getCompressorAccent(nextStatus),
          statusTransition: {
            status: nextStatus,
            expiresAt: Date.now() + 5000,
          },
        };
      }),
    }), { updateLastSync: true });
  }

  function sendCompressorCommand(compressorId, action) {
    const commandKey = getCommandKey("compressor", compressorId, action);

    if (pendingCommandsRef.current.has(commandKey)) {
      return;
    }

    pendingCommandsRef.current.add(commandKey);
    setCommandState(commandKey, "loading", "Sending command to Node-RED");

    forwardDashboardCommand("compressor", compressorId, action)
      .then(() => {
        setCommandState(commandKey, "success", "Command accepted");
        applyCompressorCommandSuccess(compressorId, action);
      })
      .catch((error) => {
        setCommandState(commandKey, "error", error.message);
      })
      .finally(() => {
        pendingCommandsRef.current.delete(commandKey);
        clearCommandStateAfterFeedback(commandKey);
      });
  }

  function pushAlarm(alarm) {
    const alarmEntry = createAlarmEntry(alarm);

    commitState((previousState) => ({
      ...previousState,
      alarms: [alarmEntry, ...previousState.alarms],
      compressors: applyAlarmToCompressors(previousState.compressors, alarmEntry),
    }), { updateLastSync: true });
  }

  async function refreshDashboardData(signal) {
    if (!isNodeRedEnabled) {
      setConnectionStatus({ state: "offline", message: "Node-RED URL is not configured" });
      return;
    }

    setConnectionStatus({ state: "connecting", message: "Refreshing Node-RED data" });

    try {
      const snapshot = await fetchDashboardSnapshot(signal);
      commitState((previousState) => applyDashboardSnapshot(previousState, snapshot), { updateLastSync: true });
      setConnectionStatus({ state: "online", message: "Node-RED connected" });
    } catch (error) {
      if (error.name === "AbortError") return;
      setConnectionStatus({ state: "offline", message: error.message });
    }
  }

  useEffect(() => {
    if (!isNodeRedEnabled) {
      return undefined;
    }

    let isMounted = true;
    let timeoutId;
    let abortController;
    let currentPollMs = nodeRedPollMs;

    async function pollDashboard() {
      abortController = new AbortController();

      try {
        const snapshot = await fetchDashboardSnapshot(abortController.signal);

        if (!isMounted) return;

        commitState((previousState) => applyDashboardSnapshot(previousState, snapshot), { updateLastSync: true });
        setConnectionStatus({ state: "online", message: "Node-RED connected" });
        currentPollMs = nodeRedPollMs;
      } catch (error) {
        if (!isMounted || error.name === "AbortError") return;
        setConnectionStatus({ state: "offline", message: error.message });
        currentPollMs = Math.min(30000, currentPollMs * 2);
      } finally {
        if (isMounted) {
          timeoutId = window.setTimeout(pollDashboard, currentPollMs);
        }
      }
    }

    pollDashboard();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      abortController?.abort();
    };
  }, []);

  useEffect(() => {
    window.IoTDashboardBridge = {
      updateOverview(cards) {
        commitState((previousState) => ({
          ...previousState,
          overview: patchCollectionById(previousState.overview, cards),
        }), { updateLastSync: true });
      },
      updateZoneReadings(items) {
        commitState((previousState) => ({
          ...previousState,
          zoneReadings: patchZoneReadings(previousState.zoneReadings, items),
        }), { updateLastSync: true });
      },
      updateZonePressures(items) {
        commitState((previousState) => ({
          ...previousState,
          zoneReadings: patchZonePressures(previousState.zoneReadings, items),
        }), { updateLastSync: true });
      },
      updateCompressors(items) {
        commitState((previousState) => ({
          ...previousState,
          compressors: patchCollectionById(
            previousState.compressors,
            items.map(normalizeIncomingCompressorPatch),
            COMPRESSOR_LIMIT,
          ),
        }), { updateLastSync: true });
      },
      updateSensors(items) {
        commitState((previousState) => ({
          ...previousState,
          sensors: patchCollectionById(previousState.sensors, items),
        }), { updateLastSync: true });
      },
      updateValves(items) {
        commitState((previousState) => ({
          ...previousState,
          valves: patchCollectionById(previousState.valves, items),
        }), { updateLastSync: true });
      },
      pushAlarm,
    };

    return () => {
      delete window.IoTDashboardBridge;
    };
  }, []);

  useEffect(() => () => {
    Object.values(commandFeedbackTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
  }, []);

  useEffect(() => {
    connectWebSocket();
    const unsubscribe = onWebSocketMessage((data) => {
      console.log("[Dashboard] WS message:", data);
      if (data?.type === "snapshot") {
        console.log("[Dashboard] snapshot received");
        commitState((previousState) => applyDashboardSnapshot(previousState, data.payload), { updateLastSync: true });
      }
      if (data?.type === "alarm") {
        console.log("[Dashboard] alarm received:", data.payload);
        pushAlarm(data.payload);
      }
    });
    return () => {
      unsubscribe();
      disconnectWebSocket();
    };
  }, []);

  return {
    dashboard,
    lastSync,
    connectionStatus,
    commandStates,
    actions: {
      acknowledgeAlarm,
      cancelDeleteCompressor,
      confirmDeleteCompressor,
      pushAlarm,
      refreshDashboardData,
      requestDeleteCompressor,
      sendCompressorCommand,
      sendValveCommand,
      setCompressorZone,
      setView,
    },
  };
}
