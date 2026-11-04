import type { ApiError, HealthResponse } from '../shared/contracts';
import type { Environment } from './environment';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { ...securityHeaders, 'Cache-Control': 'no-store' },
  });
}

async function health(env: Environment): Promise<Response> {
  let database: HealthResponse['database'] = 'unavailable';
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM platform_metadata WHERE key = 'schema_version'",
    ).first<{ value: string }>();
    if (row?.value === '1') database = 'ok';
  } catch {
    // Do not return provider exceptions, connection details, or secrets to callers.
    console.error(JSON.stringify({ event: 'database_health_failed' }));
  }
  return json(
    {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'codewise',
      environment: env.APP_ENV,
      version: env.APP_VERSION,
      database,
    } satisfies HealthResponse,
    database === 'ok' ? 200 : 503,
  );
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/health' && request.method === 'GET') {
      return health(env);
    }
    // Reserve ALL API paths so an unknown endpoint can never return SPA HTML.
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not available.',
            requestId: crypto.randomUUID(),
          },
        } satisfies ApiError,
        404,
      );
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(securityHeaders)) {
      headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  },
};
