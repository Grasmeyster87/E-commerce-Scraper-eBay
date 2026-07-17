import puppeteer from 'puppeteer-extra';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { DBService } from './dbService.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class LinkChecker {
    static jobs = {};

    static async connectBrowser() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        // Correct path to launch_chrome.bat located in the src directory
        const scriptPath = path.join(__dirname, '../launch_chrome.bat');

        let browser = await puppeteer
            .connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null,
            })
            .catch(() => null);

        if (!browser) {
            console.log('🌐 Chrome not detected. Initializing for link checking...');
            exec(`"${scriptPath}"`, (err) => {
                if (err) console.error('❌ Failed to launch Chrome:', err.message);
            });

            for (let attempt = 1; attempt <= 10; attempt++) {
                try {
                    await delay(1000);
                    browser = await puppeteer.connect({
                        browserURL: 'http://127.0.0.1:9222',
                        defaultViewport: null,
                    });
                    break;
                } catch (connectError) {
                    if (attempt === 10) throw new Error('Chrome took too long to launch.');
                }
            }
        }
        return browser;
    }

    /**
     * Checks an array of cards by visiting each URL via Puppeteer 
     * and triggers a callback with the results.
     * 
     * @param {Array} cards - The array of card objects to check
     * @param {Object} job - The job state object tracking isPaused and isCancelled
     * @param {Function} onProgress - Async callback to receive progress and status
     */
    static async checkLinks(cards, job, onProgress) {
        let browser = null;
        let page = null;

        try {
            browser = await this.connectBrowser();
            const pages = await browser.pages();
            // Try to use the first active page, or open a new one if none exists
            page = pages.length > 0 ? pages[0] : await browser.newPage();

            for (let i = 0; i < cards.length; i++) {
                if (job.isCancelled) {
                    console.log('🛑 Link checking job was cancelled.');
                    break;
                }

                while (job.isPaused) {
                    await delay(500);
                    if (job.isCancelled) break;
                }

                if (job.isCancelled) break;

                const card = cards[i];
                if (!card.url) {
                    await onProgress(card, i, cards.length, { status: 'skipped', error: 'Invalid URL' });
                    continue;
                }

                try {
                    // Navigate to the URL
                    await page.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
                    
                    const html = await page.content();
                    
                    // Add some variability checking for eBay's ended listing notices
                    const isEnded = html.includes('This listing was ended by the seller') || 
                                    html.includes('This listing was ended');
                    
                    await onProgress(card, i, cards.length, { status: isEnded ? 'ended' : 'active' });
                } catch (err) {
                    await onProgress(card, i, cards.length, { status: 'error', error: err.message });
                }

                // Add a random delay between 1.5 and 3.5 seconds
                const randomDelay = Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500;
                await delay(randomDelay);
            }
        } finally {
            if (browser) {
                // We disconnect instead of closing so that the Chrome CDP window stays alive for future searches
                await browser.disconnect().catch(() => {});
            }
        }
    }

    /**
     * Executes the background job for checking links
     */
    static async runJob(jobId, tableName, dbSettings) {
        const job = this.jobs[jobId];
        
        const sendEvent = (data) => {
            if (job.res) {
                job.res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
        };

        try {
            const db = await DBService.connect(dbSettings);
            const cards = await DBService.all(db, `SELECT * FROM ${tableName}`);
            
            job.status = 'running';
            sendEvent({ type: 'start', total: cards.length });
            
            let deletedCount = 0;
            
            await this.checkLinks(cards, job, async (card, index, total, result) => {
                const current = index + 1;
                
                if (result.status === 'skipped') {
                    sendEvent({ type: 'progress', current, total, url: 'Invalid URL', status: 'skipped' });
                    return;
                }
                
                if (result.status === 'ended') {
                    await DBService.run(db, `DELETE FROM ${tableName} WHERE id = ?`, [card.id]);
                    deletedCount++;
                    sendEvent({ type: 'progress', current, total, url: card.url, status: 'deleted' });
                } else if (result.status === 'active') {
                    sendEvent({ type: 'progress', current, total, url: card.url, status: 'ok' });
                } else if (result.status === 'error') {
                    sendEvent({ type: 'progress', current, total, url: card.url, status: 'error', error: result.error });
                }
            });

            const countRow = await DBService.get(db, `SELECT COUNT(*) as count FROM ${tableName}`);
            let tableDropped = false;
            
            if (countRow.count === 0) {
                await DBService.run(db, `DROP TABLE IF EXISTS ${tableName}`);
                tableDropped = true;
            }
            
            db.close();
            
            let cancelled = job.isCancelled;
            
            sendEvent({ type: 'finish', deletedCount, tableDropped, cancelled });
            job.status = 'finished';
            
            // Clean up memory after a delay
            setTimeout(() => { delete this.jobs[jobId]; }, 60000);
            
        } catch (error) {
            sendEvent({ type: 'error', message: error.message });
            job.status = 'error';
        }
    }
}
