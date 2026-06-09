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

function proxyNotifications(request, response, requestUrl) {
  const upstreamUrl = new URL(apiUrl);
  upstreamUrl.search = requestUrl.search;

  const requestModule = upstreamUrl.protocol === "https:" ? https : http;

  const upstreamRequest = requestModule.request(
    upstreamUrl,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${readToken()}`
      }
    },
    (upstreamResponse) => {
      let body = "";

      upstreamResponse.setEncoding("utf8");
      upstreamResponse.on("data", (chunk) => {
        body += chunk;
      });
      upstreamResponse.on("end", () => {
        response.writeHead(upstreamResponse.statusCode || 500, {
          "Content-Type": upstreamResponse.headers["content-type"] || "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        });
        response.end(body);
      });
    }
  );

  upstreamRequest.on("error", (error) => {
    sendJson(response, 500, { message: error.message });
  });

  upstreamRequest.end();
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