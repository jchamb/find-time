# Deployment Guide

This document covers local development and production deployment to Cloudflare.

## ✅ Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account ([sign up here](https://dash.cloudflare.com/sign-up))
- Wrangler CLI installed (included in dependencies)

## 🧪 Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Your `.env` file should contain:

```env
VITE_LIVESTORE_SYNC_URL=ws://localhost:8787
VITE_LIVESTORE_SYNC_AUTH_TOKEN=insecure-token-change-me
```

### 3. Start development servers

```bash
pnpm dev
```

This will:

- Start Vite dev server on `http://localhost:5173`
- Auto-launch Wrangler dev on `ws://localhost:8787`
- Connect LiveStore sync backend with local D1 database

### 4. Verify it's working

- Open `http://localhost:5173` in your browser
- Create a meeting
- Open the same URL in another tab/window
- Changes should sync in real-time

## 🚀 Production Deployment

### 1. Create D1 database (if not done already)

```bash
wrangler d1 create find-time
```

Copy the `database_id` from the output and update `wrangler.jsonc`.

### 2. Set production auth token

```bash
wrangler secret put SYNC_AUTH_TOKEN
```

Enter a secure random token (e.g., generated with `openssl rand -hex 32`).

### 3. Deploy the Cloudflare Worker

```bash
pnpm cf:deploy
```

This will deploy your worker to `https://find-time-worker.<your-account>.workers.dev`.

### 4. Update frontend environment

Create a production `.env.production`:

```env
VITE_LIVESTORE_SYNC_URL=wss://find-time-worker.<your-account>.workers.dev
VITE_LIVESTORE_SYNC_AUTH_TOKEN=<same-token-from-step-2>
```

### 5. Build and deploy frontend

Build the frontend:

```bash
pnpm build
```

Deploy `dist/` to your hosting provider:

- **Cloudflare Pages**: `wrangler pages deploy dist`
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod --dir=dist`

## 📝 Configuration Notes

### Custom Domain for Worker

To use a custom domain for the sync backend, update `wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "sync.yourdomain.com/*",
    "zone_name": "yourdomain.com"
  }
]
```

Then update your production sync URL:

```env
VITE_LIVESTORE_SYNC_URL=wss://sync.yourdomain.com
```

### Environment Variables

The worker uses these environment variables (configured in `wrangler.jsonc`):

- `SYNC_AUTH_TOKEN`: Authentication token for sync connections
- `ENVIRONMENT`: Environment identifier (`development` or `production`)

## 🔍 Troubleshooting

### Port 8787 already in use

The Vite plugin will automatically skip launching Wrangler if the port is already in use. If you need to use a different port:

1. Update `.env`: `VITE_LIVESTORE_SYNC_URL=ws://localhost:8788`
2. Restart `pnpm dev`

### "idFromName" or Durable Object binding errors

Ensure `wrangler.jsonc` has the correct DO binding without `script_name`:

```jsonc
"durable_objects": {
  "bindings": [
    {
      "name": "SYNC_BACKEND_DO",
      "class_name": "SyncBackendDO"
    }
  ]
}
```

### D1 database not found

Run `wrangler d1 list` to see your databases and verify the `database_id` in `wrangler.jsonc` matches.

## 📚 Additional Resources

- [LiveStore Documentation](https://docs.livestore.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
