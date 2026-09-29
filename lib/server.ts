import { env } from "cloudflare:workers";
export function db() {
  if (!env.DB) throw Error("Order storage is unavailable.");
  return env.DB;
}
export function session(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)og_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return value ?? crypto.randomUUID();
}
export function reply(
  request: Request,
  sid: string,
  data: unknown,
  status = 200,
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `og_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw Error("This request must come from the app.");
}
export async function body(request: Request) {
  const raw = await request.text();
  if (raw.length > 200000)
    throw Error("Import is too large. Maximum 100 rows.");
  return JSON.parse(raw);
}
export function audit(sid: string, orderId: string, message: string) {
  return db()
    .prepare(
      "INSERT INTO events (session,order_id,message,created_at) VALUES (?,?,?,?)",
    )
    .bind(sid, orderId, message, new Date().toISOString());
}
export async function state(sid: string) {
  const [rows, events] = await Promise.all([
    db()
      .prepare(
        "SELECT * FROM orders WHERE session=? ORDER BY created_at DESC,order_id",
      )
      .bind(sid)
      .all(),
    db()
      .prepare(
        "SELECT order_id,message,created_at FROM events WHERE session=? ORDER BY id DESC LIMIT 100",
      )
      .bind(sid)
      .all(),
  ]);
  return {
    orders: rows.results.map((r: any) => ({
      ...JSON.parse(r.payload),
      id: r.id,
      status: r.status,
      result: r.result ? JSON.parse(r.result) : null,
      receipt: r.receipt ? JSON.parse(r.receipt) : null,
      created_at: r.created_at,
    })),
    events: events.results,
  };
}
