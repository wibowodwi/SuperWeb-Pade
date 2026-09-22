import { corsHeaders } from "npm:@supabase/supabase-js/cors"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")

// Supabase sekarang menyediakan secret keys dalam bentuk JSON.
// Kita gunakan secret key default untuk membaca katalog produk
// dari server-side Edge Function.
let SUPABASE_SECRET_KEY = ""

try {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS")

  if (secretKeysRaw) {
    const secretKeys = JSON.parse(secretKeysRaw)
    SUPABASE_SECRET_KEY = secretKeys["default"] || ""
  }
} catch (_) {
  // Abaikan dan coba legacy service role key di bawah
}

// Kompatibilitas dengan konfigurasi Supabase lama
if (!SUPABASE_SECRET_KEY) {
  SUPABASE_SECRET_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    ""
}

// ============================================================
// INFORMASI DASAR KERIPIK PADE
// ============================================================

const PADE_KNOWLEDGE = `
IDENTITAS TOKO

Nama:
KERIPIK PADE

Jenis usaha:
UMKM Kota Cimahi.

Bidang usaha:
Keripik Pade menyediakan berbagai kebutuhan makanan dan camilan.

Alamat:
PADE 1 : Puri Cipageran Indah 1 Blok B20 
https://maps.app.goo.gl/eow7y5Z71GtxNF156 

PADE 2 : Jl KH Usman Dhomiri No.2 (Sblm Veledrome) 
https://maps.app.goo.gl/UroSDhzxrCLsMoqB6?g_st=iw

Nomor Whatsapp:
WA ADMIN PUSAT 085183180626 
WA CABANG 085117480626

PERAN BOT

Nama kamu adalah "Bot Pade".

Kamu adalah asisten belanja untuk pelanggan Keripik Pade.

Tugas utama kamu:
1. Membantu pelanggan menemukan produk yang sesuai.
2. Memberikan rekomendasi berdasarkan kebutuhan pelanggan.
3. Menjelaskan produk berdasarkan katalog yang tersedia di database.
4. Membantu pelanggan memilih camilan.
5. Menjawab pertanyaan umum tentang Keripik Pade.
6. Membantu pelanggan memahami proses belanja.
7. Jika pelanggan ingin menjadi reseller/mitra, arahkan mereka untuk menghubungi admin melalui WhatsApp.
8. Jika pelanggan membutuhkan bantuan lebih lanjut, arahkan ke admin Keripik Pade.

GAYA BICARA

Gunakan bahasa Indonesia yang:
- ramah
- santai
- natural
- mudah dipahami
- tidak terlalu panjang
- seperti staf toko yang membantu pelanggan

Jangan terlalu formal.

Contoh gaya:
"Hai 👋 Mau cari camilan yang gurih, pedas, atau buat teman nonton?"

Jika pelanggan bertanya secara singkat, jawab secara singkat.

Jika pelanggan meminta rekomendasi, berikan beberapa pilihan yang relevan.

ATURAN PRODUK

Data produk yang diberikan setelah instruksi ini berasal dari database toko.

JANGAN MENGARANG:
- nama produk
- harga
- stok
- ukuran
- varian
- rasa
- berat
- link produk
- promo
- ketersediaan

Jika informasi tersebut tidak ada di database, katakan bahwa informasi tersebut belum tersedia dan sarankan pelanggan menghubungi admin.

Jangan pernah mengatakan suatu produk tersedia jika database tidak menunjukkan informasi tersebut.

Jika pelanggan meminta rekomendasi:
- gunakan produk yang memang ada di katalog
- pilih produk yang paling relevan dengan kebutuhan pelanggan
- jangan membuat produk baru

Jika pelanggan menyebut produk tertentu tetapi produk tersebut tidak ditemukan di katalog:
katakan bahwa produk tersebut belum ditemukan di katalog dan tawarkan untuk membantu mencari alternatif yang tersedia.

HARGA

Jika harga tersedia di katalog, gunakan harga dari katalog.

Jangan mengubah harga.

Jangan menghitung diskon/promo sendiri kecuali data promo memang tersedia.

STOK

Jika database mempunyai informasi stok, gunakan data tersebut.

Jika stok tidak tersedia:
jangan mengatakan "stok tersedia".

Gunakan kalimat seperti:
"Saya belum bisa memastikan stoknya dari data yang tersedia. Untuk memastikan, bisa cek dengan admin."

CHECKOUT

Jika pelanggan sudah menentukan produk yang ingin dibeli:
bantu mereka merangkum pilihan.

Contoh:
"Siap 👍 Jadi kamu tertarik:
• Produk A
• Produk B

Kalau sudah cocok, kamu bisa lanjut pesan melalui website atau hubungi admin."

Jangan mengaku sudah membuat pesanan jika belum ada sistem pemesanan yang benar-benar melakukan transaksi.

RESELLER / MITRA

Jika pelanggan bertanya tentang reseller atau mitra:
jelaskan bahwa Keripik Pade menyediakan kesempatan reseller/mitra berdasarkan informasi yang tersedia.

Jika detail harga reseller atau syarat reseller tidak tersedia di database:
jangan mengarang.

Arahkan pelanggan untuk menghubungi admin.

WHATSAPP

Jika pelanggan membutuhkan bantuan admin, gunakan kalimat:
"Untuk informasi lebih lanjut, kamu bisa langsung menghubungi admin Keripik Pade melalui WhatsApp."

Jangan membuat nomor WhatsApp jika nomor tersebut tidak tersedia dalam data yang diberikan.

PROMO

Jangan mengarang promo.

Gunakan promo hanya jika informasi promo tersedia pada data katalog/informasi toko.

BATASAN

Kamu bukan admin manusia.

Jika pertanyaan berada di luar informasi Keripik Pade, jawab secara singkat dan arahkan kembali ke kebutuhan belanja pelanggan.

Jangan memberikan informasi yang tidak kamu ketahui seolah-olah benar.

============================================================
`

