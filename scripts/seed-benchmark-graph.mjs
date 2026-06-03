import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://chronolens:chronolens@localhost:5440/chronolens";

const prisma = new PrismaClient();
const organizationId = process.env.BENCHMARK_ORGANIZATION_ID ?? "pilot-org";
const title = process.env.BENCHMARK_INVESTIGATION_TITLE ?? "Benchmark - Representative graph";
const entityCount = positiveInteger("BENCHMARK_ENTITIES", 1000);
const relationshipCount = positiveInteger("BENCHMARK_RELATIONSHIPS", 5000);
const evidenceCount = positiveInteger("BENCHMARK_EVIDENCE", 500);
const batchSize = positiveInteger("BENCHMARK_BATCH_SIZE", 500);
const now = new Date();

if (entityCount < 2) throw new Error("BENCHMARK_ENTITIES must be at least 2");

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function batches(items) {
  const result = [];
  for (let index = 0; index < items.length; index += batchSize) result.push(items.slice(index, index + batchSize));
  return result;
}

function daysAgo(index) {
  return new Date(now.getTime() - index * 24 * 60 * 60 * 1000);
}

try {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new Error(`Organization not found: ${organizationId}`);

  await prisma.investigation.deleteMany({ where: { organizationId, title } });
  const investigation = await prisma.investigation.create({
    data: {
      organizationId,
      title,
      description: "Synthetic graph generated for reproducible PostgreSQL benchmarks",
      status: "ACTIVE",
      tags: ["benchmark", "synthetic"]
    }
  });

  const entityTypes = ["PERSON", "ORGANIZATION", "LOCATION", "EVENT", "DOCUMENT", "ASSET", "CONCEPT"];
  const relationshipTypes = ["EMPLOYEE", "FOUNDER", "INVESTOR", "BOARD_MEMBER", "SUBSIDIARY", "PARTNER", "SUPPLIER", "CUSTOMER", "ASSOCIATED", "MENTIONED_WITH"];
  const entityIds = Array.from({ length: entityCount }, () => randomUUID());
  const entities = entityIds.map((id, index) => ({
    id,
    investigationId: investigation.id,
    type: entityTypes[index % entityTypes.length],
    name: `Benchmark entity ${String(index + 1).padStart(5, "0")}`,
    aliases: [`benchmark-${index + 1}`],
    description: "Synthetic benchmark entity",
    metadata: { synthetic: true, sequence: index + 1 },
    confidence: 0.8 + (index % 20) / 100,
    firstSeen: daysAgo(index % 730),
    lastSeen: daysAgo(index % 30)
  }));
  for (const batch of batches(entities)) await prisma.entity.createMany({ data: batch });

  const relationships = Array.from({ length: relationshipCount }, (_, index) => {
    const sourceIndex = index % entityCount;
    const targetIndex = (sourceIndex + 1 + ((index * 37) % (entityCount - 1))) % entityCount;
    return {
      investigationId: investigation.id,
      sourceEntityId: entityIds[sourceIndex],
      targetEntityId: entityIds[targetIndex],
      type: relationshipTypes[index % relationshipTypes.length],
      description: "Synthetic benchmark relationship",
      weight: 0.5 + (index % 50) / 100,
      confidence: 0.75 + (index % 25) / 100,
      validFrom: daysAgo(index % 730)
    };
  });
  for (const batch of batches(relationships)) await prisma.relationship.createMany({ data: batch });

  const evidence = Array.from({ length: evidenceCount }, (_, index) => ({
    investigationId: investigation.id,
    source: "URL",
    title: `Benchmark evidence ${String(index + 1).padStart(5, "0")}`,
    url: `https://benchmark.invalid/evidence/${index + 1}`,
    capturedAt: daysAgo(index % 365),
    occurredAt: daysAgo(index % 730),
    contentHash: `synthetic-${String(index + 1).padStart(8, "0")}`,
    notes: "Synthetic benchmark evidence"
  }));
  for (const batch of batches(evidence)) await prisma.evidence.createMany({ data: batch });

  console.log(JSON.stringify({
    investigationId: investigation.id,
    title,
    entities: entityCount,
    relationships: relationshipCount,
    evidence: evidenceCount
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
