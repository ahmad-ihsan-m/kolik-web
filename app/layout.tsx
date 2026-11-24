import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prediksi Dini Kolik Kuda",
  description: "Prototipe PBL MK PPKB — sistem peringatan dini kolik kuda berbasis AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">🐴 Prediksi Dini Kolik</div>
            <Nav />
            <p className="disclaimer">
              PBL MK PPKB · Prototipe. Data sensor berasal dari simulasi, bukan pengukuran kuda sungguhan.
              Bukan alat diagnosis; keputusan klinis tetap di tangan dokter hewan.
            </p>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
