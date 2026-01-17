import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import jam3iyaRoutes from './routes/jam3iya';

// Load environment variables
dotenv.config();

// Environment variables
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/qor3a';

const app = express();

// Database pool
export const pool = new Pool({
    connectionString: DATABASE_URL,
});

// Test database connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL'))
    .catch((err) => console.error('❌ Database connection error:', err.message));

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/jam3iya', jam3iyaRoutes);

// Serve Frontend (Production)
import path from 'path';
const distPath = path.join(process.cwd(), 'dist');

// Serve static files
app.use(express.static(distPath));

// SPA Fallback - must be after API routes
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();

    // Check if index.html exists (to avoid errors in dev if dist is empty)
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
            // If dist doesn't exist (e.g. in dev mode), we just 404 or ignore
            // In dev mode, Vite handles frontend, so this might not be hit if we use port 5173 
            // but if we use port 3001 directly, this shows the frontend.
            res.status(404).send('Frontend not built. Run "npm run build" first.');
        }
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server if not running in Vercel (Vercel exports the app)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 API endpoints:`);
        console.log(`   - GET  /api/health`);
        console.log(`   - POST /api/jam3iya`);
        console.log(`   - GET  /api/jam3iya/:id`);
        console.log(`   - POST /api/jam3iya/:id/draw`);
        console.log(`   - GET  /api/jam3iya/:id/draw`);
    });
}

export default app;
