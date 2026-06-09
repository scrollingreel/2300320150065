const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const rootDirectory = __dirname;
const port = 3000;
const apiUrl = "http://4.224.186.213/evaluation-service/notifications";

function readToken() {
  const envPath = path.join(rootDirectory, ".env");

  if (!fs.existsSync(envPath)) {
    return "";
  }

  const content = fs.readFileSync(envPath, "utf8");
  const line = content.split(/\r?\n/).find((entry) => entry.trim().startsWith("VITE_ACCESS_TOKEN"));

  if (!line) {
    return "";
  }

  return line.split("=").slice(1).join("=").trim();
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
    console.error("No token found in .env, cannot refresh.");
    return null;
  }
  const info = extractCredentialsAndExpiry(token);
  if (!info || !info.credentials || !info.credentials.clientID) {
    console.error("Could not extract credentials from token in .env");
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
      console.error(`Auth service failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data && data.access_token) {
      const envPath = path.join(rootDirectory, ".env");
      fs.writeFileSync(envPath, `VITE_ACCESS_TOKEN=${data.access_token}\n`, "utf8");
      console.log("Successfully refreshed and wrote new token to .env");
      return data.access_token;
    }
  } catch (error) {
    console.error("Failed to automatically refresh token:", error.message);
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
      // If token is valid and has at least 60 seconds left, reuse it
      if (info.expiry - now > 60 * 1000) {
        return token;
      }
    }
  }

  // Otherwise, refresh it
  console.log("Token is expired, expiring soon, or refresh was forced. Fetching fresh token...");
  const newToken = await refreshAndSaveToken();
  return newToken || token; // Fallback to old token if refresh fails
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "text/plain; charset=utf-8";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  response.end(JSON.stringify(payload));
}

function serveFile(response, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Access-Control-Allow-Origin": "*"
    });
    response.end(data);
  });
}

async function proxyNotifications(request, response, requestUrl) {
  const upstreamUrl = new URL(apiUrl);
  upstreamUrl.search = requestUrl.search;

  try {
    let token = await getOrRefreshToken();
    let upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // If 401 Unauthorized, force refresh the token and retry once
    if (upstreamResponse.status === 401) {
      console.log("Upstream returned 401. Refreshing token and retrying...");
      token = await getOrRefreshToken(true);
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    const contentType = upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8";
    const body = await upstreamResponse.text();

    response.writeHead(upstreamResponse.status, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*"
    });
    response.end(body);
  } catch (error) {
    sendJson(response, 500, { message: error.message });
  }
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/notifications") {
    proxyNotifications(request, response, requestUrl);
    return;
  }

  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.join(rootDirectory, requestedPath);

  if (!filePath.startsWith(rootDirectory)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  serveFile(response, filePath);
});

server.listen(port, () => {
  process.stdout.write(`Server running at http://localhost:${port}\n`);
});