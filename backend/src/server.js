import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { runEbayScraper } from './scraperService.js';
import { FileHandler } from './utils/fileHandler.js'; // Виправлено імпорт

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/scrape', async (req, res) => {
    const { query } = req.body;
    try {
        console.log(`🚀 Запит на скрапінг: ${query}`);
        const data = await runEbayScraper(query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/save', async (req, res) => {
    const { format, data, directory } = req.body;
    try {
        // Якщо передано дефолтний 'backend/data' або порожній рядок, передаємо null, щоб відпрацював __dirname
        const targetDir =
            !directory || directory.trim() === 'backend/data'
                ? null
                : directory.trim();

        console.log(
            `💾 Збереження у форматі [${format.toUpperCase()}] в папку: ${targetDir || 'дефолтну (backend/data)'}`,
        );
        let result;

        if (format === 'csv') {
            result = FileHandler.saveToCSV(data, targetDir);
        } else if (format === 'json') {
            result = FileHandler.saveToJSON(data, targetDir);
        } else if (format === 'sqlite') {
            result = await FileHandler.saveToSQLite(data, targetDir);
        } else {
            throw new Error('Невідомий формат збереження');
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Помилка збереження:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const server = app
    .listen(PORT, () => {
        console.log(`🟢 Сервер запущено: http://localhost:${PORT}`);
    })
    .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(
                `❌ Порт ${PORT} зайнятий. Спробуй вбити процес або змінити PORT`,
            );
            process.exit(1);
        } else {
            console.error('❌ Помилка сервера:', err);
        }
    });
