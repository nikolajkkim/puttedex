// Which runner types the problem views can host: one module per engine in js/ui/engines/ (see index.js there).
// Checked from the file system, since the engine modules themselves need a browser.
import { existsSync } from 'node:fs';

export const hasEngineModule = (engine) => existsSync(new URL(`../js/ui/engines/${engine}.js`, import.meta.url));
