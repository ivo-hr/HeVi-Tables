# Security

Report vulnerabilities privately to the repository owner. Do not include
passwords, API keys, session cookies, database connection strings or personal
data in an issue.

## Secret handling

- Only `NEXT_PUBLIC_SUPABASE_URL` and the Supabase publishable/anon key may be
  exposed to the browser.
- Never expose a service-role key.
- Keep PostgreSQL passwords outside the repository and frontend environment.
- Rotate any credential that has been pasted into chat, logs or issue trackers
  before using it in production.

Authorization is enforced with PostgreSQL Row Level Security and the
`close_table` database function. UI checks are convenience checks, not the
security boundary.
