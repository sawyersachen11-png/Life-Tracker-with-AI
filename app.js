const form = document.querySelector("#plannerForm");
const output = document.querySelector("#output");
const loading = document.querySelector("#loading");
const errorBox = document.querySelector("#formError");
const submitButton = document.querySelector("#submitButton");
const clearButton = document.querySelector("#clearButton");
const qualityBadge = document.querySelector("#qualityBadge");

let history = [];

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";

  const formData = new FormData(form);
  const payload = {
    area: formData.get("area"),
    goal: formData.get("goal"),
    constraints: formData.get("constraints"),
    checkin: formData.get("checkin"),
    history
  };

  setLoading(true);
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Planner request failed.");

    renderPlan(result.data, result.warning);
    history = [
      ...history,
      { role: "user", content: `${payload.area}: ${payload.goal}` },
      { role: "assistant", content: result.data.summary }
    ].slice(-6);
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    setLoading(false);
  }
});

clearButton.addEventListener("click", () => {
  history = [];
  form.reset();
  output.className = "output empty";
  output.textContent = "Conversation cleared. Add a goal to generate a new plan.";
  qualityBadge.textContent = "Ready";
  errorBox.textContent = "";
});

function setLoading(isLoading) {
  loading.hidden = !isLoading;
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Generating..." : "Generate Plan";
}

function renderPlan(plan, warning) {
  output.className = "output";
  qualityBadge.textContent = `${Math.round(Number(plan.qualityScore || 0) * 100)}%`;

  output.replaceChildren(
    element("div", "summary", warning ? `${warning} ${plan.summary}` : plan.summary),
    ...plan.plan.map((step, index) => {
      const block = element("article", "step");
      block.append(
        element("h3", "", `${index + 1}. ${step.title}`),
        element("p", "", step.detail),
        element("small", "", step.reason)
      );
      return block;
    }),
    renderUpdates(plan.trackerUpdates),
    renderSafety(plan.safetyNote)
  );
}

function renderUpdates(items) {
  const block = element("section", "updates");
  const list = document.createElement("ul");
  for (const item of items || []) {
    list.append(element("li", "", item));
  }
  block.append(element("h3", "", "Tracker updates"), list);
  return block;
}

function renderSafety(note) {
  const block = element("section", "safety");
  block.append(element("h3", "", "Safety note"), element("p", "", note));
  return block;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