// ============================================================
// HELPER
// ============================================================

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  )
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function formatPrice(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return String(value)
  }

  return `Rp${number.toLocaleString("id-ID")}`
}

// ============================================================
// MENGAMBIL PRODUK DARI SUPABASE
// ============================================================

async function getProducts() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return {
      products: [],
      error: "Konfigurasi Supabase belum tersedia.",
    }
  }

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/products?select=*&limit=100`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()

      console.error(
        "Supabase product error:",
        response.status,
        errorText,
      )

      return {
        products: [],
        error: "Gagal membaca katalog produk.",
      }
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return {
        products: [],
        error: "Format katalog produk tidak valid.",
      }
    }

    return {
      products: data,
      error: null,
    }
  } catch (error) {
    console.error("Product fetch exception:", error)

    return {
      products: [],
      error: "Tidak dapat mengambil katalog produk.",
    }
  }
}

// ============================================================
// FORMAT KATALOG AGAR MUDAH DIBACA AI
// ============================================================

function buildProductCatalog(products: any[]): string {
  if (!products.length) {
    return `
KATALOG PRODUK

Saat ini katalog produk tidak berhasil dibaca.

Jangan mengarang produk, harga, atau stok.
Jika pelanggan bertanya tentang produk, arahkan untuk mengecek website atau menghubungi admin.
`
  }

  const formatted = products.map((product, index) => {
    const name =
      product.name ??
      product.nama ??
      product.product_name ??
      product.title ??
      "Nama produk tidak tersedia"

    const price =
      product.price ??
      product.harga ??
      product.sale_price ??
      product.selling_price

    const stock =
      product.stock ??
      product.stok ??
      product.quantity ??
      product.qty

    const description =
      product.description ??
      product.deskripsi ??
      product.desc ??
      ""

    const category =
      product.category ??
      product.kategori ??
      ""

    const variant =
      product.variant ??
      product.varian ??
      ""

    const weight =
      product.weight ??
      product.berat ??
      ""

    const image =
      product.image_url ??
      product.image ??
      product.thumbnail ??
      ""

    const sku =
      product.sku ??
      product.code ??
      product.kode ??
      ""

    let result = `

PRODUK ${index + 1}
Nama: ${cleanText(name)}`

    if (price !== undefined && price !== null && price !== "") {
      result += `\nHarga: ${formatPrice(price)}`
    }

    if (category) {
      result += `\nKategori: ${cleanText(category)}`
    }

    if (variant) {
      result += `\nVarian: ${cleanText(variant)}`
    }

    if (weight) {
      result += `\nBerat/Ukuran: ${cleanText(weight)}`
    }

    if (stock !== undefined && stock !== null && stock !== "") {
      result += `\nStok: ${cleanText(stock)}`
    }

    if (sku) {
      result += `\nSKU/Kode: ${cleanText(sku)}`
    }

    if (description) {
      result += `\nDeskripsi: ${cleanText(description)}`
    }

    if (image) {
      result += `\nGambar: ${cleanText(image)}`
    }

    return result
  })

  return `
KATALOG PRODUK KERIPIK PADE

Gunakan hanya informasi dari katalog berikut ketika menjawab pertanyaan tentang produk.

${formatted.join("\n")}
`
}

// ============================================================
// MEMBERSIHKAN HISTORY CHAT
// ============================================================

function normalizeHistory(history: unknown): any[] {
  if (!Array.isArray(history)) {
    return []
  }

  return history
    .slice(-12)
    .map((item: any) => {
      const role =
        item?.role === "assistant"
          ? "assistant"
          : "user"

      const content =
        item?.content ??
        item?.message ??
        ""

      return {
        role,
        content: String(content).slice(0, 4000),
      }
    })
    .filter((item) => item.content.trim() !== "")
}

// ============================================================
// OPENAI
// ============================================================

async function askOpenAI(
  message: string,
  history: any[],
  productCatalog: string,
) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY belum dipasang di Supabase Secrets.",
    )
  }

  const instructions = `
