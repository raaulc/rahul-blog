// Renders the public CV PDF from the private source (kept outside this repo because it has a phone number).
// Usage: CV_SRC=/path/to/Rahul_Rathod_CV.html npm run cv
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const src = process.env.CV_SRC ?? `${process.env.HOME}/Documents/project waterloo/cv/Rahul_Rathod_CV.html`;
const out = new URL('../public/cv/Rahul_Rathod_CV.pdf', import.meta.url).pathname;
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(src)) throw new Error(`CV source not found: ${src}`);

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
await page.goto(`file://${src}`, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
// Anything marked data-private (the phone number) stays out of the public copy.
const removed = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[data-private]')];
  els.forEach((e) => e.remove());
  return els.length;
});
await page.pdf({ path: out, format: 'A4', preferCSSPageSize: true, printBackground: true });
const text = await page.evaluate(() => document.body.innerText);
await browser.close();
if (/\+44|\d{5}\s?\d{6}/.test(text)) throw new Error('phone number still present in public CV');
console.log(`wrote ${out} (removed ${removed} private field${removed === 1 ? '' : 's'})`);
