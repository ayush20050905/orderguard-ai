import { normalize, quote, demoRows } from "@/lib/domain";
import {
  db,
  session,
  reply,
  checkOrigin,
  body,
  audit,
  state,
} from "@/lib/server";
export async function GET(request: Request) {
  const sid = session(request);
  try {
    return reply(request, sid, await state(sid));
  } catch (e) {
    console.error("Order load failed", e);
    return reply(
      request,
      sid,
      { error: "Orders are temporarily unavailable. Please retry." },
      503,
    );
  }
}
export async function POST(request: Request) {
  const sid = session(request);
  try {
    checkOrigin(request);
    const data = await body(request);
    if (data.action === "import" || data.action === "demo") {
      const raw = data.action === "demo" ? demoRows : data.rows;
      if (!Array.isArray(raw) || !raw.length || raw.length > 100)
        throw Error("Import 1–100 rows at a time.");
      const rows = raw.map((r: any, i: number) => {
        try {
          return normalize(r);
        } catch (e) {
          throw Error(`Row ${i + 2}: ${(e as Error).message}`);
        }
      });
      if (new Set(rows.map((r) => r.order_id)).size !== rows.length)
        throw Error("The file contains duplicate order IDs.");
      const count: any = await db()
        .prepare("SELECT COUNT(*) as count FROM orders WHERE session=?")
        .bind(sid)
        .first();
      if (count.count + rows.length > 500)
        throw Error("Demo limit reached: 500 orders per browser session.");
      const existing = await db()
        .prepare("SELECT order_id FROM orders WHERE session=?")
        .bind(sid)
        .all();
      const ids = new Set(existing.results.map((r: any) => r.order_id));
      if (rows.some((r) => ids.has(r.order_id)))
        throw Error(
          "An order ID already exists. Use new order IDs; no rows were imported.",
        );
      const now = new Date().toISOString();
      await db().batch(
        rows.flatMap((row) => [
          db()
            .prepare(
              "INSERT INTO orders (id,session,order_id,payload,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              sid,
              row.order_id,
              JSON.stringify(row),
              "imported",
              now,
              now,
            ),
          audit(
            sid,
            row.order_id,
            "Imported and validated. Awaiting marketplace verification.",
          ),
        ]),
      );
    } else if (data.action === "edit") {
      const r: any = await db()
        .prepare("SELECT * FROM orders WHERE id=? AND session=?")
        .bind(String(data.id), sid)
        .first();
      if (!r || !["imported", "ready", "blocked"].includes(r.status))
        throw Error("Only pending orders can be edited.");
      const row = normalize(data.row);
      if (row.order_id !== r.order_id) throw Error("Order ID cannot change.");
      const result = await db()
        .prepare(
          "UPDATE orders SET payload=?,status='imported',result=NULL,updated_at=? WHERE id=? AND session=? AND status IN ('imported','ready','blocked')",
        )
        .bind(JSON.stringify(row), new Date().toISOString(), r.id, sid)
        .run();
      if (!result.meta.changes)
        throw Error("Order state changed. Refresh and try again.");
      await audit(
        sid,
        r.order_id,
        "Order details edited. Previous verification invalidated.",
      ).run();
    } else if (data.action === "verify") {
      const rows = await db()
        .prepare(
          "SELECT * FROM orders WHERE session=? AND status IN ('imported','ready','blocked')",
        )
        .bind(sid)
        .all();
      if (!rows.results.length) throw Error("No pending orders to verify.");
      // Process sequentially to keep the audit order deterministic and avoid unbounded fan-out.
      for (const r of rows.results as any[]) {
        const q = quote(normalize(JSON.parse(r.payload)));
        const status = q.eligible ? "ready" : "blocked";
        await db().batch([
          db()
            .prepare(
              "UPDATE orders SET status=?,result=?,updated_at=? WHERE id=? AND session=? AND status IN ('imported','ready','blocked') AND payload=?",
            )
            .bind(
              status,
              JSON.stringify(q),
              new Date().toISOString(),
              r.id,
              sid,
              r.payload,
            ),
          audit(
            sid,
            r.order_id,
            q.reason ??
              "Exact unit price and variant match. Stock and payment method checked.",
          ),
        ]);
      }
    } else if (data.action === "submit") {
      const r: any = await db()
        .prepare("SELECT * FROM orders WHERE id=? AND session=?")
        .bind(String(data.id), sid)
        .first();
      if (!r) throw Error("Order not found.");
      if (r.status === "placed" || r.status === "awaiting_payment")
        return reply(request, sid, await state(sid));
      if (r.status !== "ready")
        throw Error("Verify this order before submitting it.");
      const row = normalize(JSON.parse(r.payload));
      const q = quote(row);
      if (!q.eligible) {
        await db().batch([
          db()
            .prepare(
              "UPDATE orders SET status=?,result=? WHERE id=? AND session=?",
            )
            .bind("blocked", JSON.stringify(q), r.id, sid),
          audit(sid, r.order_id, "Final check blocked submission: " + q.reason),
        ]);
        throw Error(q.reason!);
      }
      const status =
        row.payment_method === "cod" ? "placed" : "awaiting_payment";
      const receipt = {
        marketplace_order_id:
          row.payment_method === "cod"
            ? "DEMO-" + crypto.randomUUID().slice(0, 8).toUpperCase()
            : null,
        payment_status:
          row.payment_method === "cod" ? "due_on_delivery" : "pending",
        amount: q.total,
        currency: "INR",
        card: null,
        simulated: true,
      };
      const result = await db()
        .prepare(
          "UPDATE orders SET status=?,receipt=?,result=?,updated_at=? WHERE id=? AND session=? AND status='ready' AND payload=?",
        )
        .bind(
          status,
          JSON.stringify(receipt),
          JSON.stringify(q),
          new Date().toISOString(),
          r.id,
          sid,
          r.payload,
        )
        .run();
      if (result.meta.changes)
        await audit(
          sid,
          r.order_id,
          row.payment_method === "cod"
            ? "Demo COD order placed after final price check."
            : "Final price check passed. Awaiting simulated prepaid payment.",
        ).run();
    } else if (data.action === "pay") {
      if (!["success", "declined", "cancel"].includes(data.outcome))
        throw Error("Invalid payment outcome.");
      const r: any = await db()
        .prepare("SELECT * FROM orders WHERE id=? AND session=?")
        .bind(String(data.id), sid)
        .first();
      if (!r) throw Error("Order not found.");
      if (r.status === "placed") return reply(request, sid, await state(sid));
      if (r.status !== "awaiting_payment")
        throw Error("This order is not awaiting payment.");
      const q = quote(normalize(JSON.parse(r.payload)));
      if (!q.eligible)
        throw Error("Price or availability changed. Payment cannot proceed.");
      if (data.outcome === "success") {
        const receipt = {
          marketplace_order_id:
            "DEMO-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
          payment_status: "paid_simulated",
          amount: q.total,
          currency: "INR",
          card: { brand: "Visa", last4: "4242", test: true },
          simulated: true,
        };
        const result = await db()
          .prepare(
            "UPDATE orders SET status='placed',receipt=?,updated_at=? WHERE id=? AND session=? AND status='awaiting_payment'",
          )
          .bind(JSON.stringify(receipt), new Date().toISOString(), r.id, sid)
          .run();
        if (result.meta.changes)
          await audit(
            sid,
            r.order_id,
            "Simulated payment succeeded. Demo order placed. Test Visa •••• 4242.",
          ).run();
      } else
        await audit(
          sid,
          r.order_id,
          data.outcome === "declined"
            ? "Simulated payment declined. No order placed; payment can be retried."
            : "Checkout cancelled. No payment collected.",
        ).run();
    } else throw Error("Unknown action.");
    return reply(request, sid, await state(sid));
  } catch (e) {
    const msg = (e as Error).message;
    console.error("Order operation failed", msg);
    return reply(
      request,
      sid,
      {
        error: msg.includes("SQLITE")
          ? "Could not save orders. Retry with unique order IDs."
          : msg,
      },
      400,
    );
  }
}
