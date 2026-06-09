const LOG_ENDPOINT = "http://4.224.186.213/evaluation-service/logs";

export async function Log(stack, level, packageName, message) {
  const token = process.env.ACCESS_TOKEN || process.env.VITE_ACCESS_TOKEN || "";

  try {
    const response = await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stack,
        level,
        package: packageName,
        message
      })
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}
