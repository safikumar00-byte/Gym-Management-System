import appModule from './handler.cjs';

const handler = appModule?.default || appModule;

export default function vercelHandler(req, res) {
  return handler(req, res);
}
