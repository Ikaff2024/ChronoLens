const api = process.env.API_URL ?? "http://localhost:3021";
const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? "50");

async function timed(path, headers) {
  const startedAt = performance.now();
  const response = await fetch(api + path, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  await response.json();
  return performance.now() - startedAt;
}

const login = await fetch(api + "/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-organization-id": "pilot-org" },
  body: JSON.stringify({ email: "pilot@chronolens.local", password: "chronolens-pilot" })
}).then((response) => response.json());
const headers = { "x-organization-id": "pilot-org", Authorization: `Bearer ${login.token}` };
const investigations = await fetch(api + "/investigations?page=1&pageSize=10", { headers }).then((response) => response.json());
const atlas = investigations.items.find((item) => item.title.includes("Atlas")) ?? investigations.items[0];
const paths = [
  "/investigations?page=1&pageSize=25",
  `/entities?investigationId=${atlas.id}&page=1&pageSize=25`,
  `/relationships?investigationId=${atlas.id}&page=1&pageSize=25`,
  `/evidence?investigationId=${atlas.id}&page=1&pageSize=25`,
  `/investigations/${atlas.id}/timeline`
];
const samples = [];
for (let index = 0; index < iterations; index += 1) {
  for (const path of paths) samples.push(await timed(path, headers));
}
samples.sort((a, b) => a - b);
const percentile = (ratio) => samples[Math.min(samples.length - 1, Math.floor(samples.length * ratio))];
console.log(JSON.stringify({
  iterations,
  requests: samples.length,
  p50Ms: Number(percentile(0.5).toFixed(2)),
  p95Ms: Number(percentile(0.95).toFixed(2)),
  maxMs: Number(samples.at(-1).toFixed(2))
}, null, 2));
