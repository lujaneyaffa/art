# Lujane Art

A Cloudflare Worker for selling paintings with eBay-style bidding. Its
own repo, own domain, own deploy pipeline — the only thing it shares
with 4dasistas.ca is being on the same Cloudflare account.

- Public gallery: `public/index.html` — browse paintings, click one to
  see the full description, bid history, and place a bid.
- Admin: `public/admin.html` — password-gated (see below), add/edit/
  delete paintings, upload photos, change status, mark sold.
- API: `src/worker.js` — everything under `/api/*`.
- Storage: Cloudflare KV only (binding `ART_DATA`, already created —
  id is in `wrangler.toml`). Painting data, bids, and the photos
  themselves (as raw bytes) all live there. No R2, no Supabase, no
  external accounts needed. (R2 wasn't enabled on the Cloudflare
  account when this was built — if you'd rather serve images from R2
  later, `storeImages`/`serveImage` in `worker.js` are the only two
  functions that would need to change.)

## Deploying — automatic (recommended)

`.github/workflows/deploy.yml` deploys on every push to `main`. One-time
setup: in this repo's GitHub Settings → Secrets and variables → Actions,
add two repository secrets:

- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with the "Edit
  Cloudflare Workers" template permissions
- `ART_ADMIN_PASSWORD` — `122139` (or whatever you want the admin
  password to be; the workflow sets it as a Worker secret on every
  deploy, so changing this value and pushing is also how you rotate it)
- `ART_RESEND_API_KEY` — a [Resend](https://resend.com) API key, for
  bid notification emails (see below). Optional: if left unset,
  bidding still works, you just don't get emailed about it.

After that, any push to `main` deploys automatically and keeps the
admin password and email key in sync — no local `wrangler` needed at
all.

## Deploying — by hand

```
npx wrangler login
npx wrangler secret put ADMIN_PASSWORD
```

When prompted, type `122139` and press enter. This keeps the password
out of the repo (it's stored encrypted on Cloudflare, not in
`wrangler.toml`).

```
npx wrangler deploy
```

Wrangler will print the live URL: `https://art.lujane.workers.dev` —
that's the link to share. It also shows up in the Cloudflare dashboard
under Workers & Pages → `art`.

Re-run `npx wrangler deploy` any time you change something locally and
don't want to wait on a push.

## Changing the admin password later

```
npx wrangler secret put ADMIN_PASSWORD
```

and enter the new password. Existing admin logins (sessions) stay valid
for up to 7 days after that — log out and back in on `admin.html` to
pick up the change immediately.

## How bidding works

Each painting has a starting price and a current bid (they're the same
until the first bid comes in). Anyone can view the gallery and place a
bid with their name, email, and amount — a bid must beat the current
bid to be accepted. There's no auto-checkout or payment built in: you
see who's bidding and for how much in the admin panel and on the
painting's own bid history, and you follow up with the winner yourself
(by the email they gave) however you normally handle a sale — e-transfer,
in person, etc. If you want real payments wired in later, that's a
separate, bigger piece of work (Stripe or similar) — flag it if you want
it and it can be added on top of this.

## Email notification on every bid

Every accepted bid emails `lujanealdimasi@gmail.com` (set via the
`NOTIFY_EMAIL` var in `wrangler.toml`) with who bid, how much, and a
link back to the admin panel. Sending is done through
[Resend](https://resend.com) — free, no credit card, and you don't
need your own domain to get started:

1. Sign up at resend.com **using `lujanealdimasi@gmail.com`** as the
   account email (without a verified domain, Resend's shared sending
   address can only deliver to the address you signed up with — so
   this has to match `NOTIFY_EMAIL`).
2. Dashboard → API Keys → Create API Key (default permissions are fine).
3. Add that key as the `ART_RESEND_API_KEY` GitHub secret (see above),
   or run `npx wrangler secret put RESEND_API_KEY` if deploying by hand.

If this isn't set up, bids still work exactly the same — you just
won't get an email, and would need to check the admin panel or gallery
to see new bids. Failing to send the email never blocks a bid from
being recorded.

## Editing a painting after posting it

In the admin panel, each listed painting has an **Edit** button (next
to Delete) that opens a form to change its title or description, add
more photos, or check off existing photos to remove — separate from
the Status dropdown, which is always visible for quickly marking
something sold.
