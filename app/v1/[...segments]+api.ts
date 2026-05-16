/**
 * Dev / server-side proxy: forwards same-origin `/v1/*` to the real API so the
 * browser avoids cross-origin CORS preflight to laundrypro.io.vn.
 *
 * Target: override with EXPO_PUBLIC_API_PROXY_TARGET (e.g. staging).
 */
const UPSTREAM_ORIGIN =
  process.env.EXPO_PUBLIC_API_PROXY_TARGET?.replace(/\/$/, "") ||
  // "https://laundrypro.io.vn";
  "https://test.dhhcloud.io.vn";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function buildUpstreamUrl(request: Request): string {
  const u = new URL(request.url);
  return `${UPSTREAM_ORIGIN}${u.pathname}${u.search}`;
}

function forwardHeaders(incoming: Headers): Headers {
  const out = new Headers();
  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Let fetch set Host / :authority for UPSTREAM_ORIGIN (do not forward browser host).
    if (lower === "host" || HOP_BY_HOP.has(lower)) return;
    out.append(key, value);
  });
  return out;
}

async function proxy(request: Request): Promise<Response> {
  const targetUrl = buildUpstreamUrl(request);
  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers: forwardHeaders(request.headers),
    body: hasBody && body && body.byteLength > 0 ? body : undefined,
    redirect: "follow",
  });

  // Buffer the full body — piping `upstream.body` often arrives empty in the browser
  // when this handler runs on Node (Expo web SSR / API routes).
  const payload = await upstream.arrayBuffer();

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP.has(lower) ||
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding"
    ) {
      return;
    }
    responseHeaders.append(key, value);
  });

  return new Response(payload.byteLength === 0 ? null : payload, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request) {
  return proxy(request);
}

export async function POST(request: Request) {
  return proxy(request);
}

export async function PUT(request: Request) {
  return proxy(request);
}

export async function PATCH(request: Request) {
  return proxy(request);
}

export async function DELETE(request: Request) {
  return proxy(request);
}

export async function HEAD(request: Request) {
  return proxy(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
