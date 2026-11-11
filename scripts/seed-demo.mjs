// Isi database dengan data contoh supaya bisa langsung coba aplikasinya.
// Jalankan sekali setelah app pernah start (tabel & kategori sudah dibuat):
//   DATABASE_URL=postgres://... npm run seed:demo
// Docker: docker compose exec app node scripts/seed-demo.mjs   (butuh folder scripts di image)
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: [{ n }] } = await client.query("select count(*)::int as n from transactions");
if (n > 0 && !process.argv.includes("--force")) {
  console.log(`Sudah ada ${n} transaksi. Pakai --force kalau tetap mau menambah data contoh.`);
  await client.end();
  process.exit(0);
}

const cats = Object.fromEntries((await client.query("select id, code from categories")).rows.map((r) => [r.code, r.id]));
const accs = (await client.query("select id, name from accounts order by sort, id")).rows;
if (!accs.length || !cats["4-01"]) throw new Error("Kategori/akun belum ada. Start aplikasinya dulu sekali.");
const acc = (i) => accs[Math.min(i, accs.length - 1)].id;
const KAS = acc(0), BANK = acc(1), PG = acc(2);

// PRNG deterministik supaya hasilnya selalu sama
let seed = 20260518;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const between = (a, b) => Math.round((a + rand() * (b - a)) / 1000) * 1000;
const year = Number(process.env.DEMO_YEAR || new Date().getFullYear());
const lastMonth = Math.min(12, Number(process.env.DEMO_MONTHS || new Date().getMonth() + 1));
const d = (m, day) => `${year}-${String(m).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;

const tx = [];
const add = (date, code, account, direction, amount, description, ref = "") =>
  tx.push([date, description, cats[code], account, direction, amount, ref]);

add(d(1, 2), "3-01", BANK, "in", 50_000_000, "Setoran modal awal", "MODAL-01");
add(d(1, 5), "1-01", BANK, "out", 18_500_000, "Mesin bubut kayu mini", "INV-ALAT-01");
add(d(1, 2), "0-01", BANK, "out", 2_000_000, "Isi kas tunai awal");
add(d(1, 2), "0-01", KAS, "in", 2_000_000, "Isi kas tunai awal");
let order = 1001;
for (let m = 1; m <= lastMonth; m++) {
  const start = tx.length;
  const growth = 1 + m * 0.12;
  const online = 3 + Math.floor(rand() * 4 * growth);
  for (let i = 0; i < online; i++) {
    const amt = between(250_000, 1_800_000);
    add(d(m, 2 + i * 3), "4-01", PG, "in", amt, `Order #${order} toko online`, `ORD-${order++}`);
    add(d(m, 3 + i * 3), "6-05", PG, "out", Math.round(amt * 0.02 / 100) * 100, `MDR payment gateway #${order - 1}`);
  }
  if (m % 2 === 0) add(d(m, 14), "4-03", BANK, "in", between(4_000_000, 12_000_000), "Pesanan custom reseller", `INV-B2B-${m}`);
  add(d(m, 8), "4-02", BANK, "in", between(1_500_000, 4_500_000), "Pencairan marketplace", `MP-${m}`);
  add(d(m, 4), "5-01", BANK, "out", between(2_000_000, 5_000_000), "Pembelian bahan baku");
  add(d(m, 6), "5-02", KAS, "out", between(300_000, 900_000), "Bahan finishing & aksesoris");
  add(d(m, 25), "5-03", KAS, "out", between(2_500_000, 4_000_000), "Upah produksi bulanan");
  add(d(m, 10), "5-04", KAS, "out", between(200_000, 600_000), "Kardus & label");
  add(d(m, 12), "6-02", KAS, "out", between(300_000, 1_200_000), "Ongkir ke ekspedisi");
  add(d(m, 15), "6-03", BANK, "out", between(500_000, 1_500_000), "Iklan media sosial");
  add(d(m, 1), "6-04", BANK, "out", 350_000, "Hosting & domain");
  add(d(m, 20), "6-07", KAS, "out", between(250_000, 450_000), "Listrik & internet workshop");
  add(d(m, 27), "7-01", BANK, "in", between(5_000, 25_000), "Jasa giro bank");
  add(d(m, 27), "7-02", BANK, "out", 15_000, "Biaya admin bank");
  if (m === 4) add(d(m, 18), "6-91", KAS, "out", 650_000, "Jamuan calon reseller");

  // saldo payment gateway dicairkan ke bank, kas tunai diisi ulang dari bank
  const month = tx.slice(start);
  const net = (acc) => month.filter((t) => t[3] === acc).reduce((a, t) => a + (t[4] === "in" ? t[5] : -t[5]), 0);
  const pgNet = net(PG);
  if (pgNet > 0) {
    add(d(m, 26), "0-01", PG, "out", pgNet, "Pencairan saldo payment gateway");
    add(d(m, 26), "0-01", BANK, "in", pgNet, "Pencairan saldo payment gateway");
  }
  const kasNeed = -net(KAS);
  if (kasNeed > 0) {
    add(d(m, 3), "0-01", BANK, "out", kasNeed, "Tarik tunai untuk kas");
    add(d(m, 3), "0-01", KAS, "in", kasNeed, "Tarik tunai untuk kas");
  }
}

for (const t of tx) {
  await client.query(
    "insert into transactions (date, description, category_id, account_id, direction, amount, ref) values ($1,$2,$3,$4,$5,$6,$7)",
    t,
  );
}
console.log(`${tx.length} transaksi contoh ditambahkan untuk tahun ${year}.`);
await client.end();
