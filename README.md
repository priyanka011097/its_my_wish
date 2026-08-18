# It's My Wish

Custom wishlist boards. Sign in with Google, create a board for any occasion, fill it with
**photos**, **links** or **notes**, then share it with specific people by email or hand out a
read-only link. Light and dark theme throughout.

```
wishlist/
├── server/          Express + Mongoose API
│   ├── src/
│   │   ├── config/  env + mongo connection
│   │   ├── models/  User, Board, Wish
│   │   ├── lib/     auth (Google + JWT), access rules, validation
│   │   └── routes/  auth, boards, wishes, share, link preview
│   └── test/        end-to-end API smoke test
└── client/          React + Vite + MUI
    └── src/
        ├── theme/       light/dark palettes and the mode switch
        ├── context/     auth + toast providers
        ├── components/  board & wish cards, dialogs, layout
        └── pages/       login, dashboard, board, shared board
```

## 1. Prerequisites

- **Node 20+** (built and tested on Node 24)
- **MongoDB** — pick one:
  - **`npm run db`** (no install needed) — downloads a real `mongod` once into
    `~/.cache/mongodb-binaries` and runs it on `127.0.0.1:27017`, keeping its data in
    `server/.data/mongodb` so nothing is lost between restarts. This is the current setup.
  - a MongoDB Community Server you install yourself, or
  - a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster — put its connection
    string in `MONGODB_URI` (see the DNS note below if `mongodb+srv://` will not resolve).

## 2. Google OAuth client

1. Open the [Google Cloud console → Credentials](https://console.cloud.google.com/apis/credentials).
2. **Create credentials → OAuth client ID**, application type **Web application**.
3. Under **Authorised JavaScript origins** add `http://localhost:5173`
   (add your production origin later, e.g. `https://wishlist.example.com`).
   No redirect URI is needed — sign-in happens with a Google ID token, not a redirect.
4. Copy the **Client ID**.

## 3. Configure

`server/.env` already exists with a generated `JWT_SECRET`. Fill in the two values that are yours:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/wishlist
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

If `mongodb+srv://` fails with **`querySrv ECONNREFUSED`**, Node cannot run the SRV lookup that
Atlas connection strings need — some VPN clients and local DNS proxies refuse those queries even
though the hostname resolves fine in Windows. Point Node's resolver somewhere that answers:

```ini
DNS_SERVERS=8.8.8.8,1.1.1.1
```

The client needs no config in development — Vite proxies `/api` to the API on port 4000, so the
browser sees one origin and the session cookie just works.

## 4. Install and run

```bash
npm run install:all     # root + server + client dependencies
npm run dev:all         # local MongoDB + API on :4000 + web app on :5173
```

Open <http://localhost:5173>.

Use `npm run dev` instead if MongoDB is already running (installed as a service, or Atlas).

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run db` | local MongoDB only, data kept in `server/.data/mongodb` |
| `npm run dev:api` / `npm run dev:web` | run one side only |
| `npm test` | API smoke test against a throwaway in-memory MongoDB |
| `npm run build` | production client build into `client/dist` |
| `npm start` | serve API **and** the built client from port 4000 (`NODE_ENV=production`) |

To run the same suite against a MongoDB you are already running (it creates and then drops the
database you name):

```bash
SMOKE_MONGODB_URI=mongodb://127.0.0.1:27017/wishlist_smoke npm test
```

## How it works

**Auth.** The browser gets a Google ID token from the sign-in button and posts it to
`POST /api/auth/google`. The server verifies it with Google, upserts the user, and sets an
httpOnly JWT cookie (`wl_token`, 30 days). `GET /api/auth/me` restores the session on reload.

**Boards and wishes.** A board has a title, description, emoji and accent colour. Each wish is one
of three types, and the "add wish" dialog only insists on what that type needs:

| Type | Required | Also stores |
| --- | --- | --- |
| `photo` | an image (uploaded or linked) | buy link, note, price, priority, tags |
| `link` | link URL | image, note, price, priority, tags |
| `note` | note text | price, priority, tags |

For link wishes, **Fetch** reads the page's Open Graph tags and prefills the title, image, price and
description. Only public http(s) hosts are fetched (private and loopback addresses are refused).

**Images.** Every image field takes either an upload or a link — drag a file onto the field, press
**Upload image**, or paste a URL. Uploads go into MongoDB itself through GridFS, so there is no S3
bucket or Cloudinary account to set up and nothing extra to back up.

- 5MB per image; JPEG, PNG, GIF, WebP, AVIF and HEIC
- the file type is read from the leading bytes, not the browser's claim, so a renamed script cannot
  be stored as a photo — and SVG is refused outright because it can carry script
- stored images live at `/api/uploads/<token>`, where the token is 24 random bytes. That URL needs no
  sign-in, because people holding a share link have to be able to see the pictures; the token is
  what keeps it private, so treat it as a secret the way you would the share link itself
- when a wish is deleted, or its image swapped for another, the old file is removed from GridFS
  rather than left orphaned

**Sharing.** Two independent switches per board:

- *Invite by email* — the listed addresses see the board on their own dashboard after signing in
  with that Google account.
- *Share with a link* — `/s/<token>` is readable by anyone, no sign-in. Resetting the link mints a
  new token and instantly kills the old one.

Either way, sharing is **read-only** — only the owner can add, edit or delete. Viewers never receive
the share token or the invite list in API responses.

**Theme.** Light, dark, or match-system, chosen from the sun/moon menu in the header and remembered
in `localStorage`. Palettes live in `client/src/theme/theme.js`.

## API reference

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/config` | public — returns the Google client id |
| `POST` | `/api/auth/google` | public — body `{ credential }` |
| `GET` | `/api/auth/me` | signed in |
| `POST` | `/api/auth/logout` | public |
| `GET` | `/api/boards` | signed in — `{ owned, shared }` |
| `POST` | `/api/boards` | signed in |
| `GET` | `/api/boards/:id` | owner, invited email, or `?token=` |
| `PATCH` `DELETE` | `/api/boards/:id` | owner |
| `POST` `PUT` | `/api/boards/:id/share/emails` | owner |
| `DELETE` | `/api/boards/:id/share/emails/:email` | owner |
| `POST` | `/api/boards/:id/share/link` | owner — `{ enabled }` / `{ regenerate }` |
| `GET` `POST` | `/api/boards/:id/wishes` | read: any viewer · write: owner |
| `PATCH` `DELETE` | `/api/wishes/:id` | owner |
| `GET` | `/api/share/:token` | public when link sharing is on |
| `GET` | `/api/meta/preview?url=` | signed in |
| `POST` | `/api/uploads` | signed in — multipart `file`, max 5MB |
| `GET` | `/api/uploads/:token` | public (unguessable token) |

## Deploying

1. Set on the API host: `NODE_ENV=production`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`,
   `CLIENT_ORIGIN=https://your-domain`.
2. `npm run build`, then `npm start` — Express serves `client/dist` alongside `/api`, so one origin
   and the default `COOKIE_SAMESITE=lax` is right.
3. If instead you host the web app and the API on **different domains**, set `COOKIE_SAMESITE=none`
   (HTTPS required) and point the client at the API with `VITE_API_BASE=https://api.your-domain`.
4. Add the production origin to the Google OAuth client's authorised JavaScript origins.
