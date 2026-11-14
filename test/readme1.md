Listed directory backend
Viewed package.json:1-25
Viewed scraperService.js:1-172
Listed directory src
Viewed launch_chrome.bat:1-7
Listed directory test
Listed directory services
Viewed browser.js
Viewed scraper.js:1-100
Viewed parser.js:1-100
Viewed parser.js:101-197
Listed directory config
Viewed selectors.js:1-33
Viewed fileHandler.js:1-308
Created package.json
Created launch_chrome.bat
Created scraper.js
Created parser.js
Created index.js
Created .gitignore
Created README.md
Listed directory test
Ran command: `node --check scraper.js && node --check parser.js && node --check index.js`

У папці [`backend/test`](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test) створено повністю автономний міні-додаток для скрапінгу конкретної сторінки товару eBay та відладки алгоритмів парсингу тегів.

Додаток **повністю відв'язаний від основного проекту** (має власний маніфест, скрипти та відносні шляхи), тому згодом ви зможете просто скопіювати або перенести папку `test` у будь-яке інше місце на диску.

---

### 📂 Створені файли та їх призначення:

1. [**`launch_chrome.bat`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/launch_chrome.bat)  
   Скрипт запуску Google Chrome з тими самими налаштуваннями, що й в основному проекті (`--remote-debugging-port=9222`, `--start-maximized`, `--disable-gpu`), але з ізольованим профілем безпосередньо в цій папці:  
   `--user-data-dir="%~dp0browser_profile"`.

2. [**`scraper.js`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/scraper.js)  
   Клас `ProductScraper`:
   - Автоматично перевіряє активність порту `9222`. Якщо Chrome не запущено — запускає його через `launch_chrome.bat` та очікує підключення.
   - Підключається через `puppeteer-extra` зі `stealth`-плагіном.
   - Переходить на цільову сторінку товару, робить плавний скрол для підвантаження лінивих блоків.
   - Зберігає знімок чистого HTML у папку `debug/latest_product.html` для вашого аналізу тегів.
   - Після завершення робить `disconnect()`, залишаючи вікно браузера відкритим для вашої ручної інспекції (DevTools).

3. [**`parser.js`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/parser.js)  
   Клас `ProductParser`:
   - **`parseProduct(page)`**: витягує повний набір даних сторінки товару:
     - 🏷️ Назву товару (`h1.x-item-title__mainTitle`)
     - 💰 Ціну та конвертовану ціну (`.x-price-primary`, `.x-bin-price`)
     - ✨ Стан товару (`.x-item-condition-text`)
     - 📊 Наявність та кількість (`.d-quantity__availability`)
     - 🚚 Доставку та терміни (`.ux-labels-values--shipping`)
     - 🔄 Політику повернення (`.ux-labels-values--returns`)
     - 👤 Продавця (ім'я, рейтинг, відсоток позитивних відгуків)
     - 📋 Характеристики товару (`itemSpecifics`) — парсить сітку характеристик у ключ-значення
     - 🖼️ Усі зображення у високій якості (з автоматичним масштабуванням до `s-l1600`)
     - 📁 Хлібні крихти (breadcrumbs) та ID товару
   - **`inspectTagHierarchy(page, selector, maxDepth)`**: розкладає вибраний блок на дерево тегів, класів, глибини та текстових листів (для розробки власних алгоритмів структурного парсингу).
   - **`findTagsByText(page, keyword)`**: допоміжний інструмент пошуку, який показує, у яких саме тегах на сторінці знаходиться вказаний текст.

4. [**`index.js`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/index.js)  
   Точка входу для тестування:
   - Приймає URL товару з командного рядка або використовує тестовий лінк.
   - Запускає процес скрапінгу та парсингу.
   - Виводить красиво відформатований результат у консоль (з таблицями `console.table` для характеристик та деревом тегів).

5. [**`package.json`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/package.json), [**`.gitignore`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/.gitignore) та [**`README.md`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/e-commerce-scraper-ebay/backend/test/README.md)  
   Забезпечують повну автономність проекту при його винесенні в окремий каталог.

---

### 💻 Як запускати зараз:

Перейдіть у папку `backend/test` у терміналі:

```bash
cd backend/test
```

**1. Запуск за замовчуванням (тестовий товар):**
```bash
node index.js
```

**2. Запуск для конкретного товару (передайте URL або номер товару):**
```bash
node index.js https://www.ebay.com/itm/386927473722
```

*(Якщо Chrome ще не запущено на порті 9222, скрипт самостійно відкриє його з профілем у `backend/test/browser_profile`)*.

---

### 🚚 Як пізніше винести папку в інше місце:
1. Скопіюйте папку `test` у будь-яке інше місце.
2. У новій папці виконайте:
   ```bash
   npm install
   ```
3. Запускайте `node index.js` — додаток продовжить працювати незалежно.

Listed directory test
Viewed index.js:1-30
Listed directory test
Listed directory test
Viewed index.js:1-25
Edited index.js
Ran command: `node --check index.js`

Ця помилка виникла через особливість оболонки **PowerShell**, а не через код додатка.

### 🔍 Чому це сталося:
У вашому посиланні є символи амперсанда (`&`):
`...VVKNYFTWYHKYMM&hash=...&itmprp=...`

У **PowerShell** символ `&` є спеціальним оператором (запуску у фоновому режимі або виклику команди). Тому PowerShell розділив ваш довгий рядок на кілька окремих команд і спробував виконати параметри `hash=...` та `itmprp=...` як виконувані програми Windows, що й призвело до помилки:
> *Термин "itmprp=..." не распознается как имя...*

---

###  Як правильно запускати:

#### Варіант 1. Передати тільки ID товару (найзручніше):
Я оновив [**`index.js`**](file:///d:/xampp/htdocs/GitLab_Scraping_Portfolio/test/index.js), тепер він вміє самостійно перетворювати ID на повноцінне посилання:
```powershell
node index.js 206652221638
```

#### Варіант 2. Взяти повне посилання в подвійні лапки `""`:
Якщо передаєте посилання з параметрами (`?` та `&`), завжди огортайте його в лапки:
```powershell
node index.js "https://www.ebay.com/itm/206652221638?itmmeta=01M5SJ0S8F78VVKNYFTWYHKYMM&hash=item301d6ea8c6"
```

#### Варіант 3. Використовувати чисте посилання без трекінг-хвостів:
```powershell
node index.js https://www.ebay.com/itm/206652221638
```

---

>  **Порада для очищення консолі:**  
> Оскільки PowerShell випадково створив фонові задачі (`Job1`, `Job3`), ви можете очистити їх однією командою:
> ```powershell
> Get-Job | Remove-Job -Force
> ```