import { createRequire } from 'node:module';
import { loadSqlJs } from '../js/lib/sql-runner.js';

const require = createRequire(import.meta.url);

/** The same sql.js build the browser loads, from vendor/. */
export const getSql = () => loadSqlJs(require('../vendor/sql.js/sql-wasm.js'));
