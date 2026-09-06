import fs from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const sceneIds = ['hero', 'manufacturing', 'generation', 'data', 'recycling', 'close'];
const results = [];

await fs.mkdir('artifacts/acceptance', { recursive: true });

const launchers = [
  {
    name: 'chromium',
    type: chromium,
    options: {
      headless: true,
      args: [
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
      env: { ...process.env, LIBGL_ALWAYS_SOFTWARE: '1' },
    },
  },
  {
    name: 'firefox',
    type: firefox,
    options: {
      headless: false,
      firefoxUserPrefs: {
        'webgl.disabled': false,
        'webgl.force-enabled': true,
        'gfx.webrender.software': true,
      },
      env: {
        ...process.env,
        LIBGL_ALWAYS_SOFTWARE: '1',
        MOZ_WEBRENDER: '1',
      },
    },
  },
  {
    name: 'webkit',
    type: webkit,
    options: {
      headless: true,
      env: { ...process.env, LIBGL_ALWAYS_SOFTWARE: '1' },
    },
  },
];

for (const launcher of launchers) {
  const result = {
    browser: launcher.name,
    launched: false,
    pageLoaded: false,
    webglPass: false,
    fallbackRendered: false,
    allScenesObserved: false,
    observed: [],
    minimumFps: 0,
    averageFps: 0,
    consoleErrors: [],
    pageErrors: [],
    samples: [],
    failure: null,
  };

  let browser;
  try {
    browser = await launcher.type.launch(launcher.options);
    result.launched = true;

    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    page.on('console', (message) => {
      if (message.type() === 'error') result.consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => result.pageErrors.push(String(error)));

    const response = await page.goto(`${baseUrl}/?qa=1`, { waitUntil: 'networkidle' });
    result.pageLoaded = Boolean(response?.ok());

    await page.waitForFunction(
      () =>
        window.__CONVALT_DIAGNOSTICS__?.webgl === true ||
        document.querySelector('.canvas-shell.fallback') !== null,
      null,
      { timeout: 15000 },
    );

    const initial = await page.evaluate(() => ({
      diagnostics: window.__CONVALT_DIAGNOSTICS__ ?? null,
      fallback: document.querySelector('.canvas-shell.fallback') !== null,
    }));
    result.webglPass = initial.diagnostics?.webgl === true;
    result.fallbackRendered = initial.fallback;

    if (result.webglPass) {
      for (let index = 0; index < sceneIds.length; index += 1) {
        await page.evaluate(({ index }) => {
          scrollTo({ top: index * innerHeight, behavior: 'instant' });
        }, { index });
        await page.waitForTimeout(850);
        const diagnostic = await page.evaluate(() => window.__CONVALT_DIAGNOSTICS__ ?? null);
        result.samples.push(diagnostic);
      }

      result.observed = result.samples.map((sample) => sample?.sceneId ?? null);
      result.allScenesObserved = sceneIds.every((id) => result.observed.includes(id));
      result.minimumFps = Math.min(...result.samples.map((sample) => sample?.fps ?? 0));
      result.averageFps = Math.round(
        result.samples.reduce((sum, sample) => sum + (sample?.averageFps ?? 0), 0) /
          Math.max(1, result.samples.length),
      );
    }

    await page.screenshot({
      path: `artifacts/acceptance/${launcher.name}-final.png`,
      fullPage: false,
    });
  } catch (error) {
    result.failure = String(error);
  } finally {
    if (browser) await browser.close();
    results.push(result);
    await fs.writeFile(
      'artifacts/acceptance/browser-results.json',
      JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2),
    );
  }
}

const functionalPass = results.every(
  (result) =>
    result.launched &&
    result.pageLoaded &&
    result.webglPass &&
    result.allScenesObserved &&
    result.pageErrors.length === 0 &&
    result.failure === null,
);

console.log(JSON.stringify({ functionalPass, results }, null, 2));
if (!functionalPass) process.exit(1);
