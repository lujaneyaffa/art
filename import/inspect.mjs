const BASE = "https://art.lujane.workers.dev";
const res = await fetch(`${BASE}/api/paintings`);
const { paintings } = await res.json();
for (const p of paintings) {
  console.log("=====", p.title, p.id, "=====");
  console.log(JSON.stringify(p, null, 2));
}
