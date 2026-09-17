import puppeteer from 'puppeteer';
import { handleScrapedItem } from './jobService';

export async function runNexusScraper(targetUrl: string) {
    console.log(`[Scraper] Launching headless browser for: ${targetUrl}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ],
    });

    try {
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        console.log(`[Scraper] Navigating to: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

        await new Promise((resolve) => setTimeout(resolve, 2500));

        const extractedItems = await page.evaluate(() => {
            const candidateSelectors = [
                'li.job_listing',
                'tr.job',
                'tr.athing',
                '.job_listing',
                '.job-listing',
                '.job-item',
                '.job-card',
                '[data-job-id]',
                'article',
            ];

            for (const sel of candidateSelectors) {
                const elements = Array.from(document.querySelectorAll(sel));
                const validElements = elements.filter((el) => {
                    const txt = (el as HTMLElement).innerText?.trim() || '';
                    return txt.length > 25 && !txt.includes('Cookies') && !txt.includes('Subscribe');
                });

                if (validElements.length > 0) {
                    return validElements.slice(0, 10).map((el) => {
                        const link = el.querySelector('a') || el.closest('a');
                        let href = link ? link.getAttribute('href') : null;
                        if (!href) {
                            href = el.getAttribute('data-url') || el.getAttribute('data-href');
                        }
                        if (href && href.startsWith('/')) {
                            href = window.location.origin + href;
                        }
                        return {
                            text: (el as HTMLElement).innerText.trim(),
                            href: href || window.location.href,
                        };
                    });
                }
            }

            // Fallback: search for anchor elements with job descriptions or titles
            const anchors = Array.from(document.querySelectorAll('main a, #content a, body a'));
            const jobAnchors = anchors.filter((a) => {
                const text = (a as HTMLElement).innerText?.trim() || '';
                return text.length > 30 && text.split('\n').length >= 2;
            });

            return jobAnchors.slice(0, 10).map((a) => {
                let href = a.getAttribute('href') || window.location.href;
                if (href.startsWith('/')) href = window.location.origin + href;
                return {
                    text: (a as HTMLElement).innerText.trim(),
                    href,
                };
            });
        });

        console.log(`[Scraper] Found ${extractedItems.length} live job listings on ${targetUrl}. Structuring with Gemini...`);

        for (let i = 0; i < extractedItems.length; i++) {
            const item = extractedItems[i];
            console.log(`[Scraper] (${i + 1}/${extractedItems.length}) Processing listing: "${item.text.slice(0, 60).replace(/\n/g, ' ')}..."`);
            await handleScrapedItem(item.text, item.href);

            // Stagger API calls to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

        console.log(`[Scraper] Ingestion completed for: ${targetUrl}`);
    } catch (error) {
        console.error('[Scraper Error] Failed during page scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}