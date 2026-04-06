# FeedDrop 🎬

A curated TikTok video feed. One page, clean grid, hand-picked creators.

## Stack

- **Frontend**: Plain HTML/CSS/JS (no build step)
- **Server**: Node.js + Express
- **Deploy**: Railway
- **Domain**: Namecheap

---

## Local development

```bash
npm install
npm start
# → http://localhost:3000
```

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select this repo — Railway auto-detects Node.js and runs `npm start`
4. In **Settings → Networking**, generate a domain (Railway gives you a free `.up.railway.app` URL first)

---

## Connect your Namecheap domain

Once Railway has your app running:

1. In Railway → your project → **Settings → Networking → Custom Domain**
2. Add your domain (e.g. `feeddrop.com`)
3. Railway will show you a **CNAME record** to add

In Namecheap:
1. Dashboard → your domain → **Manage → Advanced DNS**
2. Add a new record:
   - **Type**: `CNAME`
   - **Host**: `@` (or `www` — Railway will tell you which)
   - **Value**: the value Railway gave you (e.g. `xyz.up.railway.app`)
   - **TTL**: Automatic
3. Save — DNS propagation takes 5–30 min

> **Tip**: If Namecheap doesn't allow `@` as a CNAME host, use an `ALIAS` record instead, or point the `www` subdomain and set up a redirect from root to www.

---

## Adding / replacing videos

Edit `public/index.html`. Each video is an `<article class="card">`:

```html
<article class="card">
  <div class="video-wrap">
    <blockquote class="tiktok-embed"
      cite="https://www.tiktok.com/@USERNAME/video/VIDEO_ID"
      data-video-id="VIDEO_ID"
      style="max-width:605px; min-width:325px;">
      <section></section>
    </blockquote>
  </div>
  <div class="card-meta">
    <span class="video-title">Your title here</span>
    <a class="handle" href="https://www.tiktok.com/@USERNAME" target="_blank" rel="noopener">@USERNAME</a>
  </div>
</article>
```

To get the `VIDEO_ID`: open any TikTok video → copy the number at the end of the URL.

---

## Project structure

```
tiktok-feed/
├── public/
│   └── index.html   ← entire frontend
├── server.js        ← Express static server
├── package.json
├── .gitignore
└── README.md
```