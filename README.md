# Pumpskull

Free, mobile-first, Kahoot-style classroom game that compares Day of the Dead and Halloween while practising English.

- Rules and decisions: [`docs/SPEC.md`](docs/SPEC.md)
- Files Vinicius must supply: [`docs/ASSETS.md`](docs/ASSETS.md)
- Instructions for Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Run locally

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev                  # open http://localhost:3000, or http://<your-lan-ip>:3000 on a phone
npm test
```

## Supabase

1. Create a free project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Copy the project URL, anon key and service-role key into `.env.local` (and into Vercel environment variables).
4. The free project pauses after a week without use: open it the day before the class.

## Deploy

Import the GitHub repo in Vercel (Hobby plan, non-commercial), add the three env vars, deploy.
