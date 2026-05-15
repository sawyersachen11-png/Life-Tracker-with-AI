import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlan } from "../src/ai-client.js";
import { scoreOutput } from "../src/planner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CASES_PATH = path.join(__dirname, "cases.json");
const RESULTS_PATH = path.join(__dirname, "results.json");

await loadEnv(path.join(ROOT, ".env"));

const cases = JSON.parse(await readFile(CASES_PATH, "utf8"));
const results = [];

for (const testCase of cases) {
  const result = await createPlan({ ...testCase, history: [] });
  const text = JSON.stringify(result.data);
  const score = scoreOutput(text, testCase);
  results.push({
    id: testCase.id,
    score,
    source: result.source,
    summary: result.data.summary
  });
  console.log(`${testCase.id}: ${score.toFixed(2)} (${result.source})`);
}

const average = results.reduce((sum, item) => sum + item.score, 0) / results.length;
console.log(`Average score: ${average.toFixed(2)}`);

await writeFile(
  RESULTS_PATH,
  JSON.stringify({ createdAt: new Date().toISOString(), average, results }, null, 2)
);

if (average < 0.7) {
  process.exitCode = 1;
}

async function loadEnv(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // The app can still run in fallback mode, but real evals need OPENAI_API_KEY.
  }
}
