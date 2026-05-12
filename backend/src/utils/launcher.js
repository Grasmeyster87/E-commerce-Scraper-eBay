import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function launchBrowser() {
    // Виходимо з папки utils на рівень проекту
    const projectRoot = path.join(__dirname, '../../');
    const profilePath = path.join(projectRoot, 'browser_profile');

    if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
    }

    const chromePath = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`;
    const command = `${chromePath} --remote-debugging-port=9222 --user-data-dir="${profilePath}" --no-first-run --no-default-browser-check`;

    console.log(`🔧 Ініціалізація браузера з профілем: ${profilePath}`);
    
    exec(command);

    // Даємо браузеру 2 секунди, щоб відкрити порт перед підключенням
    return new Promise(resolve => setTimeout(resolve, 2000));
}