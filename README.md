# Teogram

Teogram is a private one-to-one messaging client built with Next.js. It wraps a hosted WhisperBox API with a darker, product-style interface, browser-side end-to-end encryption, session recovery, realtime delivery, and live conversation search.

The app is designed around one rule: plaintext messages should be encrypted before they leave the browser.

## What Teogram does

- Registers users with a browser-generated RSA identity keypair
- Encrypts message bodies with AES-GCM
- Encrypts per-message AES keys with RSA-OAEP for both recipient and sender
- Protects the local private key with a password-derived AES-GCM wrapping key
- Stores the active private key in IndexedDB for session restoration
- Connects to the hosted backend for auth, user search, conversations, and message delivery
- Uses WebSocket updates with polling fallback so replies appear without manual refresh

## Architecture

Teogram is a frontend-only repo. It talks to a separately hosted backend:

- API base URL: `https://whisperbox.koyeb.app`
- WebSocket URL: `wss://whisperbox.koyeb.app/ws`

### Client layers

`src/app`
- App shell, metadata, splash flow, icon routes, and global styles

`src/components`
- `AuthScreen.tsx`: login/register UI, validation, password reveal, confirm-password checks
- `KeySetup.tsx`: key-generation state during account bootstrap
- `ChatLayout.tsx`: conversations UI, realtime updates, unread counts, presence, sending, and rendering
- `Icon.tsx`: local icon system used across the app

`src/context`
- `AuthContext.tsx`: session lifecycle, IndexedDB key storage, login, register, logout, and restore-on-load behavior

`src/lib`
- `api.ts`: typed API client, token handling, auth expiry behavior
- `crypto.ts`: Web Crypto implementation for identity keys, wrapping keys, and message encryption

`public`
- static assets and the service-worker cleanup shim used to clear stale local service worker state

`e2e`
- live smoke coverage for registration, login, encrypted delivery, and conversation isolation

## Encryption flow

1. On registration, the browser generates an RSA-OAEP identity keypair.
2. The public key is exported and sent to the backend.
3. The private key is exported as `pkcs8`, encrypted with a password-derived AES-GCM key, and the encrypted blob is sent to the backend.
4. A non-extractable private key is also stored locally in IndexedDB for session recovery.
5. When sending a message, Teogram creates a fresh AES-GCM session key.
6. The plaintext is encrypted with that AES key.
7. The AES key is encrypted twice: once for the recipient and once for the sender.
8. Only encrypted payload material is posted to the backend.

## Realtime behavior

- Active conversations refresh through WebSocket events
- Polling remains in place as a fallback when socket delivery is interrupted
- Unread counts and online indicators are driven from incoming events plus conversation refreshes

## UI notes

The current product direction uses:

- a dark neumorphic surface system
- a custom splash gate for Teogram branding
- auth screens with inline validation and reveal-password controls
- a chat surface styled to feel cohesive with the auth experience rather than like a generic template

## Local development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If port `3000` is busy:

```bash
npm run dev -- --port 3001
```

## Quality checks

Run lint and production build:

```bash
npm run lint
npm run build
```

## Live E2E smoke test

The repo includes a browser-based smoke test that exercises the hosted backend.

```bash
node e2e/live-e2e.mjs
```

By default it targets `http://localhost:3000`. To point at another local port:

```bash
$env:APP_URL="http://localhost:3001"
node e2e/live-e2e.mjs
```

## Deployment

Teogram is deployed on Vercel. Production builds are generated with:

```bash
vercel --prod
```

## Project status

This repo currently contains the Teogram frontend client only. The backend service is external, so running the UI locally still depends on the hosted WhisperBox API for auth, conversations, and delivery.
