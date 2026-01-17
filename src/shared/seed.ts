import { SHA256 } from 'crypto-js';

export interface SeedInputs {
  members: string[]; // List of member IDs or unique strings
  timestamp: number;
  salt: string;
  externalEvent?: string; // Optional
}

export interface RankedMember {
  memberId: string;
  score: string;
  originalIndex: number;
}

/**
 * Generates a deterministic SEED based on inputs.
 * SEED = SHA256(members.sort() + timestamp + externalEvent + salt)
 */
export function generateSeed(inputs: SeedInputs): string {
  // Sort members to ensure order doesn't affect seed (or should it? User requests "deterministic").
  // If order of entry matters, don't sort. But usually "members list" is the set.
  // To be safe against "input order manipulation", we should probably sort them or treat the input list as canonical.
  // The prompt says: "Inputs... list of members".
  // Let's use the provided order but the user might want "Set of members".
  // For robustness, let's join them as is. If the user changes order, seed changes. This is good.

  // Ensure members are treated as a Set (order independent) for the SEED base
  // This prevents "shuffling input order" from changing the outcome.
  // The only way to change outcome is to change the Set of members (add/remove) or Salt/Time.
  const sortedMembers = [...inputs.members].sort();

  const data = [
    sortedMembers.join(','),
    inputs.timestamp.toString(),
    inputs.externalEvent || '',
    inputs.salt
  ].join('|');

  return SHA256(data).toString();
}

/**
 * Calculates a deterministic score for a member based on the SEED.
 * score = SHA256(SEED + memberId)
 */
export function calculateMemberScore(seed: string, memberId: string): string {
  return SHA256(seed + memberId).toString();
}

/**
 * Generates the fair order of members.
 * Returns members sorted by their score (ASC).
 */
export function generateFairOrder(seed: string, members: string[]): RankedMember[] {
  const ranked = members.map((memberId, index) => {
    const score = calculateMemberScore(seed, memberId);
    return {
      memberId,
      score,
      originalIndex: index
    };
  });

  // Sort by score (hex string comparison is fine for SHA256)
  ranked.sort((a, b) => a.score.localeCompare(b.score));

  return ranked;
}
