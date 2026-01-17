import { generateSeed, generateFairOrder, type SeedInputs } from '../shared/seed';

// Type for the result coming from API/DB
interface DrawRecord {
    seed: string;
    inputs: SeedInputs;
    results: Array<{ memberId: string; score: string }>;
}

/**
 * Verifies a draw result locally.
 * Returns true if the calculated seed and order match the record.
 */
export function verifyDraw(record: DrawRecord): { isValid: boolean; details: string } {
    // 1. Re-calculate SEED
    const calculatedSeed = generateSeed(record.inputs);

    if (calculatedSeed !== record.seed) {
        return {
            isValid: false,
            details: `SEED mismatch.\nExpected: ${record.seed}\nCalculated: ${calculatedSeed}`
        };
    }

    // 2. Re-calculate Order
    const calculatedOrder = generateFairOrder(calculatedSeed, record.inputs.members);

    // 3. Compare Results
    // Check length
    if (calculatedOrder.length !== record.results.length) {
        return { isValid: false, details: 'Member count mismatch' };
    }

    // Check each position (Order is deterministic)
    for (let i = 0; i < calculatedOrder.length; i++) {
        const calc = calculatedOrder[i];
        const rec = record.results[i]; // Assuming record.results is sorted by score (as saved)

        if (calc.memberId !== rec.memberId) {
            return {
                isValid: false,
                details: `Order mismatch at position ${i + 1}.\nExpected: ${rec.memberId}\nCalculated: ${calc.memberId}`
            };
        }

        if (calc.score !== rec.score) {
            return {
                isValid: false,
                details: `Score mismatch for member ${calc.memberId}.\nExpected: ${rec.score}\nCalculated: ${calc.score}`
            };
        }
    }

    return { isValid: true, details: 'Verification Successful. The draw is mathematically valid.' };
}
