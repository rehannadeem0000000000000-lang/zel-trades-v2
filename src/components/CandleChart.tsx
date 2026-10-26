"use client";

import type { Candle, TradeLevels } from "@/lib/types";

interface Props {
  candles: Candle[];
  levels: TradeLevels | null;
  decimals: number;
}

const W = 340;
const H = 220;
const PAD_R = 76;
const PAD_T = 8;
const PAD_B = 8;

export default function CandleChart({ candles, levels, decimals }: Props) {
  const data = candles.slice(-60);
  if (data.length === 0) return null;

  const prices = data.flatMap((c) => [c.high, c.low]);
  const lines: { label: string; price: number; color: string }[] = [];
  if (levels) {
    lines.push(
      { label: "SL", price: levels.stopLoss, color: "#fb7185" },
      { label: "TP1", price: levels.tp1, color: "#6ee7b7" },
      { label: "TP2", price: levels.tp2, color: "#34d399" },
      { label: "TP3", price: levels.tp3, color: "#10b981" },
      { label: "ENTRY", price: levels.entry, color: "#e2e8f0" },
    );
    prices.push(...lines.map((l) => l.price));
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const innerW = W - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const y = (p: number) => PAD_T + ((max - p) / span) * innerH;
  const step = innerW / data.length;
  const bodyW = Math.max(1.5, step * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-black/30" role="img" aria-label="Candle chart">
      {data.map((c, i) => {
        const x = i * step + step / 2;
        const up = c.close >= c.open;
        const color = up ? "#34d399" : "#fb7185";
        const top = y(Math.max(c.open, c.close));
        const bottom = y(Math.min(c.open, c.close));
        return (
          <g key={`${c.time}-${i}`}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
            <rect x={x - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={color} />
          </g>
        );
      })}
      {lines.map((l) => (
        <g key={l.label}>
          <line
            x1={0}
            x2={innerW}
            y1={y(l.price)}
            y2={y(l.price)}
            stroke={l.color}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text x={innerW + 4} y={y(l.price) + 3} fontSize="9" fill={l.color} fontFamily="monospace">
            {l.label} {l.price.toFixed(decimals)}
          </text>
        </g>
      ))}
    </svg>
  );
}
