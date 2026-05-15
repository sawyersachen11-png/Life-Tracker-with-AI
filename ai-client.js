import { fallbackPlan } from "./planner.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function systemPrompt() {
  return [
    "You are Life Tracker AI, a practical planning coach inside a local student portfolio app.",
    "Return only valid JSON with keys: summary, plan, trackerUpdates, safetyNote, qualityScore.",
    "The plan key must be an array of exactly 3 objects with title, detail, and reason.",
    "Use the user's tracker area, goal, constraints, and recent check-in.",
    "Do not ask for private identifiers, passwords, exact addresses, or sensitive medical details.",
    "For health, mental health, finance, or legal topics, include a brief non-professional safety note.",
    "If the user asks for dangerous, self-harm, illegal, or credential-stealing help, refuse briefly and give a safer alternative.",
    "Prefer specific, testable next actions over vague motivation."
  ].join(" ");
}

function buildMessages(input) {
  const context = [
    `Tracker area: ${input.area}`,
    `Goal: ${input.goal}`,
    `Constraints: ${input.constraints || "none"}`,
    `Recent check-in: ${input.checkin || "none"}`
  ].join("\n");

  return [
    { role: "system", content: systemPrompt() },
    ...input.history,
    {
      role: "user",
      content: `Create the next Life Tracker plan from this context.\n${context}`
    }
  ];
}

export async function createPlan(input) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      source: "fallback",
      data: fallbackPlan(input),
      warning: "OPENAI_API_KEY is not set, so a local fallback plan was used."
    };
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: buildMessages(input)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || "{}";
  return { source: "openai", data: normalizePlan(JSON.parse(content)) };
}

export function normalizePlan(plan) {
  const items = Array.isArray(plan.plan) ? plan.plan.slice(0, 3) : [];

  return {
    summary: String(plan.summary || "Plan generated.").slice(0, 500),
    plan: items.map((item, index) => ({
      title: String(item.title || `Step ${index + 1}`).slice(0, 80),
      detail: String(item.detail || "").slice(0, 650),
      reason: String(item.reason || "").slice(0, 350)
    })),
    trackerUpdates: Array.isArray(plan.trackerUpdates)
      ? plan.trackerUpdates.slice(0, 5).map((item) => String(item).slice(0, 140))
      : [],
    safetyNote: String(plan.safetyNote || "Use judgment and seek a qualified professional for high-stakes decisions.").slice(0, 300),
    qualityScore: Number.isFinite(Number(plan.qualityScore)) ? Number(plan.qualityScore) : 0.7
  };
}
