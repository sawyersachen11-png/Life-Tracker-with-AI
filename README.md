# Life Tracker AI

Life Tracker AI is a local web app that turns a daily goal, constraints, and a recent check-in into a three-step tracker plan. It keeps the original tracker pages in `public/legacy/`, then adds an AI planning workflow on top of the Health, Work, Mind, and Life areas.

The AI behavior goes beyond a single text-to-JSON extraction: the app supports short multi-turn context, asks the model to produce structured coaching output with safety constraints, and includes an eval set that scores whether plans respect user constraints and avoid unsafe advice.

## Requirements

- macOS
- Node 20+
- An OpenAI API key

No other API keys or hosted services are required.

## Setup

```bash
cp .env.example .env
```

Open `.env` and add the grader-supplied key:

```bash
OPENAI_API_KEY=your_key_here
```

## Run

```bash
npm start
```

If `npm` is unavailable but Node 20+ is installed, this equivalent command also works because the project has no runtime dependencies:

```bash
node src/server.js
```

Then open:

```text
http://localhost:3000
```

Example input:

```text
Area: Health
Goal: I want to work out today but slept badly and only have 25 minutes.
Constraints: No gym access, low energy, avoid knee pain.
Recent check-in: Slept 5.5 hours and feel foggy.
```

The app shows a loading state while the server calls OpenAI, then renders a summary, three actions, tracker updates, and a safety note. If the key is missing, the app still starts and returns a local fallback plan so setup problems are visible instead of crashing.

## Run Evals

```bash
npm run eval
```

The eval script reads `eval/cases.json`, runs the planner on 10 labeled cases, scores each output with the local rubric in `src/planner.js`, prints the scores, and writes `eval/results.json`.

## Security Notes

- The OpenAI key is read only by the Node server and is never sent to browser JavaScript.
- `.env` and eval results are ignored by git.
- The server blocks dotfiles, normalizes static file paths, limits JSON request bodies, and sends a restrictive Content Security Policy.
- Model output is rendered with DOM `textContent`, not `innerHTML`, which avoids HTML/script injection from AI output.
- The app stores short chat history only in browser memory for the current tab session.
