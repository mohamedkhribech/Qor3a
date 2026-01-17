import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// --- Database Configuration ---
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/qor3a';
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
});

// Test connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL'))
    .catch((err) => console.error('❌ Database connection error:', err.message));

// --- Helper Functions ---
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

// --- App Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// --- Routes ---
const router = express.Router();

// POST /api/jam3iya
router.post('/', async (req: Request, res: Response) => {
    const { name, amount, startDate, members, currency = 'SAR' } = req.body;

    if (!name || !amount || !startDate || !members || !Array.isArray(members)) {
        res.status(400).json({ error: 'Missing required fields: name, amount, startDate, members[]' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const jamResult = await client.query(
            `INSERT INTO jam3iya (name, amount, currency, start_date) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [name, amount, currency, startDate]
        );
        const jamiyaId = jamResult.rows[0].id;

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

// GET /api/jam3iya/:id
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const jamResult = await pool.query(
            `SELECT * FROM jam3iya WHERE id = $1`, [id]
        );

        if (jamResult.rows.length === 0) {
            res.status(404).json({ error: 'Jam3iya not found' });
            return;
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

// POST /api/jam3iya/:id/draw
router.post('/:id/draw', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { salt, externalEvent } = req.body;

    if (!salt) {
        res.status(400).json({ error: 'Salt is required' });
        return;
    }

    try {
        const existingDraw = await pool.query(
            `SELECT id FROM draws WHERE jam3iya_id = $1`, [id]
        );

        if (existingDraw.rows.length > 0) {
            res.status(409).json({ error: 'Draw already exists and cannot be modified' });
            return;
        }

        const membersResult = await pool.query(
            `SELECT id, name FROM members WHERE jam3iya_id = $1`, [id]
        );

        if (membersResult.rows.length < 2) {
            res.status(400).json({ error: 'At least 2 members required' });
            return;
        }

        const members = membersResult.rows;
        const memberIds = members.map((m: any) => m.id);
        const timestamp = Date.now();

        const inputs: SeedInputs = {
            members: memberIds,
            timestamp,
            salt,
            externalEvent: externalEvent || undefined
        };

        const seed = generateSeed(inputs);

        const ranked: RankedMember[] = members.map((m: any) => ({
            memberId: m.id,
            memberName: m.name,
            score: calculateMemberScore(seed, m.id),
            month: 0
        }));

        ranked.sort((a, b) => a.score.localeCompare(b.score));
        ranked.forEach((r, i) => { r.month = i + 1; });

        const drawResult = await pool.query(
            `INSERT INTO draws (jam3iya_id, seed, seed_inputs, results)
             VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
            [id, seed, JSON.stringify(inputs), JSON.stringify(ranked)]
        );

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

// GET /api/jam3iya/:id/draw
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
            res.status(404).json({ error: 'Draw not found' });
            return;
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

app.use('/api/jam3iya', router);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (error: any) {
        res.status(500).json({ status: 'error', db: error.message });
    }
});

// Serve Frontend (Production)
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// SPA Fallback - Regex for Express 5
app.get(/^(?!\/api).+/, (req, res, next) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
            if (process.env.NODE_ENV === 'production') {
                res.status(404).send('Frontend not built. Run "npm run build" first.');
            } else {
                res.status(404).json({ error: 'Frontend not found (Dev Mode)' });
            }
        }
    });
});

// Start server if NOT in Vercel
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

export default app;
