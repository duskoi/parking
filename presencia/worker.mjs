const HEADERS = {
  "Access-Control-Allow-Origin": "https://duskoi.github.io",
  "Cache-Control": "no-store"
};

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/presencia") {
      return new Response(null, { status: 404, headers: HEADERS });
    }
    if (request.method === "GET") {
      const lastSeen = await env.DB.prepare("SELECT last_seen FROM presence WHERE id = 1").first("last_seen");
      return Response.json({ online: Number.isFinite(lastSeen) && Date.now() - lastSeen < 35000 }, { headers: HEADERS });
    }
    if (request.method === "POST") {
      const expected = env.PRESENCE_TOKEN_SHA256;
      if (!/^[a-f0-9]{64}$/.test(expected ?? "")) {
        return new Response(null, { status: 503, headers: HEADERS });
      }
      const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
      if (!token) return new Response(null, { status: 401, headers: HEADERS });
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const expectedBytes = Uint8Array.from(expected.match(/../g), pair => parseInt(pair, 16));
      if (!crypto.subtle.timingSafeEqual(hash, expectedBytes)) {
        return new Response(null, { status: 401, headers: HEADERS });
      }
      await env.DB.prepare("INSERT INTO presence (id, last_seen) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_seen = MAX(presence.last_seen, excluded.last_seen)").bind(Date.now()).run();
      return new Response(null, { status: 204, headers: HEADERS });
    }
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: "GET, POST" } });
  }
};
