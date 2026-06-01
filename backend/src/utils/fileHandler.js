import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra'; // Використовуємо існуючий пакет для PDF
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File I/O Management and Format Export Utility Service.
 * Implements low-level stream compiling routines translating matrix tables into specialized serialization types.
 */
export class FileHandler {
    /**
     * Generates a standardized sortable ISO date-time string token for data exports.
     * Format template: YYYY-MM-DD_HH-mm-ss
     * * @static
     * @method getFormattedTimestamp
     * @returns {string} Formatted timestamp string token.
     */
    static getFormattedTimestamp() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
        return `${date}_${time}`;
    }

    /**
     * Resolves absolute file system locations, verifying or recursively establishing directory roots.
     * * @static
     * @method getSavePath
     * @param {string|null} customDir - Explicit user folder destination override string.
     * @param {string} filename - Targeted file title token destination.
     * @returns {string} Fully qualified destination file location path.
     */
    static getSavePath(customDir, filename) {
        const baseDir = customDir
            ? path.resolve(customDir)
            : path.join(__dirname, '../../data');
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        return path.join(baseDir, filename);
    }

    /**
     * Serializes relational dataset arrays into standard Comma-Separated Values text structures.
     * Sanitizes text strings against format breaks via string quotation and delimiter escape logic.
     * * @static
     * @method saveToCSV
     * @param {Object[]} data - Flattened dictionary record matrix rows.
     * @param {string|null} [customDir=null] - File destination folder path.
     * @returns {Object} System operational confirmation status data payload.
     */
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

    /**
     * Serializes arrays into standardized pretty-printed JSON data structures.
     * * @static
     * @method saveToJSON
     * @param {Object[]} data - Flat parsing collection matrices.
     * @param {string|null} [customDir=null] - Destination destination path guidelines.
     * @returns {Object} Execution verification receipts.
     */
    static saveToJSON(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'No data to save' };
        const filename = `results_${this.getFormattedTimestamp()}.json`;
        const filePath = this.getSavePath(customDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        return { success: true, filePath };
    }

    /**
     * Asynchronously generates isolated SQLite binary database schemas out of raw extraction data arrays.
     * Dynamically constructs sanitized initialization query templates mapping data rows securely.
     * * @static
     * @method saveToSQLite
     * @param {Object[]} data - Relational row matrices.
     * @param {string|null} [customDir=null] - Custom disk location directories.
     * @returns {Promise<Object>} Execution confirmations containing final file routing tracking strings.
     */
    static async saveToSQLite(data, customDir = null) {
        return new Promise(async (resolve, reject) => {
            if (!data || data.length === 0)
                return resolve({ success: false, error: 'No data to save' });

            const filename = `db_${this.getFormattedTimestamp()}.sqlite`;
            let sqlite3;
            try {
                sqlite3 = (await import('sqlite3')).default.verbose();
            } catch (error) {
                return reject(
                    new Error(
                        'Required dependency package module "sqlite3" is missing.',
                    ),
                );
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

    /**
     * Compiles relational array datasets into valid XML document formats.
     * Strips whitespace and layout paths into safe tag elements, escaping special text entities.
     * * @static
     * @method saveToXML
     * @param {Object[]} data - Two-dimensional flat rows mapping dataset items.
     * @param {string|null} [customDir=null] - User target workspace path context.
     * @returns {Object} System operational execution summary reports.
     */
    static saveToXML(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'No data to save' };
        const filename = `results_${this.getFormattedTimestamp()}.xml`;
        const filePath = this.getSavePath(customDir, filename);

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<results>\n';
        data.forEach((row, idx) => {
            xml += `  <item index="${idx + 1}">\n`;
            for (const key in row) {
                // Sanitize complex semantic layout paths to align with strict W3C naming specifications
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

    /**
     * Encapsulates flat tabular matrix datasets into multi-page printable PDF documents via PDFKit.
     * Sets page rendering bounds, handles content overflow tracking, and implements dynamic font loading.
     * * @static
     * @method saveToPDF
     * @param {Object[]} data - Tabular row structures representing targeted extraction metrics.
     * @param {string|null} [customDir=null] - Custom data destination paths.
     * @returns {Promise<Object>} Execution verification metadata detailing file storage addresses.
     */
    static async saveToPDF(data, customDir = null) {
        if (!data || data.length === 0)
            return { success: false, error: 'No data to save' };

        const filename = `results_${this.getFormattedTimestamp()}.pdf`;
        const filePath = this.getSavePath(customDir, filename);

        return new Promise((resolve, reject) => {
            try {
                // Initialize a landscape canvas page tracking configuration to account for dense multi-column layouts
                const doc = new PDFDocument({
                    layout: 'landscape',
                    margin: 30,
                });
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // Load Arial system typography to establish comprehensive Unicode and Cyrillic script encoding support
                const windowsFontPath = 'C:\\Windows\\Fonts\\arial.ttf';
                if (fs.existsSync(windowsFontPath)) {
                    doc.font(windowsFontPath);
                } else {
                    console.warn(
                        '⚠️ Core system typography Arial not found. Fallbacks may disrupt Unicode rendering processes.',
                    );
                }

                // Compile and balance visual brand positioning title layout configurations
                doc.fontSize(18)
                    .fillColor('#4f46e5')
                    .text(
                        'eBay Scraping Report (Structured Relational Dataset)',
                        {
                            align: 'center',
                        },
                    );
                doc.fontSize(10)
                    .fillColor('#64748b')
                    .text(`Generated on: ${new Date().toLocaleString()}`, {
                        align: 'center',
                    });
                doc.moveDown(2);

                // Extract operational attribute tracking keys
                const headers = Object.keys(data[0]);

                // Enact loop routines laying down structural information nodes row-by-row
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
                    // Render thin structural layout lines separating sequence elements cleanly
                    doc.moveTo(30, doc.y)
                        .lineTo(760, doc.y)
                        .strokeColor('#e2e8f0')
                        .stroke();
                    doc.moveDown(1);

                    // Track layout vertical height configurations to control automatic page break triggers
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

    /**
     * Stores runtime debug information dumps to disk storage layers.
     * Saves raw source HTML structures along with optional graphical screen image buffer captures.
     * * @static
     * @method saveDebugInfo
     * @param {string} html - Raw web page HTML string text source.
     * @param {Buffer|null} [screenshotBuffer=null] - Optional binary screenshot image buffer.
     * @param {string} [prefix='debug'] - Custom identification categorization string prefix.
     * @returns {string} Disk absolute route location file path tracking information.
     */
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

        return htmlPath; 
    }
}
