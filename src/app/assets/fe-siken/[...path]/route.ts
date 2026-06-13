export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path: string[] }> | { path: string[] };
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  const { path } = await context.params;
  const upstreamBaseUrl = process.env.QUESTION_BANK_SERVICE_URL?.trim();
  if (!upstreamBaseUrl) {
    return new Response("QUESTION_BANK_SERVICE_URL is not configured.", {
      status: 500,
    });
  }
  if (!isSafeAssetPath(path)) {
    return new Response("Invalid asset path.", { status: 400 });
  }

  const safePath = path.map(encodeURIComponent).join("/");
  const upstreamUrl = `${upstreamBaseUrl.replace(/\/+$/, "")}/assets/fe-siken/${safePath}`;
  const upstreamResponse = await fetch(upstreamUrl);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: copyAllowedHeaders(upstreamResponse.headers),
  });
}

function isSafeAssetPath(path: string[]): boolean {
  return path.every(
    (segment) =>
      segment !== "" &&
      segment !== "." &&
      segment !== ".." &&
      !segment.includes("/") &&
      !segment.includes("\\")
  );
}

function copyAllowedHeaders(headers: Headers): Headers {
  const copied = new Headers();
  const contentType = headers.get("content-type");
  if (contentType !== null) {
    copied.set("content-type", contentType);
  }
  const cacheControl = headers.get("cache-control");
  if (cacheControl !== null) {
    copied.set("cache-control", cacheControl);
  }
  return copied;
}
