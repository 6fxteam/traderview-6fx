import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import TradingView from '@mathieuc/tradingview';
import compression from 'compression';
import { ChartDatabase } from './ChartDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const db = new ChartDatabase();

// === SIMPLE IN-MEMORY CACHE ===
const fastCache = new Map();
const CACHE_TTL = 30000; // 30 seconds for 'latest' or active blocks
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 8080;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Disable caching for development
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// TradingView Client Integration
const tvClient = new TradingView.Client();

io.on('connection', (socket) => {
    console.log(`[Socket] ✅ Một người dùng đã kết nối (${socket.id})`);

    socket._chart = null;
    socket._timeframe = '1';

    socket.on('setTimeframe', (tf) => {
        socket._timeframe = tf;
        console.log(`[Socket] [${socket.id}] Timeframe updated to ${tf}`);
    });

    socket.on('subscribe', (symbolName) => {
        if (socket._chart) {
            console.log(`[Socket] [${socket.id}] Cleaning up old session...`);
            socket._chart.delete();
            socket._chart = null;
        }

        const targetSymbol = symbolName.includes(':') ? symbolName : `OANDA:${symbolName}`;
        const tf = socket._timeframe || '1';

        console.log(`[Socket] [${socket.id}] 🔔 Subscribing to ${targetSymbol} (${tf})`);

        const chart = new tvClient.Session.Chart();
        socket._chart = chart;

        chart.setMarket(targetSymbol, {
            timeframe: tf,
            range: 50
        });

        chart.onUpdate(() => {
            if (!socket._chart) return;

            const p = chart.periods[0];
            if (!p || typeof p.open !== 'number' || typeof p.max !== 'number') return;

            const data = {
                symbol: targetSymbol,
                originalSymbol: symbolName,
                time: p.time * 1000,
                open: p.open,
                high: p.max,
                low: p.min,
                close: p.close,
                volume: p.volume
            };

            socket.emit('priceUpdate', data);

            // Save to SQLite (continuous history building)
            const candleArr = [[data.time, data.open, data.high, data.low, data.close, data.volume]];
            db.saveCandles(targetSymbol, tf, candleArr);
        });

        chart.onError((err) => {
            console.error(`[Socket] [${socket.id}] ❌ Chart Error:`, err.message);
        });
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] ❌ Người dùng đã ngắt kết nối (${socket.id})`);
        if (socket._chart) {
            socket._chart.delete();
            socket._chart = null;
        }
    });
});

// Proxy /binance-api requests
app.use('/binance-api/v3', createProxyMiddleware({
    target: 'https://api.binance.com/api/v3',
    changeOrigin: true,
    pathRewrite: { '^/binance-api/v3': '' }
}));

const DRAWINGS_FILE = path.join(__dirname, 'drawings.json');

// API: Load drawings
app.get('/api/drawings', (req, res) => {
    // ... logic remains ...
});

// API: TradingView History
app.get('/api/history', async (req, res) => {
    let { symbol, timeframe, range, to } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });
    if (!timeframe) timeframe = '1';

    const requestedRange = parseInt(range) || 300;
    let targetSymbol = symbol;
    if (!symbol.includes(':')) targetSymbol = `OANDA:${symbol}`;

    const toTimestamp = to ? parseInt(to) * 1000 : Date.now();

    // 1. Check SQLite first
    try {
        const cachedCandles = db.getCandles(targetSymbol, timeframe, requestedRange, toTimestamp);
        // If we have enough candles (at least 90% of what was requested), return them
        if (cachedCandles.length >= requestedRange * 0.9) {
            console.log(`[Database] 🚀 SQLite Hit: ${targetSymbol} (${timeframe}) - ${cachedCandles.length} bars`);
            return res.json(cachedCandles);
        }
    } catch (e) {
        console.error('[Database] Read error:', e);
    }

    console.log(`[History] Fetching ${requestedRange} candles for ${targetSymbol} (${timeframe}) from TV...`);

    try {
        const chart = new tvClient.Session.Chart();
        const options = { timeframe, range: requestedRange };
        if (to) options.to = parseInt(to);

        chart.setMarket(targetSymbol, options);

        let resolved = false;
        let lastCount = 0;
        let stabilityCounter = 0;

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                sendData('Timeout');
            }
        }, 15000);

        function sendData(reason = 'Success') {
            clearTimeout(timeout);
            if (chart.periods.length === 0) return res.json([]);

            const formatted = chart.periods
                .filter(p => typeof p.open === 'number' && p.time > 0)
                .map(p => [
                    p.time * 1000,
                    p.open,
                    p.max,
                    p.min,
                    p.close,
                    p.volume || 0
                ]);

            if (formatted.length > 0) {
                // Save to SQLite for persistence
                db.saveCandles(targetSymbol, timeframe, formatted);
                console.log(`[Database] 💾 Saved ${formatted.length} bars to SQLite`);
            }

            res.json(formatted);
            chart.delete();
        }

        chart.onUpdate(() => {
            if (resolved) return;
            const validCount = chart.periods.filter(p => typeof p.open === 'number').length;

            if (validCount >= requestedRange) {
                resolved = true;
                sendData();
            } else if (validCount > 0 && validCount === lastCount) {
                stabilityCounter++;
                if (stabilityCounter > 5) { // Faster response
                    resolved = true;
                    sendData();
                }
            } else if (validCount > lastCount) {
                lastCount = validCount;
                stabilityCounter = 0;
            }
        });

        chart.onError((err) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            if (chart.delete) chart.delete();
            res.status(500).json({ error: err.message || 'TV Error' });
        });

    } catch (e) {
        console.error('[History] Critical Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// API: Save drawings
app.post('/api/drawings', (req, res) => {
    try {
        const drawings = req.body;
        fs.writeFileSync(DRAWINGS_FILE, JSON.stringify(drawings, null, 2));
        res.json({ success: true, count: drawings.length });
    } catch (e) {
        console.error('Error saving drawings:', e);
        res.status(500).json({ error: 'Failed to save drawings' });
    }
});

// Serve static files
app.use(express.static('dist'));

// === MARKET CRAWLER (PRE-FETCH DATA) ===
const PRIORITY_SYMBOLS = [
    'OANDA:XAUUSD',
    'FX:EURUSD',
    'FX:GBPUSD',
    'FX:USDJPY',
    'FX:AUDUSD',
    'FX:USDCHF',
    'FX:USDCAD',
    'FX:NZDUSD'
];

async function startMarketCrawler() {
    console.log('[Crawler] 🕵️ Starting pre-fetch for priority symbols...');
    for (const symbol of PRIORITY_SYMBOLS) {
        try {
            // Fetch for common timeframes (1, 15, 60, D)
            for (const tf of ['1', '15', '60', 'D']) {
                console.log(`[Crawler] Fetching ${symbol} (${tf})...`);
                const chart = new tvClient.Session.Chart();
                chart.setMarket(symbol, { timeframe: tf, range: 1000 });

                await new Promise((resolve) => {
                    let timeout = setTimeout(resolve, 5000); // 5s max per symbol/tf
                    chart.onUpdate(() => {
                        const valid = chart.periods.filter(p => typeof p.open === 'number');
                        if (valid.length >= 800) {
                            const formatted = valid.map(p => [p.time * 1000, p.open, p.max, p.min, p.close, p.volume || 0]);
                            db.saveCandles(symbol, tf, formatted);
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                });
                chart.delete();
            }
        } catch (e) {
            console.error(`[Crawler] ❌ Error pre-fetching ${symbol}:`, e.message);
        }
    }
    console.log('[Crawler] ✅ Pre-fetch complete. Database is warmed up.');
}

server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 SQLite Persistence Enabled: traderview.db`);
    console.log(`🚀 TradingView Real-time Streaming Enabled`);

    // Start crawler in background
    startMarketCrawler();
});
