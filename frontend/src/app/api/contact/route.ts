const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const contentType = request.headers.get('Content-Type') ?? 'application/json';

  let response: globalThis.Response;

  try {
    response = await fetch(`${BACKEND_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body,
      cache: 'no-store',
    });
  } catch {
    return Response.json(
      { message: 'Contact API is unavailable' },
      {
        status: 503,
      },
    );
  }

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
