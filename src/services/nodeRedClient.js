const configuredBaseUrl = import.meta.env.VITE_NODE_RED_BASE_URL || "";

export const nodeRedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
export const isNodeRedEnabled = Boolean(nodeRedBaseUrl);
export const nodeRedPollMs = Math.max(
  1000,
  Number(import.meta.env.VITE_NODE_RED_POLL_MS || 2000),
);

function createNodeRedUrl(path) {
  return `${nodeRedBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timeout - Node-RED did not respond"));
    }, timeoutMs);

    fetch(url, { ...options, signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          reject(new Error("Request timeout - Node-RED did not respond"));
        } else {
          reject(error);
        }
      });
  });
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Node-RED responded with HTTP ${response.status}`);
  }

  return text ? JSON.parse(text) : {};
}

async function parseCommandResponse(response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Node-RED responded with HTTP ${response.status}`);
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function fetchDashboardSnapshot(signal) {
  const response = await fetch(createNodeRedUrl("/api/dashboard"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  return parseJsonResponse(response);
}

export async function sendMachineStartCommand() {
  const response = await fetchWithTimeout(createNodeRedUrl("/api/machine/start"), {
    method: "POST",
  });

  return parseCommandResponse(response);
}

export async function sendMachineStopCommand() {
  const response = await fetchWithTimeout(createNodeRedUrl("/api/machine/stop"), {
    method: "POST",
  });

  return parseCommandResponse(response);
}

export async function sendDashboardCommand(command) {
  const response = await fetchWithTimeout(createNodeRedUrl("/api/command"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(command),
  });

  return parseJsonResponse(response);
}

