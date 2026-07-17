import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runEbayScraper } from './scraperService.js';
import { FileHandler } from './utils/fileHandler.js';
import { DBService } from './utils/dbService.js';
import { CardService } from './utils/cardProcessor.js';
import { SettingsDBService } from './utils/settingsDbService.js';
import { LinkChecker } from './utils/linkChecker.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MAIN SCRAPING AND DB SAVING PROCESS
app.post('/api/scrape', async (req, res) => {
    const {
        query,
        searchMode,
        saveDebugHtml,
        action,
        itemsPerPage,
        activeTable,
        dbSettings,
        pageDelays,
        currentPage,
    } = req.body;
    try {
        console.log(
            `🚀 Backend received -> Action: [${action.toUpperCase()}] | Table: ${activeTable || 'None'}`,
        );

        // Collect raw data from the website
        const result = await runEbayScraper(
            query,
            searchMode,
            saveDebugHtml,
            action,
            itemsPerPage,
            pageDelays,
            currentPage,
        );

        // Process the cards
        const processedCards = CardService.processRawData(result.data);

        // Determine the table name
        let tableName = activeTable;

        // If this is the first search step OR the table name is missing for some reason — create it ONCE
        if (action === 'search' || !tableName) {
            tableName = await DBService.createTableForQuery(dbSettings, query, searchMode);
            console.log(
                `🗄️ CREATED ONE TABLE FOR THE ENTIRE QUERY: ${tableName}`,
            );
        } else {
            console.log(
                `♻️ APPENDING page data to the existing table: ${tableName}`,
            );
        }

        // Save cards to SQLite (they are appended to the same table)
        if (processedCards.length > 0) {
            await DBService.insertCards(dbSettings, tableName, processedCards);
        }

        // Return the name back so the frontend can lock it in its loop
        res.json({
            success: true,
            tableName: tableName,
            data: processedCards,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error('❌ Backend error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// FETCH DATA (PAGINATION)
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

// FETCH LATEST TABLE (ON STARTUP)
app.post('/api/tables/latest', async (req, res) => {
    const { dbSettings } = req.body;
    try {
        const tableName = await DBService.getLatestTable(dbSettings);
        res.json({ tableName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FETCH ALL TABLES WITH ROW COUNTS
app.post('/api/tables/list', async (req, res) => {
    const { dbSettings } = req.body;
    try {
        const tables = await DBService.getAllTablesWithCounts(dbSettings);
        res.json({ tables });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE CARD (CHECKBOXES)
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

// DATA EXPORT (Sourced from DB, not Frontend)
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

// Initialization of the service database at server startup
SettingsDBService.initDB()
    .then(() => console.log('⚙️ Service DB (servise_db.sqlite) initialized'))
    .catch((err) => console.error('❌ Failed to initialize Service DB:', err));

// NEW ROUTES FOR SETTINGS (DELAYS)

// Saving a profile
app.post('/api/settings/delays', async (req, res) => {
    const { profileName, pageDelays } = req.body;

    if (!profileName || !Array.isArray(pageDelays)) {
        return res
            .status(400)
            .json({ success: false, error: 'Invalid payload data' });
    }

    try {
        await SettingsDBService.saveProfile(profileName, pageDelays);
        console.log(`💾 Delay profile saved: [${profileName}]`);
        res.json({ success: true, message: 'Profile saved successfully' });
    } catch (error) {
        console.error('❌ Error saving delay profile:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Getting a list of profiles
app.get('/api/settings/delays', async (req, res) => {
    try {
        const profiles = await SettingsDBService.getProfiles();
        res.json({ success: true, profiles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 Server started: http://localhost:${PORT}`);
});

// Endpoint for deleting an active table from a database
app.delete('/api/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;
    // Getting the DB settings from the request body
    const { dbSettings } = req.body;

    if (!tableName || !tableName.startsWith('tbl_')) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    try {
        // We use the correct methods of your DBService
        const db = await DBService.connect(dbSettings);
        await DBService.run(db, `DROP TABLE IF EXISTS ${tableName}`);
        db.close();

        console.log(`🗑️ Table dropped from database: ${tableName}`);
        res.json({ success: true, message: `Table ${tableName} successfully deleted.` });
    } catch (error) {
        console.error(`Error deleting table ${tableName}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// LINK CHECKING - START JOB
app.post('/api/check-links/start', async (req, res) => {
    const { tableName, dbSettings } = req.body;
    if (!tableName) return res.status(400).json({ error: 'Table name is required' });

    const jobId = Date.now().toString();
    LinkChecker.jobs[jobId] = { status: 'starting', res: null, isPaused: false, isCancelled: false };

    // Fire the async task in the background
    LinkChecker.runJob(jobId, tableName, dbSettings).catch(console.error);

    res.json({ success: true, jobId });
});

// LINK CHECKING - JOB ACTION (PAUSE/RESUME/CANCEL)
app.post('/api/check-links/action', (req, res) => {
    const { jobId, action } = req.body;
    const job = LinkChecker.jobs[jobId];
    
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    if (action === 'pause') {
        job.isPaused = true;
    } else if (action === 'resume') {
        job.isPaused = false;
    } else if (action === 'cancel') {
        job.isCancelled = true;
    }
    
    res.json({ success: true, isPaused: job.isPaused, isCancelled: job.isCancelled });
});

// LINK CHECKING - SSE STREAM
app.get('/api/check-links/stream/:jobId', (req, res) => {
    const { jobId } = req.params;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const job = LinkChecker.jobs[jobId];
    
    if (!job) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found or expired' })}\n\n`);
        return res.end();
    }

    job.res = res;

    // Handle client disconnect
    req.on('close', () => {
        job.res = null;
        // Optionally, if you want to cancel the job when client disconnects, 
        // you could set job.status = 'cancelled' and check it in the loop.
    });
});

// GET: Retrieve active visualization layout strategy profile
app.get('/api/settings/visualizer-mode', async (req, res) => {
    try {
        const mode = await SettingsDBService.getVisualizerMode();
        res.json({ mode });
    } catch (error) {
        console.error('❌ Error fetching visualizer layout mode:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Persist updated visualization layout strategy state profile
app.post('/api/settings/visualizer-mode', async (req, res) => {
    const { mode } = req.body;
    try {
        if (!['structural_ierar_block', 'structural_for_standart_date'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid visualization layout mode specified' });
        }
        await SettingsDBService.setVisualizerMode(mode);
        res.json({ success: true, mode });
    } catch (error) {
        console.error('❌ Error saving visualizer layout mode:', error);
        res.status(500).json({ error: error.message });
    }
});

// DATA EXPORT (Sourced from DB, not Frontend)
app.post('/api/save', async (req, res) => {
    // Inject the visualizerLayout parameter requirement into the payload destructuring
    const { format, directory, dbSettings, tableName, visualizerLayout } = req.body;
    try {
        // Fetch all active cards from the DB
        const allActiveCards = await DBService.getAllActiveCards(
            dbSettings,
            tableName,
        );

        // Generate the table on the backend dynamically based on visualizer layout schema
        let tableData;
        if (visualizerLayout === 'structural_for_standart_date') {
            tableData = CardService.extractStandardTableData(allActiveCards);
        } else {
            tableData = CardService.extractTableData(allActiveCards);
        }

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