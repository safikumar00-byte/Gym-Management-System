let app: any;
let initError: any = null;

try {
  const mod = await import('../src/app.ts');
  app = mod.default || mod.app;
} catch (err: any) {
  initError = err;
  console.error('[Vercel Serverless Function Init Error]:', err);
}

export default async function handler(req: any, res: any) {
  if (initError) {
    return res.status(500).json({
      error: {
        code: 'INITIALIZATION_FAILED',
        message: initError.message || String(initError),
        stack: process.env.NODE_ENV !== 'production' ? initError.stack : undefined,
        name: initError.name,
      },
    });
  }

  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Request Handler Error]:', err);
    return res.status(500).json({
      error: {
        code: 'HANDLER_FAILED',
        message: err?.message || 'Server error',
      },
    });
  }
}

