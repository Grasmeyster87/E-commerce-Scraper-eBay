import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runEbayScraper } from './scraperService.js';
import { FileHandler } from './utils/fileHandler.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/scrape', async (req, res) => {
    // Приймаємо action (search або next)
    const { query, saveDebugHtml, action, itemsPerPage } = req.body;
    try {
        console.log(`🚀 Дія: [${action.toUpperCase()}] | Запит: ${query || 'Продовження'}`);
        
        const result = await runEbayScraper(query, saveDebugHtml, action, itemsPerPage);
        
        res.json({ 
            success: true, 
            data: result.data, 
            pagination: result.pagination 
        });
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/save', async (req, res) => {
    // ... Цей метод залишається без змін, як ви його надіслали ...
    const { format, data, directory } = req.body;
    try {
        const targetDir = !directory || directory.trim() === 'backend/data' ? null : directory.trim();
        let result;
        if (format === 'csv') result = FileHandler.saveToCSV(data, targetDir);
        else if (format === 'json') result = FileHandler.saveToJSON(data, targetDir);
        else if (format === 'sqlite') result = await FileHandler.saveToSQLite(data, targetDir);
        else if (format === 'xml') result = FileHandler.saveToXML(data, targetDir);
        else if (format === 'pdf') result = await FileHandler.saveToPDF(data, targetDir);
        else throw new Error('Невідомий формат');
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 Сервер запущено: http://localhost:${PORT}`);
});