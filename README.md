# PromptVault

A static, zero-backend library for browsing, searching and copying AI prompts. Built with plain HTML, CSS and JavaScript — no frameworks, no build step, no database, no API keys. It runs straight from `index.html` and deploys to GitHub Pages for free.

---

## 1. Project overview

PromptVault is a single-page catalog of prompts stored in `prompts.json`. The page loads that file with `fetch()`, then renders search, category filters, tag filters, sorting, favorites and a details modal entirely in the browser. Favorites and your light/dark preference are saved in `localStorage`, so they're per-visitor and per-browser — there is no shared account system and nothing is sent to a server.

**Folder structure**

```
prompt-vault/
├── index.html        Page structure and templates
├── style.css         All styling (design tokens at the top of the file)
├── script.js         App logic: fetch, filter, sort, modal, clipboard, theme
├── prompts.json       ← the only file you need to edit to manage content
├── README.md         This file
└── assets/
    └── favicon.svg    Site icon
```

---

## 2. Deploying to GitHub Pages

1. Create a new GitHub repository (public or private with Pages enabled on your plan).
2. Push the contents of this `prompt-vault` folder to the repository root (or to a `docs/` folder — your choice, just match it in step 3).
   ```bash
   cd prompt-vault
   git init
   git add .
   git commit -m "Initial PromptVault site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the `main` branch and the `/ (root)` folder (or `/docs` if you used that), then **Save**.
6. GitHub gives you a URL like `https://<your-username>.github.io/<your-repo>/` — it can take a minute or two to go live after the first save.

No build step, no `npm install`, no CI is required — GitHub Pages just serves the static files as-is.

---

## 3. How to update prompts

All content lives in `prompts.json` as a list of objects. To edit an existing prompt, find it by `title` or `id` and change any field. To remove one, delete its object from the array. Changes appear automatically the next time the page loads — no HTML or JS edits needed.

---

## 4. How to add a new prompt

Add a new object to the array in `prompts.json`:

```json
{
  "id": 26,
  "title": "Your Prompt Title",
  "category": "Business",
  "tags": ["tag-one", "tag-two"],
  "model": "Claude",
  "description": "One sentence describing what this prompt does.",
  "prompt": "The full prompt text the user will copy.",
  "date": "2026-07-23"
}
```

Field notes:

- **id** — must be unique across the file. Easiest approach: use one higher than the current highest id.
- **category** — a plain string. New category names are picked up automatically (see below).
- **tags** — an array of short lowercase strings; used for the tag filter chips and search.
- **model** — a label shown on the card (e.g. `Claude`, `GPT-4`, `Gemini`, or `Any`).
- **description** — one sentence, shown on the card and in the modal.
- **prompt** — the full prompt text; this is exactly what gets copied to the clipboard.
- **date** — `YYYY-MM-DD`, used by the "Newest" sort option.

Keep the JSON valid — every object needs a comma after it except the last one in the array. If the page shows an error after an edit, the most common cause is a missing comma or an unescaped quote inside a string (escape internal quotes as `\"`).

---

## 5. How to add a new category

There is nothing to configure — categories are generated automatically from whatever values appear in the `category` field across `prompts.json`. Add a prompt with a category name that doesn't exist yet (e.g. `"category": "Design"`) and a new filter chip for it appears on next load, in alphabetical order alongside the others.

---

## 6. How to add new tags

Same as categories: tags come from the `tags` array on each prompt. Add any new tag string to a prompt's `tags` list and it will appear in the Tags filter automatically, and become searchable.

---

## 7. Custom domain

1. In your repo, add a file named `CNAME` (no extension) at the same level as `index.html`, containing just your domain, e.g.:
   ```
   prompts.example.com
   ```
2. At your domain registrar / DNS provider, add a `CNAME` record pointing `prompts.example.com` to `<your-username>.github.io`.
   - For an apex domain (`example.com` instead of a subdomain), use GitHub's documented `A` records pointing to GitHub Pages' IP addresses instead of a `CNAME`.
3. In **Settings → Pages**, enter the custom domain in the **Custom domain** field and save. Optionally enable **Enforce HTTPS** once the certificate has provisioned (can take up to 24 hours).

---

## 8. Maintenance

- **Backups**: `prompts.json` is your entire database — it's plain text and versioned in git, so your commit history is your backup and changelog.
- **Broken JSON**: if the site stops showing prompts, check the browser console (F12) for a JSON parse error, which usually points at a missing comma or bracket.
- **Testing locally before pushing**: because the page uses `fetch()` to load `prompts.json`, some browsers block that request when you open `index.html` directly from disk (`file://`). Run a tiny local server instead from inside the folder:
  ```bash
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000`.
- **Fonts**: the page loads Fraunces, Inter and IBM Plex Mono from Google Fonts over HTTPS. If you need a fully offline/self-hosted build, download the font files and swap the `<link>` tags in `index.html` for local `@font-face` rules in `style.css`.

---

## 9. Future enhancement ideas

- Add a "Copy as Markdown" export for a whole category or favorites list.
- Add per-prompt usage notes or example outputs, shown as an optional expandable section in the modal.
- Add a lightweight build script that validates `prompts.json` (unique ids, required fields) before deploy, run as a GitHub Action.
- Add URL query-string support so filtered views (e.g. a single category or tag) are shareable links.
- Add an "Import/Export favorites" button so a favorites list can move between browsers without an account system.

---

Built with plain HTML, CSS and JavaScript. No backend, no database, no tracking, no API keys.
