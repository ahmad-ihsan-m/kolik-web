"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, pct, WARNA, type Kandang, type Meta } from "@/lib/api";
import Slider from "@/components/Slider";

export default function RingkasanKandang() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [hari, setHari] = useState(27);
  const [jam, setJam] = useState(12);
  const [data, setData] = useState<Kandang | null>(null);
  const [error, setError] = useState("");
  const [play, setPlay] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    api.meta().then((m) => { setMeta(m); setHari(m.sensor.hari_baseline + 20); }).catch((e) => setError(e.message));
  }, []);

  // ambil data saat slider berubah (ditunda sebentar supaya tidak memanggil API di setiap geseran)
  useEffect(() => {
    if (!meta) return;
    const id = ++req.current;
    const t = setTimeout(() => {
      api.kandang(hari, jam).then((d) => { if (id === req.current) { setData(d); setError(""); } })
        .catch((e) => setError(e.message));
    }, play ? 0 : 150);
    return () => clearTimeout(t);
  }, [hari, jam, meta, play]);

  // tombol putar: maju 1 jam setiap 0,7 detik
  useEffect(() => {
    if (!play || !meta) return;
    const t = setInterval(() => step(1), 700);
    return () => clearInterval(t);
  });

  function step(d: number) {
    if (!meta) return;
    let h = hari * 24 + jam + d;
    const lo = meta.sensor.hari_baseline * 24, hi = (meta.sensor.hari - 1) * 24 + 23;
    if (h > hi) { setPlay(false); h = hi; }
    h = Math.min(Math.max(h, lo), hi);
    setHari(Math.floor(h / 24)); setJam(h % 24);
  }

  const thr = meta?.sensor.threshold ?? 0.5;

  return (
    <>
      <h1>Ringkasan kandang</h1>
      <p className="caption">
        Status semua kuda pada satu titik waktu. Alarm = skor risiko ≥ {thr.toFixed(2)} selama 2 jam berturut-turut.
        Geser waktu atau tekan <b>Putar</b> untuk melihat perubahan. Klik kartu kuda untuk melihat grafiknya.
      </p>
      {error && <div className="alert error">{error}</div>}

      {meta && (
        <div className="controls" style={{ gridTemplateColumns: "3fr 1.2fr auto" }}>
          <Slider label="Hari" value={hari} min={meta.sensor.hari_baseline} max={meta.sensor.hari - 1} onChange={setHari} />
          <Slider label="Jam" value={jam} min={0} max={23} onChange={setJam} format={(v) => `${String(v).padStart(2, "0")}:00`} />
          <div className="row">
            <button className="btn" onClick={() => step(-1)} title="mundur 1 jam">◀</button>
            <button className="btn" onClick={() => step(1)} title="maju 1 jam">▶</button>
            <button className={`btn ${play ? "" : "primary"}`} onClick={() => setPlay(!play)}>{play ? "⏸ Jeda" : "▶ Putar"}</button>
          </div>
        </div>
      )}

      {!data && !error && <div className="skeleton" style={{ height: 420 }} />}

      {data && (
        <>
          <div className="metrics">
            <div className="metric"><div className="k">Jumlah kuda</div><div className="v">{data.kuda.length}</div></div>
            <div className="metric"><div className="k">Alarm aktif</div><div className="v" style={{ color: data.jumlah.ALARM ? "var(--red)" : undefined }}>{data.jumlah.ALARM}</div></div>
            <div className="metric"><div className="k">Waspada</div><div className="v" style={{ color: data.jumlah.WASPADA ? "var(--amber)" : undefined }}>{data.jumlah.WASPADA}</div></div>
            <div className="metric"><div className="k">Kolik aktif (simulasi)</div><div className="v">{data.jumlah["KOLIK AKTIF"]}</div></div>
          </div>

          <div className="muted" style={{ marginBottom: 8 }}>{data.waktu}</div>
          <div className="herd">
            {data.kuda.map((k) => (
              <Link key={k.id} href={`/kuda?id=${k.id}&sampai=${Math.min(Math.floor(data.t / 24) + 1, meta?.sensor.hari ?? 90)}`}
                    className="horse" style={{ borderLeftColor: WARNA[k.status] }}>
                <div className="name">Kuda #{k.id} {k.uji && <span className="tag" title="tidak dipakai saat melatih model">uji</span>}</div>
                <div className="st" style={{ color: WARNA[k.status] }}>{k.status}</div>
                <div className="risk">{pct(k.risiko)}</div>
                <div className="hr">
                  HR {k.hr_3h !== null && k.hr_base !== null ? `${k.hr_3h.toFixed(0)} bpm (normal ${k.hr_base.toFixed(0)})` : "sensor tidak terbaca"}
                </div>
              </Link>
            ))}
          </div>

          <h2>Alarm 24 jam terakhir</h2>
          {data.alarm_24jam.length === 0 ? (
            <div className="alert info">Tidak ada alarm dalam 24 jam terakhir.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Waktu</th><th>Kuda</th><th>Risiko</th><th>Alasan</th></tr></thead>
              <tbody>
                {data.alarm_24jam.map((a) => (
                  <tr key={`${a.kuda}-${a.hour}`}>
                    <td style={{ whiteSpace: "nowrap" }}>{a.waktu}</td>
                    <td><Link href={`/kuda?id=${a.kuda}&sampai=${Math.min(Math.floor(a.hour / 24) + 2, meta?.sensor.hari ?? 90)}`}>#{a.kuda}</Link></td>
                    <td><b>{pct(a.risiko)}</b></td>
                    <td><ul>{a.alasan.map((r) => <li key={r}>{r}</li>)}</ul></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
