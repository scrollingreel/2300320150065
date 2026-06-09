import { Log } from "../logging_middleware/logger.js";

const NOTIFICATIONS_ENDPOINT = "http://4.224.186.213/evaluation-service/notifications";
const PRIORITY_MAP = new Map([
  ["Placement", 3],
  ["Result", 2],
  ["Event", 1]
]);

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

  const response = await fetch(NOTIFICATIONS_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN || process.env.VITE_ACCESS_TOKEN || ""}`
    }
  });

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
