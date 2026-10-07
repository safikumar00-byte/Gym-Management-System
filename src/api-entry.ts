import app from './app.ts';

export default function handler(req: any, res: any) {
  const matched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'];
  if (matched && req.url === '/api' && matched !== '/api') {
    req.url = matched;
  }
  return app(req, res);
}

