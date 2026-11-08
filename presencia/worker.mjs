import { DurableObject } from "cloudflare:workers";

const ORIGEN_WEB = "https://duskoi.github.io";
const VIGENCIA_MS = 35000;
const HEADERS = {
  "Access-Control-Allow-Origin": ORIGEN_WEB,
  "Cache-Control": "no-store"
};

export class ParkingPresence extends DurableObject {
  async recordHeartbeat() {
    await this.ctx.storage.put("ultimoLatido", Date.now());
  }

  async isOnline() {
    const lastSeen = await this.ctx.storage.get("ultimoLatido");
    return Number.isFinite(lastSeen) && Date.now() - lastSeen < VIGENCIA_MS;
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/presencia") {
      return new Response(null, { status: 404, headers: HEADERS });
    }

    const parking = env.PARKING.getByName("parking");
    if (request.method === "GET") {
      return Response.json({ online: await parking.isOnline() }, { headers: HEADERS });
    }
    if (request.method === "POST") {
      if (!env.PRESENCE_TOKEN) {
        return new Response(null, { status: 503, headers: HEADERS });
      }
      if (request.headers.get("Authorization") !== "Bearer " + env.PRESENCE_TOKEN) {
        return new Response(null, { status: 401, headers: HEADERS });
      }
      await parking.recordHeartbeat();
      return new Response(null, { status: 204, headers: HEADERS });
    }
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: "GET, POST" } });
  }
};
