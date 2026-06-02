import { describe, expect, it } from "vitest";

import { selectSeededUniqueCandidates } from "./question-selection";

type Candidate = {
  id: number;
  url: string;
};

function createCandidates(count: number): Candidate[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    url: `https://example.test/q${index + 1}.html`,
  }));
}

describe("selectSeededUniqueCandidates", () => {
  it("returns stable candidates for the same seed", () => {
    const candidates = createCandidates(30);

    const first = selectSeededUniqueCandidates(candidates, {
      count: 20,
      seed: "seed-a",
    });
    const second = selectSeededUniqueCandidates(candidates, {
      count: 20,
      seed: "seed-a",
    });

    expect(second).toEqual(first);
    expect(first).toHaveLength(20);
  });

  it("returns different candidates or order for different seeds", () => {
    const candidates = createCandidates(30);

    const first = selectSeededUniqueCandidates(candidates, {
      count: 20,
      seed: "seed-a",
    }).map((candidate) => candidate.url);
    const second = selectSeededUniqueCandidates(candidates, {
      count: 20,
      seed: "seed-b",
    }).map((candidate) => candidate.url);

    expect(second).not.toEqual(first);
  });

  it("deduplicates candidates by URL before selecting", () => {
    const candidates = [
      ...createCandidates(10),
      { id: 101, url: "https://example.test/q1.html" },
      { id: 102, url: "https://example.test/q2.html" },
    ];

    const selected = selectSeededUniqueCandidates(candidates, {
      count: 12,
      seed: "seed-a",
    });

    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((candidate) => candidate.url))).toHaveProperty(
      "size",
      10
    );
  });
});
