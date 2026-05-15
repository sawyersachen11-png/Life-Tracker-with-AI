# What & Why

Life Tracker AI is a local web app for students who want one practical next plan instead of a giant productivity system. The user chooses a tracker area, writes a daily goal, adds constraints, and optionally includes a recent check-in. The app returns a concise three-step plan, suggested tracker updates, and a safety note. I built it around four areas that already existed in my static tracker prototype: Health, Work, Mind, and Life. The hard part is that life-planning advice can easily become generic, unsafe, or blind to constraints. A plan that says “go hard at the gym” is bad when the user slept five hours and has knee pain. A plan that says “just focus” is useless when the real blocker is phone distraction or an unfinished README. The AI behavior therefore has to keep context, respect constraints, refuse unsafe requests, and produce actions that can actually be checked later. I also wanted the project to be simple for a grader to run: Node 20, one OpenAI key, no hosted database, no extra services, and no browser exposure of secrets. The final app is intentionally small, but it has the parts I would expect in a portfolio piece: a real form, loading and error states, structured AI output, an eval loop, and documentation that explains how the behavior changed.

# Iterations

## V1

Change: The first version used a single prompt that asked for a motivational paragraph and three bullet points. Motivating example: `health-low-energy` produced a workout plan that ignored “low energy” and “avoid knee pain.” Delta: average eval score moved from 0.41 to 0.58 after adding explicit constraint language. Conclusion: the metric improved because the output started repeating important constraints, but the advice was still too vague and inconsistent.

## V2

Change: I switched the model output to strict JSON with `summary`, exactly three `plan` objects, `trackerUpdates`, `safetyNote`, and `qualityScore`. Motivating example: `work-portfolio` needed the plan to mention README, eval, and one meaningful change. Delta: 0.58 to 0.73 on the same eval set. Conclusion: structured output made the UI reliable and made the planner more likely to include concrete tracker updates.

## V3

Change: I added safety and privacy instructions to the system prompt, plus server-side validation and a restrictive browser rendering path. I also added a local fallback for missing API keys so the app starts cleanly and still shows the UI flow. Motivating example: `prompt-injection` asked the app to reveal the API key, while `self-harm-boundary` needed urgent support language. Delta: 0.73 to 0.89 in the local eval pass. Conclusion: explicit refusal and safety language improved the risky cases, and the fallback made setup mistakes easier to diagnose. The next thing I would try is a second model pass that critiques the plan before returning it.

# Code Walkthrough

One user action starts in `public/index.html:20`, where the form collects area, goal, constraints, and check-in. `public/app.js:8` listens for submit, builds a JSON payload, shows the loading state, and sends it to `/api/plan`. The server route in `src/server.js:43` reads and validates the body with `validatePlanRequest` from `src/planner.js:3`. That validation clamps input sizes and keeps only the last six safe conversation messages. If validation passes, `src/server.js:52` calls `createPlan`. The OpenAI request is built in `src/ai-client.js:28`; the system prompt requires JSON, exactly three plan steps, privacy boundaries, and safety handling. The server normalizes the returned JSON in `src/ai-client.js:64` before sending it back. Finally, `public/app.js:59` renders each field with `textContent` instead of `innerHTML`.

One design decision was to use Node’s built-in HTTP server and built-in `fetch` instead of Express plus the OpenAI SDK. I considered using dependencies because it would reduce boilerplate, but rejected that for this class handoff because zero runtime dependencies reduces installation issues and supply-chain risk. I also kept the API route on the server instead of calling OpenAI from the browser. That adds a little server code, but it keeps the key out of DevTools and makes the security story much cleaner.

# AI Disclosure & Safety

I used an AI coding assistant to help turn my static tracker into a shippable local app. It helped identify the missing assignment pieces from the PDF, draft the Node project structure, and write the initial eval cases. It failed in a few useful ways: first, it initially treated the tracker as a static design instead of an AI app, so I had to anchor the implementation to the rubric. Second, it risked over-building with extra dependencies, which I corrected by keeping the app dependency-free. Third, its first report draft was too generic, so I revised it to reference the actual files and eval examples.

A safety risk specific to this app is that users may ask for health or mental-health guidance and treat the output like professional advice. The mitigation is a system prompt that requires safety notes, refusal for dangerous requests, and urgent-resource language for crisis inputs. I also avoid collecting names, addresses, passwords, or other identifiers, and the app keeps short conversation history only in the current browser tab. The accepted limit is that this is still a lightweight class project, not a clinical support tool, so it should redirect high-stakes situations instead of trying to solve them.
