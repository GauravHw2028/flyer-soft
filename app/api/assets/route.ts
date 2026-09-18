import {
  owner,
  db,
  bucket,
  sameOrigin,
  failure,
  maxUploadBytes,
} from "../_shared";

function megabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function detectedMime(b: Uint8Array) {
  if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71)
    return "image/png";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  const head = String.fromCharCode(...b.slice(0, 4));
  const riff = String.fromCharCode(...b.slice(8, 12));
  if (head === "RIFF" && riff === "WEBP") return "image/webp";
  return "";
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const id = await owner();
    const limit = maxUploadBytes();
    const message = `Choose an image under ${megabytes(limit)} MB.`;
    if (Number(req.headers.get("content-length")) > limit + 1024 * 1024)
      return new Response(message, { status: 413 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > limit || file.size === 0)
      return Response.json({ error: message }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const mime = detectedMime(new Uint8Array(bytes));
    if (!mime)
      return Response.json(
        { error: "Use a PNG, JPEG or WebP image." },
        { status: 400 },
      );

    const key = crypto.randomUUID();
    await bucket().put(key, new Uint8Array(bytes), {
      httpMetadata: { contentType: mime },
    });
    try {
      await db()
        .prepare(
          "INSERT INTO assets (id, owner, name, mime, size, created) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          key,
          id,
          file.name.slice(0, 200),
          mime,
          file.size,
          new Date().toISOString(),
        )
        .run();
    } catch (e) {
      await bucket().delete(key);
      throw e;
    }
    return Response.json({ url: "/api/assets/" + key, id: key });
  } catch (e) {
    return failure(e);
  }
}
