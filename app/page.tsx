"use client";
import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Upload,
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  Package,
  ArrowUpRight,
  Clock3,
  FileSpreadsheet,
  ChevronRight,
  CreditCard,
  Truck,
  Sparkles,
  RefreshCw,
  Code2,
  BookOpen,
  SearchCheck,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { catalog, demoRows } from "@/lib/domain";
import { columns, parseCSV, records } from "@/lib/import";
type Order = (typeof demoRows)[number] & {
  id: string;
  status: string;
  result: any;
  receipt: any;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n / 100);
const labels: Record<string, string> = {
  imported: "Needs check",
  ready: "Price matched",
  blocked: "Blocked",
  awaiting_payment: "Awaiting payment",
  placed: "Order placed",
};
export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]),
    [events, setEvents] = useState<any[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<Order | null>(null),
    [payment, setPayment] = useState<Order | null>(null),
    [tab, setTab] = useState("orders"),
    [question, setQuestion] = useState("Why are some orders blocked?"),
    [answer, setAnswer] = useState(""),
    [mode, setMode] = useState(""),
    [filter, setFilter] = useState("all");
  const file = useRef<HTMLInputElement>(null);
  const apply = (d: any) => {
    setOrders(d.orders);
    setEvents(d.events);
    setSelected((s) =>
      s ? (d.orders.find((o: Order) => o.id === s.id) ?? null) : null,
    );
  };
  useEffect(() => {
    fetch("/api/orders")
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        apply(d);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function action(action: string, extra: any = {}) {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      apply(d);
      setLoaded(true);
      if (action === "submit") {
        const o = d.orders.find((x: Order) => x.id === extra.id);
        if (o?.status === "awaiting_payment") {
          setSelected(null);
          setPayment(o);
        } else if (o?.status === "placed")
          setMessage("Demo order placed. No real purchase was made.");
        else
          setMessage(
            "Order changed during submission. Review its latest status and verify again.",
          );
      }
      if (action === "verify")
        setMessage("Verification complete. Only matching orders can proceed.");
      if (action === "import" || action === "demo")
        setMessage(
          "Orders imported. Run verification to check marketplace prices.",
        );
      if (action === "pay") {
        setPayment(null);
        setMessage(
          extra.outcome === "success"
            ? "Simulated payment succeeded and demo order was placed."
            : "No payment collected. You can retry checkout.",
        );
      }
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy("");
    }
  }
  async function upload(f: File) {
    setBusy("reading");
    setError("");
    try {
      if (f.size > 2 * 1024 * 1024)
        throw Error("Use a file smaller than 2 MB.");
      let rows: unknown[][];
      if (f.name.toLowerCase().endsWith(".xlsx")) {
        const { default: read } = await import("read-excel-file/browser");
        const sheets = await read(f);
        rows = sheets[0]?.data ?? [];
      } else if (f.name.toLowerCase().endsWith(".csv"))
        rows = parseCSV(await f.text());
      else
        throw Error(
          "Choose an .xlsx or .csv file. Legacy .xls files are not supported.",
        );
      const data = records(rows);
      if (data.length > 100)
        throw Error("Import no more than 100 rows per file.");
      await action("import", { rows: data });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      if (file.current) file.current.value = "";
    }
  }
  function template() {
    const content = [
      columns,
      ...demoRows.map((r) => columns.map((k) => r[k as keyof typeof r])),
    ]
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }),
    );
    a.download = "orderguard-template.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function ask() {
    setBusy("ask");
    setError("");
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setAnswer(d.answer);
      setMode(d.mode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const counts = {
    ready: orders.filter((o) => o.status === "ready").length,
    blocked: orders.filter((o) => o.status === "blocked").length,
    placed: orders.filter((o) => o.status === "placed").length,
  };
  const visible = orders.filter((o) => filter === "all" || o.status === filter);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <ShieldCheck size={23} />
          </span>
          OrderGuard<span className="brand-label">ORDER AGENT</span>
        </a>
        <div className="top-meta">
          <span className="demo-pill">Demo workspace</span>
          <span className="avatar">OG</span>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">COMMERCE OPERATIONS</div>
            <h1>Every order. Verified.</h1>
            <p>Import your spreadsheet. Match the price. Place the order.</p>
          </div>
          <Button variant="outline" onClick={template}>
            <Download size={16} />
            Download template
          </Button>
        </div>
        <div className="demo-banner">
          <ShieldCheck size={19} />
          <span>
            <strong>Safe to explore.</strong> Products, prices and payments are
            simulated. No real purchases or card charges.
          </span>
          <a href="#guide" onClick={() => setTab("guide")}>
            How it works <ArrowUpRight size={15} />
          </a>
        </div>
        <section className="stats" aria-label="Order statistics">
          {[
            {
              name: "Total orders",
              value: orders.length,
              icon: FileSpreadsheet,
              detail: "In this workspace",
              tone: "",
            },
            {
              name: "Price matched",
              value: counts.ready,
              icon: CheckCircle2,
              detail: "Ready for checkout",
              tone: "green",
            },
            {
              name: "Blocked orders",
              value: counts.blocked,
              icon: AlertTriangle,
              detail: "Need your attention",
              tone: "amber",
            },
            {
              name: "Orders placed",
              value: counts.placed,
              icon: Package,
              detail: "Simulated orders",
              tone: "blue",
            },
          ].map((s) => (
            <article className="stat" key={s.name}>
              <div className="stat-top">
                <span>{s.name}</span>
                <s.icon size={18} className={s.tone} />
              </div>
              <strong>{String(s.value).padStart(2, "0")}</strong>
              <small>{s.detail}</small>
            </article>
          ))}
        </section>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="section-nav">
            <TabsList variant="line">
              <TabsTrigger value="orders">Order queue</TabsTrigger>
              <TabsTrigger value="catalog">Demo marketplace</TabsTrigger>
              <TabsTrigger value="guide">Project guide</TabsTrigger>
            </TabsList>
            <span className="policy-label">
              <LockKeyhole size={14} />
              Exact price match required
            </span>
          </div>
          {error && (
            <div role="alert" className="notice error">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {message && (
            <div role="status" className="notice success">
              {message}
            </div>
          )}
          <TabsContent value="orders">
            <div className="workspace-grid">
              <section className="queue-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Order queue <span>{orders.length}</span>
                    </h2>
                    <p>Verify each row before checkout.</p>
                  </div>
                  <Button
                    disabled={
                      !!busy ||
                      !orders.some((o) =>
                        ["imported", "ready", "blocked"].includes(o.status),
                      )
                    }
                    onClick={() => action("verify")}
                  >
                    <Play size={15} />
                    {busy === "verify" ? "Verifying…" : "Run verification"}
                  </Button>
                </div>
                <div
                  className="upload-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!busy && e.dataTransfer.files[0])
                      void upload(e.dataTransfer.files[0]);
                  }}
                >
                  <div className="upload-icon">
                    <Upload size={23} />
                  </div>
                  <div>
                    <strong>Bring your orders into focus</strong>
                    <p>Drop an Excel or CSV file · up to 100 rows, 2 MB</p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => file.current?.click()}
                  >
                    {busy === "reading" ? "Reading…" : "Import file"}
                  </Button>
                  <input
                    aria-label="Import orders spreadsheet"
                    ref={file}
                    type="file"
                    accept=".xlsx,.csv"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) void upload(e.target.files[0]);
                    }}
                  />
                </div>
                {orders.length > 0 && (
                  <div className="queue-filters">
                    {[
                      ["all", "All orders"],
                      ["ready", "Matched"],
                      ["blocked", "Blocked"],
                      ["placed", "Placed"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        aria-pressed={filter === key}
                        className={filter === key ? "active" : ""}
                        onClick={() => setFilter(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {orders.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order / product</TableHead>
                        <TableHead>Excel price</TableHead>
                        <TableHead>Market price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          <span className="sr-only">Details</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((o) => (
                        <TableRow key={o.id} className="order-row">
                          <TableCell>
                            <div className="product-cell">
                              <ProductImage url={o.product_url} />
                              <div>
                                <button
                                  className="order-link"
                                  onClick={() => setSelected(o)}
                                >
                                  {o.order_id}
                                </button>
                                <span className="product-name">
                                  {o.result?.product ??
                                    catalog.find((p) =>
                                      o.product_url.endsWith("/" + p.slug),
                                    )?.name ??
                                    "Product awaiting check"}
                                </span>
                                <span className="row-meta">
                                  {o.size} · Qty {o.quantity} ·{" "}
                                  {o.payment_method === "cod"
                                    ? "COD"
                                    : "Prepaid"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="price-cell">
                            {money(Math.round(Number(o.price) * 100))}
                            <small>per unit</small>
                          </TableCell>
                          <TableCell className="price-cell">
                            {o.result?.market_price != null
                              ? money(o.result.market_price)
                              : "—"}
                            <small>
                              {o.result ? "demo price" : "not checked"}
                            </small>
                          </TableCell>
                          <TableCell>
                            <span className={"status " + o.status}>
                              {o.status === "ready" ? (
                                <CheckCircle2 size={13} />
                              ) : o.status === "blocked" ? (
                                <AlertTriangle size={13} />
                              ) : (
                                <Clock3 size={13} />
                              )}{" "}
                              {labels[o.status]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`View ${o.order_id}`}
                              onClick={() => setSelected(o)}
                            >
                              <ChevronRight size={17} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="empty-queue">
                    <div className="empty-icon">
                      <FileSpreadsheet size={30} />
                    </div>
                    <h3>
                      {loaded
                        ? "Your next order starts here"
                        : "Loading your workspace…"}
                    </h3>
                    <p>
                      Try four sample orders to see a price match,
                      <br />a mismatch, prepaid checkout and a stock block.
                    </p>
                    <Button
                      variant="outline"
                      disabled={!!busy || !loaded}
                      onClick={() => action("demo")}
                    >
                      Load sample orders <ChevronRight size={16} />
                    </Button>
                  </div>
                )}
                {!!orders.length && !visible.length && (
                  <p className="empty-filter">No orders in this view.</p>
                )}
                <div className="table-footer">
                  <span>Prices in INR · unit price comparison</span>
                  <span>
                    Server-side verification <ShieldCheck size={14} />
                  </span>
                </div>
              </section>
              <aside className="right-rail">
                <section className="policy-card">
                  <div className="policy-icon">
                    <SearchCheck size={24} />
                  </div>
                  <h2>A match means a match.</h2>
                  <p>
                    The agent only proceeds when your spreadsheet price equals
                    the selected variant’s marketplace price.
                  </p>
                  <div className="comparison-example">
                    <div>
                      <span>Excel</span>
                      <strong>₹6,499</strong>
                    </div>
                    <span className="equals">=</span>
                    <div>
                      <span>Marketplace</span>
                      <strong>₹6,499</strong>
                    </div>
                  </div>
                  <div className="policy-check">
                    <CheckCircle2 size={15} />
                    Checked again at checkout
                  </div>
                </section>
                <section className="activity-panel">
                  <div className="rail-heading">
                    <h2>Activity log</h2>
                    <Clock3 size={16} />
                  </div>
                  {events.length ? (
                    <ol className="activity-list">
                      {events.slice(0, 6).map((e, i) => (
                        <li key={i}>
                          <span className="event-dot" />
                          <div>
                            <strong>{e.order_id}</strong>
                            <p>{e.message}</p>
                            <time>
                              {new Date(e.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="activity-empty">
                      Your import, verification and checkout activity will
                      appear here.
                    </div>
                  )}
                </section>
              </aside>
            </div>
            <section className="assistant-panel">
              <div>
                <Sparkles size={20} />
                <h2>Order assistant</h2>
                <span>Rules summary · optional AI</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask();
                }}
              >
                <Input
                  aria-label="Question for order assistant"
                  value={question}
                  maxLength={500}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!!busy || !question.trim()}
                  type="submit"
                >
                  {busy === "ask" ? "Thinking…" : "Ask assistant"}
                </Button>
              </form>
              {answer && (
                <div className="assistant-answer">
                  <span className="eyebrow">
                    {mode === "ai"
                      ? "AI EXPLANATION"
                      : "BUILT-IN RULES SUMMARY"}
                  </span>
                  <p>{answer}</p>
                </div>
              )}
            </section>
          </TabsContent>
          <TabsContent value="catalog">
            <section className="catalog-panel">
              <div className="panel-heading">
                <div>
                  <h2>Demo marketplace</h2>
                  <p>
                    These are fixed test prices, not live marketplace listings.
                  </p>
                </div>
                <span className="demo-pill">
                  INR · tax included · free demo shipping
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Size / variant</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalog.map((p) => (
                    <TableRow key={p.slug}>
                      <TableCell>
                        <div className="product-cell">
                          <img
                            className="product-visual catalog-image"
                            src={`/products/${p.slug}.png`}
                            alt={`Illustrative reference: ${p.name}`}
                          />
                          <div>
                            <strong>{p.name}</strong>
                            <code className="catalog-url">
                              https://demo.orderguard.example/products/{p.slug}
                            </code>
                            <span className="image-note">
                              Illustrative reference image
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{p.size}</TableCell>
                      <TableCell>{money(p.price)}</TableCell>
                      <TableCell>
                        {p.stock ? (
                          p.stock + " available"
                        ) : (
                          <span className="amber">Out of stock</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.cod ? "COD + prepaid" : "Prepaid only"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="catalog-note">
                Use these exact URLs and sizes in your spreadsheet. They are
                internal test identifiers and do not open external shops. Stock
                is a fixed simulation and is not reserved or depleted.
              </p>
            </section>
          </TabsContent>
          <TabsContent value="guide">
            <section id="guide" className="guide-panel">
              <div className="panel-heading">
                <div>
                  <h2>From spreadsheet to verified order</h2>
                  <p>
                    A deployable interview demo with a deterministic purchasing
                    policy.
                  </p>
                </div>
                <span className="image-note">Full source is included in this project folder.</span>
              </div>
              <div className="guide-steps">
                {[
                  [
                    "01",
                    "Import",
                    "Read .xlsx or CSV. Validate required fields and reject duplicate IDs.",
                  ],
                  [
                    "02",
                    "Verify",
                    "Resolve the exact product and size. Compare integer prices in paise.",
                  ],
                  [
                    "03",
                    "Review",
                    "Block mismatches, unavailable stock and unsupported payment methods.",
                  ],
                  [
                    "04",
                    "Checkout",
                    "Recheck the price, then create a demo COD order or simulate prepaid checkout.",
                  ],
                ].map(([n, t, d]) => (
                  <article key={n}>
                    <span>{n}</span>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </article>
                ))}
              </div>
              <div className="guide-columns">
                <article>
                  <h3>What you can demonstrate</h3>
                  <ul>
                    <li>Excel and CSV import with per-row errors.</li>
                    <li>Exact price validation enforced on the server.</li>
                    <li>
                      Persistent orders, status transitions and an audit log.
                    </li>
                    <li>COD and prepaid success, decline and cancellation.</li>
                    <li>
                      Masked test card details and repeat-click protection.
                    </li>
                    <li>
                      Optional AI explanations that cannot authorize purchases.
                    </li>
                  </ul>
                </article>
                <article>
                  <h3>Before connecting a live store</h3>
                  <p>
                    This deployment uses a simulated catalog and checkout. Live
                    ordering needs your marketplace’s supported API and a
                    payment provider integration. No real card details belong in
                    the spreadsheet.
                  </p>
                  <p>
                    The AI explanation endpoint needs server-side OPENAI_API_KEY
                    and OPENAI_MODEL settings. Without them, the assistant shows
                    a clearly labelled rules summary.
                  </p>
                  <a
                    className="download-link"
                    href="/INTERVIEW_GUIDE.md"
                    download
                  >
                    <BookOpen size={16} />
                    Download interview guide
                  </a>
                </article>
              </div>
              <div className="schema-note">
                <h3>Spreadsheet columns</h3>
                <code>{columns.join(" · ")}</code>
                <p>
                  Price is the tax-inclusive unit price in INR. Quantity is a
                  whole number. Payment method is cod or prepaid. Use fictional
                  shipping details in this demo. Browser sessions have separate
                  workspaces; clearing cookies starts a new workspace.
                </p>
              </div>
            </section>
          </TabsContent>
        </Tabs>
        <footer>
          <span>
            <ShieldCheck size={15} />
            OrderGuard
          </span>
          <span>Verified by rules. Explained with AI.</span>
          <span>Open README.md for setup instructions</span>
        </footer>
      </main>
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="order-dialog">
          <DialogTitle>Order {selected?.order_id}</DialogTitle>
          <DialogDescription>
            Review the full order and the latest server verification.
          </DialogDescription>
          {selected && (
            <>
              <ProductImage url={selected.product_url} large />
              <span className={"status " + selected.status}>
                {labels[selected.status]}
              </span>
              <dl className="detail-grid">
                <dt>Product URL</dt>
                <dd className="url-value">{selected.product_url}</dd>
                <dt>Size / quantity</dt>
                <dd>
                  {selected.size} / {selected.quantity}
                </dd>
                <dt>Shipping address</dt>
                <dd>{selected.shipping_address}</dd>
                <dt>Payment method</dt>
                <dd>
                  {selected.payment_method === "cod"
                    ? "Cash on delivery"
                    : "Prepaid"}
                </dd>
                <dt>Excel unit price</dt>
                <dd>{money(Math.round(Number(selected.price) * 100))}</dd>
                <dt>Market unit price</dt>
                <dd>
                  {selected.result?.market_price != null
                    ? money(selected.result.market_price)
                    : "Not available"}
                </dd>
                <dt>Order total</dt>
                <dd>
                  {money(
                    Math.round(Number(selected.price) * 100) *
                      selected.quantity,
                  )}
                  <small> Tax included · ₹0 demo shipping</small>
                </dd>
              </dl>
              {selected.result?.reason && (
                <div className="notice error">{selected.result.reason}</div>
              )}
              {selected.receipt && (
                <div className="receipt">
                  <h3>Demo receipt</h3>
                  <p>
                    {selected.receipt.marketplace_order_id ??
                      "Order created after successful payment"}
                  </p>
                  <p>
                    Payment:{" "}
                    {selected.receipt.payment_status.replaceAll("_", " ")}
                  </p>
                  {selected.receipt.card && (
                    <p>
                      <CreditCard size={16} />
                      Test {selected.receipt.card.brand} ••••{" "}
                      {selected.receipt.card.last4}
                    </p>
                  )}
                </div>
              )}
              {["imported", "ready", "blocked"].includes(selected.status) && (
                <EditOrder
                  order={selected}
                  busy={!!busy}
                  save={async (row) => {
                    await action("edit", { id: selected.id, row });
                  }}
                />
              )}
              {selected.status === "ready" && (
                <Button
                  disabled={!!busy}
                  onClick={() => action("submit", { id: selected.id })}
                >
                  {selected.payment_method === "cod" ? (
                    <Truck size={16} />
                  ) : (
                    <CreditCard size={16} />
                  )}{" "}
                  {selected.payment_method === "cod"
                    ? "Place demo COD order"
                    : "Continue to demo payment"}
                </Button>
              )}
              {selected.status === "awaiting_payment" && (
                <Button
                  disabled={!!busy}
                  onClick={() => {
                    setPayment(selected);
                    setSelected(null);
                  }}
                >
                  Resume demo payment
                </Button>
              )}
              <p className="dialog-note">
                Demo only. No real orders or charges. Final prices are checked
                on the server.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!payment} onOpenChange={(v) => !v && setPayment(null)}>
        <DialogContent>
          <DialogTitle>Simulated prepaid checkout</DialogTitle>
          <DialogDescription>
            Test payment outcomes without entering card details.
          </DialogDescription>
          <div className="test-card">
            <span>TEST CARD · NO REAL CHARGES</span>
            <CreditCard size={28} />
            <strong>•••• •••• •••• 4242</strong>
            <small>Visa · Fictional card display</small>
          </div>
          <div className="payment-total">
            <span>{payment?.order_id}</span>
            <strong>{payment ? money(payment.result.total) : ""}</strong>
          </div>
          <Button
            disabled={!!busy}
            onClick={() =>
              action("pay", { id: payment?.id, outcome: "success" })
            }
          >
            Simulate successful payment
          </Button>
          <div className="payment-options">
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                action("pay", { id: payment?.id, outcome: "declined" })
              }
            >
              Simulate decline
            </Button>
            <Button
              variant="ghost"
              disabled={!!busy}
              onClick={() =>
                action("pay", { id: payment?.id, outcome: "cancel" })
              }
            >
              Cancel checkout
            </Button>
          </div>
          <p className="dialog-note">
            A live version must use a payment provider’s hosted checkout and
            verified payment events. Full card numbers and CVV are never
            collected here.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EditOrder({
  order,
  busy,
  save,
}: {
  order: Order;
  busy: boolean;
  save: (row: any) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [price, setPrice] = useState(order.price),
    [quantity, setQuantity] = useState(order.quantity),
    [size, setSize] = useState(order.size),
    [address, setAddress] = useState(order.shipping_address);
  useEffect(() => {
    setPrice(order.price);
    setQuantity(order.quantity);
    setSize(order.size);
    setAddress(order.shipping_address);
  }, [order]);
  return (
    <div className="edit-order">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        {open ? "Close editor" : "Edit order details"}
      </Button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const { order_id, product_url, payment_method, currency } = order;
            await save({
              order_id,
              product_url,
              payment_method,
              currency,
              price,
              quantity,
              size,
              shipping_address: address,
            });
          }}
        >
          <label>
            Unit price (INR)
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
          <label>
            Quantity
            <Input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Size
            <Input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              required
            />
          </label>
          <label>
            Shipping address
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </label>
          <Button type="submit" disabled={busy}>
            Save & require recheck
          </Button>
        </form>
      )}
    </div>
  );
}

function ProductImage({
  url,
  large = false,
}: {
  url: string;
  large?: boolean;
}) {
  const product = catalog.find(
    (p) => url === `https://demo.orderguard.example/products/${p.slug}`,
  );
  if (!product) return null;
  return large ? (
    <figure>
      <img
        className="detail-image"
        src={`/products/${product.slug}.png`}
        alt={`Illustrative reference: ${product.name}`}
      />
      <figcaption className="image-note">
        AI-generated reference image · demo product
      </figcaption>
    </figure>
  ) : (
    <img
      className="product-visual"
      src={`/products/${product.slug}.png`}
      alt={`Illustrative reference: ${product.name}`}
      loading="lazy"
    />
  );
}
