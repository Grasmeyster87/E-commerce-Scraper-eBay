import fs from 'fs';
import path from 'path';

export class FileHandler {
    static saveToCSV(data, filename = 'results.csv') {
        if (!data || data.length === 0) return;

        const dir = './backend/data';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        const filePath = path.join(dir, filename);

        // Отримуємо заголовки з ключів першого об'єкта
        const headers = Object.keys(data[0]).join(',');

        // Формуємо рядки, екрануючи коми в назвах товарів
        const rows = data.map((obj) =>
            Object.values(obj)
                .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                .join(','),
        );

        const csvContent = [headers, ...rows].join('\n');

        fs.writeFileSync(filePath, csvContent, 'utf8');
        console.log(`✅ Data saved to ${filePath}`);
    }
    static saveDebugInfo(html, screenshotBuffer, prefix = 'debug') {
        const dir = './backend/data/debug';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const timestamp = new Date().getTime();

        // Зберігаємо HTML
        const htmlPath = path.join(dir, `${prefix}_${timestamp}.html`);
        fs.writeFileSync(htmlPath, html, 'utf8');

        // Зберігаємо скріншот
        const screenshotPath = path.join(dir, `${prefix}_${timestamp}.png`);
        fs.writeFileSync(screenshotPath, screenshotBuffer);

        console.log(`📸 Debug data saved: ${htmlPath} and ${screenshotPath}`);
    }
}
