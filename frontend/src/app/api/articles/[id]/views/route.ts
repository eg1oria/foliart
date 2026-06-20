const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!/^\d+$/.test(id)) {
      return Response.json({ message: 'Invalid article id' }, { status: 400 });
    }

    const response = await fetch(`${backendUrl}/api/articles/${id}/views`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    const bodyText = await response.text();

    return new Response(bodyText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return Response.json(
      {
        message: 'Failed to proxy article view counter request',
      },
      { status: 502 },
    );
  }
}
