import { describe, expect, it } from "vitest";

import {
  selectSeededUniqueCandidates,
  selectWeightedSeededCandidates,
} from "./question-selection";

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

describe("selectWeightedSeededCandidates", () => {
  it("prioritizes unseen candidates over high-accuracy seen candidates", () => {
    const candidates = createCandidates(4);

    const selected = selectWeightedSeededCandidates(candidates, {
      count: 2,
      seed: "seed-a",
      statsByUrl: new Map([
        [
          "https://example.test/q1.html",
          { attemptCount: 3, correctCount: 3, incorrectCount: 0 },
        ],
        [
          "https://example.test/q2.html",
          { attemptCount: 2, correctCount: 2, incorrectCount: 0 },
        ],
      ]),
    });

    expect(selected.map((candidate) => candidate.url).sort()).toEqual([
      "https://example.test/q3.html",
      "https://example.test/q4.html",
    ]);
  });

  it("prioritizes incorrect candidates over unseen candidates", () => {
    const candidates = createCandidates(4);

    const selected = selectWeightedSeededCandidates(candidates, {
      count: 2,
      seed: "seed-a",
      statsByUrl: new Map([
        [
          "https://example.test/q1.html",
          { attemptCount: 3, correctCount: 1, incorrectCount: 2 },
        ],
      ]),
    });

    expect(selected[0]?.url).toBe("https://example.test/q1.html");
    expect(selected).toHaveLength(2);
  });

  it("randomizes candidates with the same weight by seed", () => {
    const candidates = createCandidates(20);
    const statsByUrl = new Map(
      candidates.map((candidate) => [
        candidate.url,
        { attemptCount: 1, correctCount: 0, incorrectCount: 1 },
      ])
    );

    const first = selectWeightedSeededCandidates(candidates, {
      count: 10,
      seed: "seed-a",
      statsByUrl,
    }).map((candidate) => candidate.url);
    const second = selectWeightedSeededCandidates(candidates, {
      count: 10,
      seed: "seed-b",
      statsByUrl,
    }).map((candidate) => candidate.url);

    expect(second).not.toEqual(first);
  });
});
