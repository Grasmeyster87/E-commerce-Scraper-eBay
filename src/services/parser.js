import { selectors } from '../config/selectors.js';

export class Parser {
    static async parseProduct(element) {
        return await element.evaluate((el, sel) => {
            const titleEl = el.querySelector(sel.title);
            const priceEl = el.querySelector(sel.price);
            const linkEl = el.querySelector(sel.link);

            return {
                title: titleEl ? titleEl.innerText.trim() : null,
                price: priceEl ? priceEl.innerText.trim() : null,
                url: linkEl ? linkEl.href : null,
            };
        }, selectors);
    }
}