import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");

if (existsSync(envPath)) {
  failures.push(".env exists locally. Do not commit or push real API keys.");
}

if (!existsSync(envExamplePath)) {
  failures.push(".env.example is missing.");
} else {
  const envExample = readFileSync(envExamplePath, "utf8").trim();
  if (envExample !== "OPENAI_API_KEY=") {
    failures.push(".env.example must contain only: OPENAI_API_KEY=");
  }
}

const gitignorePath = path.join(root, ".gitignore");
if (!existsSync(gitignorePath) || !readFileSync(gitignorePath, "utf8").split(/\r?\n/).includes(".env")) {
  failures.push(".gitignore must include .env.");
}

for (const file of walk(root)) {
  const relative = path.relative(root, file);
  if (relative.startsWith(".git/") || relative === ".env") continue;
  if (/\.(png|jpg|jpeg|gif|pdf|ico|bin|onnx)$/i.test(relative)) continue;

  const text = readFileSync(file, "utf8");
  if (/sk-[A-Za-z0-9_-]{20,}/.test(text)) {
    failures.push(`Possible OpenAI API key found in ${relative}.`);
  }
}

if (failures.length > 0) {
  console.error("Preflight failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Preflight passed: no .env file, safe .env.example, no obvious API keys.");

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "coverage"].includes(entry)) continue;
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) yield* walk(fullPath);
    if (stat.isFile()) yield fullPath;
  }
}