${PADE_KNOWLEDGE}

============================================================
DATA PRODUK TERKINI
============================================================

${productCatalog}

============================================================
ATURAN TERAKHIR
============================================================

Jawablah pertanyaan pelanggan berdasarkan informasi di atas.

Prioritaskan katalog produk yang tersedia.

Jangan mengarang data yang tidak tersedia.

Jika pelanggan meminta rekomendasi, gunakan kebutuhan mereka sebagai dasar.

Jika pelanggan mengatakan:
- "yang gurih"
- "yang pedas"
- "buat teman nonton"
- "buat hadiah"
- "yang murah"
- "cemilan"
- atau kebutuhan lainnya

carilah produk yang paling relevan dari katalog.

Jika tidak ada data yang cukup untuk memberikan rekomendasi, katakan dengan jujur.

Jawaban sebaiknya ringkas dan mudah dibaca.

Gunakan bullet point jika menyebut beberapa produk.

Jangan menggunakan markdown table kecuali benar-benar diperlukan.

Jangan menyebut bahwa kamu adalah model AI kecuali pelanggan bertanya.

Kamu adalah Bot Pade, asisten belanja Keripik Pade.
`

  const input = [
    ...history,
    {
      role: "user",
      content: message,
    },
  ]

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions,
        input,
        max_output_tokens: 700,
      }),
    },
  )

  const responseText = await response.text()

  if (!response.ok) {
    console.error(
      "OpenAI API error:",
      response.status,
      responseText,
    )

    let errorMessage = "Gagal menghubungi AI."

    try {
      const parsed = JSON.parse(responseText)

      errorMessage =
        parsed?.error?.message ||
        errorMessage
    } catch (_) {
      // response bukan JSON
    }

    throw new Error(errorMessage)
  }

  let data: any

  try {
    data = JSON.parse(responseText)
  } catch (_) {
    throw new Error("Response OpenAI tidak valid.")
  }

  // Responses API menyediakan output_text pada response.
  if (data?.output_text) {
    return data.output_text.trim()
  }

  // Fallback jika output_text tidak tersedia
  try {
    const output = data?.output || []

    const texts: string[] = []

    for (const item of output) {
      if (!Array.isArray(item?.content)) continue

      for (const content of item.content) {
        if (
          content?.type === "output_text" &&
          content?.text
        ) {
          texts.push(content.text)
        }
      }
    }

    if (texts.length) {
      return texts.join("\n").trim()
    }
  } catch (_) {
    // fallback gagal
  }

  throw new Error(
    "AI tidak memberikan jawaban teks.",
  )
}

// ============================================================
// MAIN EDGE FUNCTION
// ============================================================

Deno.serve(async (req) => {
  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  // ----------------------------------------------------------
  // HANYA POST
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method tidak diperbolehkan.",
      },
      405,
    )
  }

  try {
    // --------------------------------------------------------
    // CEK OPENAI KEY
    // --------------------------------------------------------

    if (!OPENAI_API_KEY) {
      return jsonResponse(
        {
          success: false,
          error:
            "OPENAI_API_KEY belum dikonfigurasi di Supabase.",
        },
        500,
      )
    }

    // --------------------------------------------------------
    // BACA BODY
    // --------------------------------------------------------

    let body: any

    try {
      body = await req.json()
    } catch (_) {
      return jsonResponse(
        {
          success: false,
          error: "Request JSON tidak valid.",
        },
        400,
      )
    }

    const message = cleanText(
      body?.message ??
      body?.prompt ??
      body?.text,
    )

    const history = normalizeHistory(
      body?.history,
    )

    // --------------------------------------------------------
    // VALIDASI MESSAGE
    // --------------------------------------------------------

    if (!message) {
      return jsonResponse(
        {
          success: false,
          error: "Pesan tidak boleh kosong.",
        },
        400,
      )
    }

    // Batasi input supaya tidak terlalu besar
    const userMessage = message.slice(0, 4000)

    // --------------------------------------------------------
    // AMBIL PRODUK DARI DATABASE
    // --------------------------------------------------------

    const productResult = await getProducts()

    const productCatalog =
      buildProductCatalog(productResult.products)

    // --------------------------------------------------------
    // TANYAKAN KE OPENAI
    // --------------------------------------------------------

    const answer = await askOpenAI(
      userMessage,
      history,
      productCatalog,
    )

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return jsonResponse({
      success: true,
      answer,
      message: answer,

      // Informasi ini berguna untuk debugging frontend
      // tetapi tidak menampilkan API key.
      meta: {
        model: OPENAI_MODEL,
        productsLoaded:
          productResult.products.length,
      },
    })
  } catch (error) {
    console.error(
      "Bot Pade error:",
      error,
    )

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada Bot Pade.",
      },
      500,
    )
  }
})
