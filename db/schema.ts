import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    session: text("session").notNull(),
    orderId: text("order_id").notNull(),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("imported"),
    result: text("result"),
    receipt: text("receipt"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("idx_orders_session_order_id").on(t.session, t.orderId)],
);
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  session: text("session").notNull(),
  orderId: text("order_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});
