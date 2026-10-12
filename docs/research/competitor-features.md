# Riset Fitur Pesaing HARUM.IN

Tanggal akses semua sumber: 2026-10-13. Peneliti: Claude (sesi riset). Rujukan [S#] mengarah ke daftar Sumber di bagian akhir.

Konvensi:
- **FAKTA** = tertulis di sumber primer yang dirujuk. **INFERENSI** = kesimpulan saya, bukan klaim sumber.
- "Tidak ditemukan" = tidak tertulis di halaman yang berhasil saya baca. Itu BUKAN bukti fitur itu tidak ada (banyak halaman produk hanya ringkasan; sebagian situs memblokir pembacaan otomatis).
- "Belum terverifikasi primer" = satu-satunya informasi berasal dari pihak ketiga, atau sumber primer tidak dapat dibuka.
- Batasan: situs Kasir Pintar, developer.grab.com, dokumentasi SATUSEHAT (sebagian besar), BPJS P-Care, Shopee Open Platform, ShopeeFood, dan Ginee menolak/gagal dibaca (robots atau halaman kosong). Lihat bagian Sumber.

---

## 1. Ringkasan (10 baris)

1. Pesaing POS Indonesia yang paling lengkap di F&B adalah majoo (paket Prime Rp999.000/outlet/bulan: KDS, self order, GoFood+GrabFood, payroll, server lokal offline) [S1][S2]. Moka dan Olsera kuat di integrasi ekosistem, Pawoon unggul di harga entry dan Open API [S6][S12][S14][S15].
2. Integrasi GoFood/GrabFood adalah fitur pembeda utama di tingkat paket atas: majoo (Prime), Moka (GoFood langsung, GrabFood lewat Hubster), Olsera (GrabFood di Basic) [S1][S8][S10][S12].
3. GoFood punya API partner publik dengan sandbox dan jalur "Facilitator" khusus penyedia POS [S37][S38]. Ini jalur yang bisa dicoba HARUM.IN tanpa menunggu kemitraan formal (FAKTA terbatas pada dokumentasi pembuka; biaya dan kriteria go-live detail tidak ditemukan).
4. GrabFood punya "GrabFood Point of Sale API" tetapi syarat onboarding tidak dapat dibaca (dokumentasi memblokir) [S40][S39]. ShopeeFood: tidak ditemukan sumber primer API/POS.
5. QRIS dinamis gratis dihasilkan merchant per BI; jalur praktis untuk vendor perangkat lunak adalah PJP berizin atau payment gateway (Midtrans: acquirer GoPay dan ShopeePay; Xendit: maks Rp10 juta, T+1) [S41][S42][S43].
6. PPN: tarif nominal 12% tetapi efektif 11% untuk barang non-mewah (DPP nilai lain 11/12) berdasarkan PMK 131/2024; pedagang eceran PKP boleh tidak mencantumkan identitas pembeli akhir di faktur pajak [S46][S47]. PB1/PBJT makanan-minuman maksimal 10% [S51].
7. Aplikasi klinik gigi Indonesia (Klinik Pintar, kumoDent, KlinikDent, Dentiva) sudah umum menyediakan odontogram digital dan SATUSEHAT; "rencana perawatan" tidak tertulis eksplisit di ketiganya yang dicek (kecuali pesaing global Dentally) [S25][S27][S28][S29][S59]. INFERENSI: ini ruang pembeda HARUM.IN.
8. BPJS: bridging P-Care/VClaim ditawarkan vendor klinik (Klinik Pintar menyebut 300+ klinik; KlinikDent: cek kepesertaan VClaim) tetapi syarat resmi BPJS untuk vendor belum terverifikasi primer [S26][S28][S52].
9. UU PDP 27/2022 berlaku sejak 17 Okt 2022; kesehatan, biometrik, dan keuangan pribadi tergolong data pribadi spesifik; sanksi administratif denda sampai 2% pendapatan [S57][S58]. Relevan langsung ke RME, absensi GPS/biometrik, dan CRM.
10. Celah terbesar HARUM.IN vs pasar: integrasi food delivery, QRIS dinamis/payment gateway, self-order QR, toko online/marketplace, Open API publik, dan pengingat WhatsApp klinik (rincian di bagian 5).

---

## 2. Matriks fitur x pesaing

Legenda: **Ya** = tertulis di sumber. **$** = berbayar/hanya paket tertentu (paket disebut). **-** = tidak ditemukan di halaman yang terbaca. **N/V** = tidak terverifikasi karena sumber primer tidak terbaca.

### 2a. Pesaing Indonesia

| Fitur | Moka | majoo | Olsera | Pawoon | iSeller | Kasir Pintar |
|---|---|---|---|---|---|---|
| POS dasar (kasir, laporan) | Ya [S6] | Ya [S1] | Ya [S11] | Ya [S13] | Ya [S16] | N/V |
| Multi-outlet | Ya [S6] | $ Advance+ [S1] | Ya (dashboard franchise $ Pro) [S12] | Ya ($ Pro per outlet) [S14] | Ya [S16] | N/V |
| Denah/manajemen meja | Ya [S6] | Ya (kustom layout $ Prime+) [S2] | Ya [S11] | Ya (Modul Meja) [S15] | - | N/V |
| Kitchen display (KDS) | - [S7] | $ Prime [S1][S2] | - [S11] | - [S15] | - | N/V |
| Self order / menu QR | $ (QR digital menu) [S6] | $ Advance (QR e-menu), Prime (self order) [S1][S2] | $ Pro (self-order) [S12] | Ya (menu digital, pesanan online) [S15] | - | N/V |
| Stok bahan / resep | Ya (ingredients inventory) [S6] | Ya (resep varian, auto kurang stok) [S2] | - (stok umum saja) [S11] | Ya ($ Pro inventory) [S14] | Varian & bundle saja [S16] | N/V |
| Purchase order & supplier | Ya (artikel bantuan) [S61] | - eksplisit; Prime: "item request, purchase delivery" [S1] | - | - | - | N/V |
| Akuntansi / jurnal | - di halaman Moka; integrasi mitra Jurnal [S9] | $ Advance+ (CoA, auto posting) [S1] | $ Pro (Olsera Akunting) [S12] | Integrasi akuntansi (nama tidak disebut) [S13] | - [S16] | N/V |
| Absensi karyawan | Manajemen karyawan (rincian - ) [S6] | $ Advance (foto), Prime (geolokasi) [S1] | Ya (PIN Basic; wajah $ Pro) [S12] | Pro employee mgmt [S14] | - | N/V |
| Payroll / slip gaji | - | $ Prime [S1] | - (komisi penjualan saja) [S11] | - | - | N/V |
| CRM / loyalty / poin | Ya [S6][S7] | Ya CRM; membership "coming soon" di Prime+ [S1] | Manajemen pelanggan & promo; loyalty tidak disebut [S11] | CRM & promosi $ Pro [S14] | Ya [S16] | N/V |
| Promo / voucher | Ya [S6] | Ya (promo, reward) [S3] | Ya [S11] | Ya [S15] | - | N/V |
| Integrasi GoFood | Ya (via GoBiz; gratis tahun pertama) [S8] | $ Prime [S1][S4] | - [S11] | - (hanya GoSend) [S13] | - | N/V |
| Integrasi GrabFood | Ya (via Hubster) [S10] | $ Prime [S1][S5] | $ Basic [S12] | - (hanya GrabExpress) [S13] | - | N/V |
| Integrasi ShopeeFood | - (hanya disebut sebagai contoh Hub tak terpakai) [S10] | - [S2] | - [S11] | - | - | N/V |
| QRIS | Ya [S6] | Ya; dinamis $ Advance [S1] | Ya (Olsera QRIS) + Midtrans, Xendit [S11] | Ya (pembayaran digital) [S13] | iSeller Pay (kartu) [S16] | N/V |
| Mode offline | - [S7] | $ Prime (Local Server) [S1][S2] | - [S11] | - | Ya (SmartSync) [S16] | N/V |
| API terbuka | Ya (Moka Connect, Private Solution) [S9] | - | - [S11] | Ya (Open API) [S13][S15] | - | N/V |
| Marketplace (Shopee/Tokopedia) | - | $ Prime (Shopee, GrabMart) [S1] | $ Pro [S12] | - | Disebut "Marketplaces" tanpa nama [S16] | N/V |
| Toko online / web order | Ya (Moka Order) [S7] | Ya (semua paket; website $ Prime) [S1] | Ya [S11] | Ya (pesanan online) [S15] | Ya [S16] | N/V |
| Kurir | - | - | Ya (50+ kurir) [S11] | GoSend, GrabExpress [S13] | - | N/V |
| Medical record / klinik | - | Prime Beauty: rekam medis pelanggan; Prime+: service/treatment records [S1][S3] | - | - | - | N/V |
| Harga entry (per outlet/bulan) | Rp299.000 [S6] | Rp249.000 [S1] | Rp1.288.000/tahun [S12] | Free (batas transaksi); Pro Rp299.000 [S14] | tidak ditemukan | N/V |

### 2b. Pembanding global

| Fitur | Loyverse | Square | Lightspeed | Odoo POS | Toast |
|---|---|---|---|---|---|
| KDS | Ya [S19] | $ add-on US$30/perangkat/bln (Plus) [S21] | Ya [S23] | Ya [S24] | Disebut (hardware) [S22] |
| Denah meja | Parsial (tiket bernama) [S19] | Ya [S20] | Ya [S23] | - di halaman (aplikasi "POS Restaurant" terpisah) [S24] | tidak ditemukan |
| Stok/resep, PO | Dasar gratis; PO/transfer $ US$25/bln [S18][S19] | Ya; multi-lokasi $ Plus [S20] | Ya, level bahan [S23] | via modul Inventory [S24] | Ya (Supplier & Accounting Suite) [S22] |
| Loyalty | Ya [S19] | Ya [S20] | Via integrasi [S23] | Ya (poin, eWallet, pricelist) [S24] | Ya (Marketing Suite) [S22] |
| Karyawan/jadwal/payroll | Time clock; employee mgmt $ US$25/bln [S18][S19] | Ya, termasuk payroll [S20] | Via integrasi (7shifts) [S23] | - | Ya [S22] |
| Offline | Ya [S19] | Pembayaran offline 24 jam [S20] | Ya [S23] | Ya [S24] | tidak ditemukan |
| Self order / kiosk | - | $ Kiosk add-on [S21] | Ya (QR, tableside) [S23] | Ya [S24] | tidak ditemukan |
| Online ordering | - | Ya (tanpa biaya bulanan; Uber Eats, DoorDash) [S20] | Ya [S23] | via eCommerce [S24] | Ya [S22] |
| API | Ya [S19] | tidak ditemukan di halaman | Ya (partner API) [S23] | tidak ditemukan | - di halaman [S22] |
| Harga | Gratis + add-on [S18] | Free / US$49 / US$149 per lokasi [S21] | tidak ditemukan | tidak ditemukan | tidak ditemukan |

### 2c. Aplikasi klinik gigi/klinik

| Fitur | Klinik Pintar | kumoDent | KlinikDent | Dentiva | Dentally (global) | Dentrix (global) | Open Dental (global) |
|---|---|---|---|---|---|---|---|
| Odontogram digital | Ya [S25] | Ya [S27] | Ya (FDI, per permukaan, riwayat perubahan) [S28] | Ya [S29] | Charting Ya [S59] | Charting Ya [S30] | - di halaman [S32] |
| Rencana perawatan | - eksplisit [S25] | - eksplisit [S27] | - eksplisit [S28] | - | Ya [S59] | Tidak modul khusus [S30] | - |
| Pengingat janji | - eksplisit (hanya notifikasi email) [S25] | Ya (otomatis H-1, reschedule mandiri) [S27] | Ya (WhatsApp) [S28] | Ya (WhatsApp) [S29] | Ya [S59] | Ya [S30] | Ya (eReminders) [S32] |
| Booking online/portal | Ya (reservasi online, paket Siap) [S26] | Ya [S27] | - | - | Ya (Portal) [S59] | Ya [S30] | Portal disebut [S32] |
| ICD / koding | Ya (ICD-10) [S62] | - | Terkait diagnosis [S28] | Ya (ICD-10, ICD-9-CM, KFA) [S29] | - | - | - |
| SATUSEHAT | Ya [S26] | Ya [S27] | Ya (konfigurasi per klinik) [S28] | Ya (FHIR, antrean ulang) [S29] | n/a | n/a | n/a |
| BPJS (P-Care/VClaim) | Ya (P-Care/Mobile JKN) [S26] | - [S27] | VClaim cek kepesertaan [S28] | - di badan halaman [S29] | n/a | n/a | n/a |
| Asuransi/penjamin | Ya (manajemen penjamin) [S25] | - | - | - | - eksplisit | Ya (klaim otomatis) [S30] | - |
| Inventori (batch/kedaluwarsa) | Ya [S25] | Ya (FIFO, batch) [S27] | - | Ya (FEFO, HPP per tindakan) [S29] | - | - | - |
| Informed consent digital | - | Formulir digital [S27] | - | Ya [S29] | Ya (formulir) [S59] | Ya (intake) [S30] | - |
| Offline | - | - | - | Ya (draft offline) [S29] | - | - | - |
| Harga | Gratis (Mandiri); Rp300rb/bln (Siap) [S25] | tidak ditemukan | Rp99rb/bln [S28] | Rp299rb-1,499jt/bln [S29] | tidak ditemukan | tidak ditemukan | tidak ditemukan |

### 2d. Alat toko online (ringkas)

| Fitur | Jubelio | BigSeller | Shopify | Ginee |
|---|---|---|---|---|
| Multi-marketplace (Tokopedia, Shopee, Lazada, Blibli) | Ya [S33] | Ya (20+ platform, API resmi) [S34] | via apps (tidak diverifikasi) | N/V (halaman kosong) [S36] |
| Stok sinkron multi-gudang | Ya [S33] | Ya (inventory & purchasing) [S34] | Ya multi-lokasi [S35] | N/V |
| Cetak resi / kurir | Kurir terintegrasi [S33] | - eksplisit | Diskon pengiriman s.d. 87% [S35] | N/V |
| Dropship/reseller | - eksplisit; "distribution" [S34] | Fitur "distribution" disebut (maknanya tidak dijelaskan) [S34] | - | N/V |
| POS | Ya [S33] | Ya [S34] | Ya ($89/lokasi POS Pro) [S35] | N/V |
| Harga | tidak ditemukan | "Free omnichannel solution" (klaim vendor) [S34] | US$29-299/bln [S35] | N/V |

Catatan: Shopee/Tokopedia seller tools resmi tidak dapat dibaca (open.shopee.com diblokir). Bagian C ini sengaja ringkas dan tidak mencakup detail alat bawaan Shopee/Tokopedia.

---

## 3. Catatan per pesaing

**majoo.** Harga per outlet per bulan belum PPN: Starter Rp249.000, Advance Rp499.000, Prime Rp999.000, Prime+ harga konsultasi [S1]. Prime memuat KDS, Order Display, Self Order, Local Server offline, GoFood+GrabFood, payroll, majoo Teams (absensi geolokasi, ePayslip, transfer gaji bank) [S1]. Prime+ memuat kustom denah meja, gudang, cetak barcode, workflow, catatan layanan/perawatan [S1]. Integrasi GoFood: login nomor GoFood terdaftar dan kode konfirmasi; menu dipetakan, harga bisa markup/markdown, stok otomatis mengikuti stok majoo (untuk resep dihitung dari bahan baku paling sedikit); jangan ubah menu langsung di aplikasi GoFood [S4]. Integrasi GrabFood: butuh akun merchant GrabFood aktif, ekspor menu, sinkron pesanan [S5]. Panduan keduanya tidak menyebut syarat paket tertentu (paket Prime berasal dari halaman harga [S1]). Untuk klinik: ada produk Prime Beauty dengan rekam medis pelanggan [S3].

**Moka POS.** Basic Rp299.000, Pro Rp499.000, Enterprise Rp799.000 per outlet per bulan; centang fitur per paket tidak terbaca [S6]. GoFood: lewat GoBiz, wajib Auto-Accept, merchant tidak bisa membatalkan pesanan, harga maksimal Rp2.000.000, dan integrasi gratis tahun pertama lalu syarat dikaji ulang [S8]. GrabFood dan GoFood di Online Order Management lewat Hubster; GrabFood butuh persetujuan Grab pada integrasi pertama; perubahan menu perlu lima hari kerja pemberitahuan [S10]. Moka Connect: marketplace mitra (Circle Media, Digiresto, Jurnal, Storelogy) dan Private Solution API [S9].

**Olsera.** Basic Rp1.288.000, Premium Rp1.988.000, Pro Rp2.688.000 per tahun (belum PPN, harga promo) [S12]. Pro membuka marketplace, absensi wajah, Olsera Akunting, self-order, dashboard franchise [S12]. Beberapa mode layanan (Dine In, Take Away, Delivery, Reservasi) bertanda tambahan biaya di Premium [S12]. Sertifikasi ISO 27001 dan 27701 diklaim di beranda [S11].

**Pawoon.** Free (satu outlet; batas transaksi tertulis 7/hari di kartu paket dan 500/bulan di tabel, saling berbeda di halaman yang sama) dan Pro Rp299.000/outlet/bulan [S14]. Open API tersedia [S13][S15]. Pesan antar lewat GrabExpress dan GoSend, bukan GoFood/GrabFood [S13].

**iSeller.** Halaman produk: SmartSync offline, loyalty bawaan, "Food Delivery" dan "Marketplaces" tanpa nama platform [S16]. Harga tidak ditemukan.

**Kasir Pintar.** Situs memblokir pembacaan; hanya daftar hasil pencarian yang terlihat (halaman Harga, Fitur, Perbedaan Free vs Pro) [S17]. Semua isi: N/V.

**Loyverse, Square, Toast, Lightspeed, Odoo.** Lihat tabel 2b. Poin berguna untuk HARUM.IN: Loyverse memakai model "inti gratis + add-on berbayar per toko" (inventory lanjutan dan employee mgmt masing-masing US$25/bln) [S18]; Square memasang KDS dan Kiosk sebagai add-on per perangkat [S21]; Odoo dan Lightspeed menjual offline dan self-order sebagai bagian paket [S23][S24].

**Aplikasi klinik gigi Indonesia.** Klinik Pintar punya paket gratis (1 poliklinik, RME, odontogram), paket Siap Rp285-300rb/bln dengan BPJS dan SATUSEHAT, klaim 3.000 faskes [S25][S26]. KlinikDent Rp99rb/bln (maks 5 cabang, 25 pengguna), setup SATUSEHAT/VClaim butuh kredensial klinik [S28]. Dentiva Rp299rb-1,499jt/bln dan mencatat bahwa dokumen privasi/ketentuan masih draf [S29]. kumoDent tanpa harga di halaman, berbicara speech-to-text untuk catatan dokter [S27]. INFERENSI: pasar sudah memberi harga rendah (Rp0-300rb) untuk klinik; HARUM.IN sulit bersaing sebagai klinik-saja dan lebih masuk akal sebagai "POS+ERP yang juga paham klinik gigi".

**Alat toko online.** Jubelio: katalog multi-kanal, sinkron stok multi-gudang, WMS, rekonsiliasi pembayaran, POS, kurir; loyalty "coming soon"; angka kinerja di halaman adalah klaim vendor [S33]. BigSeller: 20+ marketplace via API resmi, klaim 1,1 juta pengguna [S34]. Shopify: Basic US$29, Grow US$79, Advanced US$299 per bulan (tahunan), POS Pro US$89/lokasi [S35].

---

## 4. Fakta teknis dan regulasi (D)

### D1. API/integrasi GoFood, GrabFood, ShopeeFood untuk POS pihak ketiga

| Butir | Status | Isi |
|---|---|---|
| GoFood/GoBiz API | **Terverifikasi primer (sebagian)** | Portal developer GoBiz menyediakan sandbox (`api.partner-sandbox.gobiz.co.id`) dan produksi (`api.gobiz.co.id`); OAuth client credentials. Dua tipe: Direct Integration (merchant) dan **Facilitator (penyedia POS/agregator pesanan)**. Wajib uji sandbox sebelum produksi; outlet harus terdaftar di sistem Partner Integration; setelah uji, kirim formulir kontak untuk verifikasi go-live. Hanya developer yang ditunjuk lewat email pemilik GoBiz yang boleh membuat integrasi [S37][S38]. Daftar bagian dokumentasi: Outlet Information, Food Integration, Payment Integration, MokaPos Integration, Webhooks [S38]. |
| GoFood: biaya, kriteria go-live, endpoint menu/order | **Tidak ditemukan** | Halaman yang terbaca tidak memuat biaya atau endpoint rinci; halaman Food Integration gagal dibuka [S38]. |
| GrabFood API | **Tidak terverifikasi (sebagian)** | Ada produk "GrabFood Point of Sale API" di developer.grab.com (hanya judul hasil pencarian) [S40]. SDK resmi Grab (GitHub) memakai kredensial `client_credentials` dengan scope `food.partner_api` dan environment staging, tetapi README tidak menjelaskan cara memperoleh kredensial [S39]. Syarat onboarding: **belum terverifikasi primer** (situs dev memblokir pembacaan). Pihak Moka menulis bahwa integrasi GrabFood pertama perlu persetujuan Grab [S10]. |
| ShopeeFood | **Tidak ditemukan** | Tidak ada halaman primer Shopee/ShopeeFood tentang API POS yang dapat dibaca (open.shopee.com diblokir; hasil pencarian pihak ketiga tidak dipakai). Halaman majoo/Moka/Olsera/Pawoon yang terbaca tidak menyebut integrasi ShopeeFood [S2][S10][S11]. majoo menyebut integrasi marketplace Shopee, bukan ShopeeFood [S2]. |

INFERENSI: Dari sisi biaya-manfaat, GoFood (self-service, sandbox publik) layak lebih dulu; GrabFood perlu kontak kemitraan; ShopeeFood sebaiknya tidak dijanjikan di peta jalan sampai ada bukti primer.

### D2. QRIS dinamis untuk merchant/POS

- **FAKTA (BI):** QRIS dasar pengaturan PADG 21/18/PADG/2019, terakhir diubah PADG 3/2025; batas Rp10.000.000 per transaksi; MPM dinamis dibuat lewat EDC/smartphone dan gratis; MDR: usaha mikro 0% sampai Rp500.000 dan 0,3% di atasnya, usaha kecil/menengah/besar 0,7%; semua PJP pengguna QR pembayaran wajib QRIS; PJP dan Lembaga Switching harus mendapat persetujuan BI; merchant cukup membuka rekening di PJP berizin [S41].
- **FAKTA (Midtrans):** QRIS dibuat lewat charge API (`payment_type: qris`), acquirer yang didukung GoPay dan AirPay Shopee (ShopeePay), IDR saja, notifikasi status pending/settlement/expire/deny; masa berlaku QR dan biaya tidak ditulis di halaman itu [S42].
- **FAKTA (Xendit):** QRIS min 1 maks 10.000.000 IDR, penyelesaian T+1 hari kerja, kedaluwarsa 48 jam (dapat diatur), refund penuh/parsial dengan batasan issuer, sengketa 90 hari, fund flow AGGREGATOR; biaya tidak dicantumkan [S43].
- **INFERENSI:** HARUM.IN sebagai SaaS tidak perlu menjadi PJP; menjalankan QRIS dinamis lewat gateway berizin (Midtrans/Xendit) adalah jalur yang konsisten dengan temuan di atas. Perlu dicek ke gateway apakah status merchant UMKM tiap tenant memerlukan KYC per tenant, dan siapa pemegang dana (aggregator).

### D3. Coretax DJP, faktur pajak, PPN, PB1

- **FAKTA:** PMK 81/2024 (dasar hukum Coretax) berlaku sejak 1 Januari 2025 [S45]. Coretax menyatukan layanan administrasi DJP; NPWP jadi 16 digit (NIK untuk WNI), cabang memakai NITKU [S49].
- **FAKTA:** PMK 131/2024 berlaku 1 Januari 2025: tarif PPN 12% dengan DPP nilai lain 11/12 untuk barang/jasa non-mewah (efektif 11%); tarif efektif 12% hanya barang mewah untuk konsumen akhir sejak 1 Februari 2025. Catatan: halaman DJP itu tidak membahas jasa mewah dan tidak membahas Coretax [S46].
- **FAKTA (PER-1/PJ/2025):** PKP wajib membuat faktur pajak; pedagang eceran PKP boleh tidak mencantumkan identitas pembeli dan tanda tangan untuk penjualan ke konsumen akhir (kecuali kendaraan bermotor, kapal, pesawat, tanah/bangunan, senjata api); kode transaksi 01-10 (04 = DPP nilai lain) [S47]. Dokumen ini tidak menyebut Coretax, NITKU, API, atau PJAP.
- **FAKTA:** e-Faktur Desktop dibuka kembali mulai 12 Feb 2025 (KEP-54/PJ/2025) untuk semua PKP kecuali kode transaksi 06/07, PKP pemusatan, dan PKP terdaftar setelah 1 Jan 2025 (wajib Coretax atau e-Faktur Host-to-Host); retur, pembatalan, dan SPT Masa PPN tetap di Coretax. Sumber bertanggal 14 April 2025; **status Oktober 2026 belum diverifikasi** [S48].
- **Tidak ditemukan:** spesifikasi API/PJAP Coretax untuk integrasi POS (hanya judul artikel ortax pihak ketiga yang terlihat di hasil pencarian; belum terverifikasi primer). Disebutnya "e-Faktur Host-to-Host" [S48] adalah petunjuk bahwa ada jalur otomatisasi, tetapi rinciannya tidak ditemukan.
- **FAKTA (PPh final UMKM):** tarif 0,5% berdasarkan PP 55/2022 untuk omzet sampai Rp4,8 miliar/tahun; WP orang pribadi bebas PPh atas omzet sampai Rp500 juta/tahun; jangka waktu pemakaian terbatas, dan artikel DJP yang dibaca menyebut kepastian perpanjangan masih menunggu keputusan teknis [S50]. **Status terbaru belum terverifikasi primer.**
- **FAKTA (PBJT/PB1):** pajak daerah atas makanan/minuman (PBJT, dasar PP 35/2023) dikenakan ke konsumen akhir dan dipungut restoran; tarif paling tinggi 10% [S51]. Ambang omzet pengecualian dan tarif per daerah: **tidak ditemukan** (perda masing-masing).
- **Tidak diverifikasi:** ambang PKP Rp4,8 miliar (tidak ada sumber primer yang saya baca).
- **INFERENSI:** POS perlu (a) pengaturan tarif PBJT per daerah, (b) opsi harga termasuk/tidak termasuk pajak, (c) ekspor data penjualan untuk faktur pajak PKP. Perlu konfirmasi konsultan pajak sebelum menjanjikan fitur faktur.

### D4. BPJS Kesehatan (P-Care/VClaim) untuk pihak ketiga

- **Terverifikasi (keberadaan):** ada "Webservice PCare" resmi di new-api.bpjs-kesehatan.go.id (versi 3.0) [S52]. Halaman tidak dapat dibaca; autentikasi dan syarat vendor: **belum terverifikasi primer**.
- **FAKTA (vendor, bukan BPJS):** Klinik Pintar menawarkan bridging P-Care/Mobile JKN dan mengklaim 300+ klinik, tanpa merinci syarat [S26]. KlinikDent: cek kepesertaan VClaim saat pendaftaran, harus disiapkan kredensial oleh klinik, tidak otomatis [S28].
- **Tidak ditemukan:** katalog API VClaim resmi, persyaratan kerja sama vendor, biaya.
- **INFERENSI:** karena kredensial dipegang fasilitas kesehatan (FKTP), model yang realistis adalah klinik membawa kredensial sendiri ke HARUM.IN, bukan HARUM.IN memegang akses sebagai vendor. Perlu konfirmasi ke BPJS.

### D5. SATUSEHAT: syarat integrasi vendor dan sandbox

- **FAKTA (dokumentasi staging "Cara Menggunakan"):** langkah: daftar akun platform, ambil API key sandbox, ambil API key produksi, pelajari resource FHIR HL7 dan terminologi (ICD, LOINC, SNOMED), tinjau data wajib per modul. Ada jalur terpisah untuk fasyankes dan "Mitra Sistem RME". Tautan akses sandbox di halaman itu rusak [S53]. Catatan: URL itu domain dokumentasi staging, jadi isinya bisa tidak persis sama dengan dokumentasi produksi.
- **Tidak terverifikasi:** halaman produksi "Registrasi Sistem RME", "Kode Akses API (Sandbox)", dan prasyarat onboarding diblokir pembacaan [S60]. Dokumen, biaya, dan sertifikasi vendor: **tidak ditemukan**.
- **FAKTA (syarat dan ketentuan platform):** client ID/secret/API dilarang dipindahtangankan; fasyankes wajib mengawasi berkala pihak yang dilibatkan sebagai prosesor data; data disimpan minimal 25 tahun dan di wilayah Indonesia; audit trail wajib aktif, log minimal 30 hari; password ganti tiap 3 bulan; celah keamanan dilaporkan ke helpdesk@kemkes.go.id [S54].
- **FAKTA (Permenkes 24/2022):** RME harus terinteroperabilitas dengan platform yang dikelola Kemenkes (Pasal 21); batas penyelenggaraan RME 31 Desember 2023 (Pasal 45); sanksi administratif berupa teguran tertulis dan/atau rekomendasi pencabutan akreditasi (Pasal 42) [S55]. Teks peraturan itu tidak menyebut kata "SATUSEHAT".
- **FAKTA (berita Kemenkes):** tenggat diundur sampai akhir 2025; 34.463 fasyankes terintegrasi per 27 Oktober 2025. Berita itu menulis "Permenkes 24 Tahun 2023", sementara teks peraturan yang saya baca bernomor 24 Tahun 2022 (kemungkinan salah ketik di berita) [S56]. Sanksi: tidak disebut di berita itu.
- **Status "sandbox terbaru":** belum terverifikasi. Hasil: HARUM.IN menyebut SATUSEHAT "belum teruji", jadi uji sandbox sebaiknya jadi prioritas karena pesaing lokal (Klinik Pintar, kumoDent, Dentiva) sudah mengklaim integrasi [S26][S27][S29].

### D6. UU Pelindungan Data Pribadi

- **FAKTA:** UU 27/2022 berlaku sejak 17 Oktober 2022 [S57]. Data pribadi spesifik termasuk kesehatan, biometrik, genetika, catatan kejahatan, anak, dan keuangan pribadi [S57]. Sanksi administratif meliputi denda sampai 2% dari pendapatan; ada pula sanksi pidana [S58].
- **Tidak ditemukan (halaman yang terbaca):** masa transisi dua tahun dan status peraturan pelaksana. Pengetahuan umum saya: masa transisi dua tahun berakhir Oktober 2024. Itu **belum terverifikasi primer** dalam sesi ini.
- **INFERENSI untuk HARUM.IN:** data RME dan odontogram (kesehatan), absensi GPS dan wajah (lokasi/biometrik, Olsera menyebut absensi wajah [S12]), CRM pelanggan, dan payroll termasuk objek UU ini. Perlu: dasar persetujuan eksplisit, kebijakan privasi tenant-pengendali vs HARUM.IN-prosesor, enkripsi, audit log, jejak akses, mekanisme hapus/ekspor data, dan prosedur insiden. Dentiva menampilkan AES-256, isolasi per klinik, role-based access, audit log [S29] sebagai pembanding praktik pasar.

---

## 5. Celah HARUM.IN vs pasar

Dasar hitung: jumlah pesaing yang **tertulis memiliki** fitur di sumber primer pada tabel 2a-2c (pesaing Indonesia + global di kategorinya). Kasir Pintar, Ginee dihitung N/V (tidak masuk). Urutan menurun menurut jumlah. Ini penghitungan dari tabel, jadi sifatnya INFERENSI atas FAKTA tabel.

| # | Fitur yang belum ada di HARUM.IN | Jumlah pesaing yang memiliki | Siapa | Catatan |
|---|---|---|---|---|
| 1 | Toko online / web order / pesanan online | 9 | Moka, majoo, Olsera, Pawoon, iSeller, Square, Lightspeed, Odoo, Toast [S7][S1][S11][S15][S16][S20][S23][S24][S22] | Termasuk "Moka Order". HARUM.IN punya POS tetapi tidak ada saluran pesan online disebutkan di konteks. |
| 2 | Self order / menu QR / kiosk | 7 | majoo, Moka, Olsera, Pawoon, Square (kiosk), Lightspeed, Odoo [S1][S6][S12][S15][S21][S23][S24] | Biasanya paket atas. |
| 3 | QRIS / pembayaran digital terintegrasi (termasuk dinamis) | 5 | Moka, majoo, Olsera, Pawoon, iSeller (iSeller Pay: kartu) [S6][S1][S11][S13][S16] | Lihat D2 untuk jalur gateway. |
| 4 | Pengingat janji WhatsApp/SMS otomatis (klinik) | 6 | kumoDent, KlinikDent, Dentiva, Dentally, Dentrix, Open Dental [S27][S28][S29][S59][S30][S32] | Fitur klinik paling konsisten. |
| 5 | Open API publik / marketplace integrasi | 4 (API) | Moka, Pawoon, Loyverse, Lightspeed [S9][S13][S19][S23] | Odoo dan Square: tidak ditemukan di halaman terbaca. |
| 6 | Integrasi marketplace (Shopee, dll.) | 4 | majoo, Olsera, Jubelio, BigSeller [S1][S12][S33][S34] | Relevan untuk daster/fashion; ShopeeFood terpisah. |
| 7 | Integrasi GoFood/GrabFood | 3 | majoo, Moka, Olsera (Grab saja) [S1][S8][S10][S12] | Hanya majoo, Moka yang lengkap dua-duanya. |
| 8 | Dashboard franchise / kontrol multi-outlet terpusat | 4 | Olsera (Pro), Pawoon, majoo, Moka [S12][S14][S1][S6] | HARUM.IN sudah multi-tenant; pastikan tampilan lintas-cabang. |
| 9 | SATUSEHAT teruji + klaim kepatuhan | 4 aplikasi klinik | Klinik Pintar, kumoDent, KlinikDent, Dentiva [S26][S27][S28][S29] | HARUM.IN: "belum teruji". |
| 10 | Bridging BPJS (P-Care/VClaim) | 2 | Klinik Pintar, KlinikDent (VClaim) [S26][S28] | Dikaitkan ke D4 (syarat belum terverifikasi). |
| 11 | Booking/reservasi online pasien (portal) | 4 | Klinik Pintar, kumoDent, Dentally, Dentrix [S26][S27][S59][S30] | |
| 12 | Kurir terintegrasi (ongkir/resi) | 3 | Olsera (50+), Pawoon (GoSend, GrabExpress), Jubelio [S11][S13][S33] | Lebih penting untuk toko daster. |
| 13 | Manajemen penjamin/asuransi klinik | 2 | Klinik Pintar, Dentrix [S25][S30] | |
| 14 | Batch/kedaluwarsa FIFO/FEFO | 3 | kumoDent, Dentiva, Klinik Pintar [S27][S29][S25] | HARUM.IN sudah punya stok/resep/BOM; cek kelengkapan batch. |
| 15 | Add-on berbayar modular | 3 | Loyverse, Square, Olsera (add-on layanan) [S18][S21][S12] | Strategi harga, bukan fitur. |

Fitur yang HARUM.IN **sudah punya** dan jarang dimiliki pesaing POS (INFERENSI dari tabel 2a-2b): jurnal+neraca penuh bersama POS (hanya majoo Advance+ dan Olsera Pro yang tertulis), proyeksi kas, KPI, copilot AI, odontogram+ICD di satu produk POS/ERP (hanya majoo Prime+ yang tertulis "service and treatment records"), dan penagihan langganan. Tidak ditemukan pesaing POS lokal yang menyebut copilot AI atau proyeksi kas di halaman yang dibaca.

Peluang pembeda klinik (INFERENSI): rencana perawatan terstruktur (kumoDent/KlinikDent/Klinik Pintar tidak menulis eksplisit; Dentally menulis), digabung dengan billing klinik dan odontogram.

---

## 6. Sumber (diakses 2026-10-13)

Halaman yang diblokir pembacaan otomatis (robots/CLIENT_ERROR) diberi tanda (blokir) dan hanya dipakai sebagai petunjuk keberadaan, bukan isi.

[S1]: https://majoo.id/harga "majoo - Harga paket"
[S2]: https://majoo.id/prime/fnb "majoo Prime F&B"
[S3]: https://majoo.id/ "majoo beranda"
[S4]: https://majoo.id/panduan-pengguna/detail/107 "majoo - Integrasi GoFood"
[S5]: https://majoo.id/panduan-pengguna/detail/105 "majoo - Integrasi GrabFood"
[S6]: https://www.mokapos.com/en/pricing "Moka POS Pricing"
[S7]: https://www.mokapos.com/en/ "Moka POS beranda"
[S8]: https://help.mokapos.com/s/article/12550312686617 "Moka - Integrasi GoFood"
[S9]: https://help.mokapos.com/tentang-moka-connect "Moka Connect"
[S10]: https://help.mokapos.com/cara-mengatur-menu-pada-fitur-online-order-management "Moka - Online Order Management (Hubster)"
[S11]: https://www.olsera.com/ "Olsera beranda"
[S12]: https://www.olsera.com/id/pricing "Olsera harga"
[S13]: https://pawoon.com/ "Pawoon beranda"
[S14]: https://pawoon.com/harga/ "Pawoon harga"
[S15]: https://pawoon.com/fitur/ "Pawoon fitur"
[S16]: https://isellercommerce.com/pos "iSeller POS"
[S17]: https://kasirpintar.co.id/fitur "Kasir Pintar fitur (blokir; hanya judul hasil pencarian)"
[S18]: https://loyverse.com/pricing "Loyverse harga"
[S19]: https://loyverse.com/features "Loyverse fitur"
[S20]: https://squareup.com/us/en/point-of-sale/restaurants "Square restoran"
[S21]: https://squareup.com/us/en/pricing "Square harga"
[S22]: https://pos.toasttab.com/products "Toast produk"
[S23]: https://www.lightspeedhq.com/pos/restaurant/ "Lightspeed restoran"
[S24]: https://www.odoo.com/app/point-of-sale-features "Odoo POS"
[S25]: https://klinikpintar.id/aplikasiklinik/faskes/klinik-gigi "Klinik Pintar - klinik gigi"
[S26]: https://klinikpintar.id/aplikasiklinik/paket/paket_siap "Klinik Pintar - Paket Siap"
[S27]: https://www.kumodent.com/id/ "kumoDent"
[S28]: https://klinikdent.id/ "KlinikDent"
[S29]: https://dentiva.id/ "Dentiva"
[S30]: https://www.dentrix.com/products/dentrix "Dentrix"
[S32]: https://www.opendental.com/site/features.html "Open Dental"
[S33]: https://jubelio.com/ "Jubelio"
[S34]: https://www.bigseller.com/ "BigSeller"
[S35]: https://www.shopify.com/pricing "Shopify"
[S36]: https://ginee.com/id/ "Ginee (halaman kosong saat dibaca)"
[S37]: https://developer.gobiz.com/ "GoBiz Developer (landing)"
[S38]: https://developer.gobiz.com/docs/api/intro "GoBiz API intro"
[S39]: https://github.com/grab/grabfood-api-sdk-java "SDK Java GrabFood resmi (README)"
[S40]: https://developer.grab.com/products/food-pos-model "GrabFood Point of Sale API (blokir; hanya judul)"
[S41]: https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/qris/default.aspx "Bank Indonesia - QRIS"
[S42]: https://docs.midtrans.com/docs/qris "Midtrans QRIS"
[S43]: https://docs.xendit.co/docs/qr-codes "Xendit QR Codes"
[S44]: https://www.pajak.go.id/id/coretax "DJP Coretax"
[S45]: https://www.pajak.go.id/en/node/112032 "DJP - PMK 81/2024 (Coretax)"
[S46]: https://www.pajak.go.id/en/node/113453 "DJP - PMK 131/2024"
[S47]: https://www.pajak.go.id/sites/default/files/lampiran/Petunjuk%20Teknis%20Pembuatan%20Faktur%20Pajak%20dan%20Dokumen%20Tertentu%20yang%20Kedudukannya%20Dipersamakan%20dengan%20Faktur%20Pajak%20serta%20Penerapan%20PMK%20131%20Tahun%202024.pdf "DJP - PER-1/PJ/2025 petunjuk teknis faktur pajak"
[S48]: https://pajak.go.id/en/node/115238 "DJP - e-Faktur Desktop"
[S49]: https://pajak.go.id/en/node/110136 "DJP - Fitur Coretax"
[S50]: https://pajak.go.id/en/node/113670 "DJP - PPh final UMKM"
[S51]: https://klc2.kemenkeu.go.id/kms/knowledge/pbjt-atas-makanan-dan-minuman-36ad11f5/detail/ "Kemenkeu KMS - PBJT makanan dan minuman"
[S52]: https://new-api.bpjs-kesehatan.go.id/pcare-rest-v3.0/ "BPJS Webservice PCare (blokir; hanya judul)"
[S53]: https://dokumentasisatusehat-stg.dto.kemkes.go.id/ "SATUSEHAT dokumentasi staging - Cara Menggunakan"
[S54]: https://satusehat.kemkes.go.id/platform/terms-and-privacy "SATUSEHAT syarat dan privasi"
[S55]: https://jdih.kemkes.go.id/storage/documents/pdfs/2022permenkes024.pdf "Permenkes 24/2022"
[S56]: https://www.badankebijakan.kemkes.go.id/wajib-integrasi-satu-sehat-kemenkes-desak-percepatan-rme-di-fasyankes/ "Badan Kebijakan Kemenkes - wajib integrasi"
[S57]: https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022 "BPK - UU 27/2022"
[S58]: https://www.komdigi.go.id/berita/artikel/detail/mengenal-sanksi-pelanggar-data-pribadi "Komdigi - sanksi UU PDP"
[S59]: https://www.dentally.com/en-gb/dental-software-features "Dentally fitur"
[S60]: https://satusehat.kemkes.go.id/platform/docs/id/registration-guide/regis-vendor/ "SATUSEHAT Registrasi Sistem RME (blokir; hanya judul)"
[S61]: https://help.mokapos.com/mengenal-fitur-purchase-order-dan-data-supplier-untuk-menambah-stok-barang-dan-mendata-supplier-anda "Moka - Purchase Order dan Supplier (hanya judul hasil pencarian; isi tidak dibuka)"
[S62]: https://klinikpintar.id/aplikasiklinik/fitur/rekam-medis-gigi/detail "Klinik Pintar - rekam medis gigi (hanya judul hasil pencarian: odontogram ICD-10)"

Sumber pihak ketiga yang SENGAJA tidak dipakai sebagai dasar klaim: artikel perbandingan (klikit.io, ibos.io, mekari blog, detik, accurate.id, idxchannel, ortax.org).
