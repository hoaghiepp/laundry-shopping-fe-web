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

/** Headers that break undici when we re-buffer the body / let fetch negotiate encoding. */
const STRIP_REQUEST = new Set([
  "host",
  "content-length",
  "accept-encoding",
  "connection",
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
    if (STRIP_REQUEST.has(lower) || HOP_BY_HOP.has(lower)) return;
    out.append(key, value);
  });
  return out;
}

function errorCauseMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code;
    return code ? `${cause.message} (${code})` : cause.message;
  }
  if (cause && typeof cause === "object" && "code" in cause) {
    return String((cause as { code: unknown }).code);
  }
  return err.message;
}

async function fetchUpstream(
  targetUrl: string,
  init: RequestInit & { body?: Buffer },
  attempts = 2
): Promise<globalThis.Response> {
  let lastErr: unknown;
  const raw = init.body;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(targetUrl, {
        ...init,
        // undici detaches ArrayBuffer/Uint8Array bodies (including retries). Blob owns a copy.
        body: raw && raw.length > 0 ? new Blob([raw]) : undefined,
      });
    } catch (err) {
      lastErr = err;
      // Brief retry for transient DNS / connect / TLS blips under Metro.
      if (i + 1 < attempts) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

async function proxy(request: Request): Promise<Response> {
  const targetUrl = buildUpstreamUrl(request);
  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  try {
    const upstream = await fetchUpstream(targetUrl, {
      method,
      headers: forwardHeaders(request.headers),
      body: hasBody && body && body.byteLength > 0 ? body : undefined,
      redirect: "follow",
    });

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

    const contentType = upstream.headers.get("content-type") ?? "";
    // Order streams must flush each event. Buffering arrayBuffer() holds the
    // UI until the server closes the socket (about 30 minutes).
    if (contentType.includes("text/event-stream") && upstream.body) {
      responseHeaders.set("Content-Type", "text/event-stream");
      responseHeaders.set("Cache-Control", "no-cache, no-transform");
      responseHeaders.set("X-Accel-Buffering", "no");
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    }

    // Buffer the full body — piping `upstream.body` often arrives empty in the browser
    // when this handler runs on Node (Expo web SSR / API routes).
    const payload = await upstream.arrayBuffer();

    return new Response(payload.byteLength === 0 ? null : payload, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const detail = errorCauseMessage(err);
    console.error(`[v1 proxy] upstream fetch failed → ${targetUrl}: ${detail}`);
    return Response.json(
      {
        success: false,
        meta: { code: "502" },
        message: `API proxy cannot reach ${UPSTREAM_ORIGIN}`,
        detail,
        target: targetUrl,
      },
      { status: 502 }
    );
  }
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
