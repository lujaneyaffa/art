// One-off: remove duplicate photos already stored on live paintings
// (same image content under two different ids), now that uploads are
// deduplicated going forward. Downloads each photo, hashes it, and
// removes every repeat after the first occurrence per painting.
import { createHash } from "node:crypto";

const BASE = "https://art.lujane.workers.dev";
const password = process.env.ART_ADMIN_PASSWORD;
if (!password) throw new Error("ART_ADMIN_PASSWORD is not set");

const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password }),
});
if (!loginRes.ok) throw new Error(`login failed: ${await loginRes.text()}`);
const { token } = await loginRes.json();

const listRes = await fetch(`${BASE}/api/paintings`);
const { paintings } = await listRes.json();

for (const p of paintings) {
  if (!p.images || p.images.length < 2) continue;

  const seen = new Map(); // hash -> first imageId
  const duplicates = [];

  for (const imageId of p.images) {
    const res = await fetch(`${BASE}/api/images/${imageId}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const hash = createHash("sha256").update(buf).digest("hex");
    if (seen.has(hash)) {
      duplicates.push(imageId);
    } else {
      seen.set(hash, imageId);
    }
  }

  if (!duplicates.length) {
    console.log(`"${p.title}" — no duplicates (${p.images.length} photos)`);
    continue;
  }

  const fd = new FormData();
  for (const imageId of duplicates) fd.append("removeImage", imageId);

  const putRes = await fetch(`${BASE}/api/admin/paintings/${p.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const out = await putRes.json();
  if (!putRes.ok) throw new Error(`cleanup failed for "${p.title}": ${JSON.stringify(out)}`);
  console.log(`"${p.title}" — removed ${duplicates.length} duplicate photo(s), ${out.painting.images.length} remain`);
}
