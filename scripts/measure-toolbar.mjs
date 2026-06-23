import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "C:\\Users\\zwf\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe",
  headless: true
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:1420", { waitUntil: "networkidle" });
await page.waitForSelector('div.tool-group', { timeout: 5000 });
const groups = await page.locator('div.tool-group').all();
const layoutGroup = groups[1];
const rect = await layoutGroup.evaluate(el => {
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height };
});
const buttons = await layoutGroup.locator('button').all();
const btnRects = [];
for (const b of buttons) {
  const r = await b.evaluate(el => ({ w: el.getBoundingClientRect().width, text: el.innerText }));
  btnRects.push(r);
}
console.log("tool-group:", rect);
console.log("buttons:", JSON.stringify(btnRects));
await browser.close();