import { Router, Request, Response } from 'express';
import { pool } from '../db/index'; // Removed .js
import crypto from 'crypto';

const router = Router();

// Shared SHA-256 function (matching frontend)
function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

interface SeedInputs {
    members: string[];
    timestamp: number;
    salt: string;
    externalEvent?: string;
}

function generateSeed(inputs: SeedInputs): string {
    const sortedMembers = [...inputs.members].sort();
    const data = [
        sortedMembers.join(','),
        inputs.timestamp.toString(),
        inputs.externalEvent || '',
        inputs.salt
    ].join('|');
    return sha256(data);
}

function calculateMemberScore(seed: string, memberId: string): string {
    return sha256(seed + memberId);
}

interface RankedMember {
    memberId: string;
    memberName: string;
    score: string;
    month: number;
}

// POST /api/jam3iya - Create a new Jam3iya with members
router.post('/', async (req: Request, res: Response) => {
    const { name, amount, startDate, members, currency = 'SAR' } = req.body;

    if (!name || !amount || !startDate || !members || !Array.isArray(members)) {
        return res.status(400).json({ error: 'Missing required fields: name, amount, startDate, members[]' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create Jam3iya
        const jamResult = await client.query(
            `INSERT INTO jam3iya (name, amount, currency, start_date) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [name, amount, currency, startDate]
        );
        const jamiyaId = jamResult.rows[0].id;

        // Insert members
        const memberIds: string[] = [];
        for (const memberName of members) {
            const memberResult = await client.query(
                `INSERT INTO members (jam3iya_id, name) VALUES ($1, $2) RETURNING id`,
                [jamiyaId, memberName]
            );
            memberIds.push(memberResult.rows[0].id);
        }

        await client.query('COMMIT');

        res.status(201).json({
            id: jamiyaId,
            name,
            amount,
            currency,
            startDate,
            members: memberIds
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating jam3iya:', error);
        res.status(500).json({ error: 'Failed to create jam3iya' });
    } finally {
        client.release();
    }
});

// GET /api/jam3iya/:id - Get a Jam3iya by ID
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const jamResult = await pool.query(
            `SELECT * FROM jam3iya WHERE id = $1`, [id]
        );

        if (jamResult.rows.length === 0) {
            return res.status(404).json({ error: 'Jam3iya not found' });
        }

        const membersResult = await pool.query(
            `SELECT id, name, avatar FROM members WHERE jam3iya_id = $1`, [id]
        );

        const drawResult = await pool.query(
            `SELECT * FROM draws WHERE jam3iya_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]
        );

        res.json({
            ...jamResult.rows[0],
            members: membersResult.rows,
            draw: drawResult.rows[0] || null
        });
    } catch (error) {
        console.error('Error fetching jam3iya:', error);
        res.status(500).json({ error: 'Failed to fetch jam3iya' });
    }
});

// POST /api/jam3iya/:id/draw - Generate a draw for a Jam3iya
router.post('/:id/draw', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { salt, externalEvent } = req.body;

    if (!salt) {
        return res.status(400).json({ error: 'Salt is required' });
    }

    try {
        // Check if draw already exists (immutable)
        const existingDraw = await pool.query(
            `SELECT id FROM draws WHERE jam3iya_id = $1`, [id]
        );

        if (existingDraw.rows.length > 0) {
            return res.status(409).json({ error: 'Draw already exists and cannot be modified' });
        }

        // Fetch members
        const membersResult = await pool.query(
            `SELECT id, name FROM members WHERE jam3iya_id = $1`, [id]
        );

        if (membersResult.rows.length < 2) {
            return res.status(400).json({ error: 'At least 2 members required' });
        }

        const members = membersResult.rows;
        const memberIds = members.map(m => m.id);
        const timestamp = Date.now();

        // Generate SEED
        const inputs: SeedInputs = {
            members: memberIds,
            timestamp,
            salt,
            externalEvent: externalEvent || undefined
        };

        const seed = generateSeed(inputs);

        // Calculate scores and rank
        const ranked: RankedMember[] = members.map((m) => ({
            memberId: m.id,
            memberName: m.name,
            score: calculateMemberScore(seed, m.id),
            month: 0 // Will be set after sorting
        }));

        ranked.sort((a, b) => a.score.localeCompare(b.score));
        ranked.forEach((r, i) => { r.month = i + 1; });

        // Save to database
        const drawResult = await pool.query(
            `INSERT INTO draws (jam3iya_id, seed, seed_inputs, results)
             VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
            [id, seed, JSON.stringify(inputs), JSON.stringify(ranked)]
        );

        // Audit log
        await pool.query(
            `INSERT INTO audit_log (jam3iya_id, action, details)
             VALUES ($1, $2, $3)`,
            [id, 'DRAW_GENERATED', JSON.stringify({ seed, inputsHash: sha256(JSON.stringify(inputs)) })]
        );

        res.status(201).json({
            id: drawResult.rows[0].id,
            jamiyaId: id,
            seed,
            inputs,
            results: ranked,
            createdAt: drawResult.rows[0].created_at,
            isLocked: true
        });
    } catch (error) {
        console.error('Error generating draw:', error);
        res.status(500).json({ error: 'Failed to generate draw' });
    }
});

// GET /api/jam3iya/:id/draw - Get draw results
router.get('/:id/draw', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const drawResult = await pool.query(
            `SELECT d.*, j.name as jam3iya_name, j.amount, j.currency
             FROM draws d
             JOIN jam3iya j ON d.jam3iya_id = j.id
             WHERE d.jam3iya_id = $1`,
            [id]
        );

        if (drawResult.rows.length === 0) {
            return res.status(404).json({ error: 'Draw not found' });
        }

        const draw = drawResult.rows[0];
        res.json({
            id: draw.id,
            jamiyaId: draw.jam3iya_id,
            jamiyaName: draw.jam3iya_name,
            amount: draw.amount,
            currency: draw.currency,
            seed: draw.seed,
            inputs: draw.seed_inputs,
            results: draw.results,
            createdAt: draw.created_at,
            isLocked: draw.is_locked
        });
    } catch (error) {
        console.error('Error fetching draw:', error);
        res.status(500).json({ error: 'Failed to fetch draw' });
    }
});

export default router;
