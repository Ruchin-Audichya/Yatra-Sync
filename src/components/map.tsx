"use client";
import { useId, useState } from "react";
import { hubs, edges, shortestPath } from "@/domain/graph";
import { MapPin, Plus, Minus, Navigation } from "lucide-react";
export function Schematic({
  origin = "jecrc",
  destination = "junction",
  onSelect,
  large = false,
}: {
  origin?: string;
  destination?: string;
  onSelect?: (id: string) => void;
  large?: boolean;
}) {
  const routeId = useId();
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const route = shortestPath(origin, destination);
  const active = new Set(
    route?.edges.flatMap((e) => [e, e.split(">").reverse().join(">")]) ?? [],
  );
  return (
    <div className={`schematic ${large ? "map-large" : ""}`}>
      <div className="map-top">
        <span>
          <span className="live-dot" /> CORRIDOR EXPLORER
        </span>
        <span className="map-label">Jaipur, Rajasthan</span>
      </div>
      <svg
        viewBox="0 0 560 700"
        className="map-svg"
        aria-label="Interactive illustrative Jaipur corridor graph"
      >
        <defs>
          <linearGradient id={routeId} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#5146ff" />
            <stop offset="1" stopColor="#00b6b0" />
          </linearGradient>
          <pattern
            id="grid"
            width="26"
            height="26"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 26 0 L 0 0 0 26"
              fill="none"
              stroke="currentColor"
              strokeWidth=".5"
              opacity=".07"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <rect width="560" height="700" fill="url(#grid)" />
        <g
          transform={`translate(${280 - 280 * zoom},${350 - 350 * zoom}) scale(${zoom})`}
        >
          <path
            d="M0 420 Q140 370 185 455 T560 450"
            stroke="currentColor"
            strokeWidth="45"
            opacity=".035"
            fill="none"
          />
          <path
            d="M30 0 Q85 110 45 265 T160 600 M520 0 Q420 160 510 300 T475 600"
            stroke="currentColor"
            strokeWidth="22"
            opacity=".035"
            fill="none"
          />
          {[
            [60, 115, 35, 55],
            [265, 130, 55, 33],
            [165, 330, 38, 48],
            [400, 380, 65, 45],
            [230, 480, 33, 55],
            [350, 70, 45, 50],
          ].map(([x, y, w, h], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="8"
              fill="currentColor"
              opacity=".035"
              transform={`rotate(-12 ${x} ${y})`}
            />
          ))}
          {edges
            .filter((_, i) => i % 2 === 0)
            .map((e) => {
              const a = hubs.find((h) => h.id === e.from)!,
                b = hubs.find((h) => h.id === e.to)!;
              return (
                <g key={e.id}>
                  <path
                    d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                    stroke={
                      active.has(e.id) ? `url(#${routeId})` : "currentColor"
                    }
                    strokeWidth={active.has(e.id) ? 7 : 3}
                    opacity={active.has(e.id) ? 1 : 0.12}
                    strokeLinecap="round"
                  />
                  {active.has(e.id) && (
                    <path
                      d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                      strokeDasharray="3 8"
                      opacity=".7"
                    />
                  )}
                </g>
              );
            })}
          {hubs.map((h) => {
            const endpoint = h.id === origin || h.id === destination;
            return (
              <g
                key={h.id}
                onClick={() => {
                  setSelected(h.id);
                  onSelect?.(h.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(h.id);
                    onSelect?.(h.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${h.name}`}
                className="hub-node"
              >
                {endpoint && (
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r="20"
                    fill="var(--teal)"
                    opacity=".12"
                  />
                )}
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={endpoint ? 9 : 6}
                  stroke="var(--teal)"
                  strokeWidth="3"
                  fill="var(--surface)"
                />
                <text
                  x={
                    h.x +
                    (["jecrc", "junction", "tonk"].includes(h.id) ? -12 : 14)
                  }
                  y={
                    h.y +
                    (h.id === "jecrc"
                      ? 26
                      : h.id === "tonk"
                        ? 20
                        : h.id === "junction"
                          ? -20
                          : -13)
                  }
                  textAnchor={
                    ["jecrc", "junction", "tonk"].includes(h.id)
                      ? "end"
                      : "start"
                  }
                  fontSize={endpoint ? 14 : 11}
                  fontWeight={endpoint ? 700 : 500}
                  fill="currentColor"
                >
                  {h.name}
                </text>
                {endpoint && (
                  <text
                    x={h.x + (h.id === "junction" ? -12 : 14)}
                    y={h.y + (h.id === "junction" ? -2 : 8)}
                    textAnchor={h.id === "junction" ? "end" : "start"}
                    fontSize="9"
                    letterSpacing="1"
                    fill="var(--teal)"
                  >
                    {h.id === origin ? "YOUR START" : "YOUR DESTINATION"}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-zoom">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
        >
          <Plus size={16} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(0.8, zoom - 0.1))}
        >
          <Minus size={16} />
        </button>
        <button aria-label="Reset map zoom" onClick={() => setZoom(1)}>
          <Navigation size={15} />
        </button>
      </div>
      {selected && (
        <div className="map-selection">
          <MapPin size={16} />
          <span>{hubs.find((h) => h.id === selected)?.name}</span>
          <button
            onClick={() => setSelected(null)}
            aria-label="Dismiss selected hub"
          >
            ×
          </button>
        </div>
      )}
      <div className="map-bottom">
        <span>
          <i /> Shared corridor
        </span>
        <span>Illustrative graph · no live traffic</span>
      </div>
    </div>
  );
}
