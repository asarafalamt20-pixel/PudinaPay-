# Security and deployment checklist

- This project is a simulator only and never connects to UPI or a bank.
- Set a unique high-entropy `JWT_SECRET` in deployment.
- Set a unique admin password through `ADMIN_PASSWORD`; do not use demo credentials publicly.
- Require HTTPS for any public deployment.
- Use rate limiting, audit logging, dependency updates, backups, and a professional security review before broader use.
- For real payments, integrate a licensed payment provider through its official server-side API and follow its compliance requirements. Never collect UPI PINs, card PINs, OTPs, or bank passwords.
- SQLite data persists only when `DB_PATH` points to persistent storage.
