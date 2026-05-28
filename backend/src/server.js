import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runEbayScraper } from './scraperService.js';
import { FileHandler } from './utils/fileHandler.js';
import { DBService } from './utils/dbService.js';

// Вам також потрібно імпортувати CardService на бекенд,
// щоб обробляти дані ПЕРЕД збереженням у базу
import { CardService } from './utils/cardProcessor.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. ГОЛОВНИЙ ПРОЦЕС СКРАПІНГУ ТА ЗБЕРЕЖЕННЯ В БД
app.post('/api/scrape', async (req, res) => {
    const { query, saveDebugHtml, action, itemsPerPage, activeTable, dbSettings } = req.body;
    try {
        console.log(`🚀 Бекенд отримав -> Дія: [${action.toUpperCase()}] | Таблиця: ${activeTable || 'Немає'}`);
        
        // 1. Збираємо чисті дані з сайту
        const result = await runEbayScraper(query, saveDebugHtml, action, itemsPerPage);
        
        // 2. Обробляємо картки
        const processedCards = CardService.processRawData(result.data);
        
        // 3. Визначаємо назву таблиці
        let tableName = activeTable;

        // Якщо це перший крок пошуку АБО назва таблиці з якихось причин не прийшла — створюємо її ОДИН раз
        if (action === 'search' || !tableName) {
            tableName = await DBService.createTableForQuery(dbSettings, query);
            console.log(`🗄️ СТВОРЕНО ОДНУ ТАБЛИЦЮ НА ВЕСЬ ЗАПИТ: ${tableName}`);
        } else {
            console.log(`♻️ ДОПИСУЄМО дані сторінки в існуючу таблицю: ${tableName}`);
        }

        // 4. Записуємо картки в SQLite (вони додаються в ту саму таблицю)
        if (processedCards.length > 0) {
            await DBService.insertCards(dbSettings, tableName, processedCards);
        }
        
        // Повертаємо назву назад, щоб фронтенд її зафіксував у себе в циклі
        res.json({ 
            success: true, 
            tableName: tableName, 
            data: processedCards, 
            pagination: result.pagination 
        });
    } catch (error) {
        console.error('❌ Помилка на бекенді:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. ОТРИМАННЯ ДАНИХ (ПАГІНАЦІЯ)
app.post('/api/cards/list', async (req, res) => {
    const { dbSettings, tableName, page = 1, limit = 60 } = req.body;
    if (!tableName) return res.json({ cards: [], total: 0 });

    try {
        const offset = (page - 1) * limit;
        const data = await DBService.getCards(
            dbSettings,
            tableName,
            limit,
            offset,
        );
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. ОТРИМАННЯ ОСТАННЬОЇ ТАБЛИЦІ (ПРИ СТАРТІ)
app.post('/api/tables/latest', async (req, res) => {
    const { dbSettings } = req.body;
    try {
        const tableName = await DBService.getLatestTable(dbSettings);
        res.json({ tableName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. ОНОВЛЕННЯ КАРТКИ (ЧЕКБОКСИ)
app.put('/api/cards/:id', async (req, res) => {
    const { id } = req.params;
    const { dbSettings, tableName, updates } = req.body;
    try {
        await DBService.updateCard(dbSettings, tableName, id, updates);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. ЕКСПОРТ ДАНИХ (Беремо з БД, а не з Фронтенду)
app.post('/api/save', async (req, res) => {
    const { format, directory, dbSettings, tableName } = req.body;
    try {
        // Забираємо всі активні картки з БД
        const allActiveCards = await DBService.getAllActiveCards(
            dbSettings,
            tableName,
        );

        // Формуємо таблицю на бекенді
        const tableData = CardService.extractTableData(allActiveCards);

        if (tableData.length === 0)
            throw new Error('Немає активних карток для експорту');

        const targetDir =
            !directory || directory.trim() === 'backend/data'
                ? null
                : directory.trim();
        let result;

        if (format === 'csv')
            result = FileHandler.saveToCSV(tableData, targetDir);
        else if (format === 'json')
            result = FileHandler.saveToJSON(tableData, targetDir);
        else if (format === 'sqlite')
            result = await FileHandler.saveToSQLite(tableData, targetDir);
        else if (format === 'xml')
            result = FileHandler.saveToXML(tableData, targetDir);
        else if (format === 'pdf')
            result = await FileHandler.saveToPDF(tableData, targetDir);
        else throw new Error('Невідомий формат');

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 Сервер запущено: http://localhost:${PORT}`);
});
