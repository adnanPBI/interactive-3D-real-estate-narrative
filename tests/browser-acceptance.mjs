import fs from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const sceneIds = ['hero', 'manufacturing', 'generation', 'data', 'recycling', 'close'];
const engines = { chromium, firefox, webkit };
const results = [];

for (const [name, browserType] of Object.entries(engines)) {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}/?qa=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__CONVALT_DIAGNOSTICS__?.webgl === true, null, { timeout: 15000 });

  const samples = [];
  for (let index = 0; index < sceneIds.length; index += 1) {
    await page.evaluate(({ index, total }) => {
      const max = document.documentElement.scrollHeight - innerHeight;
      scrollTo(0, max * (index / (total - 1)));
    }, { index, total: sceneIds.length });
    await page.waitForTimeout(900);
    const diagnostic = await page.evaluate(() => window.__CONVALT_DIAGNOSTICS__);
    samples.push(diagnostic);
  }

  const observed = samples.map((sample) => sample?.sceneId);
  const allScenesObserved = sceneIds.every((id) => observed.includes(id));
  const webglPass = samples.every((sample) => sample?.webgl === true);
  const minimumFps = Math.min(...samples.map((sample) => sample?.fps ?? 0));
  const averageFps = Math.round(
    samples.reduce((sum, sample) => sum + (sample?.averageFps ?? 0), 0) / samples.length,
  );

  results.push({
    browser: name,
    allScenesObserved,
    webglPass,
    observed,
    minimumFps,
    averageFps,
    consoleErrors,
    samples,
  });

  await browser.close();
}

await fs.mkdir('artifacts/acceptance', { recursive: true });
await fs.writeFile(
  'artifacts/acceptance/browser-results.json',
  JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2),
);

const functionalPass = results.every(
  (result) => result.allScenesObserved && result.webglPass && result.consoleErrors.length === 0,
);

console.log(JSON.stringify({ functionalPass, results }, null, 2));
if (!functionalPass) process.exit(1);
