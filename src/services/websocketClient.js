const WS_URL = import.meta.env.VITE_NODE_RED_WS_URL || "";

let ws = null;
let messageHandlers = [];
let reconnectTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 3000;

export function isWebSocketEnabled() {
  return Boolean(WS_URL);
}

export function onWebSocketMessage(handler) {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter((h) => h !== handler);
  };
}

function dispatchMessage(data) {
  messageHandlers.forEach((handler) => {
    try {
      handler(data);
    } catch (e) {
      console.error("WebSocket handler error:", e);
    }
  });
}

export function connectWebSocket() {
  if (!isWebSocketEnabled() || ws) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts = 0;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    ws.onmessage = (event) => {
      console.log("[WS] raw received:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("[WS] parsed:", data);
        dispatchMessage(data);
      } catch (err) {
        console.warn("[WS] parse failed:", err);
        dispatchMessage({ raw: event.data });
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      ws = null;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn("WebSocket max reconnect attempts reached. Stopping retries.");
        return;
      }
      reconnectAttempts += 1;
      const delay = Math.min(30000, BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1));
      console.log(`WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      reconnectTimeout = setTimeout(connectWebSocket, delay);
    };
  } catch (error) {
    console.error("WebSocket connection failed:", error);
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("WebSocket max reconnect attempts reached. Stopping retries.");
      return;
    }
    reconnectAttempts += 1;
    const delay = Math.min(30000, BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1));
    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    reconnectTimeout = setTimeout(connectWebSocket, delay);
  }
}

export function disconnectWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  reconnectAttempts = 0;
}
