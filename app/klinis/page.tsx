"use client";

import { useEffect, useState } from "react";
import { api, pct, type HasilKlinis, type Meta } from "@/lib/api";

type Val = string | number | null;

const PRESET: Record<string, Record<string, Val>> = {
  "Kosong": {},
  "Contoh: kolik ringan": {
    age: "adult", rectal_temp: 38.1, pulse: 48, respiratory_rate: 20, temp_of_extremities: "normal",
    peripheral_pulse: "normal", mucous_membrane: "normal_pink", capillary_refill_time: "less_3_sec",
    pain: "mild_pain", peristalsis: "hypomotile", abdominal_distention: "slight", packed_cell_volume: 40, total_protein: 7.0,
  },
  "Contoh: kolik berat": {
    age: "adult", rectal_temp: 37.2, pulse: 104, respiratory_rate: 36, temp_of_extremities: "cold",
    peripheral_pulse: "reduced", mucous_membrane: "dark_cyanotic", capillary_refill_time: "more_3_sec",
    pain: "extreme_pain", peristalsis: "absent", abdominal_distention: "severe", nasogastric_reflux: "more_1_liter",
    abdomen: "distend_small", packed_cell_volume: 62, total_protein: 7.5,
  },
};

type Num = { col: string; label: string; min: number; max: number; step: number };
type Cat = { col: string; label: string };

const VITAL: (Num | Cat)[] = [
  { col: "age", label: "Usia" },
  { col: "rectal_temp", label: "Suhu rektal (°C) · normal 37,2–38,3", min: 34, max: 42, step: 0.1 },
  { col: "pulse", label: "Detak jantung (bpm) · normal 28–44", min: 20, max: 200, step: 1 },
  { col: "respiratory_rate", label: "Laju napas (/menit) · normal 10–24", min: 5, max: 100, step: 1 },
  { col: "packed_cell_volume", label: "Hematokrit / PCV (%) · normal 30–50", min: 10, max: 80, step: 1 },
  { col: "total_protein", label: "Protein total (g/dL) · normal 6–7,5", min: 2, max: 100, step: 0.1 },
];
const SIRKULASI: Cat[] = [
  { col: "temp_of_extremities", label: "Suhu ekstremitas" },
  { col: "peripheral_pulse", label: "Pulsa perifer" },
  { col: "mucous_membrane", label: "Warna membran mukosa" },
  { col: "capillary_refill_time", label: "Waktu pengisian kapiler" },
  { col: "pain", label: "Tingkat nyeri" },
];
const CERNA: (Num | Cat)[] = [
  { col: "peristalsis", label: "Gerak usus (peristaltik)" },
  { col: "abdominal_distention", label: "Perut kembung" },
  { col: "nasogastric_tube", label: "Gas lambung (selang NG)" },
  { col: "nasogastric_reflux", label: "Refluks nasogastrik" },
  { col: "rectal_exam_feces", label: "Feses (pemeriksaan rektal)" },
  { col: "abdomen", label: "Temuan perut (rektal)" },
  { col: "abdomo_appearance", label: "Cairan abdominosentesis" },
  { col: "nasogastric_reflux_ph", label: "pH refluks", min: 1, max: 9, step: 0.1 },
  { col: "abdomo_protein", label: "Protein cairan perut (g/dL)", min: 0, max: 12, step: 0.1 },
];
const ALL = [...VITAL, ...SIRKULASI, ...CERNA];
const MIN_FILLED = 5;

