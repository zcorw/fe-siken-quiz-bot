export interface SelectSeededUniqueCandidatesOptions {
  count: number;
  seed: string;
}

export interface CandidateWithUrl {
  url: string;
}

export function selectSeededUniqueCandidates<TCandidate extends CandidateWithUrl>(
  candidates: TCandidate[],
  { count, seed }: SelectSeededUniqueCandidatesOptions
): TCandidate[] {
  return shuffleSeeded(dedupeByUrl(candidates), seed).slice(0, count);
}

function dedupeByUrl<TCandidate extends CandidateWithUrl>(
  candidates: TCandidate[]
): TCandidate[] {
  const seenUrls = new Set<string>();
  const deduped: TCandidate[] = [];

  for (const candidate of candidates) {
    if (seenUrls.has(candidate.url)) {
      continue;
    }

    seenUrls.add(candidate.url);
    deduped.push(candidate);
  }

  return deduped;
}

function shuffleSeeded<TValue>(values: TValue[], seed: string): TValue[] {
  const shuffled = [...values];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
