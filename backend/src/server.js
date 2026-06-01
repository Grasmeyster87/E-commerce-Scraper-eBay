import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runEbayScraper } from './scraperService.js';
import { FileHandler } from './utils/fileHandler.js';
import { DBService } from './utils/dbService.js';
import { CardService } from './utils/cardProcessor.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. MAIN SCRAPING AND DB SAVING PROCESS
app.post('/api/scrape', async (req, res) => {
    const { query, saveDebugHtml, action, itemsPerPage, activeTable, dbSettings } = req.body;
    try {
        console.log(`🚀 Backend received -> Action: [${action.toUpperCase()}] | Table: ${activeTable || 'None'}`);
        
        // 1. Collect raw data from the website
        const result = await runEbayScraper(query, saveDebugHtml, action, itemsPerPage);
        
        // 2. Process the cards
        const processedCards = CardService.processRawData(result.data);
        
        // 3. Determine the table name
        let tableName = activeTable;

        // If this is the first search step OR the table name is missing for some reason — create it ONCE
        if (action === 'search' || !tableName) {
            tableName = await DBService.createTableForQuery(dbSettings, query);
            console.log(`🗄️ CREATED ONE TABLE FOR THE ENTIRE QUERY: ${tableName}`);
        } else {
            console.log(`♻️ APPENDING page data to the existing table: ${tableName}`);
        }

        // 4. Save cards to SQLite (they are appended to the same table)
        if (processedCards.length > 0) {
            await DBService.insertCards(dbSettings, tableName, processedCards);
        }
        
        // Return the name back so the frontend can lock it in its loop
        res.json({ 
            success: true, 
            tableName: tableName, 
            data: processedCards, 
            pagination: result.pagination 
        });
    } catch (error) {
        console.error('❌ Backend error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. FETCH DATA (PAGINATION)
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

// 3. FETCH LATEST TABLE (ON STARTUP)
app.post('/api/tables/latest', async (req, res) => {
    const { dbSettings } = req.body;
    try {
        const tableName = await DBService.getLatestTable(dbSettings);
        res.json({ tableName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. UPDATE CARD (CHECKBOXES)
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

// 5. DATA EXPORT (Sourced from DB, not Frontend)
app.post('/api/save', async (req, res) => {
    const { format, directory, dbSettings, tableName } = req.body;
    try {
        // Fetch all active cards from the DB
        const allActiveCards = await DBService.getAllActiveCards(
            dbSettings,
            tableName,
        );

        // Generate the table on the backend
        const tableData = CardService.extractTableData(allActiveCards);

        if (tableData.length === 0)
            throw new Error('No active cards available for export');

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
        else throw new Error('Unknown format');

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 Server started: http://localhost:${PORT}`);
});