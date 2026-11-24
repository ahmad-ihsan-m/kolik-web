"use client";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
};

export default function Slider({ label, value, min, max, step = 1, onChange, format, disabled }: Props) {
  return (
    <label className="field">
      <span className="lab"><span>{label}</span><span className="val">{format ? format(value) : value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
             onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
