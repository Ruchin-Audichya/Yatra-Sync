import type { Edge, Hub, Path } from "./types";
export const hubs: Hub[] = [
  {
    id: "junction",
    name: "Jaipur Junction",
    short: "Railway station",
    x: 145,
    y: 100,
  },
  {
    id: "gate",
    name: "Junction Gate 2",
    short: "Station east gate",
    x: 190,
    y: 110,
  },
  {
    id: "civil",
    name: "Civil Lines",
    short: "Metro meeting hub",
    x: 120,
    y: 195,
  },
  {
    id: "gandhi",
    name: "Gandhi Nagar",
    short: "Railway station",
    x: 235,
    y: 270,
  },
  {
    id: "malviya",
    name: "Malviya Nagar",
    short: "Community hub",
    x: 325,
    y: 330,
  },
  {
    id: "airport",
    name: "Jaipur Airport",
    short: "Terminal meeting hub",
    x: 375,
    y: 225,
  },
  {
    id: "tonk",
    name: "Tonk Road",
    short: "Corridor interchange",
    x: 255,
    y: 390,
  },
  {
    id: "sitapura",
    name: "Sitapura",
    short: "Industrial area hub",
    x: 335,
    y: 465,
  },
  {
    id: "jecrc",
    name: "JECRC University",
    short: "Campus meeting hub",
    x: 430,
    y: 515,
  },
];
const links: [string, string, number, number][] = [
  ["junction", "gate", 250, 1],
  ["junction", "civil", 3300, 8],
  ["gate", "civil", 3350, 8],
  ["civil", "gandhi", 5400, 11],
  ["gandhi", "malviya", 3100, 7],
  ["malviya", "tonk", 3800, 8],
  ["airport", "malviya", 4200, 10],
  ["tonk", "sitapura", 6500, 12],
  ["sitapura", "jecrc", 5500, 10],
];
export const edges: Edge[] = links.flatMap(([from, to, meters, minutes]) => [
  { id: `${from}>${to}`, from, to, meters, minutes },
  { id: `${to}>${from}`, from: to, to: from, meters, minutes },
]);
export interface RouteProvider {
  name: string;
  route(from: string, to: string): Path | null;
}
const cache = new Map<string, Path | null>();
export function shortestPath(
  from: string,
  to: string,
  graph: Edge[] = edges,
): Path | null {
  if (graph !== edges) return computePath(from, to, graph);
  const key = `${from}:${to}`;
  if (cache.has(key)) return cache.get(key)!;
  const result = computePath(from, to, graph);
  cache.set(key, result);
  return result;
}
function computePath(from: string, to: string, graph: Edge[]): Path | null {
  if (!hubs.some((h) => h.id === from) || !hubs.some((h) => h.id === to))
    return null;
  if (from === to) return { hubs: [from], edges: [], meters: 0, minutes: 0 };
  const dist = new Map<string, number>([[from, 0]]),
    prev = new Map<string, Edge>();
  const done = new Set<string>();
  for (;;) {
    const next = [...dist.entries()]
      .filter(([id]) => !done.has(id))
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
    if (!next) return null;
    const [node, d] = next;
    if (node === to) break;
    done.add(node);
    for (const edge of graph
      .filter((e) => e.from === node)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      const alt = d + edge.meters;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, edge);
      }
    }
  }
  const route: Edge[] = [];
  let at = to;
  while (at !== from) {
    const e = prev.get(at);
    if (!e) return null;
    route.unshift(e);
    at = e.from;
  }
  return {
    hubs: [from, ...route.map((e) => e.to)],
    edges: route.map((e) => e.id),
    meters: route.reduce((s, e) => s + e.meters, 0),
    minutes: route.reduce((s, e) => s + e.minutes, 0),
  };
}
export const seededGraph: RouteProvider = {
  name: "Illustrative seeded corridor graph",
  route: shortestPath,
};
export function directedOverlap(a: Path, b: Path): number {
  // Ordered common subsequence of directed edges, weighted by edge length.
  const positions = a.edges.filter((id) => b.edges.includes(id));
  let last = -1,
    meters = 0;
  for (const id of positions) {
    const pos = b.edges.indexOf(id);
    if (pos > last) {
      meters += edges.find((e) => e.id === id)?.meters ?? 0;
      last = pos;
    }
  }
  return Math.min(a.meters, b.meters) === 0
    ? 0
    : meters / Math.min(a.meters, b.meters);
}
export const hubName = (id: string) =>
  hubs.find((h) => h.id === id)?.name ?? id;
