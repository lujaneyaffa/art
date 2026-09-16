// One-off bulk import for the initial 5 paintings. Run via the
// "Import paintings" GitHub Actions workflow (workflow_dispatch only).
// Safe to re-run: skips any painting whose title already exists on the
// site (case-insensitive), so it never creates duplicates.
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
const existingTitles = new Set(existing.map((p) => p.title.trim().toLowerCase()));

const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password }),
});
if (!loginRes.ok) throw new Error(`login failed: ${await loginRes.text()}`);
const { token } = await loginRes.json();

for (const p of paintings) {
  if (existingTitles.has(p.title.trim().toLowerCase())) {
    console.log(`skip "${p.title}" — already on the site`);
    continue;
  }

  const dir = path.join(import.meta.dirname, "paintings", p.slug);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();

  const fd = new FormData();
  fd.append("title", p.title);
  fd.append("description", p.description);
  fd.append("startingBid", String(p.startingBid));
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    fd.append("images", new Blob([buf], { type: "image/jpeg" }), f);
  }

  const res = await fetch(`${BASE}/api/admin/paintings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const out = await res.json();
  if (!res.ok) throw new Error(`create failed for "${p.title}": ${JSON.stringify(out)}`);
  console.log(`created "${p.title}" -> ${out.painting.id} (${files.length} photos)`);
}
