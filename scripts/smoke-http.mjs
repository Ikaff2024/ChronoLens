const api = process.env.API_URL ?? "http://localhost:3021";

async function call(path, options = {}) {
  const response = await fetch(api + path, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(`${path}: ${response.status} ${text}`);
  return body;
}

const health = await call("/health");
const login = await call("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-organization-id": "pilot-org" },
  body: JSON.stringify({ email: "pilot@chronolens.local", password: "chronolens-pilot" })
});
const headers = {
  "Content-Type": "application/json",
  "x-organization-id": "pilot-org",
  Authorization: `Bearer ${login.token}`
};
const investigations = await call("/investigations?page=1&pageSize=10", { headers });
let atlas = investigations.items.find((item) => item.title.includes("Atlas")) ?? investigations.items[0];
if (!atlas) {
  atlas = await call("/investigations", {
    method: "POST",
    headers,
    body: JSON.stringify({ title: `CI smoke ${Date.now()}`, description: "Temporary smoke test dossier" })
  });
}
const entities = await call(`/entities?investigationId=${atlas.id}&page=1&pageSize=10`, { headers });
const evidence = await call(`/evidence?investigationId=${atlas.id}&page=1&pageSize=10`, { headers });
const purge = await call("/auth/sessions/purge-expired", { method: "POST", headers });

console.log(JSON.stringify({
  health: health.checks.database,
  investigations: investigations.total,
  entities: entities.total,
  evidence: evidence.total,
  expiredSessionsDeleted: purge.deleted
}, null, 2));
