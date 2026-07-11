export async function POST() {
  return Response.json(
    {
      message:
        'Legacy article image uploads are disabled. Upload media through an article draft.',
    },
    { status: 410 },
  );
}
