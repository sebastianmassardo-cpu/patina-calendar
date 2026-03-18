# Patina Calendar Project

This repository is safe to put in git without breaking the automatic Excel updates.

The important split is:

- `frontend/` is the online Next.js app and reads calendar data from Supabase.
- `sync/` is the local watcher that runs on this PC, watches the Excel file, and pushes updates into Supabase.
- `backend/` is only a local Excel-reading API and is not required for the deployed site.

## Why git will not break the automation

Git only stores the code. The automatic updates still happen because the watcher continues running locally on this computer:

```bash
npm run sync:watch
```

That watcher reads the Excel file path from `sync/.env` and upserts rows into Supabase. As long as that watcher keeps running on this PC, the deployed calendar will keep receiving updates.

## Root commands

From the repository root:

```bash
npm run dev
npm run build
npm run lint
npm run sync:once
npm run sync:watch
npm run backend:start
```

## Environment files

Actual secrets and local paths are intentionally ignored by git.

- `frontend/.env.local` contains the public Supabase variables for local frontend development.
- `sync/.env` contains the Excel path and service-role credentials for the local watcher.

Templates are included here:

- `frontend/.env.example`
- `sync/.env.example`

## Deploying from git

For Vercel, deploy the `frontend/` app from this repository.

- If this is an existing Vercel project already linked to `frontend/`, no structure change is needed.
- If you create a new Vercel project, set the Root Directory to `frontend`.
- Add the frontend env vars from `frontend/.env.example` in Vercel before deploying.

The deployed app uses Supabase, not the local Excel backend, so it can run online while the Excel watcher stays local.
