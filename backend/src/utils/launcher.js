import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * External Chrome process initialization utility wrapper.
 * Launches a decoupled Chrome browser application instance configured with automated remote debugging protocols.
 * @returns {Promise<void>} Resolves following execution grace window tracking initialization delays
 */
export async function launchBrowser() {
    // Navigate up from utils directory to the project root
    const projectRoot = path.join(__dirname, '../../');
    const profilePath = path.join(projectRoot, 'browser_profile');

    if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
    }

    const chromePath = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`;
    const command = `${chromePath} --remote-debugging-port=9222 --user-data-dir="${profilePath}" --no-first-run --no-default-browser-check`;

    console.log(`🔧 Ініціалізація браузера з профілем: ${profilePath}`);

    exec(command);

    // Allow 2 seconds for the browser process to open port listeners before connecting
    return new Promise((resolve) => setTimeout(resolve, 2000));
}
