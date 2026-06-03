const api = process.env.API_URL ?? "http://localhost:3021";
const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? "50");
const investigationTitle = process.env.BENCHMARK_INVESTIGATION_TITLE;

async function timed(path, headers) {
  const startedAt = performance.now();
  const response = await fetch(api + path, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const body = await response.text();
  return { durationMs: performance.now() - startedAt, responseBytes: Buffer.byteLength(body) };
}

const login = await fetch(api + "/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-organization-id": "pilot-org" },
  body: JSON.stringify({ email: "pilot@chronolens.local", password: "chronolens-pilot" })
}).then((response) => response.json());
const headers = { "x-organization-id": "pilot-org", Authorization: `Bearer ${login.token}` };
const investigations = await fetch(api + "/investigations?page=1&pageSize=100", { headers }).then((response) => response.json());
const target = investigations.items.find((item) => investigationTitle ? item.title === investigationTitle : item.title.includes("Atlas")) ?? investigations.items[0];
if (!target) throw new Error("No investigation available for benchmark");
const paths = [
  "/investigations?page=1&pageSize=25",
  `/entities?investigationId=${target.id}&page=1&pageSize=25`,
  `/relationships?investigationId=${target.id}&page=1&pageSize=25`,
  `/evidence?investigationId=${target.id}&page=1&pageSize=25`,
  `/investigations/${target.id}/timeline?page=1&pageSize=25`
];
const samples = new Map(paths.map((path) => [path, []]));
for (let index = 0; index < iterations; index += 1) {
  for (const path of paths) samples.get(path).push(await timed(path, headers));
}

function summary(entries) {
  const durations = entries.map((entry) => entry.durationMs).sort((a, b) => a - b);
  const percentile = (ratio) => durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))];
  return {
    requests: entries.length,
    responseBytes: Math.max(...entries.map((entry) => entry.responseBytes)),
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    maxMs: Number(durations.at(-1).toFixed(2))
  };
}

const allSamples = [...samples.values()].flat();
console.log(JSON.stringify({
  investigation: target.title,
  iterations,
  overall: summary(allSamples),
  endpoints: Object.fromEntries([...samples].map(([path, entries]) => [path, summary(entries)]))
}, null, 2));
