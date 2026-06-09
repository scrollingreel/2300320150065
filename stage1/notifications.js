import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Log } from "../logging_middleware/logger.js";

const NOTIFICATIONS_ENDPOINT = "http://4.224.186.213/evaluation-service/notifications";
const PRIORITY_MAP = new Map([
  ["Placement", 3],
  ["Result", 2],
  ["Event", 1]
]);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(currentDir, "../notification_app_fe/.env");

function readToken() {
  if (process.env.ACCESS_TOKEN) return process.env.ACCESS_TOKEN;
  if (process.env.VITE_ACCESS_TOKEN) return process.env.VITE_ACCESS_TOKEN;

  if (!fs.existsSync(envPath)) {
    return "";
  }

  try {
    const content = fs.readFileSync(envPath, "utf8");
    const line = content.split(/\r?\n/).find((entry) => entry.trim().startsWith("VITE_ACCESS_TOKEN"));
    if (line) {
      return line.split("=").slice(1).join("=").trim();
    }
  } catch (err) {
    // Ignore error
  }
  return "";
}

function extractCredentialsAndExpiry(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return {
      credentials: {
        email: payload.email,
        name: payload.name,
        rollNo: payload.rollNo,
        accessCode: payload.accessCode,
        clientID: payload.clientID,
        clientSecret: payload.clientSecret
      },
      expiry: payload.exp ? payload.exp * 1000 : 0
    };
  } catch (error) {
    return null;
  }
}

async function refreshAndSaveToken() {
  const token = readToken();
  if (!token) {
    return null;
  }
  const info = extractCredentialsAndExpiry(token);
  if (!info || !info.credentials || !info.credentials.clientID) {
    return null;
  }

  try {
    const response = await fetch("http://4.224.186.213/evaluation-service/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(info.credentials)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.access_token) {
      fs.writeFileSync(envPath, `VITE_ACCESS_TOKEN=${data.access_token}\n`, "utf8");
      return data.access_token;
    }
  } catch (error) {
    // Ignore
  }
  return null;
}

async function getOrRefreshToken(forceRefresh = false) {
  const token = readToken();
  if (!token) return "";

  if (!forceRefresh) {
    const info = extractCredentialsAndExpiry(token);
    if (info && info.expiry) {
      const now = Date.now();
      if (info.expiry - now > 60 * 1000) {
        return token;
      }
    }
  }

  const newToken = await refreshAndSaveToken();
  return newToken || token;
}

function toTimestamp(notification) {
  const value = notification.Timestamp || notification.timestamp || notification.createdAt || notification.time || "";
  return new Date(value).getTime();
}

function getPriority(notification) {
  return PRIORITY_MAP.get(notification.Type) || 0;
}

function normalizeNotification(notification) {
  return {
    id: notification.ID || notification.id || "",
    type: notification.Type || notification.type || "",
    message: notification.Message || notification.message || "",
    timestamp: notification.Timestamp || notification.timestamp || ""
  };
}

function compareNotifications(first, second) {
  const priorityDifference = getPriority(second) - getPriority(first);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return toTimestamp(second) - toTimestamp(first);
}

export async function fetchNotifications() {
  await Log("backend", "info", "api", "Fetching notifications started");

  let token = await getOrRefreshToken();

  let response = await fetch(NOTIFICATIONS_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    await Log("backend", "warn", "api", "Token invalid or expired. Refreshing token and retrying...");
    token = await getOrRefreshToken(true);
    response = await fetch(NOTIFICATIONS_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  if (!response.ok) {
    await Log("backend", "error", "api", `API failure with status ${response.status}`);
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  const payload = await response.json();
  const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];

  await Log("backend", "info", "api", "Notifications fetched successfully");

  return notifications.map(normalizeNotification);
}

export async function buildTopNotifications(limit = 10) {
  try {
    const notifications = await fetchNotifications();

    await Log("backend", "info", "utils", "Sorting notifications");

    const sortedNotifications = [...notifications].sort(compareNotifications);
    const topNotifications = sortedNotifications.slice(0, limit);

    await Log("backend", "info", "utils", "Top 10 notifications generated");

    return {
      allNotifications: notifications,
      topNotifications,
      complexity: {
        time: "O(n log n)",
        space: "O(n)"
      }
    };
  } catch (error) {
    await Log("backend", "error", "middleware", `Processing error: ${error.message}`);
    throw error;
  }
}
