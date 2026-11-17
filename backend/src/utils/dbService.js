import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(
    __dirname,
    '../../data/defaultDatabseForDataSQLT3.sqlite',
);

/**
 * Relational Database Persistence Service.
 * Orchestrates SQLite3 connection pooling, transaction isolation wrappers, schema provisioning,
 * and deep serialization mapping of nested extraction entities.
 */
export class DBService {
    /**
     * Evaluates dynamic runtime configurations to resolve absolute file path configurations to targets.
     * Automatically provisions missing physical sub-directories recursively across storage scopes.
     * * @static
     * @method getDbPath
     * @param {Object} dbSettings - User connection configuration variables.
     * @returns {string} Fully qualified disk routing absolute file system path.
     */
    static getDbPath(dbSettings) {
        if (dbSettings?.source === 'custom' && dbSettings?.customPath) {
            const customDir = path.resolve(dbSettings.customPath);
            if (!fs.existsSync(customDir))
                fs.mkdirSync(customDir, { recursive: true });
            return path.join(customDir, 'customDatabase.sqlite');
        }

        const defaultDir = path.dirname(defaultDbPath);
        if (!fs.existsSync(defaultDir))
            fs.mkdirSync(defaultDir, { recursive: true });
        return defaultDbPath;
    }

    /**
     * Initializes and returns an operational low-level SQLite3 connection interface.
     * * @static
     * @method connect
     * @param {Object} dbSettings - Target context deployment settings.
     * @returns {Promise<sqlite3.Database>} Active database driver connection channel instance.
     */
    static connect(dbSettings) {
        const dbPath = this.getDbPath(dbSettings);
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
    }

