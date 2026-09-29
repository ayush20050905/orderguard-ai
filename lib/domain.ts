export type OrderInput = {
  order_id: string;
  product_url: string;
  size: string;
  price: string;
  quantity: number;
  shipping_address: string;
  payment_method: "cod" | "prepaid";
  currency: string;
};
export type Product = {
  slug: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  cod: boolean;
};
export const catalog: Product[] = [
  {
    slug: "aero-pro-racket",
    name: "Aero Pro badminton racket",
    size: "4U",
    price: 649900,
    stock: 12,
    cod: true,
  },
  {
    slug: "court-stride-shoes",
    name: "Court Stride shoes",
    size: "UK 8",
    price: 329900,
    stock: 8,
    cod: true,
  },
  {
    slug: "performance-tee",
    name: "Performance training tee",
    size: "M",
    price: 89900,
    stock: 24,
    cod: true,
  },
  {
    slug: "tour-kitbag",
    name: "Tour 6-racket kitbag",
    size: "One size",
    price: 249900,
    stock: 6,
    cod: false,
  },
  {
    slug: "feather-shuttles",
    name: "Feather shuttle tube",
    size: "12 pcs",
    price: 189900,
    stock: 0,
    cod: true,
  },
];
export const demoRows: OrderInput[] = [
  {
    order_id: "ORD-1001",
    product_url: "https://demo.orderguard.example/products/aero-pro-racket",
    size: "4U",
    price: "6499",
    quantity: 1,
    shipping_address:
      "Demo Customer, 12 Sample Road, Bengaluru, Karnataka 560001, India",
    payment_method: "cod",
    currency: "INR",
  },
  {
    order_id: "ORD-1002",
    product_url: "https://demo.orderguard.example/products/court-stride-shoes",
    size: "UK 8",
    price: "2999",
    quantity: 1,
    shipping_address:
      "Demo Customer, 12 Sample Road, Bengaluru, Karnataka 560001, India",
    payment_method: "prepaid",
    currency: "INR",
  },
  {
    order_id: "ORD-1003",
    product_url: "https://demo.orderguard.example/products/performance-tee",
    size: "M",
    price: "899",
    quantity: 2,
    shipping_address:
      "Demo Customer, 12 Sample Road, Bengaluru, Karnataka 560001, India",
    payment_method: "prepaid",
    currency: "INR",
  },
  {
    order_id: "ORD-1004",
    product_url: "https://demo.orderguard.example/products/feather-shuttles",
    size: "12 pcs",
    price: "1899",
    quantity: 1,
    shipping_address:
      "Demo Customer, 12 Sample Road, Bengaluru, Karnataka 560001, India",
    payment_method: "cod",
    currency: "INR",
  },
];
export function money(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(text))
    throw Error(
      "Price must be a positive number with at most 2 decimal places.",
    );
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (amount <= 0) throw Error("Price must be greater than zero.");
  return amount;
}
export function normalize(raw: Record<string, unknown>): OrderInput {
  const allowed = [
    "order_id",
    "product_url",
    "size",
    "price",
    "quantity",
    "shipping_address",
    "payment_method",
    "currency",
  ];
  if (Object.keys(raw).some((k) => !allowed.includes(k)))
    throw Error(
      "Unexpected column. Use the template columns only; never upload card numbers or CVV.",
    );
  const order_id = String(raw.order_id ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(order_id))
    throw Error(
      "Order ID must contain 1–64 letters, numbers, underscores or hyphens.",
    );
  const product_url = String(raw.product_url ?? "").trim();
  try {
    const u = new URL(product_url);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      product_url.length > 500
    )
      throw Error();
  } catch {
    throw Error("Product URL must be a valid HTTPS URL.");
  }
  const size = String(raw.size ?? "").trim();
  if (!size || size.length > 40)
    throw Error("Size is required (up to 40 characters).");
  const price = String(raw.price ?? "").trim();
  money(price);
  const quantity = Number(raw.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw Error("Quantity must be a whole number from 1 to 100.");
  const shipping_address = String(raw.shipping_address ?? "").trim();
  if (shipping_address.length < 15 || shipping_address.length > 500)
    throw Error("Shipping address must contain 15–500 characters.");
  const payment_method = String(raw.payment_method ?? "cod")
    .trim()
    .toLowerCase();
  if (!["cod", "prepaid"].includes(payment_method))
    throw Error("Payment method must be cod or prepaid.");
  const currency = String(raw.currency ?? "INR")
    .trim()
    .toUpperCase();
  if (currency !== "INR") throw Error("This demo accepts INR only.");
  return {
    order_id,
    product_url,
    size,
    price,
    quantity,
    shipping_address,
    payment_method: payment_method as "cod" | "prepaid",
    currency,
  };
}
export function quote(row: OrderInput) {
  let p: Product | undefined;
  const url = new URL(row.product_url);
  if (
    url.origin === "https://demo.orderguard.example" &&
    !url.search &&
    !url.hash
  )
    p = catalog.find(
      (x) =>
        url.pathname === `/products/${x.slug}` &&
        x.size.toLowerCase() === row.size.toLowerCase(),
    );
  const expected = money(row.price);
  const reason = !p
    ? "Product or size not found in the demo catalog."
    : p.price !== expected
      ? "Excel and marketplace unit prices do not match."
      : p.stock < row.quantity
        ? "Requested quantity is unavailable."
        : row.payment_method === "cod" && !p.cod
          ? "Cash on delivery is unavailable for this product."
          : null;
  return {
    eligible: !reason,
    reason,
    product: p?.name ?? "Unknown product",
    market_price: p?.price ?? null,
    expected_price: expected,
    subtotal: expected * row.quantity,
    shipping: 0,
    tax: 0,
    total: expected * row.quantity,
    checked_at: new Date().toISOString(),
    source: "Demo catalog",
    price_basis: "INR unit price; tax included; demo shipping free",
  };
}
