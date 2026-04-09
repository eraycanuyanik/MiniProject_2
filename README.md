# Voice calculator (EE471 Mini-project 2)

React + TypeScript calculator with **voice input** (Web Speech API) and **spoken feedback** for every key. Vocabulary matches the assignment: digits as “zero”…“nine”, `.` → “point”, `÷` → “over”, `×` → “times”, `+` → “plus”, `−` → “minus”, `=` → “is” plus the spoken result (e.g. “is eight”).

## Run locally

```bash
npm install
npm run dev
```

Use **Chrome or Edge** (Chromium) and allow the microphone when you turn the mic on. Speech recognition needs a [secure context](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (`https://` or `http://localhost`).

## Docker (bonus)

```bash
docker build -t voice-calculator .
docker run --rm -p 8080:80 voice-calculator
```

Open `http://localhost:8080`. For microphone access from another machine, serve over HTTPS or use localhost.

## GitHub

After creating an empty repository on GitHub:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

## Course deliverables

1. Git repository URL (after you push).
2. Screen recordings with audio: voice inputs (a–d) and button inputs (a–d) as specified in the brief.
3. Vibe coding transcripts (export from Cursor: **Agent transcripts** / project transcripts folder).
4. Optional: same demos using the Docker URL.