    /**
     * Promisified asynchronous wrapper executing a mutation query statement.
     * * @static
     * @method run
     * @param {sqlite3.Database} db - Target connection pointer instance.
     * @param {string} sql - Prepared SQL statement template string.
     * @param {Array} [params=[]] - Data parameters bound to safe execution limits.
     * @returns {Promise<Object>} Execution tracking statistics and mutation metadata receipts.
     */
    static run(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    /**
     * Promisified asynchronous engine fetching multiple matching records from data stores.
     * * @static
     * @method all
     * @param {sqlite3.Database} db - Target connection instance pointer.
     * @param {string} sql - Search query string.
     * @param {Array} [params=[]] - Dynamic query filtering parameters.
     * @returns {Promise<Object[]>} Extracted record collection arrays.
     */
    static all(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Promisified query wrapper fetching a singular matching matrix record.
     * * @static
     * @method get
     * @param {sqlite3.Database} db - Active connection controller asset.
     * @param {string} sql - Targeted query execution statement.
     * @param {Array} [params=[]] - Dynamic parameter injection array.
     * @returns {Promise<Object|undefined>} The evaluated row configuration or undefined.
     */
    static get(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Витягує чистий ключовий термін або назву категорії з пошукового запиту чи URL.
     * Відфільтровує службові префікси: https, http, www, ebay.com, /b/, /sch/, /itm/ тощо,
     * щоб вони не потрапляли в назву таблиці.
     * @static
     * @method extractCleanQueryKeyword
     * @param {string} rawQuery - Початковий рядок пошуку або посилання
     * @returns {string} Очищене ключове слово (наприклад, 'intel', 'Cell_Phones_Smartphones')
     */
    static extractCleanQueryKeyword(rawQuery) {
        if (!rawQuery || typeof rawQuery !== 'string') return 'search';

        let str = rawQuery.trim();

        // Перевіряємо, чи містить рядок ознаки URL-адреси
        const isUrl = /^https?:\/\//i.test(str) || /ebay\.[a-z.]+/i.test(str) || str.startsWith('www.');

        if (isUrl) {
            try {
                const urlToParse = /^https?:\/\//i.test(str) ? str : `https://${str}`;
                const urlObj = new URL(urlToParse);

                // 1. Пошуковий параметр _nkw (наприклад, ?_nkw=intel або ?_nkw=laptop)
                const nkw = urlObj.searchParams.get('_nkw');
                if (nkw && nkw.trim()) {
                    return nkw.trim();
                }

                const pathname = urlObj.pathname;

                // 2. Сторінка категорії (/b/Category-Name/...)
                const bCategoryMatch = pathname.match(/\/b\/([^/]+)/i);
                if (bCategoryMatch && bCategoryMatch[1]) {
                    return bCategoryMatch[1];
                }

                // 3. Категорія через /sch/ (наприклад, /sch/Cell-Phones-Smartphones/...)
                const schCategoryMatch = pathname.match(/\/sch\/([^/]+)/i);
                if (schCategoryMatch && schCategoryMatch[1] && schCategoryMatch[1].toLowerCase() !== 'i.html') {
                    return schCategoryMatch[1];
                }

                // 4. Сторінка товару (/itm/123456789)
                const itmMatch = pathname.match(/\/itm\/(\d+)/i);
                if (itmMatch && itmMatch[1]) {
                    return `itm_${itmMatch[1]}`;
                }

                // 5. Інші шляхи — беремо перший змістовний сегмент шляху, виключаючи b, sch, itm тощо
                const pathSegments = pathname
                    .split('/')
                    .filter((seg) => seg && !['b', 'sch', 'itm', 'i.html', 'index.html'].includes(seg.toLowerCase()));
                if (pathSegments.length > 0) {
                    return pathSegments[0];
                }
            } catch {
                str = str
                    .replace(/^https?:\/\//i, '')
                    .replace(/^www\./i, '')
                    .replace(/^ebay\.[a-z.]+\/?/i, '');
            }
        }

        // Очищаємо залишки можливих URL-шляхів
        return str
            .replace(/^https?:?\/?\/?/i, '')
            .replace(/^www\./i, '')
            .replace(/^ebay\.[a-z.]+\/?/i, '')
            .replace(/^\/?b\/?/i, '')
            .replace(/^\/?sch\/?/i, '')
            .trim() || 'search';
    }

    /**
     * Creates a distinct relational schema table tailored specifically for an isolated search footprint.
     * Sanitizes source search tokens to eliminate character injection risks and avoid schema collision anomalies.
     * * @static
     * @method createTableForQuery
     * @param {Object} dbSettings - Current storage database location variables.
     * @param {string} queryName - Search argument string used to compose the data layout table signature identifier.
     * @param {string} [searchMode='query'] - Mode of search: 'query' or 'link'.
     * @returns {Promise<string>} Cleaned system identifier title of the provisioned table structure.
     */
    static async createTableForQuery(dbSettings, queryName, searchMode = 'query') {
        const db = await this.connect(dbSettings);

        let siteName = 'ebay_com';

        // Витягуємо домен, якщо передано URL
        if (queryName && (/^https?:\/\//i.test(queryName) || /ebay\.[a-z.]+/i.test(queryName))) {
            try {
                const urlToParse = /^https?:\/\//i.test(queryName) ? queryName : `https://${queryName}`;
                const urlObj = new URL(urlToParse);
                siteName = urlObj.hostname.replace(/^www\./i, '').replace(/\./g, '_');
            } catch {}
        }

        // Очищаємо ключове слово від адреси сайту та технічних шляхів (/b/, /sch/ тощо)
        const cleanKeyword = this.extractCleanQueryKeyword(queryName);

        const safeQuery = cleanKeyword
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 30) || 'search';

        // Format date as YYYY_MM_DDT... for uniqueness
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');

        const tableName = `tbl_${siteName}_${safeQuery}_${timestamp}`;

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

    /**
     * Створює окрему таблицю для товарів "${tableName}_goods",
     * пов'язану з активною таблицею через foreign key (card_id -> id).
     * @static
     * @method createProductTable
     * @param {Object} dbSettings - Налаштування бази даних.
     * @param {string} tableName - Назва активної таблиці пошуку.
     * @returns {Promise<string>} Назва створеної таблиці товарів.
     */
    static async createProductTable(dbSettings, tableName) {
        const db = await this.connect(dbSettings);
        const productTableName = `${tableName}_goods`;

        const schema = `
            CREATE TABLE IF NOT EXISTS "${productTableName}" (
                card_id TEXT PRIMARY KEY,
                itemId TEXT,
                title TEXT,
                price TEXT,
                approxPrice TEXT,
                condition TEXT,
                availability TEXT,
                shipping TEXT,
                returnsPolicy TEXT,
                sellerName TEXT,
                sellerScore TEXT,
                sellerPositivePercent TEXT,
                breadcrumbs TEXT,
                itemSpecifics TEXT,
                images TEXT,
                galleryLinks TEXT,
                descriptionText TEXT,
                descriptionHtml TEXT,
                descriptionStructured TEXT,
                htmlFilePath TEXT,
                mediaFolderPath TEXT,
                url TEXT,
                scrapedAt TEXT,
                FOREIGN KEY (card_id) REFERENCES ${tableName} (id) ON DELETE CASCADE
            )
        `;
        await this.run(db, schema);
        db.close();
        return productTableName;
    }

    /**
     * Зберігає або оновлює деталі товару в таблиці "${tableName}_goods".
     * @static
     * @method insertProductDetails
     * @param {Object} dbSettings - Налаштування бази даних.
     * @param {string} tableName - Назва активної таблиці пошуку.
     * @param {Object} product - Об'єкт зі скрапленими даними товару.
     */
    static async insertProductDetails(dbSettings, tableName, product) {
        const db = await this.connect(dbSettings);
        const productTableName = `${tableName}_goods`;

        try {
            const stmt = db.prepare(`INSERT OR REPLACE INTO "${productTableName}" (
                card_id, itemId, title, price, approxPrice, condition, availability,
                shipping, returnsPolicy, sellerName, sellerScore, sellerPositivePercent,
                breadcrumbs, itemSpecifics, images, galleryLinks,
                descriptionText, descriptionHtml, descriptionStructured,
                htmlFilePath, mediaFolderPath, url, scrapedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            await new Promise((resolve, reject) => {
                stmt.run([
                    product.card_id,
                    product.itemId || '',
                    product.title || '',
                    product.price || '',
                    product.approxPrice || '',
                    product.condition || '',
                    product.availability || '',
                    product.shipping || '',
                    product.returnsPolicy || '',
                    product.seller?.name || product.sellerName || '',
                    product.seller?.score || product.sellerScore || '',
                    product.seller?.positivePercent || product.sellerPositivePercent || '',
                    typeof product.breadcrumbs === 'string' ? product.breadcrumbs : JSON.stringify(product.breadcrumbs || []),
                    typeof product.itemSpecifics === 'string' ? product.itemSpecifics : JSON.stringify(product.itemSpecifics || {}),
                    typeof product.images === 'string' ? product.images : JSON.stringify(product.images || []),
                    typeof product.galleryLinks === 'string' ? product.galleryLinks : JSON.stringify(product.galleryLinks || []),
                    product.descriptionText || '',
                    product.descriptionHtml || '',
                    typeof product.descriptionStructured === 'string' ? product.descriptionStructured : JSON.stringify(product.descriptionStructured || {}),
                    product.htmlFilePath || null,
                    product.mediaFolderPath || null,
                    product.url || '',
                    product.scrapedAt || new Date().toISOString(),
                ], function (err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
            stmt.finalize();
        } finally {
            db.close();
        }
    }

    /**
     * Отримує список збережених товарів для заданої таблиці.
     * Шукає "${tableName}_goods" (або стару назву "${tableName}_товари" для сумісності).
     * @static
     * @method getProductDetailsList
     * @param {Object} dbSettings - Налаштування бази даних.
     * @param {string} tableName - Назва активної таблиці пошуку.
     * @returns {Promise<Object[]>}
     */
    static async getProductDetailsList(dbSettings, tableName) {
        const db = await this.connect(dbSettings);
        try {
            let targetTable = `${tableName}_goods`;
            let tableExists = await this.get(
                db,
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                [targetTable],
            );
            if (!tableExists) {
                targetTable = `${tableName}_товари`;
                tableExists = await this.get(
                    db,
                    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                    [targetTable],
                );
            }
            if (!tableExists) return [];

            const rows = await this.all(db, `SELECT * FROM "${targetTable}"`);
            return rows.map((row) => ({
                ...row,
                breadcrumbs: row.breadcrumbs ? JSON.parse(row.breadcrumbs) : [],
                itemSpecifics: row.itemSpecifics ? JSON.parse(row.itemSpecifics) : {},
                images: row.images ? JSON.parse(row.images) : [],
                galleryLinks: row.galleryLinks ? JSON.parse(row.galleryLinks) : [],
                descriptionStructured: row.descriptionStructured ? JSON.parse(row.descriptionStructured) : {},
            }));
        } finally {
            db.close();
        }
    }

    /**
     * Отримує список усіх збережених таблиць скрапінгу разом із кількістю рядків у них.
     * Ігнорує дочірні таблиці товарів (_goods та _товари).
     * @static
     * @method getAllTablesWithCounts
     * @param {Object} dbSettings - Налаштування бази даних.
     * @returns {Promise<Object[]>} Масив об'єктів { name, count }.
     */
    static async getAllTablesWithCounts(dbSettings) {
        const db = await this.connect(dbSettings);
        try {
            const tables = await this.all(
                db,
                "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'tbl_%' AND name NOT LIKE '%_goods' AND name NOT LIKE '%_товари' ORDER BY name DESC",
            );
            const result = [];
            for (const table of tables) {
                const countRow = await this.get(
                    db,
                    `SELECT COUNT(*) as count FROM ${table.name}`,
                );
                result.push({ name: table.name, count: countRow.count });
            }
            return result;
        } finally {
            db.close();
        }
    }

    /**
     * Scans structural system catalogs to return the most recently provisioned search dataset table.
     * Used for restoring historical sessions upon initial frontend dashboard boots.
     * Ігнорує дочірні таблиці товарів (_goods та _товари).
     * * @static
     * @method getLatestTable
     * @param {Object} dbSettings - System context connection setup configurations.
     * @returns {Promise<string|null>} The table identifier name string, or null if no collections exist.
     */
    static async getLatestTable(dbSettings) {
        const db = await this.connect(dbSettings);
        try {
            const result = await this.get(
                db,
                "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'tbl_%' AND name NOT LIKE '%_goods' AND name NOT LIKE '%_товари' ORDER BY name DESC LIMIT 1",
            );
            return result ? result.name : null;
        } finally {
            db.close();
        }
    }

    /**
     * Persists batch payloads of customized extraction card entities into targeted tables.
     * Implements transactional compilation parameters utilizing statement optimization loops.
     * * @static
     * @method insertCards
     * @param {Object} dbSettings - Environment relational driver tracking parameters.
     * @param {string} tableName - Destination storage table identifier token.
     * @param {Object[]} cards - Array collections detailing active structural models.
     * @returns {Promise<void>} Resolves immediately upon transaction batch closing sequence execution.
     */
    static async insertCards(dbSettings, tableName, cards) {
        if (!cards || cards.length === 0) return;
        const db = await this.connect(dbSettings);

        const stmt = db.prepare(`INSERT OR REPLACE INTO ${tableName} 
            (id, url, img, cardChecked, uniqueness, currentDepth, maxDepth, showCleanText, saveCardLink, saveImgLink, lines) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        for (const card of cards) {
            stmt.run([
                card.id,
                card.url,
                card.img,
                card.cardChecked ? 1 : 0,
                card.uniqueness ? 1 : 0,
                card.currentDepth,
                card.maxDepth,
                card.showCleanText ? 1 : 0,
                card.saveCardLink ? 1 : 0,
                card.saveImgLink ? 1 : 0,
                JSON.stringify(card.lines),
            ]);
        }
        stmt.finalize();
        db.close();
    }

    /**
     * Queries database targets for storage row records using SQL pagination parameters.
     * Deserializes internal JSON schema payloads to output standard data shapes.
     * * @static
     * @method getCards
     * @param {Object} dbSettings - Storage context setup instructions.
     * @param {string} tableName - Data source target table name string.
     * @param {number} limit - Numerical bounding constraint indicating maximum requested page sizes.
     * @param {number} offset - Total skipping row index count offset.
     * @returns {Promise<Object>} Object payload carrying cast record arrays and comprehensive matching data rows counters.
     */
    static async getCards(dbSettings, tableName, limit, offset) {
        const db = await this.connect(dbSettings);
        try {
            const rows = await this.all(
                db,
                `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
                [limit, offset],
            );
            const totalRow = await this.get(
                db,
                `SELECT COUNT(*) as count FROM ${tableName}`,
            );

            const processedRows = rows.map((row) => ({
                ...row,
                cardChecked: !!row.cardChecked,
                uniqueness: !!row.uniqueness,
                showCleanText: !!row.showCleanText,
                saveCardLink: !!row.saveCardLink,
                saveImgLink: !!row.saveImgLink,
                lines: JSON.parse(row.lines),
            }));

            return { cards: processedRows, total: totalRow.count };
        } finally {
            db.close();
        }
    }

    /**
     * Extracts entirely unfiltered batch datasets from tables matching affirmative confirmation criteria keys.
     * Leveraged for feeding direct background compiler workflows (e.g. CSV, XML, PDF exporters).
     * * @static
     * @method getAllActiveCards
     * @param {Object} dbSettings - Relational driver configurations.
     * @param {string} tableName - Targeted search tracking table name string.
     * @returns {Promise<Object[]>} Fully hydrated dataset array tracking confirmed cards.
     */
    static async getAllActiveCards(dbSettings, tableName) {
        const db = await this.connect(dbSettings);
        try {
            const rows = await this.all(
                db,
                `SELECT * FROM ${tableName} WHERE cardChecked = 1`,
            );
            return rows.map((row) => ({
                ...row,
                cardChecked: !!row.cardChecked,
                uniqueness: !!row.uniqueness,
                showCleanText: !!row.showCleanText,
                saveCardLink: !!row.saveCardLink,
                saveImgLink: !!row.saveImgLink,
                lines: JSON.parse(row.lines),
            }));
        } finally {
            db.close();
        }
    }

    /**
     * Executes targeted mutation query updates tracking user dashboard item changes.
     * Encapsulates state structures back into storage fields within relational databases.
     * * @static
     * @method updateCard
     * @param {Object} dbSettings - Storage platform connection preferences.
     * @param {string} tableName - System storage target data table identity string.
     * @param {string} cardId - Unique identification primary key matching target record item updates.
     * @param {Object} updates - Attribute mutation parameters specifying upcoming values.
     * @returns {Promise<void>} Resolves immediately upon completing storage mutation sequences.
     */
    static async updateCard(dbSettings, tableName, cardId, updates) {
        const db = await this.connect(dbSettings);
        try {
            await this.run(
                db,
                `UPDATE ${tableName} SET 
                cardChecked = ?, uniqueness = ?, currentDepth = ?, 
                showCleanText = ?, saveCardLink = ?, saveImgLink = ?, lines = ?
                WHERE id = ?`,
                [
                    updates.cardChecked ? 1 : 0,
                    updates.uniqueness ? 1 : 0,
                    updates.currentDepth,
                    updates.showCleanText ? 1 : 0,
                    updates.saveCardLink ? 1 : 0,
                    updates.saveImgLink ? 1 : 0,
                    JSON.stringify(updates.lines),
                    cardId,
                ],
            );
        } finally {
            db.close();
        }
    }
}
