import express from 'express';
import cors from 'cors';
import { runEbayScraper } from './scraperService.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Endpoint для запуску скрапінгу
app.post('/api/scrape', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    console.log(`Starting scrape for: ${query}...`);
    const data = await runEbayScraper(query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});