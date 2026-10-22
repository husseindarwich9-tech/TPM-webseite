// Pfad zum Chromium für Playwright/Lighthouse: CHROME_PATH, sonst der vorinstallierte Browser der
// Cloud-Umgebung, sonst der von Playwright verwaltete Browser (npx playwright install chromium).
import fs from 'node:fs';
const CLOUD = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const CHROME = process.env.CHROME_PATH || (fs.existsSync(CLOUD) ? CLOUD : undefined);
