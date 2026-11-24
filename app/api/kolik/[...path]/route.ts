// Proxy: /api/kolik/<apa saja>  ->  KOLIK_API_URL/<apa saja>
// Browser cukup memanggil website sendiri, jadi tidak ada masalah CORS
// dan alamat API bisa diganti lewat environment variable tanpa ubah kode.
import { NextRequest } from "next/server";

const API = process.env.KOLIK_API_URL;

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!API) {
    return Response.json({ detail: "KOLIK_API_URL belum diisi" }, { status: 500 });
  }
  const { path } = await ctx.params;
  const url = `${API.replace(/\/$/, "")}/${path.join("/")}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "API tidak bisa dihubungi" }, { status: 502 });
  }
}

export { forward as GET, forward as POST };
