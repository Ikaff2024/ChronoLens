import { createHash } from "crypto";

type EvidenceHashInput = {
  source: string;
  title: string;
  url?: string | null;
  occurredAt?: Date | null;
  notes?: string | null;
};

export function evidenceHash(input: EvidenceHashInput) {
  const canonical = JSON.stringify({
    source: input.source,
    title: input.title.trim(),
    url: input.url?.trim() ?? null,
    occurredAt: input.occurredAt?.toISOString() ?? null,
    notes: input.notes?.trim() ?? null
  });

  return createHash("sha256").update(canonical).digest("hex");
}
