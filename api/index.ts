import express from 'express';
import cors from 'cors';
import { pool } from './db/index.js';
import jam3iyaRoutes from './routes/jam3iya.js';
import path from 'path';

const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (error: any) {
        res.status(500).json({ status: 'error', db: error.message });
    }
});

// API Routes
app.use('/api/jam3iya', jam3iyaRoutes);

// Serve Frontend (Production)
const distPath = path.join(process.cwd(), 'dist');

// Serve static files
app.use(express.static(distPath));

// SPA Fallback - must be after API routes
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();

    // Check if index.html exists (to avoid errors in dev if dist is empty)
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
            // In dev mode, or if not built
            if (process.env.NODE_ENV === 'production') {
                res.status(404).send('Frontend not built. Run "npm run build" first.');
            } else {
                res.status(404).json({ error: 'Frontend not found (Dev Mode)' });
            }
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

// Start server if NOT in Vercel Serverless environment
// Vercel sets 'VERCEL=1' automatically. 
// We want to listen in local dev AND local production (npm start).
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

export default app;
