const BASE = "https://art.lujane.workers.dev";
const PASSWORD = process.env.ART_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("Missing ART_ADMIN_PASSWORD");

const loginRes = await fetch(`${BASE}/api/admin/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: PASSWORD }),
});
const { token } = await loginRes.json();
if (!token) throw new Error("Login failed");
const auth = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

const BLURB = `These five paintings are about mental health, not explained or illustrated, just felt. Each one started from an emotional state, and the colour, texture, and movement grew from there. There are no clean answers in any of them, because that's not really how it works.

1. Breaking Apart
All blue, and mostly about texture. Parts of the surface are literally cracked and built up, like broken ice. It's about that feeling when something inside you starts to give way.

2. Tornado
Pink, blue, and white moving in a circular motion. There's something almost pretty about it, but it doesn't sit still. That's what an emotional spiral feels like, it pulls you in, and it looks different from the outside than it does when you're inside it.

3. Melting From Within
Lines that drip from the top of the canvas all the way down, in blue and white. It's about falling apart slowly, quietly, from the inside, before anyone else notices.

4. Overstimulated
The biggest painting in the series and the most chaotic, different patterns, different colours, all competing for space. No clear focal point, no resolution. Just a lot, all at once. That's the feeling.

5. Fitting In
Mostly pink, with parts that don't quite match the rest. It's a quieter painting, but it holds something uncomfortable, the feeling of being almost like everyone else, but not quite.

All five works are completed acrylic paintings with pouring mediums on canvas, dry and ready to hang.`;

const createRes = await fetch(`${BASE}/api/admin/collections`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ name: "Selection One", blurb: BLURB }),
});
const { collection } = await createRes.json();
console.log("Created collection:", collection);

const { paintings } = await (await fetch(`${BASE}/api/paintings`)).json();
const targetSlugs = [
  "majestic",
  "fitting-in",
  "overstimulated",
  "melting-from-within",
  "tornado",
  "breaking-apart",
];
for (const slug of targetSlugs) {
  const p = paintings.find((x) => x.id === slug);
  if (!p) {
    console.log(`SKIP ${slug}: not found`);
    continue;
  }
  const fd = new FormData();
  fd.set("collectionId", collection.id);
  const res = await fetch(`${BASE}/api/admin/paintings/${slug}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  console.log(`${slug}: ${res.status}`);
}
