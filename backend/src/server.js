import express from 'express';
import cors from 'cors';
import { runEbayScraper } from './scraperService.js';

const app = express();
const PORT = process.env.PORT || 5001; 

app.use(cors());
app.use(express.json());

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

// Додаємо обробку помилок запуску
const server = app.listen(PORT, () => {
    console.log(`🟢 Сервер запущено: http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Порт ${PORT} зайнятий. Спробуй вбити процес або змінити PORT на 5002`);
        process.exit(1);
    } else {
        console.error('❌ Помилка сервера:', err);
    }
});