// One-off: shrink whatever painting photos are already sitting in KV
// from before upload-time compression existed. Downloads each image,
// and if it's bigger than it needs to be, resizes it (sharp, longest
// edge capped at 1600px, JPEG quality 82) and replaces it in place,
// preserving photo order. Safe to re-run: anything already small
// enough is left alone.
import sharp from "sharp";

const BASE = "https://art.lujane.workers.dev";
const password = process.env.ART_ADMIN_PASSWORD;
if (!password) throw new Error("ART_ADMIN_PASSWORD is not set");

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 82;
const SKIP_UNDER_BYTES = 300 * 1024; // don't bother re-encoding already-small images

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
  if (!p.images || !p.images.length) continue;

  const results = [];
  let anyShrunk = false;

  for (const imageId of p.images) {
    const res = await fetch(`${BASE}/api/images/${imageId}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const tooBig = buf.length > SKIP_UNDER_BYTES || (meta.width && meta.width > MAX_DIMENSION) || (meta.height && meta.height > MAX_DIMENSION);

    if (!tooBig) {
      results.push({ imageId, buf, changed: false });
      continue;
    }

    const resized = await sharp(buf)
      .rotate() // respect EXIF orientation before stripping it
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    console.log(`"${p.title}" ${imageId}: ${(buf.length / 1024).toFixed(0)}KB -> ${(resized.length / 1024).toFixed(0)}KB`);
    results.push({ imageId, buf: resized, changed: true });
    anyShrunk = true;
  }

  if (!anyShrunk) {
    console.log(`skip "${p.title}" — already small`);
    continue;
  }

  const fd = new FormData();
  for (const { imageId } of results) {
    fd.append("removeImage", imageId);
  }
  for (const { buf, imageId } of results) {
    fd.append("images", new Blob([buf], { type: "image/jpeg" }), `${imageId}.jpg`);
  }

  const putRes = await fetch(`${BASE}/api/admin/paintings/${p.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const out = await putRes.json();
  if (!putRes.ok) throw new Error(`replace failed for "${p.title}": ${JSON.stringify(out)}`);
  console.log(`updated "${p.title}" (${results.length} photo(s))`);
}
