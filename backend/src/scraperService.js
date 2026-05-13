import puppeteer from 'puppeteer';

export async function runEbayScraper(searchQuery) {
  const browser = await puppeteer.launch({
    headless: false, // Для дебагу залишаємо false
    userDataDir: './browser_profile', // Твій налаштований профіль
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  try {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}`;
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Твоя логіка збору даних (приклад):
    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.s-item__info'));
      return items.slice(1, 6).map(item => ({
        title: item.querySelector('.s-item__title')?.innerText,
        price: item.querySelector('.s-item__price')?.innerText,
      }));
    });

    await browser.close();
    return results;
  } catch (error) {
    await browser.close();
    throw error;
  }
}