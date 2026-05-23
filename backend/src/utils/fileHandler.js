import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Отримуємо абсолютний шлях до поточної папки (backend/src/utils)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileHandler {
    // Допоміжний метод для перевірки та створення динамічного шляху
    static getSavePath(customDir, filename) {
        // Якщо користувач не ввів шлях, зберігаємо в backend/data
        // path.join(__dirname, '../../data') піднімається з backend/src/utils -> backend/src -> backend і заходить в data
        const baseDir = customDir ? path.resolve(customDir) : path.join(__dirname, '../../data');
        
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        return path.join(baseDir, filename);
    }

    static saveToCSV(data, customDir = null, filename = `results_${Date.now()}.csv`) {
        if (!data || data.length === 0) return { success: false, error: 'No data to save' };

        const filePath = this.getSavePath(customDir, filename);
        const headers = Object.keys(data[0]).join(',');

        // Формуємо рядки, екрануючи коми та перенесення рядків у назвах
        const rows = data.map((obj) =>
            Object.values(obj)
                .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                .join(','),
        );

        fs.writeFileSync(filePath, [headers, ...rows].join('\n'), 'utf8');
        return { success: true, filePath };
    }

    static saveToJSON(data, customDir = null, filename = `results_${Date.now()}.json`) {
        if (!data || data.length === 0) return { success: false, error: 'No data to save' };

        const filePath = this.getSavePath(customDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        return { success: true, filePath };
    }

    static async saveToSQLite(data, customDir = null, filename = `results_${Date.now()}.sqlite`) {
        return new Promise(async (resolve, reject) => {
            if (!data || data.length === 0) return resolve({ success: false, error: 'No data to save' });

            let sqlite3;
            try {
                sqlite3 = (await import('sqlite3')).default.verbose();
            } catch (error) {
                return reject(new Error('Не встановлено модуль sqlite3. Виконайте: npm install sqlite3 в папці backend'));
            }

            const filePath = this.getSavePath(customDir, filename);
            const db = new sqlite3.Database(filePath);

            const columns = Object.keys(data[0]);
            const safeColumns = columns.map(c => `"${c.replace(/"/g, '""')}"`);
            
            const createTableQuery = `CREATE TABLE IF NOT EXISTS parsed_data (${safeColumns.map(c => `${c} TEXT`).join(', ')});`;
            
            db.serialize(() => {
                db.run(createTableQuery);
                const placeholders = safeColumns.map(() => '?').join(', ');
                const insertQuery = `INSERT INTO parsed_data VALUES (${placeholders})`;
                const stmt = db.prepare(insertQuery);
                
                for (const row of data) {
                    stmt.run(Object.values(row).map(val => String(val)));
                }
                stmt.finalize();
            });

            db.close((err) => {
                if (err) reject(new Error(err.message));
                else resolve({ success: true, filePath });
            });
        });
    }

    static saveDebugInfo(html, screenshotBuffer, prefix = 'debug') {
        const dir = path.join(__dirname, '../../data/debug');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const timestamp = Date.now();
        const htmlPath = path.join(dir, `${prefix}_${timestamp}.html`);
        const screenshotPath = path.join(dir, `${prefix}_${timestamp}.png`);
        
        fs.writeFileSync(htmlPath, html, 'utf8');
        fs.writeFileSync(screenshotPath, screenshotBuffer);
    }
}