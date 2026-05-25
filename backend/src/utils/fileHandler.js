import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra'; // Використовуємо існуючий пакет для PDF
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileHandler {
    // Генерація назви: YYYY-MM-DD_HH-mm-ss
    static getFormattedTimestamp() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
        return `${date}_${time}`;
    }

    static getSavePath(customDir, filename) {
        const baseDir = customDir
            ? path.resolve(customDir)
            : path.join(__dirname, '../../data');
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        return path.join(baseDir, filename);
    }

    static saveToCSV(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'No data to save' };
        const filename = `results_${this.getFormattedTimestamp()}.csv`;
        const filePath = this.getSavePath(customDir, filename);
        const headers = Object.keys(data[0]).join(',');

        const rows = data.map((obj) =>
            Object.values(obj)
                .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                .join(','),
        );

        fs.writeFileSync(filePath, [headers, ...rows].join('\n'), 'utf8');
        return { success: true, filePath };
    }

    static saveToJSON(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'No data to save' };
        const filename = `results_${this.getFormattedTimestamp()}.json`;
        const filePath = this.getSavePath(customDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        return { success: true, filePath };
    }

    static async saveToSQLite(data, customDir = null) {
        return new Promise(async (resolve, reject) => {
            if (!data || data.length === 0)
                return resolve({ success: false, error: 'No data to save' });

            const filename = `db_${this.getFormattedTimestamp()}.sqlite`;
            let sqlite3;
            try {
                sqlite3 = (await import('sqlite3')).default.verbose();
            } catch (error) {
                return reject(new Error('Не встановлено модуль sqlite3.'));
            }

            const filePath = this.getSavePath(customDir, filename);
            const db = new sqlite3.Database(filePath);

            const columns = Object.keys(data[0]);
            const safeColumns = columns.map(
                (c) => `"${c.replace(/"/g, '""')}"`,
            );

            const createTableQuery = `CREATE TABLE IF NOT EXISTS parsed_data (${safeColumns.map((c) => `${c} TEXT`).join(', ')});`;

            db.serialize(() => {
                db.run(createTableQuery);
                const placeholders = safeColumns.map(() => '?').join(', ');
                const insertQuery = `INSERT INTO parsed_data VALUES (${placeholders})`;
                const stmt = db.prepare(insertQuery);

                for (const row of data) {
                    stmt.run(Object.values(row).map((val) => String(val)));
                }
                stmt.finalize();
            });

            db.close((err) => {
                if (err) reject(new Error(err.message));
                else resolve({ success: true, filePath });
            });
        });
    }

    // НОВЕ: Експорт у XML
    static saveToXML(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'No data to save' };
        const filename = `results_${this.getFormattedTimestamp()}.xml`;
        const filePath = this.getSavePath(customDir, filename);

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<results>\n';
        data.forEach((row, idx) => {
            xml += `  <item index="${idx + 1}">\n`;
            for (const key in row) {
                // XML-теги не можуть містити пробіли та спецсимволи (як у ваших семантичних шляхах)
                const safeTag = key
                    .replace(/[^a-zA-Z0-9]/g, '_')
                    .replace(/^([0-9])/, 'n_$1');
                const safeVal = String(row[key])
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                xml += `    <${safeTag}>${safeVal}</${safeTag}>\n`;
            }
            xml += '  </item>\n';
        });
        xml += '</results>';

        fs.writeFileSync(filePath, xml, 'utf8');
        return { success: true, filePath };
    }

    // НОВЕ: Експорт у PDF через Puppeteer
    static async saveToPDF(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'Немає даних для збереження' };

        const filename = `results_${this.getFormattedTimestamp()}.pdf`;
        const filePath = this.getSavePath(customDir, filename);

        return new Promise((resolve, reject) => {
            try {
                // Створюємо альбомну орієнтацію (landscape), оскільки в таблиці багато колонок
                const doc = new PDFDocument({
                    layout: 'landscape',
                    margin: 30,
                });
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // Підключаємо шрифт Arial для повної підтримки української мови
                const windowsFontPath = 'C:\\Windows\\Fonts\\arial.ttf';
                if (fs.existsSync(windowsFontPath)) {
                    doc.font(windowsFontPath);
                } else {
                    console.warn(
                        '⚠️ Системний шрифт Arial не знайдено. Можливі проблеми з відображенням кирилиці.',
                    );
                }

                // Заголовок документа
                doc.fontSize(18)
                    .fillColor('#4f46e5')
                    .text('Звіт скрапінгу eBay (Сформована таблиця)', {
                        align: 'center',
                    });
                doc.fontSize(10)
                    .fillColor('#64748b')
                    .text(`Згенеровано: ${new Date().toLocaleString()}`, {
                        align: 'center',
                    });
                doc.moveDown(2);

                // Витягуємо назви колонок (динамічні ключі)
                const headers = Object.keys(data[0]);

                // Структуроване відображення кожного товару у вигляді картки-рядка
                data.forEach((row, idx) => {
                    doc.fontSize(12)
                        .fillColor('#1e1b4b')
                        .text(
                            `Товар №${row['№'] || idx + 1} (ID: ${row['ID'] || '-'})`,
                            { underline: true },
                        );
                    doc.moveDown(0.3);

                    headers.forEach((header) => {
                        if (header !== '№' && header !== 'ID') {
                            doc.fontSize(10)
                                .fillColor('#1e293b')
                                .text(`${header}: `, { continued: true })
                                .fillColor('#475569')
                                .text(`${row[header] || '-'}`);
                        }
                    });

                    doc.moveDown(0.8);
                    // Малюємо тонку лінію-розділювач між товарами
                    doc.moveTo(30, doc.y)
                        .lineTo(760, doc.y)
                        .strokeColor('#e2e8f0')
                        .stroke();
                    doc.moveDown(1);

                    // Перевірка на ліміт висоти сторінки для перенесення
                    if (doc.y > 520) {
                        doc.addPage();
                    }
                });

                doc.end();

                stream.on('finish', () => resolve({ success: true, filePath }));
                stream.on('error', (err) => reject(new Error(err.message)));
            } catch (error) {
                reject(error);
            }
        });
    }

    // ОНОВЛЕНО: Тепер скріншот не є обов'язковим, а дата додається в назву автоматично
    static saveDebugInfo(html, screenshotBuffer = null, prefix = 'debug') {
        const dir = path.join(__dirname, '../../data/debug');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const timestamp = this.getFormattedTimestamp();
        const htmlPath = path.join(dir, `${prefix}_${timestamp}.html`);
        fs.writeFileSync(htmlPath, html, 'utf8');

        if (screenshotBuffer) {
            const screenshotPath = path.join(dir, `${prefix}_${timestamp}.png`);
            fs.writeFileSync(screenshotPath, screenshotBuffer);
        }

        return htmlPath; // Повертаємо шлях, щоб вивести в консоль
    }
}