export default function Klinis() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [preset, setPreset] = useState("Kosong");
  const [form, setForm] = useState<Record<string, Val>>({});
  const [hasil, setHasil] = useState<HasilKlinis | null>(null);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.meta().then(setMeta).catch((e) => setError(e.message)); }, []);

  function pilihPreset(p: string) { setPreset(p); setForm({ ...PRESET[p] }); setHasil(null); setWarn(""); }

  const filled = ALL.filter((f) => form[f.col] !== undefined && form[f.col] !== null && form[f.col] !== "").length;

  async function hitung(e: React.FormEvent) {
    e.preventDefault();
    if (filled < MIN_FILLED) {
      setWarn(`Isi minimal ${MIN_FILLED} pemeriksaan (sebaiknya termasuk detak jantung) supaya perkiraan bermakna.`);
      setHasil(null);
      return;
    }
    setWarn(""); setLoading(true); setError("");
    const body: Record<string, Val> = {};
    for (const [k, v] of Object.entries(form)) if (v !== null && v !== "") body[k] = v;
    try { setHasil(await api.klinis(body)); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  function field(f: Num | Cat) {
    if ("min" in f) {
      return (
        <label className="field" key={f.col}>
          <span className="lab">{f.label}</span>
          <input type="number" min={f.min} max={f.max} step={f.step} placeholder="kosong"
                 value={form[f.col] ?? ""} onChange={(e) => setForm({ ...form, [f.col]: e.target.value === "" ? null : Number(e.target.value) })} />
        </label>
      );
    }
    const opsi = meta?.klinis.pilihan_kategori[f.col] ?? [];
    const lab = meta?.klinis.label_kategori[f.col] ?? {};
    return (
      <label className="field" key={f.col}>
        <span className="lab">{f.label}</span>
        <select value={(form[f.col] as string) ?? ""} onChange={(e) => setForm({ ...form, [f.col]: e.target.value || null })}>
          <option value="">— tidak diperiksa —</option>
          {opsi.map((o) => <option key={o} value={o}>{lab[o] ?? o}</option>)}
        </select>
      </label>
    );
  }

  return (
    <>
      <h1>Pemeriksaan klinis</h1>
      <p className="caption">
        Model Bagian A, dilatih dengan data klinis kolik <b>nyata</b> (UCI/Kaggle, 299 kuda). Isi hasil pemeriksaan awal kuda
        yang sedang kolik untuk melihat perkiraan risiko berakhir fatal. Kolom boleh dikosongkan jika tidak diperiksa.
      </p>
      {error && <div className="alert error">{error}</div>}

      <div className="row" style={{ marginBottom: 14 }}>
        <span className="muted">Isi otomatis:</span>
        <div className="seg">
          {Object.keys(PRESET).map((p) => <button key={p} className={preset === p ? "on" : ""} onClick={() => pilihPreset(p)}>{p}</button>)}
        </div>
      </div>

      {!meta && !error ? <div className="skeleton" style={{ height: 480 }} /> : (
        <form onSubmit={hitung} className="formbox">
          <div className="cols3">
            <div><h3>Tanda vital</h3>{VITAL.map(field)}</div>
            <div><h3>Sirkulasi dan nyeri</h3>{SIRKULASI.map(field)}</div>
            <div><h3>Saluran cerna</h3>{CERNA.map(field)}</div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" disabled={loading}>{loading ? "Menghitung…" : "Hitung risiko"}</button>
            <span className="muted">Diisi {filled} dari {ALL.length} pemeriksaan</span>
          </div>
        </form>
      )}

      {warn && <div className="alert warning">{warn}</div>}

      {hasil && (
        <>
          <div className={`alert ${hasil.berisiko_tinggi ? "error" : "success"}`}>
            <div className="big">{pct(hasil.probabilitas_fatal)}</div>
            <b>Perkiraan risiko fatal — {hasil.berisiko_tinggi ? "BERISIKO TINGGI" : "risiko lebih rendah"}</b>{" "}
            (ambang {pct(hasil.threshold)}). Diisi {hasil.jumlah_field_terisi} dari {hasil.jumlah_field} pemeriksaan.
          </div>
          <h2>Faktor yang paling berpengaruh</h2>
          <table className="table">
            <thead><tr><th>Faktor</th><th>Nilai</th><th>Pengaruh</th><th>Besar</th></tr></thead>
            <tbody>
              {hasil.faktor.map((f) => (
                <tr key={f.fitur}>
                  <td>{f.nama}</td>
                  <td>{f.nilai}</td>
                  <td className={f.arah === "naik" ? "up" : "down"}>{f.arah === "naik" ? "▲ menaikkan risiko" : "▼ menurunkan risiko"}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{f.besar.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>
            Metode penjelasan: {hasil.metode_penjelasan}. Model dilatih dengan 299 kasus kolik dari akhir 1980-an (University of Guelph).
            Gunakan sebagai bahan diskusi, bukan dasar keputusan klinis.
          </p>
        </>
      )}
    </>
  );
}
