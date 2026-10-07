import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const appModule = require('./handler.cjs');
const handler = appModule.default || appModule;

export default function vercelHandler(req, res) {
  return handler(req, res);
}
