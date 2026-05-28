import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(__dirname, '../../data/defaultDatabseForDataSQLT3.sqlite');

export class DBService {
    static getDbPath(dbSettings) {
        if (dbSettings?.source === 'custom' && dbSettings?.customPath) {
            const customDir = path.resolve(dbSettings.customPath);
            if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
            return path.join(customDir, 'customDatabase.sqlite');
        }
        
        const defaultDir = path.dirname(defaultDbPath);
        if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
        return defaultDbPath;
    }

    static connect(dbSettings) {
        const dbPath = this.getDbPath(dbSettings);
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
    }

    static run(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    static all(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static get(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Створення нової таблиці для конкретного пошуку
    static async createTableForQuery(dbSettings, queryName) {
        const db = await this.connect(dbSettings);
        const safeQuery = queryName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
        const tableName = `tbl_${safeQuery}_${timestamp}`;

        const schema = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                id TEXT PRIMARY KEY,
                url TEXT,
                img TEXT,
                cardChecked INTEGER,
                uniqueness INTEGER,
                currentDepth INTEGER,
                maxDepth INTEGER,
                showCleanText INTEGER,
                saveCardLink INTEGER,
                saveImgLink INTEGER,
                lines TEXT
            )
        `;
        await this.run(db, schema);
        db.close();
        return tableName;
    }

    // Отримання останньої створеної таблиці (для завантаження при старті)
    static async getLatestTable(dbSettings) {
        const db = await this.connect(dbSettings);
        try {
            const result = await this.get(db, "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'tbl_%' ORDER BY name DESC LIMIT 1");
            return result ? result.name : null;
        } finally {
            db.close();
        }
    }

    // Збереження масиву карток
    static async insertCards(dbSettings, tableName, cards) {
        if (!cards || cards.length === 0) return;
        const db = await this.connect(dbSettings);
        
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${tableName} 
            (id, url, img, cardChecked, uniqueness, currentDepth, maxDepth, showCleanText, saveCardLink, saveImgLink, lines) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        for (const card of cards) {
            stmt.run([
                card.id, card.url, card.img, 
                card.cardChecked ? 1 : 0, card.uniqueness ? 1 : 0, 
                card.currentDepth, card.maxDepth, 
                card.showCleanText ? 1 : 0, card.saveCardLink ? 1 : 0, card.saveImgLink ? 1 : 0,
                JSON.stringify(card.lines)
            ]);
        }
        stmt.finalize();
        db.close();
    }

    // Отримання карток з пагінацією
    static async getCards(dbSettings, tableName, limit, offset) {
        const db = await this.connect(dbSettings);
        try {
            const rows = await this.all(db, `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`, [limit, offset]);
            const totalRow = await this.get(db, `SELECT COUNT(*) as count FROM ${tableName}`);
            
            const processedRows = rows.map(row => ({
                ...row,
                cardChecked: !!row.cardChecked,
                uniqueness: !!row.uniqueness,
                showCleanText: !!row.showCleanText,
                saveCardLink: !!row.saveCardLink,
                saveImgLink: !!row.saveImgLink,
                lines: JSON.parse(row.lines)
            }));

            return { cards: processedRows, total: totalRow.count };
        } finally {
            db.close();
        }
    }

    // Отримання всіх активних карток для експорту (CSV, JSON тощо)
    static async getAllActiveCards(dbSettings, tableName) {
        const db = await this.connect(dbSettings);
        try {
            const rows = await this.all(db, `SELECT * FROM ${tableName} WHERE cardChecked = 1`);
            return rows.map(row => ({
                ...row,
                cardChecked: !!row.cardChecked,
                uniqueness: !!row.uniqueness,
                showCleanText: !!row.showCleanText,
                saveCardLink: !!row.saveCardLink,
                saveImgLink: !!row.saveImgLink,
                lines: JSON.parse(row.lines)
            }));
        } finally {
            db.close();
        }
    }

    // Оновлення однієї картки
    static async updateCard(dbSettings, tableName, cardId, updates) {
        const db = await this.connect(dbSettings);
        try {
            await this.run(db, `UPDATE ${tableName} SET 
                cardChecked = ?, uniqueness = ?, currentDepth = ?, 
                showCleanText = ?, saveCardLink = ?, saveImgLink = ?, lines = ?
                WHERE id = ?`, 
                [
                    updates.cardChecked ? 1 : 0, updates.uniqueness ? 1 : 0, updates.currentDepth,
                    updates.showCleanText ? 1 : 0, updates.saveCardLink ? 1 : 0, updates.saveImgLink ? 1 : 0,
                    JSON.stringify(updates.lines), cardId
                ]
            );
        } finally {
            db.close();
        }
    }
}