// One-off bulk import for the initial 5 paintings. Run via the
// "Import paintings" GitHub Actions workflow (workflow_dispatch only).
// Safe to re-run: for each painting, if a matching title already
// exists on the site AND already has photos, it's skipped; if it
// exists but has no photos yet (e.g. created as a placeholder from
// admin.html), photos are added to that same entry instead of
// creating a duplicate; only creates a brand-new entry if no matching
// title exists at all.
import fs from "node:fs";
import path from "node:path";

const BASE = "https://art.lujane.workers.dev";
const password = process.env.ART_ADMIN_PASSWORD;
if (!password) throw new Error("ART_ADMIN_PASSWORD is not set");

const paintings = [
  { slug: "breaking-apart", title: "Breaking Apart", description: "Acrylic and pouring medium on canvas, 2022", startingBid: 150 },
  { slug: "tornado", title: "Tornado", description: "Acrylic and pouring medium on canvas, 2022", startingBid: 150 },
  { slug: "melting-from-within", title: "Melting From Within", description: "Acrylic and pouring medium on canvas, 2022", startingBid: 150 },
  { slug: "overstimulated", title: "Overstimulated", description: "Acrylic and pouring medium on canvas, 2024", startingBid: 150 },
  { slug: "fitting-in", title: "Fitting In", description: "Acrylic and pouring medium on canvas, 2023", startingBid: 150 },
];

const existingRes = await fetch(`${BASE}/api/paintings`);
if (!existingRes.ok) throw new Error(`could not list existing paintings: ${await existingRes.text()}`);
const { paintings: existing } = await existingRes.json();
const byTitle = new Map(existing.map((p) => [p.title.trim().toLowerCase(), p]));

const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password }),
});
if (!loginRes.ok) throw new Error(`login failed: ${await loginRes.text()}`);
const { token } = await loginRes.json();

for (const p of paintings) {
  const dir = path.join(import.meta.dirname, "paintings", p.slug);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();

  const match = byTitle.get(p.title.trim().toLowerCase());

  if (match && match.images && match.images.length > 0) {
    console.log(`skip "${p.title}" — already has ${match.images.length} photo(s)`);
    continue;
  }

  const fd = new FormData();
  if (!match) {
    fd.append("title", p.title);
    fd.append("description", p.description);
    fd.append("startingBid", String(p.startingBid));
  }
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    fd.append("images", new Blob([buf], { type: "image/jpeg" }), f);
  }

  if (match) {
    const res = await fetch(`${BASE}/api/admin/paintings/${match.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const out = await res.json();
    if (!res.ok) throw new Error(`add photos failed for "${p.title}": ${JSON.stringify(out)}`);
    console.log(`added ${files.length} photo(s) to existing "${p.title}" (${match.id})`);
  } else {
    const res = await fetch(`${BASE}/api/admin/paintings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const out = await res.json();
    if (!res.ok) throw new Error(`create failed for "${p.title}": ${JSON.stringify(out)}`);
    console.log(`created "${p.title}" -> ${out.painting.id} (${files.length} photos)`);
  }
}
