import app from './app.ts';

export default function handler(req: any, res: any) {
  try {
    const matched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'];
    if (matched && typeof matched === 'string' && req.url === '/api' && matched !== '/api') {
      req.url = matched;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('Unhandled Vercel Handler Invocation Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: 'FUNCTION_INVOCATION_ERROR',
          message: err?.message || 'Internal serverless invocation error',
        },
      });
    }
  }
}


