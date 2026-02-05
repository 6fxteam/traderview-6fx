import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChartDatabase {
    constructor() {
        this.db = new Database(path.join(__dirname, 'traderview.db'));
        this.init();
    }

    init() {
        // Create candles table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS candles (
                symbol TEXT,
                timeframe TEXT,
                time INTEGER,
                open REAL,
                high REAL,
                low REAL,
                close REAL,
                volume REAL,
                PRIMARY KEY (symbol, timeframe, time)
            )
        `);

        // Create index for faster range queries
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_candles_lookup ON candles (symbol, timeframe, time)`);

        console.log('[ChartDatabase] ✅ SQLite Database initialized');
    }

    saveCandles(symbol, timeframe, candles) {
        const insert = this.db.prepare(`
            INSERT OR REPLACE INTO candles (symbol, timeframe, time, open, high, low, close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = this.db.transaction((items) => {
            for (const c of items) {
                // c format: [time, open, high, low, close, volume]
                insert.run(symbol, timeframe, c[0], c[1], c[2], c[3], c[4], c[5]);
            }
        });

        transaction(candles);
    }

    getCandles(symbol, timeframe, limit = 1000, endTime = null) {
        let query = `
            SELECT time, open, high, low, close, volume 
            FROM candles 
            WHERE symbol = ? AND timeframe = ?
        `;
        const params = [symbol, timeframe];

        if (endTime) {
            query += ` AND time <= ?`;
            params.push(endTime);
        }

        query += ` ORDER BY time DESC LIMIT ?`;
        params.push(limit);

        const rows = this.db.prepare(query).all(...params);

        // Convert back to [time, o, h, l, c, v] format
        return rows.reverse().map(r => [r.time, r.open, r.high, r.low, r.close, r.volume]);
    }

    getLatestTime(symbol, timeframe) {
        const row = this.db.prepare(`
            SELECT MAX(time) as maxTime FROM candles WHERE symbol = ? AND timeframe = ?
        `).get(symbol, timeframe);
        return row ? row.maxTime : 0;
    }
}
