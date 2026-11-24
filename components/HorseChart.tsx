"use client";

import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Episode, Series } from "@/lib/api";
import { fmtTime } from "@/lib/api";

const INK = "#2b2f2c", GREEN = "#4C9F70", AMBER = "#E0A030", RED = "#D1495B", GREY = "#8A8A8A";

type Row = Record<string, number | null | boolean>;

type Props = {
  series: Series;
  threshold: number;
  episodes?: Episode[];
  revealEpisodes?: boolean;
  now?: number | null;           // jam "sekarang" (garis biru), dipakai di demo
  domain?: [number, number];     // rentang sumbu x tetap (dalam jam), supaya grafik tidak bergeser saat diputar
  compact?: boolean;
};

const PANELS = [
  { key: "hr", title: "Detak jantung 3 jam vs baseline kuda ini (bpm)", main: "hr_3h", base: "hr_base", unit: "bpm", nd: 0 },
  { key: "lie", title: "Waktu berbaring 3 jam vs baseline (fraksi)", main: "lie_3h", base: "lie_base", unit: "", nd: 2 },
  { key: "eat", title: "Waktu makan per jam vs baseline (menit)", main: "eat", base: "eat_base", unit: "menit", nd: 1 },
] as const;

export default function HorseChart({ series, threshold, episodes = [], revealEpisodes = true, now = null, domain, compact }: Props) {
  const rows: Row[] = series.hour.map((h, i) => ({
    x: h / 24,
    hr_3h: series.hr_3h[i], hr_base: series.hr_base[i],
    lie_3h: series.lie_3h[i], lie_base: series.lie_base[i],
    eat: series.eat[i], eat_base: series.eat_base[i],
    risk: series.risk[i],
    risk_alarm: series.alarm[i] ? series.risk[i] : null,
  }));
  const x0 = (domain?.[0] ?? series.hour[0] ?? 0) / 24;
  const x1 = (domain?.[1] ?? series.hour[series.hour.length - 1] ?? 24) / 24;
  const ticks: number[] = [];
  for (let d = Math.ceil(x0); d <= Math.floor(x1); d++) ticks.push(d);
  const H = compact ? 120 : 150;

  const shading = revealEpisodes
    ? episodes
        .filter((e) => e.onset_h / 24 >= x0 - 1 && (e.onset_h - e.prodrome_h) / 24 <= x1 + 1)
        .flatMap((e) => [
          <ReferenceArea key={`p${e.onset_h}`} x1={Math.max((e.onset_h - e.prodrome_h) / 24, x0)} x2={Math.min(e.onset_h / 24, x1)}
                         fill={AMBER} fillOpacity={0.2} strokeOpacity={0} ifOverflow="hidden" />,
          <ReferenceArea key={`a${e.onset_h}`} x1={Math.max(e.onset_h / 24, x0)} x2={Math.min((e.onset_h + e.active_h) / 24, x1)}
                         fill={RED} fillOpacity={0.13} strokeOpacity={0} ifOverflow="hidden" />,
        ])
    : [];
  const nowLine = now !== null ? <ReferenceLine x={now / 24} stroke="#1f4e79" strokeWidth={1.6} ifOverflow="hidden" /> : null;

  const xAxis = (showTicks: boolean) => (
    <XAxis dataKey="x" type="number" domain={[x0, x1]} ticks={ticks} allowDataOverflow
           tickFormatter={(d) => `Hari ${d}`} tick={showTicks ? { fontSize: 11, fill: GREY } : false}
           height={showTicks ? 22 : 4} axisLine={{ stroke: "#ddd" }} tickLine={false} />
  );

  return (
    <div className="chart">
      <div className="legend">
        <span><i style={{ background: INK }} /> nilai kuda</span>
        <span><i style={{ background: GREEN, height: 0, borderTop: `2px dashed ${GREEN}` }} /> baseline kuda ini</span>
        <span><i style={{ background: RED }} /> skor risiko</span>
        <span>▲ alarm</span>
        {revealEpisodes && episodes.length > 0 && <>
          <span><i className="box" style={{ background: AMBER, opacity: 0.45 }} /> fase prodromal</span>
          <span><i className="box" style={{ background: RED, opacity: 0.3 }} /> kolik aktif</span>
        </>}
      </div>

      {PANELS.map((p) => (
        <div key={p.key}>
          <div className="panel-title">{p.title}</div>
          <ResponsiveContainer width="100%" height={H}>
            <ComposedChart data={rows} syncId="kuda" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#eee" vertical={false} />
              {xAxis(false)}
              <YAxis width={44} tick={{ fontSize: 11, fill: GREY }} domain={p.key === "lie" ? [0, 1] : ["auto", "auto"]}
                     tickFormatter={(v) => Number(v).toFixed(p.nd)} />
              {shading}
              <Tooltip content={<Tip panel={p} />} isAnimationActive={false} />
              <Line dataKey={p.base} stroke={GREEN} strokeDasharray="4 3" strokeWidth={1.4} dot={false} isAnimationActive={false} connectNulls={false} />
              <Line dataKey={p.main} stroke={INK} strokeWidth={1.4} dot={false} isAnimationActive={false} connectNulls={false} />
              {nowLine}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ))}

      <div className="panel-title">Skor risiko kolik dalam 6 jam</div>
      <ResponsiveContainer width="100%" height={H + 40}>
        <ComposedChart data={rows} syncId="kuda" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eee" vertical={false} />
          {xAxis(true)}
          <YAxis width={44} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={{ fontSize: 11, fill: GREY }}
                 tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          {shading}
          <ReferenceLine y={threshold} stroke={GREY} strokeDasharray="5 4"
                         label={{ value: "ambang alarm", position: "insideTopLeft", fontSize: 11, fill: GREY }} />
          <Tooltip content={<Tip panel={null} />} isAnimationActive={false} />
          <Area dataKey="risk" stroke={RED} strokeWidth={1.8} fill={RED} fillOpacity={0.12} dot={false}
                isAnimationActive={false} connectNulls={false} />
          <Line dataKey="risk_alarm" stroke="none" isAnimationActive={false} activeDot={false}
                dot={(d: { cx?: number; cy?: number; value?: unknown; index?: number }) =>
                  d.value === null || d.value === undefined || d.cx === undefined || d.cy === undefined
                    ? <g key={d.index} />
                    : <path key={d.index} d={`M${d.cx},${d.cy - 6} L${d.cx + 5},${d.cy + 3} L${d.cx - 5},${d.cy + 3} Z`} fill={RED} />} />
          {nowLine}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

type TipProps = {
  active?: boolean;
  payload?: { payload: Row }[];
  panel: (typeof PANELS)[number] | null;
};

function Tip({ active, payload, panel }: TipProps) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const v = (k: string, nd: number) => (r[k] === null || r[k] === undefined ? "–" : Number(r[k]).toFixed(nd));
  return (
    <div className="tip">
      <b>{fmtTime(Math.round(Number(r.x) * 24))}</b>
      {panel ? (
        <div>{v(panel.main, panel.nd)} {panel.unit} <span className="muted">(normal {v(panel.base, panel.nd)})</span></div>
      ) : (
        <div>risiko {r.risk === null ? "– (membangun baseline)" : `${Math.round(Number(r.risk) * 100)}%`}{r.risk_alarm !== null && " · ALARM"}</div>
      )}
    </div>
  );
}
