const BASE = "https://art.lujane.workers.dev";
const [pRes, cRes] = await Promise.all([
  fetch(`${BASE}/api/paintings`),
  fetch(`${BASE}/api/collections`),
]);
const { paintings } = await pRes.json();
const { collections } = await cRes.json();
console.log("COLLECTIONS:", JSON.stringify(collections, null, 2));
console.log("PAINTINGS:");
for (const p of paintings) {
  console.log(`  ${p.id} | status=${p.status} | collectionId=${p.collectionId}`);
}
