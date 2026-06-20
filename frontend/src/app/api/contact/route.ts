const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export const dynamic = 'force-dynamic';
const maxContactBodyBytes = 16 * 1024;

async function readLimitedBody(request: Request) {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxContactBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);

  if (Number.isFinite(contentLength) && contentLength > maxContactBodyBytes) {
    return Response.json({ message: 'Request body is too large' }, { status: 413 });
  }

  const body = await readLimitedBody(request);

  if (body === null) {
    return Response.json({ message: 'Request body is too large' }, { status: 413 });
  }
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
      signal: AbortSignal.timeout(15_000),
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
