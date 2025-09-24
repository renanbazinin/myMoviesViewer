# My Movies Viewer

Browse your Plex libraries in a clean, simple UI with search, filters, and posters.

Live site: http://renanbazinin.github.io/myMoviesViewer

## Features

- Fast search, genre/content rating filters, and sorting
- Favorites and Watch Later lists (saved locally)
- Smart caching of posters and library data
- Server health badge with details on hover
- Works as a static site (no build step)

## Quick start

- Just open the live site: http://renanbazinin.github.io/myMoviesViewer
- If your server is protected, enter your server password in the top bar; it’ll be remembered locally.

## Configure your server

Edit `config.js` to point the app at your server:

- Set `ENVIRONMENT` to `'local'` or `'production'`
- Update the URLs in `SERVERS.local` and `SERVERS.production`
- Passwords are stored in the browser (localStorage) after you type them in the UI

Endpoints the app expects from your server:
- `GET /health`
- `GET /libraries`
- `GET /libraries/:key`
- `GET /poster?title=...&year=...`

## Developing locally

- No build needed. Open `index.html` in your browser, or use a simple static server/live server.
- Make sure your Plex proxy server is running and matches the URL in `config.js`.

## Troubleshooting

- 401 Unauthorized: Set/verify your password in the top bar (or in `config.js`).
- Health shows “Down”: Check that your server is reachable at the configured URL.
- Storage quota errors: Use “Clear Cache” in the footer to free space.

---

Enjoy your library! If you run into issues, file a bug or tweak `config.js` to match your setup.