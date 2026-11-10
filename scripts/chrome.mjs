// Pfad zum Chromium für Playwright/Lighthouse: CHROME_PATH, sonst der vorinstallierte Browser der
// Cloud-Umgebung, sonst der von Playwright verwaltete Browser (npx playwright install chromium).
import fs from 'node:fs';
// Versionsunabhängiger Verweis der Cloud-Umgebung (zeigt auf den jeweils installierten Chromium)
const CLOUD = '/opt/pw-browsers/chromium';
export const CHROME = process.env.CHROME_PATH || (fs.existsSync(CLOUD) ? CLOUD : undefined);
