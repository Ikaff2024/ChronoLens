import { EvidenceSource } from "@prisma/client";
import { evidenceHash } from "../src/evidence/evidence-hash";

describe("evidenceHash", () => {
  it("produces a deterministic hash for normalized evidence", () => {
    const occurredAt = new Date("2026-05-20T10:00:00.000Z");
    expect(
      evidenceHash({
        source: EvidenceSource.URL,
        title: " Source publique ",
        url: " https://example.org/source ",
        occurredAt,
        notes: " Note analyste "
      })
    ).toBe(
      evidenceHash({
        source: EvidenceSource.URL,
        title: "Source publique",
        url: "https://example.org/source",
        occurredAt,
        notes: "Note analyste"
      })
    );
  });
});
