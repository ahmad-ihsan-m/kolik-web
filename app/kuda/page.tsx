"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import HorseChart from "@/components/HorseChart";
import Slider from "@/components/Slider";
import { api, fmtTime, pct, type DetailKuda, type Episode, type Meta } from "@/lib/api";

export default function Page() {
  return <Suspense fallback={<div className="skeleton" style={{ height: 500 }} />}><DetailKudaPage /></Suspense>;
}

function DetailKudaPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [list, setList] = useState<{ id: number; uji: boolean; episode: Episode[] }[]>([]);
  const [id, setId] = useState<number>(Number(sp.get("id") ?? 0));
  const [sampai, setSampai] = useState<number | null>(sp.get("sampai") ? Number(sp.get("sampai")) : null);
  const [rentang, setRentang] = useState(7);
  const [truth, setTruth] = useState(true);
  const [data, setData] = useState<DetailKuda | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const req = useRef(0);

  useEffect(() => {
    Promise.all([api.meta(), api.daftarKuda()]).then(([m, l]) => { setMeta(m); setList(l); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const rid = ++req.current;
    setLoading(true);
    const t = setTimeout(() => {
      api.detailKuda(id, sampai, rentang)
        .then((d) => { if (rid !== req.current) return; setData(d); setError(""); if (sampai === null) setSampai(d.sampai_hari); })
        .catch((e) => setError(e.message))
        .finally(() => rid === req.current && setLoading(false));
    }, 150);
    return () => clearTimeout(t);
  }, [id, sampai, rentang]);

  function pilihKuda(v: number) {
    setId(v); setSampai(null);
    router.replace(`/kuda?id=${v}`, { scroll: false });
  }

  const nHari = meta?.sensor.hari ?? 90;
  const base = meta?.sensor.hari_baseline ?? 7;
  const kuda = list.find((k) => k.id === id);

  return (
    <>
      <h1>Detail kuda</h1>
      <p className="caption">
        Garis hitam = nilai kuda, garis hijau putus-putus = baseline (normal) kuda itu sendiri pada jam yang sama.
        Skor risiko naik ketika beberapa sinyal menyimpang dari baseline-nya.
      </p>
      {error && <div className="alert error">{error}</div>}

      <div className="controls" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}>
        <label className="field">
          <span className="lab">Kuda</span>
          <select value={id} onChange={(e) => pilihKuda(Number(e.target.value))}>
            {list.map((k) => (
              <option key={k.id} value={k.id}>
                Kuda #{k.id} {k.uji ? "(uji)" : ""} · {k.episode.length} episode kolik
              </option>
            ))}
          </select>
        </label>
        <Slider label="Tampilkan sampai hari ke-" value={sampai ?? base + 14} min={base + 1} max={nHari} onChange={setSampai} />
        <Slider label="Rentang (hari)" value={rentang} min={2} max={21} onChange={setRentang} />
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <label className="toggle">
          <input type="checkbox" checked={truth} onChange={(e) => setTruth(e.target.checked)} />
          Tampilkan kebenaran simulasi (fase prodromal oranye, kolik aktif merah)
        </label>
        {kuda && kuda.episode.length > 0 && (
          <div className="row">
            <span className="muted">Lompat ke episode:</span>
            {kuda.episode.map((e, i) => (
              <button key={i} className="btn" style={{ padding: "4px 10px" }}
                      onClick={() => setSampai(Math.min(Math.floor(e.onset_h / 24) + 2, nHari))}>
                {i + 1} · {fmtTime(Math.floor(e.onset_h))}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s" }}>
        {data ? (
          <HorseChart series={data.series} threshold={data.threshold} episodes={data.episode} revealEpisodes={truth}
                      domain={[(data.sampai_hari - data.rentang) * 24, data.sampai_hari * 24 - 1]} />
        ) : !error && <div className="skeleton" style={{ height: 640 }} />}
      </div>

      {data && (
        <>
          <h2>Kejadian alarm di rentang ini</h2>
          {data.alarm.length === 0 ? (
            <div className="alert info">Tidak ada alarm di rentang ini.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Waktu</th><th>Risiko</th><th>Alasan</th>{truth && <th>Menurut simulasi</th>}</tr></thead>
              <tbody>
                {data.alarm.map((a) => (
                  <tr key={a.hour}>
                    <td style={{ whiteSpace: "nowrap" }}>{a.waktu}</td>
                    <td><b>{pct(a.risiko)}</b></td>
                    <td><ul>{a.alasan.map((r) => <li key={r}>{r}</li>)}</ul></td>
                    {truth && <td><span className={`badge ${a.penilaian}`}>{a.penilaian_teks}</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {truth && data.episode.length > 0 && (
            <p className="muted" style={{ marginTop: 12 }}>
              Episode kolik kuda ini (kebenaran simulasi):{" "}
              {data.episode.map((e) => `${fmtTime(Math.floor(e.onset_h))} (prodromal ${e.prodrome_h.toFixed(0)} jam)`).join(", ")}
            </p>
          )}
          {data.uji && <p className="muted">Kuda ini termasuk kuda uji: datanya tidak pernah dilihat model saat dilatih.</p>}
        </>
      )}
    </>
  );
}
