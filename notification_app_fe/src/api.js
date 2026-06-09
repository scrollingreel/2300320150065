const API_URL = "/api/notifications";

function extractItems(payload) {
  if (Array.isArray(payload.notifications)) {
    return payload.notifications;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

function extractTotal(payload) {
  const values = [
    payload.total,
    payload.totalCount,
    payload.count,
    payload.total_records,
    payload.resultCount,
    payload.pagination?.total,
    payload.pagination?.totalCount,
    payload.metadata?.total,
    payload.metadata?.totalCount
  ];

  for (const value of values) {
    if (Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

export async function fetchNotifications({ page, limit, notificationType, signal }) {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  if (notificationType) {
    url.searchParams.set("notification_type", notificationType);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  const payload = await response.json();
  const items = extractItems(payload);
  const total = extractTotal(payload);

  return {
    items,
    total,
    raw: payload
  };
}
