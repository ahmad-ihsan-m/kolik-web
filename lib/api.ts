// Tipe data dan fungsi pemanggil API (semua lewat proxy /api/kolik → KOLIK_API_URL)

export type Status = "KOLIK AKTIF" | "ALARM" | "WASPADA" | "NORMAL" | "MEMBANGUN BASELINE";

export type Meta = {
  klinis: {
    model: string;
    threshold: number;
    pilihan_kategori: Record<string, string[]>;
    label_kategori: Record<string, Record<string, string>>;
    rentang_normal: Record<string, [number, number]>;
    nama_indonesia: Record<string, string>;
  };
  sensor: { threshold: number; horizon_jam: number; hari: number; hari_baseline: number; jumlah_kuda: number };
};

export type Episode = { onset_h: number; prodrome_h: number; active_h: number };

export type Series = {
  hour: number[];
  hr_3h: (number | null)[];
  hr_base: (number | null)[];
  lie_3h: (number | null)[];
  lie_base: (number | null)[];
  eat: (number | null)[];
  eat_base: (number | null)[];
  risk: (number | null)[];
  alarm: boolean[];
};

export type Kandang = {
  t: number;
  waktu: string;
  threshold: number;
  jumlah: Record<Status, number>;
  kuda: { id: number; uji: boolean; status: Status; risiko: number | null; hr_3h: number | null; hr_base: number | null }[];
  alarm_24jam: { hour: number; waktu: string; kuda: number; risiko: number; alasan: string[] }[];
};

export type DetailKuda = {
  id: number;
  uji: boolean;
  threshold: number;
  sampai_hari: number;
  rentang: number;
  episode: Episode[];
  series: Series;
  alarm: {
    hour: number; waktu: string; risiko: number; alasan: string[];
    penilaian: "benar" | "saat" | "palsu"; penilaian_teks: string;
  }[];
};

export type HasilSuntik = {
  onset_h: number;
  onset_waktu: string;
  mulai_putar: number;
  selesai_putar: number;
  threshold: number;
  episode: Episode[];
  series: Series;
  alarm_pertama: { hour: number; waktu: string; risiko: number; lead_jam: number; alasan: string[] } | null;
  alasan_per_alarm: Record<string, string[]>;
};

export type HasilKlinis = {
  probabilitas_fatal: number;
  threshold: number;
  berisiko_tinggi: boolean;
  status: string;
  kalimat: string;
  alasan: { fitur: string; teks: string; kontribusi: number }[];
  faktor: { fitur: string; nama: string; nilai: string; arah: "naik" | "turun"; besar: number }[];
  metode_penjelasan: string;
  jumlah_field_terisi: number;
  jumlah_field: number;
  catatan: string | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/kolik/${path}`, init);
  let data: unknown;
  try { data = await res.json(); } catch { throw new Error(`API mengembalikan respons tidak valid (${res.status})`); }
  if (!res.ok) {
    const d = (data as { detail?: unknown }).detail;
    throw new Error(typeof d === "string" ? d : JSON.stringify(d));
  }
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  meta: () => call<Meta>("meta"),
  kandang: (hari: number, jam: number) => call<Kandang>(`kandang?hari=${hari}&jam=${jam}`),
  daftarKuda: () => call<{ id: number; uji: boolean; episode: Episode[] }[]>("kuda"),
  detailKuda: (id: number, sampaiHari: number | null, rentang: number) =>
    call<DetailKuda>(`kuda/${id}?rentang=${rentang}${sampaiHari !== null ? `&sampai_hari=${sampaiHari}` : ""}`),
  suntik: (prodromal_jam: number, keparahan: number, seed: number) =>
    call<HasilSuntik>("demo/suntik", post({ prodromal_jam, keparahan, seed })),
  klinis: (body: Record<string, string | number | null>) => call<HasilKlinis>("klinis/predict", post(body)),
};

export const fmtTime = (h: number) => `Hari ${Math.floor(h / 24)}, ${String(Math.floor(h % 24)).padStart(2, "0")}:00`;
export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "–" : `${Math.round(v * 100)}%`);

export const WARNA: Record<Status, string> = {
  "KOLIK AKTIF": "var(--red)",
  ALARM: "var(--red)",
  WASPADA: "var(--amber)",
  NORMAL: "var(--green)",
  "MEMBANGUN BASELINE": "var(--grey)",
};
