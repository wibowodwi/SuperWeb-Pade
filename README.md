# ShopMate AI — Toko Camilan + Admin + WhatsApp

Paket ini adalah website static yang meniru layout pada screenshot yang diberikan: top bar, navbar, hero besar, kategori, grid produk, keranjang di kanan, benefit bar, serta halaman admin untuk CRUD produk.

## Teknologi gratis
- HTML + CSS + JavaScript vanilla — tanpa build rumit.
- Supabase Free — database PostgreSQL + Auth. Cocok untuk mulai gratis.
- Cloudflare Pages — hosting static gratis.
- WhatsApp click-to-chat — checkout langsung membuka WhatsApp toko.

## 1. Buat database Supabase
1. Buka https://supabase.com/ dan buat project Free.
2. Buka SQL Editor.
3. Copy semua isi `supabase.sql` lalu Run.
4. Buka Authentication > Users > Add user, buat email + password admin.
5. Kembali ke SQL Editor dan jalankan:
   `insert into public.admin_users(email) values ('EMAIL_ADMIN_ANDA');`
6. Ambil Project URL dan anon/public key dari Project Settings > API.

## 2. Isi config.js
Copy `config.example.js` menjadi `config.js`, lalu isi:
- `supabaseUrl`: Project URL Supabase.
- `supabaseAnonKey`: anon/public key.
- `whatsappNumber`: nomor WhatsApp toko dengan format internasional, contoh `6281234567890`.
- `storeName`: nama toko.

Jangan pernah memasukkan `service_role` key ke website.

## 3. Jalankan lokal
Cara termudah:
- Klik dua kali `index.html` untuk melihat tampilan.
- Untuk fitur Supabase yang lebih konsisten, gunakan VS Code + Live Server atau jalankan server lokal sederhana.

## 4. Kelola produk
Buka `/admin.html`, login dengan akun Supabase Auth yang emailnya sudah dimasukkan ke `admin_users`.
- Tambah produk
- Edit produk
- Hapus produk
- Aktif/nonaktifkan produk
- Ubah nama toko
- Ubah nomor WhatsApp

Perubahan produk menggunakan Supabase Realtime sehingga halaman toko dapat memperbarui katalog otomatis.

## 5. Checkout WhatsApp
Pelanggan memilih produk → atur jumlah → isi nama/catatan → klik `Pesan via WhatsApp`.
Website membuat pesan otomatis berisi item, jumlah, total, nama pelanggan, dan catatan lalu membuka `wa.me`.

## 6. Upload gratis ke Cloudflare Pages
1. Buat akun Cloudflare.
2. Buat project Pages baru.
3. Pilih Direct Upload atau hubungkan GitHub.
4. Upload seluruh folder ini setelah `config.js` sudah dibuat.
5. Jika menggunakan upload static, pastikan `index.html` berada di root.
6. Cloudflare akan memberi alamat `*.pages.dev`.

Alternatif: GitHub Pages juga bisa untuk file static, tetapi Cloudflare Pages lebih praktis untuk paket ini.

## Catatan gambar
File `assets/*.png` adalah crop dari screenshot referensi yang diberikan di percakapan, sehingga tampilan awal lebih dekat dengan desain referensi. Untuk toko produksi, sebaiknya ganti dengan foto produk asli milik toko dan isi URL gambar melalui admin.

## Import / Export Produk Bulk

Di `admin.html` tersedia tiga fitur untuk mengelola produk secara massal:

- **Export CSV**: mengunduh seluruh produk saat ini ke `produk-shopmate.csv`.
- **Import CSV**: upload file CSV untuk mengubah banyak produk sekaligus atau menambahkan produk baru.
- **Template**: mengunduh contoh format CSV.

Format kolom CSV:

`id,name,category,description,price,image_url,active`

Untuk **mengedit produk yang sudah ada**, pertahankan nilai `id` dari hasil Export CSV. Untuk **menambahkan produk baru**, kosongkan kolom `id`. Nilai `active` dapat berupa `true/false`, `1/0`, `aktif/nonaktif`, atau `ya/tidak`.

Disarankan selalu **Export CSV terlebih dahulu**, edit di Excel/Google Sheets, simpan sebagai CSV UTF-8, lalu Import kembali.


### Tanya shopper → WhatsApp
Menu **Tanya shopper** di halaman utama sekarang membuka WhatsApp toko dengan pesan otomatis: `Mau daftar menjadi Reseller Pade`. Nomor WhatsApp mengikuti `whatsappNumber` di `config.js`.

## 7. Bot Pade — AI chatbot

Website sekarang memiliki widget **Bot Pade** dengan tombol mengambang dan panel chat di sisi kanan, mengikuti referensi desain yang diberikan.

### Kemampuan
- Menjawab pertanyaan umum tentang berbagai macam cemilan.
- Memberi rekomendasi berdasarkan rasa, suasana, acara, oleh-oleh, hampers, dan teman nonton.
- Menggunakan katalog produk aktif dari website sebagai konteks sehingga nama, kategori, deskripsi, dan harga mengikuti katalog.
- Memiliki batasan agar tidak mengarang stok, ongkir, promo, komposisi, masa simpan, jam buka, atau kebijakan toko yang belum dimasukkan ke sistem.

### Mengaktifkan AI
Chatbot menggunakan Supabase Edge Function di `supabase/functions/chatbot/index.ts`. API key AI **tidak** diletakkan di frontend.

1. Install Supabase CLI dan login ke project yang sama.
2. Deploy function:
   `supabase functions deploy chatbot`
3. Di Supabase Dashboard → Edge Functions → chatbot → Secrets, tambahkan:
   - `OPENAI_API_KEY` = API key OpenAI Anda
   - opsional `OPENAI_MODEL` = model yang ingin digunakan (default di function: `gpt-5.6-luna`)
4. Pastikan `chatbotEndpoint` di `config.js` mengarah ke URL Edge Function Anda.

Jika function belum aktif, widget tetap tampil tetapi akan memberikan pesan bahwa shopper sedang tidak tersambung.

### Mengubah pengetahuan toko
Pengetahuan dasar ada di `supabase/functions/chatbot/index.ts`. Untuk informasi operasional yang sering berubah, tambahkan data tersebut ke konteks sebelum deploy. Katalog produk tidak perlu disalin manual karena frontend mengirim katalog aktif ke function pada setiap pertanyaan.
