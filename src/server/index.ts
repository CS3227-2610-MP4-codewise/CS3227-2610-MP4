import type { ApiError, HealthResponse } from '../shared/contracts';
import type { Environment } from './environment';
import { ManagedAuthRoutes } from './auth/managed-routes';
import { ManagedStore } from './auth/managed-store';
import { FirebaseCredentials, firebaseConfig } from './auth/firebase';
import { AuthEmail } from './auth/mail';
import { GmailTransport } from './auth/gmail';
import { OwnerBootstrap, ownerConfig } from './auth/owner';
import { CourseAuthority } from './courses/authority';
import { composeIdentityCourse } from './auth/composition';
import { AssignmentService } from './instructor/assignments/service';
import { D1Assignments } from './instructor/assignments/repository';
import { assignmentHandler } from './instructor/assignments/http';
import { BoundaryError } from '../shared/instructor-contracts/schema';

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
  async fetch(
    request: Request,
    env: Environment,
    context?: ExecutionContext,
  ): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (
      pathname.startsWith('/api/auth/') ||
      pathname === '/api/courses' ||
      pathname.startsWith('/api/instructor/')
    ) {
      const config = firebaseConfig(env);
      const store = new ManagedStore(env.DB),
        credentials = config ? new FirebaseCredentials(config) : undefined,
        bootstrap = ownerConfig(env),
        courses = new CourseAuthority(env.DB);
      const auth = new ManagedAuthRoutes(
        store,
        config,
        credentials,
        config &&
          env.GMAIL_SENDER_EMAIL &&
          env.GMAIL_APP_PASSWORD &&
          env.AUTH_MAIL_ENABLED === 'true'
          ? new AuthEmail(
              { sender: env.GMAIL_SENDER_EMAIL, origin: config.origin },
              new GmailTransport({
                sender: env.GMAIL_SENDER_EMAIL,
                appPassword: env.GMAIL_APP_PASSWORD,
              }),
            )
          : undefined,
        courses,
        {
          async authorize(principal, destination) {
            if (destination === '/workspace') return;
            const match =
              /^\/instructor\/assignments\/([A-Za-z0-9_-]{1,128})$/.exec(
                destination,
              );
            if (!match) throw new BoundaryError('FORBIDDEN');
            const draft = await env.DB.prepare(
              'SELECT id FROM instructor_assignment_drafts WHERE id=?',
            )
              .bind(match[1])
              .first();
            if (!draft) throw new BoundaryError('FORBIDDEN');
            const scope = await courses.requireObject(
              principal,
              { kind: 'assignment', id: match[1] },
              'read',
            );
            await courses.requireCourse(
              principal,
              scope.courseId,
              'instructor-read',
            );
          },
        },
        context ? (work) => context.waitUntil(work()) : undefined,
        credentials && bootstrap
          ? new OwnerBootstrap(store, credentials, bootstrap)
          : undefined,
      );
      if (pathname.startsWith('/api/auth/')) return auth.fetch(request);
      if (pathname === '/api/courses' && request.method === 'GET') {
        try {
          const { principal } = await auth.requireSession(request);
          return json({ courses: await courses.list(principal) });
        } catch (error) {
          return json(
            {
              error: {
                code:
                  error instanceof BoundaryError
                    ? error.code
                    : 'UPSTREAM_UNAVAILABLE',
                message: 'Course access unavailable.',
                requestId: crypto.randomUUID(),
              },
            },
            error instanceof BoundaryError && error.code === 'UNAUTHENTICATED'
              ? 401
              : 503,
          );
        }
      }
      if (pathname.startsWith('/api/instructor/')) {
        const identity = composeIdentityCourse(auth, courses);
        return assignmentHandler(
          new AssignmentService(
            new D1Assignments(env.DB, { enforceAuthority: true }),
            identity,
          ),
          '/api/instructor',
        )(request);
      }
    }
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
    if (
      [
        '/sign-in',
        '/auth/finish',
        '/auth/invitations',
        '/auth/reset',
        '/auth/action',
        '/auth/forgot',
        '/workspace',
      ].includes(pathname)
    ) {
      headers.set('Cache-Control', 'no-store');
      headers.set('Referrer-Policy', 'no-referrer');
    }
    return new Response(response.body, { status: response.status, headers });
  },
};
