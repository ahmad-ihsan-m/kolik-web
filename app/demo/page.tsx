"use client";

import { useEffect, useMemo, useState } from "react";
import HorseChart from "@/components/HorseChart";
import Slider from "@/components/Slider";
import { api, fmtTime, pct, type HasilSuntik, type Series } from "@/lib/api";

const SPEED = { lambat: 600, sedang: 250, cepat: 80, instan: 0 } as const;
type Speed = keyof typeof SPEED;

export default function DemoSuntik() {
  const [prod, setProd] = useState(10);
  const [sev, setSev] = useState(0.9);
  const [speed, setSpeed] = useState<Speed>("sedang");
  const [seed, setSeed] = useState(7);
  const [demo, setDemo] = useState<HasilSuntik | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dipakai, setDipakai] = useState({ prod, seed });

  async function mulai() {
    setLoading(true); setError("");
    try {
      const d = await api.suntik(prod, sev, seed);
      setDemo(d); setPaused(false); setDipakai({ prod, seed });
      setNow(speed === "instan" ? d.selesai_putar : d.mulai_putar);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  // putar jam demi jam
  useEffect(() => {
    if (!demo || now === null || paused || now >= demo.selesai_putar || speed === "instan") return;
    const t = setTimeout(() => setNow(now + 1), SPEED[speed]);
    return () => clearTimeout(t);
  }, [demo, now, paused, speed]);

  const view: Series | null = useMemo(() => {
    if (!demo || now === null) return null;
    const n = demo.series.hour.findIndex((h) => h > now);
    const k = n === -1 ? demo.series.hour.length : n;
    const s = demo.series;
    return {
      hour: s.hour.slice(0, k), hr_3h: s.hr_3h.slice(0, k), hr_base: s.hr_base.slice(0, k), lie_3h: s.lie_3h.slice(0, k),
      lie_base: s.lie_base.slice(0, k), eat: s.eat.slice(0, k), eat_base: s.eat_base.slice(0, k), risk: s.risk.slice(0, k),
      alarm: s.alarm.slice(0, k),
    };
  }, [demo, now]);

  const selesai = demo && now !== null && now >= demo.selesai_putar;
  let banner: React.ReactNode = null;
  if (demo && now !== null && view) {
    const i = view.hour.length - 1;
    const reached = now + 1 > demo.onset_h;
    const risk = view.risk[i];
    if (reached) {
      banner = <div className="alert error"><b>{fmtTime(now)} — KOLIK TERJADI</b> (onset {demo.onset_waktu}).</div>;
    } else if (view.alarm[i]) {
      // alasan dari jam pertama rangkaian alarm yang sedang berjalan
      let j = i; while (j > 0 && view.alarm[j - 1]) j--;
      const why = demo.alasan_per_alarm[String(view.hour[j])] ?? [];
      banner = (
        <div className="alert warning">
          <b>{fmtTime(now)} — ALARM.</b> Risiko kolik {pct(risk)} dalam 6 jam.
          {why.length > 0 && <ul>{why.map((r) => <li key={r}>{r}</li>)}</ul>}
        </div>
      );
    } else {
      banner = <div className="alert info"><b>{fmtTime(now)}</b> — risiko {pct(risk)}. Belum ada alarm.</div>;
    }
  }

  return (
    <>
      <h1>Demo: suntik kolik</h1>
      <p className="caption">
        Simulasikan seekor kuda baru selama 12 hari, suntikkan satu episode kolik, lalu putar data jam demi jam.
        Model tidak tahu kapan kolik terjadi; lihat apakah alarm berbunyi sebelum onset.
      </p>

      <div className="controls" style={{ gridTemplateColumns: "1fr 1fr auto 0.6fr" }}>
        <Slider label="Lama fase prodromal (jam)" value={prod} min={3} max={16} onChange={setProd} />
        <Slider label="Tingkat keparahan" value={sev} min={0.6} max={1.2} step={0.05} onChange={setSev} format={(v) => v.toFixed(2)} />
        <div className="field">
          <span className="lab">Kecepatan putar</span>
          <div className="seg">
            {(Object.keys(SPEED) as Speed[]).map((s) => (
              <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}</button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="lab">Seed kuda</span>
          <input type="number" min={0} max={9999} value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
        </label>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn primary" onClick={mulai} disabled={loading}>{loading ? "Menyimulasikan…" : "💉 Suntik kolik dan mulai"}</button>
        {demo && !selesai && speed !== "instan" && (
          <button className="btn" onClick={() => setPaused(!paused)}>{paused ? "▶ Lanjut" : "⏸ Jeda"}</button>
        )}
        {demo && <button className="btn" onClick={() => { setNow(demo.mulai_putar); setPaused(false); }}>↺ Ulangi</button>}
        {demo && <button className="btn" onClick={() => setNow(demo.selesai_putar)}>⏭ Langsung ke akhir</button>}
        <button className="btn" onClick={() => setSeed(Math.floor(Math.random() * 10000))} title="kuda acak lain">🎲 Kuda lain</button>
      </div>
      {error && <div className="alert error">{error}</div>}

      {banner}
      {demo && view && now !== null && (
        <HorseChart series={view} threshold={demo.threshold} episodes={demo.episode} revealEpisodes={now + 1 > demo.onset_h}
                    now={now} domain={[demo.mulai_putar - 48, demo.selesai_putar]} />
      )}
      {!demo && !loading && (
        <div className="alert info">Atur parameter lalu tekan <b>Suntik kolik dan mulai</b>.</div>
      )}

      {demo && selesai && (
        <>
          <h2>Hasil</h2>
          {demo.alarm_pertama ? (
            <div className="alert success">
              Alarm pertama berbunyi <b>{demo.alarm_pertama.waktu}</b>, yaitu <b>{demo.alarm_pertama.lead_jam.toFixed(1)} jam sebelum onset</b> kolik.
              Risiko saat itu {pct(demo.alarm_pertama.risiko)}.
              <div style={{ marginTop: 8 }}><b>Alasan alarm:</b></div>
              <ul>{demo.alarm_pertama.alasan.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          ) : (
            <div className="alert error">
              Model <b>tidak</b> memberi alarm sebelum onset. Coba fase prodromal yang lebih panjang atau keparahan lebih tinggi.
              Kasus seperti ini juga terjadi di evaluasi notebook (sekitar 1 dari 10 episode).
            </div>
          )}
          <p className="muted">Fase prodromal sebenarnya: {dipakai.prod} jam (oranye), kolik aktif (merah). Seed {dipakai.seed}.</p>
        </>
      )}
    </>
  );
}
