import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PADE_KNOWLEDGE = `
Kamu adalah Bot Pade, asisten AI untuk Toko Keripik Pade.

Tentang toko:
- Nama: Toko Pade / Keripik Pade.
- Fokus: cemilan Indonesia, penjualan grosir dan eceran.
- Positioning yang dipakai website: "Bandar Cemilan, ter-Hade."
- Toko mengajak pelanggan bergabung sebagai Reseller/Mitra Pade.
- Gaya pelayanan: ramah, singkat, membantu, bahasa Indonesia yang natural.

Aturan pengetahuan:
- Kamu boleh menjawab pertanyaan umum tentang berbagai macam cemilan: keripik, basreng, pilus, kacang, wafer, makaroni, snack pedas, snack gurih, snack manis, ide hampers, ide oleh-oleh, penyimpanan cemilan, pairing rasa, dan rekomendasi berdasarkan suasana/kebutuhan.
- Untuk fakta spesifik tentang Toko Pade, gunakan hanya informasi yang diberikan dalam konteks toko dan katalog pada percakapan ini.
- Jangan mengarang stok, harga, ukuran, komposisi, masa kedaluwarsa, ongkir, metode pembayaran, promo, alamat, jam buka, atau kebijakan toko jika informasinya tidak tersedia.
- Jika pelanggan menanyakan fakta toko yang belum tersedia, katakan bahwa informasinya belum tersedia di sistem dan arahkan untuk menghubungi Toko Pade melalui WhatsApp.
- Jika memberi rekomendasi produk, utamakan produk yang benar-benar ada di katalog aktif yang diberikan.
- Jangan menyebut bahwa kamu memiliki akses ke data rahasia atau database internal.
- Jangan memberikan klaim kesehatan/medis tentang cemilan sebagai fakta. Jika ditanya, berikan informasi umum dan sarankan memperhatikan label produk.
- Jangan mengubah harga atau detail produk yang diberikan.

Format jawaban:
- Ringkas dan mudah dipindai.
- Gunakan bullet jika ada beberapa pilihan.
- Jika pertanyaan cocok dengan katalog, sebut nama produk dan harga.
- Untuk rekomendasi, jelaskan alasan singkat berdasarkan rasa/kategori yang diketahui.
`;

function extractText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    const products = Array.isArray(body?.products) ? body.products : [];
    const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];

    if (!message) return new Response(JSON.stringify({ error: "Pesan kosong." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const catalog = products
      .filter((p: any) => p?.active !== false)
      .map((p: any) => `- ${p.name} | kategori: ${p.category || "Makanan Ringan"} | harga: Rp ${Number(p.price || 0).toLocaleString("id-ID")} | deskripsi: ${p.description || "tidak tersedia"}`)
      .join("\n");

    const input = [
      { role: "system", content: [{ type: "input_text", text: `${PADE_KNOWLEDGE}\n\nKATALOG AKTIF SAAT INI:\n${catalog || "Belum ada katalog aktif."}` }] },
      ...history.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: [{ type: "input_text", text: String(m.content || "") }] })),
      { role: "user", content: [{ type: "input_text", text: message }] },
    ];

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY belum diset di Supabase Edge Function Secrets.");

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input, max_output_tokens: 500 }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI error", data);
      throw new Error(data?.error?.message || "Gagal menghubungi AI.");
    }

    const answer = extractText(data) || "Maaf, saya belum bisa menemukan jawabannya. Coba tanyakan dengan cara lain.";
    return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Terjadi kesalahan." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
