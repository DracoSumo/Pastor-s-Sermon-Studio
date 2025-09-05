
# Pastor's Sermon Studio (Patched)

Patched Next.js app with:
- Correct `package.json` (valid JSON)
- ESM seed script (`scripts/seed.mjs`) — no ts-node needed
- Supabase schema + seed data
- LocalStorage fallback when Supabase is not configured

## Quick Start
```bash
npm i
npm run dev
```

## Seed (optional)
Set env and run:
```bash
# PowerShell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE"
npm run seed
```
