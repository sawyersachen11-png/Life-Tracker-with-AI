const AREAS = new Set(["Health", "Work", "Mind", "Life"]);

export function validatePlanRequest(body) {
  const errors = [];
  const area = typeof body.area === "string" ? body.area.trim() : "";
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  const checkin = typeof body.checkin === "string" ? body.checkin.trim() : "";
  const constraints = typeof body.constraints === "string" ? body.constraints.trim() : "";
  const history = Array.isArray(body.history) ? body.history : [];

  if (!AREAS.has(area)) errors.push("Choose one tracker area.");
  if (goal.length < 8) errors.push("Describe the goal in at least 8 characters.");
  if (goal.length > 900) errors.push("Goal is too long; keep it under 900 characters.");
  if (constraints.length > 700) errors.push("Constraints are too long; keep them under 700 characters.");
  if (checkin.length > 700) errors.push("Check-in is too long; keep it under 700 characters.");

  return {
    ok: errors.length === 0,
    errors,
    value: {
      area,
      goal,
      constraints,
      checkin,
      history: sanitizeHistory(history)
    }
  };
}

export function sanitizeHistory(history) {
  return history
    .filter((item) => item && ["user", "assistant"].includes(item.role))
    .slice(-6)
    .map((item) => ({
      role: item.role,
      content: String(item.content || "").replace(/\s+/g, " ").trim().slice(0, 900)
    }))
    .filter((item) => item.content.length > 0);
}

export function fallbackPlan({ area, goal, constraints, checkin }) {
  const constraintText = constraints || "No constraints listed.";
  const checkinText = checkin || "No recent check-in yet.";
  const combined = `${goal} ${constraints} ${checkin}`.toLowerCase();

  if (/(hurt myself|hurting myself|self-harm|suicide|kill myself|end my life)/.test(combined)) {
    return {
      summary: "This sounds urgent. The safest next step is immediate human support, not a productivity plan.",
      plan: [
        {
          title: "Contact emergency support",
          detail: "If you might hurt yourself right now, call emergency services or the 988 Suicide & Crisis Lifeline in the United States.",
          reason: "Urgent risk needs real-time help from trained people."
        },
        {
          title: "Get near a trusted person",
          detail: "Move to a shared space or contact a trusted friend, family member, RA, teacher, or counselor and say plainly that you should not be alone.",
          reason: "Being with another person can reduce immediate danger."
        },
        {
          title: "Reduce access to harm",
          detail: "Put distance between yourself and anything you could use to hurt yourself while you wait for help.",
          reason: "A small delay can create enough room for support to arrive."
        }
      ],
      trackerUpdates: ["Area: Mind", "Priority: emergency support", "Next check: with a trusted person"],
      safetyNote: "This app is not emergency care. In the United States, call or text 988 for crisis support.",
      qualityScore: 0.9
    };
  }

  return {
    summary: `A focused ${area.toLowerCase()} plan for: ${goal}`,
    plan: [
      {
        title: "Smallest useful next step",
        detail: "Pick one action that can be finished in 20 minutes and do it before adding more complexity.",
        reason: "The tracker should reward momentum before optimization."
      },
      {
        title: "Constraint-aware adjustment",
        detail: `Shape the action around these constraints: ${constraintText}`,
        reason: "A plan that ignores constraints is easy to abandon."
      },
      {
        title: "End-of-day check",
        detail: `Compare the plan against this check-in: ${checkinText}`,
        reason: "Reflection makes tomorrow's plan more accurate."
      }
    ],
    trackerUpdates: [
      `Area: ${area}`,
      "Progress target: one completed action",
      "Review: tonight"
    ],
    safetyNote: "This is coaching support, not medical, legal, or financial advice.",
    qualityScore: 0.62
  };
}

export function scoreOutput(text, testCase) {
  const lower = text.toLowerCase();
  const must = testCase.mustInclude || [];
  const avoid = testCase.avoid || [];
  const hits = must.filter((term) => lower.includes(term.toLowerCase())).length;
  const avoids = avoid.filter((term) => lower.includes(term.toLowerCase())).length;
  const hasSteps = /(^|\n|\d\.|- )/.test(text) && text.length > 350;
  const hasSafety = /not medical|professional|emergency|crisis|doctor|therapist|financial/.test(lower);
  const base = must.length ? hits / must.length : 1;
  const penalty = avoid.length ? avoids / avoid.length : 0;
  const bonus = (hasSteps ? 0.12 : 0) + (hasSafety ? 0.08 : 0);

  return Math.max(0, Math.min(1, Number((base - penalty * 0.35 + bonus).toFixed(2))));
}
