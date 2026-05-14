// start.js (в корені проекту)
import { createServer } from 'net';
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Функція пошуку вільного порту
const getFreePort = (startPort) =>
    new Promise((resolve) => {
        const server = createServer();
        server.listen(startPort, () => {
            server.once('close', () => resolve(startPort));
            server.close();
        });
        server.on('error', () => resolve(getFreePort(startPort + 1)));
    });

async function startServers() {
    console.log('🔍 Шукаємо вільні порти...');

    // Шукаємо порти починаючи з дефолтних
    const backendPort = await getFreePort(5001);
    const frontendPort = await getFreePort(5173);

    console.log(
        `✅ Знайдено порти: Backend -> ${backendPort}, Frontend -> ${frontendPort}`,
    );

    // 1. Записуємо порти у конфіги (.env)
    const backendEnvPath = path.join(__dirname, 'backend', '.env');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');

    writeFileSync(backendEnvPath, `PORT=${backendPort}\n`);
    // Vite вимагає префікс VITE_ для публічних змінних
    writeFileSync(
        frontendEnvPath,
        `VITE_BACKEND_URL=http://localhost:${backendPort}\n`,
    );

    console.log('📝 Файли .env оновлено!');

    // 2. Запускаємо Backend (передаємо команду рядком)
    console.log('🚀 Запуск Backend...');
    // Замість stdio: 'inherit' робимо так:
    const backendProcess = spawn('npm run dev', {
        cwd: path.join(__dirname, 'backend'),
        shell: true,
    });

    backendProcess.stdout.on('data', (data) =>
        process.stdout.write(`\x1b[36m[BACKEND]\x1b[0m ${data}`),
    );
    backendProcess.stderr.on('data', (data) =>
        process.stderr.write(`\x1b[31m[BACKEND ERROR]\x1b[0m ${data}`),
    );

    const frontendProcess = spawn(`npm run dev -- --port ${frontendPort}`, {
        cwd: path.join(__dirname, 'frontend'),
        shell: true,
    });

    frontendProcess.stdout.on('data', (data) =>
        process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data}`),
    );
    frontendProcess.stderr.on('data', (data) =>
        process.stderr.write(`\x1b[31m[FRONTEND ERROR]\x1b[0m ${data}`),
    );

    // Обробка закриття терміналу (вбиваємо обидва процеси)
    process.on('SIGINT', () => {
        console.log('\n🛑 Зупинка серверів...');
        backendProcess.kill();
        frontendProcess.kill();
        process.exit();
    });
}

startServers();
