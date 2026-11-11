import type { CategoryGroup, Role, TaxScheme } from "./db/schema";

export const GROUP_LABEL: Record<CategoryGroup, string> = {
  pendapatan: "Pendapatan Usaha",
  hpp: "HPP",
  beban: "Beban Usaha",
  beban_nd: "Beban Non-Deductible",
  lain: "Lain-lain",
  pajak: "Pajak Penghasilan",
  aset: "Aset (bukan biaya)",
  pinjaman: "Pinjaman",
  modal: "Modal",
  transfer: "Transfer Antar Akun",
};

export const GROUP_ORDER: CategoryGroup[] = [
  "pendapatan",
  "hpp",
  "beban",
  "beban_nd",
  "lain",
  "pajak",
  "aset",
  "pinjaman",
  "modal",
  "transfer",
];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  staff: "Staf",
  viewer: "Konsultan (lihat saja)",
};

export const SCHEME_LABEL: Record<TaxScheme, string> = {
  pt_umum: "PT Biasa / CV — tarif umum (Ps 31E)",
  pt_perorangan: "PT Perorangan — PPh Final 0,5%",
  op: "Orang Pribadi — PPh Final 0,5%",
};

export const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Daftar kategori default (chart of accounts sederhana untuk UMKM). Bisa diubah di menu Pengaturan. */
export const DEFAULT_CATEGORIES: {
  code: string;
  name: string;
  group: CategoryGroup;
  description: string;
  finalTaxed?: boolean;
}[] = [
  { code: "4-01", name: "Penjualan Toko Online", group: "pendapatan", description: "Order lewat website sendiri (payment gateway / transfer)" },
  { code: "4-02", name: "Penjualan Marketplace", group: "pendapatan", description: "Shopee, Tokopedia, Etsy, dll. Catat nilai kotor; potongan komisi masuk 6-05" },
  { code: "4-03", name: "Penjualan Langsung / B2B", group: "pendapatan", description: "Pesanan custom, reseller, proyek, toko offline" },
  { code: "4-04", name: "Penjualan Ekspor", group: "pendapatan", description: "Order luar negeri, dalam Rupiah" },
  { code: "4-05", name: "Ongkir Ditagih ke Pembeli", group: "pendapatan", description: "Ongkir yang dibayar pembeli ke usaha" },
  { code: "5-01", name: "Bahan Baku", group: "hpp", description: "Bahan utama produk" },
  { code: "5-02", name: "Bahan Penolong & Finishing", group: "hpp", description: "Bahan pendukung, finishing, aksesoris" },
  { code: "5-03", name: "Upah Produksi / Tukang", group: "hpp", description: "Upah borongan / harian tukang" },
  { code: "5-04", name: "Kemasan", group: "hpp", description: "Box, label, kertas, bubble wrap" },
  { code: "5-05", name: "Maklon / Jasa Produksi Luar", group: "hpp", description: "Produk/komponen yang dikerjakan pihak lain" },
  { code: "6-01", name: "Gaji & Tunjangan Karyawan", group: "beban", description: "Termasuk PPh 21 yang disetor & BPJS" },
  { code: "6-02", name: "Ongkos Kirim & Ekspedisi", group: "beban", description: "Kurir, cargo, air/sea freight" },
  { code: "6-03", name: "Iklan & Marketing", group: "beban", description: "Iklan online, tools sosmed, foto produk" },
  { code: "6-04", name: "Server, Domain & Software", group: "beban", description: "Hosting, domain, langganan software" },
  { code: "6-05", name: "Biaya Payment Gateway & Marketplace", group: "beban", description: "MDR payment gateway, komisi marketplace" },
  { code: "6-06", name: "Sewa Tempat / Workshop", group: "beban", description: "Sewa workshop / gudang" },
  { code: "6-07", name: "Listrik, Air & Internet", group: "beban", description: "Listrik, wifi, pulsa usaha" },
  { code: "6-08", name: "Transportasi & BBM", group: "beban", description: "Bensin, parkir, tol untuk keperluan usaha" },
  { code: "6-09", name: "ATK & Perlengkapan", group: "beban", description: "Alat tulis, alat kecil < 1 tahun pakai" },
  { code: "6-10", name: "Jasa Profesional", group: "beban", description: "Notaris, konsultan pajak, freelancer" },
  { code: "6-11", name: "Perizinan & Legalitas", group: "beban", description: "NIB, merek dagang, sertifikasi" },
  { code: "6-12", name: "Perawatan & Perbaikan", group: "beban", description: "Servis mesin, perbaikan alat & workshop" },
  { code: "6-13", name: "Beban Lain-lain", group: "beban", description: "Biaya usaha yang tidak masuk kategori lain" },
  { code: "6-91", name: "Jamuan / Entertainment", group: "beban_nd", description: "Dikoreksi fiskal kecuali ada daftar nominatif" },
  { code: "6-92", name: "Sumbangan", group: "beban_nd", description: "Donasi, sumbangan acara" },
  { code: "6-93", name: "Denda & Sanksi Pajak", group: "beban_nd", description: "Denda telat lapor/setor, bunga STP" },
  { code: "7-01", name: "Bunga / Jasa Giro Bank", group: "lain", description: "Sudah kena PPh final di bank, bukan omzet", finalTaxed: true },
  { code: "7-02", name: "Biaya Admin Bank", group: "lain", description: "Admin bulanan, biaya transfer" },
  { code: "7-03", name: "Beban Bunga Pinjaman", group: "lain", description: "Bunga saja; pokok pinjaman masuk 2-02" },
  { code: "7-04", name: "Selisih Kurs", group: "lain", description: "Untung (masuk) / rugi (keluar) kurs order USD" },
  { code: "8-01", name: "Setor PPh Final 0,5%", group: "pajak", description: "Setoran bulanan pakai kode billing" },
  { code: "8-02", name: "Setor PPh Badan (Ps 25/29)", group: "pajak", description: "Angsuran PPh 25 / pelunasan PPh 29" },
  { code: "1-01", name: "Beli Aset Tetap", group: "aset", description: "Mesin, alat, laptop, kendaraan (pakai > 1 tahun)" },
  { code: "2-01", name: "Pinjaman Diterima", group: "pinjaman", description: "Pinjaman bank / pihak lain" },
  { code: "2-02", name: "Cicilan Pokok Pinjaman", group: "pinjaman", description: "Pokok saja; bunganya ke 7-03" },
  { code: "3-01", name: "Setoran Modal", group: "modal", description: "Uang pribadi / investor masuk ke usaha" },
  { code: "3-02", name: "Pengambilan Pemilik / Dividen", group: "modal", description: "Uang usaha dipakai pribadi / bagi hasil" },
  { code: "0-01", name: "Transfer Antar Akun", group: "transfer", description: "Mis. payment gateway → bank: 2 transaksi, keluar & masuk" },
];

/** Arah default sebuah kategori, untuk bantu urutkan pilihan di form. */
export function suggestDirection(code: string, group: CategoryGroup): "in" | "out" | null {
  if (["2-01", "3-01", "7-01"].includes(code)) return "in";
  if (["2-02", "3-02", "7-02", "7-03"].includes(code)) return "out";
  if (group === "pendapatan") return "in";
  if (["hpp", "beban", "beban_nd", "pajak", "aset"].includes(group)) return "out";
  return null;
}

export const DEFAULT_ACCOUNTS = ["Kas Tunai", "Rekening Bank", "Payment Gateway"];
