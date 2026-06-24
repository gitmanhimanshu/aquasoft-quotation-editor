# Aqua Soft — 1000 LPH Quotation / Brochure Editor

A zero-dependency, **static** editor for the Aqua Soft 1000 LPH RO System brochure.
Edit the content in the browser and export a pixel-perfect **PDF** — no build, no server.

**Live demo:** _enable GitHub Pages (see below)_

## ✨ Features
- **16-page brochure**, with **pages 1–8 fully editable** (text, prices, photos)
- Editable **price / spec / elements tables** with per-row **➕ add** and **✕ delete**
- **Auto-calculated totals** (Indian number format)
- **Click-to-replace photos** (cover, technical spec, features machine)
- **Save** edits in the browser (localStorage)
- **Download PDF** via the browser's print engine (pixel-perfect, same design)
- Google Fonts (Baloo 2 + Dancing Script) + Font Awesome via CDN

## 🚀 Use
Just open `index.html` in Chrome/Edge — edit any blue/underlined text, then **Download PDF**.

**PDF print settings:** A4 · Margins **None** · **Background graphics ON** · Save as PDF.

## 🌐 Deploy on GitHub Pages (free, no Render/Vercel)
1. Push this folder to a GitHub repo (`index.html` at the repo root).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → **main** / **/(root)** → Save.
3. Open `https://<username>.github.io/<repo>/`.

> Needs internet for the CDN fonts/icons. Everything else runs in the browser.

## 📁 Structure
```
index.html          # all 16 pages
style.css           # design + print rules
app.js              # rows, totals, photo slots, save, PDF
assets/
  image2/3/4/11/14.png, machine.png   # logo, waves, signature, photos
  pages/page_01,09–16.jpg             # static design pages
```

## 🛠 Pages
| Page | Editable |
|------|----------|
| 1 Cover | title text + hand photo |
| 2 Quotation | text + price rows (auto-total) |
| 3 Company Profile | text |
| 4 Water Vending Machine | text |
| 5 Technical Specification | text + rows + photo |
| 6 Features | callouts + bullets + machine photo |
| 7 Technical Details (Elements) | table rows |
| 8 Terms & Conditions | text |
| 9–16 | fixed design pages |
