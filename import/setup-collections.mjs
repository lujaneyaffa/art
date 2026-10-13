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
const authHeaders = { Authorization: `Bearer ${token}` };

// --- 1. Create (or reuse) the two collections ---
const existingRes = await fetch(`${BASE}/api/collections`);
const { collections: existing } = await existingRes.json();

async function getOrCreateCollection(name, blurb) {
  const found = existing.find((c) => c.name === name);
  if (found) {
    console.log(`collection "${name}" already exists (${found.id})`);
    return found.id;
  }
  const res = await fetch(`${BASE}/api/admin/collections`, {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify({ name, blurb }),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(`create collection "${name}" failed: ${JSON.stringify(out)}`);
  console.log(`created collection "${name}" -> ${out.collection.id}`);
  return out.collection.id;
}

const selectionOneBlurb = `These five paintings are about mental health, not explained or illustrated, just felt. Each one started from an emotional state, and the colour, texture, and movement grew from there. There are no clean answers in any of them, because that's not really how it works.

All five works are completed acrylic paintings with pouring mediums on canvas, dry and ready to hang.`;

const selectionOneId = await getOrCreateCollection("Selection One", selectionOneBlurb);
const selectionTwoId = await getOrCreateCollection("Selection Two", "");

// --- 2. Assign paintings to collections ---
const firstSixIds = ["majestic", "fitting-in", "overstimulated", "melting-from-within", "tornado", "breaking-apart"];
const lastOneId = "when-two-worlds-try-to-collide";

// --- 3. New descriptions for the 5 named paintings ---
const descriptions = {
  "breaking-apart": `All blue, and mostly about texture. Parts of the surface are literally cracked and built up, like broken ice. It's about that feeling when something inside you starts to give way.`,
  "tornado": `Pink, blue, and white moving in a circular motion. There's something almost pretty about it, but it doesn't sit still. That's what an emotional spiral feels like, it pulls you in, and it looks different from the outside than it does when you're inside it.`,
  "melting-from-within": `Lines that drip from the top of the canvas all the way down, in blue and white. It's about falling apart slowly, quietly, from the inside, before anyone else notices.`,
  "overstimulated": `The biggest painting in the series and the most chaotic, different patterns, different colours, all competing for space. No clear focal point, no resolution. Just a lot, all at once. That's the feeling.`,
  "fitting-in": `Mostly pink, with parts that don't quite match the rest. It's a quieter painting, but it holds something uncomfortable, the feeling of being almost like everyone else, but not quite.`,
};

async function updatePainting(id, collectionId, description) {
  const fd = new FormData();
  fd.append("collectionId", collectionId);
  if (description !== undefined) fd.append("description", description);
  const res = await fetch(`${BASE}/api/admin/paintings/${id}`, {
    method: "PUT",
    headers: authHeaders,
    body: fd,
  });
  const out = await res.json();
  if (!res.ok) throw new Error(`update "${id}" failed: ${JSON.stringify(out)}`);
  console.log(`updated "${out.painting.title}" (${id}) -> collection ${collectionId}${description !== undefined ? ", new description" : ""}`);
}

for (const id of firstSixIds) {
  await updatePainting(id, selectionOneId, descriptions[id]);
}
await updatePainting(lastOneId, selectionTwoId);

console.log("done");
