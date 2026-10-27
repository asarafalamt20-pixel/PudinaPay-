# Pudina Pay — Demo Payment App

A demo-only wallet and payment UI with login, transaction history, admin dashboard, QR generation/scanning UI, wallet balance, and notifications. **It does not move real money.** All balances and transactions are simulated.

## Stack
- Web: responsive HTML/CSS/JavaScript
- Backend: Node.js + Express
- Database: SQLite (`better-sqlite3`)
- Android: WebView wrapper project (loads local web assets in a production build; optional remote URL mode)

## Requirements
- Node.js 20+
- npm
- Android Studio (only to build Android wrapper)

## Run locally
```bash
cd backend
npm install
cp .env.example .env
npm start
```
Open http://localhost:3000

Demo credentials:
- Admin: `admin@pudinapay.demo` / `DemoAdmin123!`
- User: `user@pudinapay.demo` / `DemoUser123!`

These credentials are for local demo use only. Change them before any shared deployment.

## Features
- Demo login and registration
- Demo wallet balance and simulated add-money / transfer flows
- Transaction history
- Admin overview and transaction review
- QR code generation and scan input (simulated)
- In-app notifications
- SQLite persistence

## Safety / limitations
- No real UPI rails, bank connection, payment gateway, KYC, or real-money settlement.
- QR codes are demo payloads only. Scanning a QR does not send money.
- Passwords are hashed with bcrypt; API uses signed JWTs.
- Configure a strong `JWT_SECRET` and HTTPS in deployment.
- Admin account is seeded from environment variables on first startup.
- Do not use this starter to collect real payment credentials or represent demo payments as completed real payments.

## Deploy
Render:
1. Push this folder to a GitHub repository.
2. Create a Render **Web Service** from the repository.
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Set environment variables: `JWT_SECRET` to a long random secret, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `NODE_ENV=production`.
7. Add a persistent disk and set `DB_PATH` to a file path on that disk (for example `/var/data/pudina-pay.sqlite`). Without persistent storage, local SQLite data may reset on redeploy.

For a public production app, use a managed database and a security review. Render's filesystem is ephemeral unless persistent storage is configured.

## Android
The `android/` folder contains a minimal Android Studio WebView wrapper. By default it loads the deployed web app URL; update `APP_URL` in `MainActivity.kt`. For a local-only build, copy web assets into Android assets and adjust the URL to `file:///android_asset/index.html` (API calls would also need a local backend or deployed API URL).


## Render deployment settings
- Root Directory: leave blank (files are at repository root)
- Build Command: `npm install`
- Start Command: `npm start`
- `NODE_ENV`: `production`
- `JWT_SECRET`: use Render's generated secret
- `ADMIN_EMAIL`: `asarafalamt20@gmail.com`
- `ADMIN_PASSWORD`: set a strong private password in Render
- `DB_PATH`: `/var/data/pudina-pay.sqlite`

The Render disk configuration in `render.yaml` mounts persistent storage at `/var/data`.
This is a demo wallet only; it does not perform real bank or UPI payments.


## Send by mobile and QR scanning
- Registration supports a unique 10-digit Indian mobile number.
- Send transfers can look up a registered account by mobile number or email.
- QR screen supports camera scanning and selecting an image from the gallery in browsers that support BarcodeDetector. Only Pudina Pay account QR payloads are accepted.
- Transfers remain simulated; this project does not send real UPI payments or real money.

## Commission split (demo estimator)
The Home page includes a commission estimator using the operator rates supplied by the app owner. It allocates 70% of estimated provider commission to the customer reward and 30% to Pudina Pay. The estimator does not credit real rewards. In production, issue rewards only after an authorized recharge API confirms success and the provider confirms the commission; handle reversals/refunds and payouts through authorized provider APIs. The current project remains a demo and does not perform real recharge, payment verification, reward settlement, or bank/UPI withdrawals.
