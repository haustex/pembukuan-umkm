<div align="center">

# Pembukuan UMKM

**Aplikasi pembukuan & laporan keuangan self-hosted untuk UMKM Indonesia.**<br>
Catat uang masuk/keluar, dapat laporan laba rugi, rekap PPh, dan export Excel/PDF yang siap buat SPT.

[![CI](https://github.com/haustex/pembukuan-umkm/actions/workflows/ci.yml/badge.svg)](https://github.com/haustex/pembukuan-umkm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-black)

Dibuat dan dipakai sendiri oleh **[Haus Kayu](https://hauskayu.com)**, produsen custom furniture & kerajinan kayu jati dari Jepara.

<img src="docs/screenshots/dashboard.png" alt="Dashboard" width="900">

</div>

> **English:** A self-hosted bookkeeping & financial reporting app for Indonesian small businesses (UMKM). Record cash in/out, get profit & loss, monthly tax recap (PPh Final 0.5% under PP 20/2026, or corporate tax with Article 31E facility), and export to Excel/PDF. Multi-user with roles, Docker-ready. UI and docs are in Bahasa Indonesia.

---

## Kenapa dibuat

Kebanyakan aplikasi akuntansi terlalu ribet buat UMKM. Di sisi lain, catatan di spreadsheet gampang berantakan pas mau lapor pajak. Aplikasi ini ada di tengah-tengahnya:

- **Inputnya cuma buku kas**: tanggal, nominal, kategori, akun. Nggak perlu ngerti jurnal debit-kredit.
- **Laporannya langsung kebentuk**: laba rugi, koreksi fiskal, PKP, estimasi PPh, dan rekap per bulan.
- **Data di server sendiri.** Nggak ada langganan bulanan, nggak ada pihak ketiga yang ikut lihat angka lo.

## Fitur

| | |
|---|---|
| **Transaksi** | Uang masuk, uang keluar, dan transfer antar akun (otomatis jadi 2 baris). Filter per bulan/kategori/akun, pencarian, tombol "Simpan & lanjut" buat input cepat. |
| **Dashboard** | Omzet, laba, estimasi PPh, saldo per akun, grafik bulanan, dan pengingat batas setor PPh Final. |
| **Laporan** | Laba Rugi & Pajak (koreksi fiskal → PKP → PPh), Rekap Bulanan, Rincian per Kategori, Saldo per Akun. |
| **Export** | Laporan tahunan ke **Excel** (5 sheet, angkanya angka beneran) dan **PDF** (A4, siap cetak). Buku kas sesuai filter juga bisa ke Excel & PDF. |
| **Pajak** | 3 skema: PT/CV tarif umum + fasilitas **Pasal 31E**, **PT Perorangan** PPh Final 0,5%, **Orang Pribadi** PPh Final 0,5% dengan omzet bebas Rp500 juta. Mengikuti **PP 20/2026**. |
| **Multi-user** | Role **Owner** (akses penuh), **Staf** (catat transaksi), dan **Konsultan** (cuma lihat & download laporan). |
| **Kategori** | 38 kategori siap pakai dengan kode ala akuntan (4-xx pendapatan, 5-xx HPP, 6-xx beban, dst). Semuanya bisa diubah. |
| **Mobile** | Tampilan responsif, enak dipakai catat transaksi dari HP. |

<table>
  <tr>
    <td><img src="docs/screenshots/catat-transaksi.png" alt="Catat transaksi"></td>
    <td><img src="docs/screenshots/laporan-laba-rugi.png" alt="Laporan laba rugi"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/transaksi.png" alt="Daftar transaksi"></td>
    <td><img src="docs/screenshots/laporan-bulanan.png" alt="Rekap bulanan"></td>
  </tr>
</table>

## Pasang dalam 5 menit

Yang dibutuhkan: server/VPS dengan **Docker** dan **Docker Compose**, plus domain atau subdomain.

```bash
git clone https://github.com/haustex/pembukuan-umkm.git
cd pembukuan-umkm
cp .env.example .env
nano .env                 # isi POSTGRES_PASSWORD, BRAND_NAME, ADMIN_EMAIL, ADMIN_PASSWORD

docker compose up -d      # pakai image siap pakai dari GitHub Container Registry
docker compose logs -f app   # tunggu sampai muncul "[bootstrap] Owner ... dibuat"
```

App jalan di `127.0.0.1:3010`. Sambungkan ke domain lewat reverse proxy. Contoh config Caddy ada di [`deploy/Caddyfile.snippet`](deploy/Caddyfile.snippet):

```caddy
lk.example.com {
	reverse_proxy 127.0.0.1:3010
}
```

Buka domainnya, login pakai `ADMIN_EMAIL`, lalu:

1. **Akun Saya**: ganti password. Habis itu hapus `ADMIN_PASSWORD` dari `.env`.
2. **Pengaturan**: pilih skema pajak, isi tanggal mulai pembukuan dan saldo awal tiap akun.
3. **Pengguna**: tambah staf atau konsultan pajak kalau perlu.

Mau coba-coba dulu? Isi data contoh:

```bash
docker compose exec app node scripts/seed-demo.mjs
```

### Build sendiri dari source

```bash
docker compose up -d --build
```

### Update ke versi terbaru

```bash
git pull
docker compose pull && docker compose up -d   # atau: docker compose up -d --build
```

Migrasi database jalan otomatis waktu app start.

### Backup

```bash
# backup harian jam 02:15, simpan 30 file terakhir di folder backups/
crontab -e
15 2 * * * /opt/pembukuan-umkm/deploy/backup.sh
```

Restore:

```bash
gunzip -c backups/lk-XXXX.sql.gz | docker compose exec -T db psql -U lk -d lk
```

Simpan salinan backup di tempat lain juga (S3/R2/Google Drive). Jangan cuma di server yang sama.

## Konfigurasi (`.env`)

| Variabel | Fungsi |
|---|---|
| `POSTGRES_PASSWORD` | Password database (wajib). |
| `BRAND_NAME` | Nama di logo, judul halaman, dan header PDF. Default: `Pembukuan`. |
| `BUSINESS_NAME` | Nama usaha/badan usaha awal. Bisa diubah lagi di Pengaturan. |
| `SEED_ACCOUNTS` | Akun kas awal, dipisah koma, mis. `Kas Tunai,BCA,Midtrans`. |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Owner pertama. Cuma dipakai kalau belum ada user sama sekali. |
| `APP_IMAGE` | Ganti image Docker kalau mau pakai fork sendiri. |

## Cara pakai yang benar

- **Penjualan dicatat nilai kotornya.** Potongan payment gateway/marketplace dicatat terpisah di `6-05`, biar omzet buat pajak nggak kekecilan.
- **Pindah saldo antar rekening pakai Transfer.** Transfer nggak dihitung sebagai omzet atau biaya.
- **Uang pribadi masuk ke usaha** dicatat `3-01 Setoran Modal`. **Uang usaha dipakai pribadi** dicatat `3-02`.
- **Beli alat/mesin yang dipakai lebih dari setahun** dicatat `1-01 Aset Tetap`, bukan biaya. Penyusutannya diisi di akhir tahun lewat Pengaturan.
- **Jamuan, sumbangan, dan denda** (`6-9x`) tetap dicatat. Nanti otomatis dikoreksi fiskal.
- Tiap bulan, **cocokkan saldo akun** dengan mutasi bank.

## Catatan pajak

Hitungannya mengikuti **PP 20/2026** (berlaku 22 April 2026) dan **Pasal 31E UU PPh**:

- PPh Final 0,5% dari omzet cuma untuk **Orang Pribadi**, **PT Perorangan**, dan **koperasi**, tanpa batas waktu (koperasi maks. 4 tahun). Khusus Orang Pribadi, omzet Rp500 juta pertama per tahun bebas pajak.
- **PT biasa / CV** yang terdaftar mulai 22 April 2026 pakai tarif umum PPh Badan 22%. Dengan fasilitas Pasal 31E, omzet sampai Rp4,8 M dapat diskon 50% (efektif 11% dari PKP).
- PPh Final disetor paling lambat tanggal 15 bulan berikutnya.

> ⚠️ Angka di aplikasi adalah **estimasi untuk persiapan**, bukan nasihat pajak. Konfirmasi ke KPP atau konsultan pajak sebelum lapor SPT. Aturan bisa berubah. Kalau ada yang nggak sesuai, silakan buka issue.

## Development

```bash
npm install
# siapkan Postgres, lalu buat .env.local:
#   DATABASE_URL=postgres://user:pass@localhost:5432/lk
#   ADMIN_EMAIL=... ADMIN_PASSWORD=...
npm run dev          # http://localhost:3010
npm run typecheck
npm run seed:demo    # data contoh
```

Kalau ubah schema di `src/lib/db/schema.ts`, jalankan `npm run db:generate` lalu commit folder `drizzle/`.

**Stack:** Next.js 16 (App Router, Server Actions) · PostgreSQL · Drizzle ORM · Tailwind CSS 4 · exceljs · pdfkit.

```
src/app/(app)/        halaman setelah login
src/app/login/        halaman login
src/app/api/export/   download Excel & PDF
src/lib/report.ts     semua hitungan laporan & pajak
src/lib/export-*.ts   generator Excel & PDF
src/lib/bootstrap.ts  migrasi otomatis + data awal
drizzle/              migrasi SQL
deploy/               contoh Caddy & script backup
```

## Kontribusi

PR dan issue welcome, terutama buat:

- update aturan pajak terbaru,
- upload foto bukti transaksi (S3/R2),
- import dari CSV/mutasi bank,
- laporan neraca sederhana.

Tolong buka issue dulu buat perubahan besar.

## Sponsor

Aplikasi ini gratis (MIT) dan dirawat oleh workshop furnitur kecil di Jepara. Kalau aplikasi ini menghemat waktu lo,
[dukung Haus Kayu lewat GitHub Sponsors](https://github.com/sponsors/haustex).

### Sponsor bisnis

_Logo lo di sini. [Jadi sponsor Business](https://github.com/sponsors/haustex) ($50/bulan)._

### Backer

_Nama lo di sini. [Jadi Backer](https://github.com/sponsors/haustex) ($10/bulan)._

## Lisensi

[MIT](LICENSE). Bebas dipakai, diubah, dan dijual. Kalau berguna buat usaha lo, kasih ⭐ ya.

---

<div align="center">
Dibuat di Jepara oleh <a href="https://hauskayu.com"><b>// HAUS KAYU</b></a>, custom furniture & kerajinan kayu jati.
</div>
