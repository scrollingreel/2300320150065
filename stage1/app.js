import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTopNotifications } from "./notifications.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(currentDirectory, "output");
const outputFilePath = join(outputDirectory, "top_10_notifications.md");

function formatTable(rows) {
  const header = ["ID", "Type", "Message", "Timestamp"];
  const separator = ["---", "---", "---", "---"];
  const body = rows.map((notification) => [
    notification.id,
    notification.type,
    notification.message,
    notification.timestamp
  ]);

  return [header, separator, ...body]
    .map((row) => `| ${row.map((value) => String(value).replaceAll("|", "\\|")).join(" | ")} |`)
    .join("\n");
}

async function run() {
  const result = await buildTopNotifications(10);
  const table = formatTable(result.topNotifications);
  const output = [
    "# Top 10 Priority Notifications",
    "",
    table,
    "",
    `Time Complexity: ${result.complexity.time}`,
    `Space Complexity: ${result.complexity.space}`
  ].join("\n");

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFilePath, output, "utf8");

  process.stdout.write(`${output}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
