# Teleflow Replit Setup Guide

This project is a Vite + React app.

## What to upload

Upload `Teleflow-replit-upload.zip` into a new Replit project, then unzip it.

## What this project needs

- Node.js environment
- Install project dependencies
- Run the Vite dev server

## Recommended Replit steps

1. Create a new **Node.js** Repl.
2. Upload `Teleflow-replit-upload.zip`.
3. Unzip the file inside Replit.
4. Make sure these files are in the root:
   - `package.json`
   - `vite.config.js`
   - `index.html`
   - `src/`
5. Install dependencies:

```bash
npm install
```

6. Start the app:

```bash
npm run dev:replit
```

7. Open the webview preview in Replit.

## Why port 3000

Vite defaults to port `5173`, but Replit usually behaves more smoothly when the app is started on `0.0.0.0:3000`.

## If the app does not open

Try these checks:

1. Confirm dependencies installed without errors.
2. Confirm `package.json` is in the project root.
3. Confirm the run command is:

```bash
npm run dev:replit
```

4. If Replit asks for a start command, use:

```bash
npm run dev:replit
```

## Build command

If Replit wants a build command, use:

```bash
npm run build
```

## Notes about this app

- This is a frontend-first prototype.
- Telegram and Gemini behavior in this version is mostly prototype/demo logic unless you wire a backend later.
- Uploaded files in the UI are business context files for AI guidance.
- Saved workflow templates are stored in browser local storage in this prototype.

## Short version for Replit

Use Node.js, run:

```bash
npm install
npm run dev:replit
```

## Quick sanity check

This newer build includes:

- a `Files` section in the left sidebar
- saved workflow templates
- profile-based context file permissions

If those do not appear after upload, Replit is still running an older copy or the wrong folder.
