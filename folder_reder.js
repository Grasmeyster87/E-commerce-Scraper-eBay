import fs from 'fs';
import path from 'path';

/**
 * Рекурсивно выводит содержимое каталога в консоль с ограничением по глубине.
 * @param {string} directoryPath Путь к корневому каталогу.
 * @param {number} maxDepth Максимальная глубина вложенности (0 для только корневого каталога, 1 для корневого и его непосредственных подпапок, и т.д.).
 * @param {number} currentDepth Текущая глубина вложенности (для рекурсивных вызовов, не указывайте при первом вызове).
 * @param {string} prefix Префикс для отступов в консоли (для рекурсивных вызовов, не указывайте при первом вызове).
 */
let directoryPath = './';
let maxDepth = 1;
let currentDepth = 0;

function listDirectoryContents(directoryPath, maxDepth, currentDepth = 0, prefix = '') {
    // Проверяем, не превышена ли максимальная глубина
    if (currentDepth > maxDepth) {
        return;
    }

    try {
        const items = fs.readdirSync(directoryPath, { withFileTypes: true });

        items.forEach(item => {
            if (item.isDirectory() && ['node_modules', '.git'].includes(item.name)) { 
                return; //  Исключение папок из поиска
            }
            /*
            Включить только определенные папки: Аналогично, вы можете использовать if (item.isDirectory() && !['src', 'public'].includes(item.name)) { continue; }, чтобы сканировать только указанные папки.
            */
            const fullPath = path.join(directoryPath, item.name);

            if (item.isDirectory()) {
                console.log(`${prefix}📁 ${item.name}/`);
                // Рекурсивный вызов для подпапки, увеличиваем глубину
                listDirectoryContents(fullPath, maxDepth, currentDepth + 1, prefix + '  ');
            } else {
                console.log(`${prefix}📄 ${item.name}`);
            }
        });
    } catch (error) {
        // Обработка ошибок, например, если нет прав доступа или путь неверен
        console.error(`Ошибка при доступе к ${directoryPath}: ${error.message}`);
    }
}

// --- Использование скрипта ---

// 1. Укажите путь к корневому каталогу, который вы хотите просканировать
const rootDirectory = './'; // <-- ИЗМЕНИТЕ ЭТОТ ПУТЬ НА ВАШ!

// 2. Укажите максимальную глубину сканирования
// 0: Только файлы/папки в корневом каталоге.
// 1: Корневой каталог и его непосредственные подпапки.
// 2: Корневой, его подпапки и подпапки внутри этих подпапок.
// И т.д.
const scanDepth = 2; // <-- ИЗМЕНИТЕ ЭТУ ГЛУБИНУ ПО НЕОБХОДИМОСТИ

console.log(`Сканирование каталога: ${rootDirectory} (Глубина: ${scanDepth})\n`);
listDirectoryContents(rootDirectory, scanDepth);