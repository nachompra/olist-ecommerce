// Carga, filtrado y agregación de los pedidos (generados por scripts/prep.py)

export const REGIONES = {
  Norte: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MS", "MT"],
  Sudeste: ["ES", "MG", "RJ", "SP"],
  Sur: ["PR", "RS", "SC"],
};

export const NOMBRE_ESTADO = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahía", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais",
  MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Río de Janeiro", RN: "Río Grande do Norte", RO: "Rondônia",
  RR: "Roraima", RS: "Río Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
  TO: "Tocantins",
};

export const ESTADO_PEDIDO_ES = {
  delivered: "Entregado", shipped: "En tránsito", invoiced: "Facturado", processing: "En preparación",
  approved: "Aprobado", created: "Creado", canceled: "Cancelado", unavailable: "No disponible",
};

export const TRAMOS_RETRASO = [
  { id: "antes", label: "Antes de plazo", test: (l) => l < 0 },
  { id: "dia", label: "En el día", test: (l) => l === 0 },
  { id: "1-3", label: "1–3 días tarde", test: (l) => l >= 1 && l <= 3 },
  { id: "4-7", label: "4–7 días", test: (l) => l >= 4 && l <= 7 },
  { id: "8-14", label: "8–14 días", test: (l) => l >= 8 && l <= 14 },
  { id: "15+", label: "Más de 14", test: (l) => l > 14 },
];

export async function loadData() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/orders.json`);
  if (!res.ok) throw new Error(`No se pudieron cargar los datos (${res.status})`);
  const data = await res.json();
  data.n = data.pedidos.m.length;
  data.anulados = new Set(["canceled", "unavailable"].map((s) => data.estadosPedido.indexOf(s)));
  data.regionDeEstado = data.estados.map((uf) => Object.keys(REGIONES).find((r) => REGIONES[r].includes(uf)));
  return data;
}

/** Devuelve los índices de pedidos que cumplen el filtro {from, to, region, estado, cat}. */
export function filtrar(data, f, from = f.from, to = f.to) {
  const P = data.pedidos;
  const est = f.estado === "" ? -1 : data.estados.indexOf(f.estado);
  const cat = f.cat === "" ? -1 : Number(f.cat);
  const out = [];
  for (let i = 0; i < data.n; i++) {
    const m = P.m[i];
    if (m < from || m > to) continue;
    if (est >= 0 ? P.s[i] !== est : f.region && data.regionDeEstado[P.s[i]] !== f.region) continue;
    if (cat >= 0 && P.c[i] !== cat) continue;
    out.push(i);
  }
  return out;
}

const mean = (sum, n) => (n ? sum / n : null);

export function kpisVentas(data, idx) {
  const P = data.pedidos;
  let fact = 0, validos = 0, nr = 0, sr = 0, sat = 0, insat = 0;
  for (const i of idx) {
    if (!data.anulados.has(P.st[i])) { fact += P.v[i] ?? 0; validos++; }
    const r = P.r[i];
    if (r != null) { nr++; sr += r; if (r >= 4) sat++; else if (r <= 2) insat++; }
  }
  return {
    facturacion: fact, pedidos: idx.length, ticket: mean(fact, validos),
    nota: mean(sr, nr), satisfechos: mean(sat, nr), insatisfechos: mean(insat, nr), valoraciones: nr,
  };
}

export function kpisLogistica(data, idx) {
  const P = data.pedidos;
  let ent = 0, aTiempo = 0, sd = 0, tarde = 0, sl = 0, na = 0, sa = 0, nk = 0, sk = 0, nf = 0, sf = 0, anul = 0;
  for (const i of idx) {
    if (data.anulados.has(P.st[i])) anul++;
    if (P.d[i] != null && P.l[i] != null) {
      ent++; sd += P.d[i];
      if (P.l[i] <= 0) aTiempo++; else { tarde++; sl += P.l[i]; }
    }
    if (P.a[i] != null) { na++; sa += P.a[i]; }
    if (P.k[i] != null && P.k[i] >= 0) { nk++; sk += P.k[i]; }
    if (P.f[i] != null) { nf++; sf += P.f[i]; }
  }
  return {
    entregados: ent, aTiempo: mean(aTiempo, ent), plazo: mean(sd, ent), retrasoMedio: mean(sl, tarde),
    tarde, aprobacionH: mean(sa, na), diasTransportista: mean(sk, nk), flete: mean(sf, nf),
    anulados: mean(anul, idx.length),
  };
}

/** Puntos para el mapa de calor: peso por código postal. metrica = "pedidos" | "facturacion" */
export function puntosMapa(data, idx, metrica) {
  const P = data.pedidos;
  const w = new Float64Array(data.geo.length);
  for (const i of idx) {
    const z = P.z[i];
    if (z == null) continue;
    if (metrica === "pedidos") w[z] += 1;
    else if (!data.anulados.has(P.st[i])) w[z] += P.v[i] ?? 0;
  }
  const pts = [], pesos = [];
  for (let z = 0; z < w.length; z++) {
    if (w[z] > 0) { pts.push([data.geo[z][0], data.geo[z][1], w[z]]); pesos.push(w[z]); }
  }
  pesos.sort((a, b) => a - b);
  const q = pesos.length ? pesos[Math.floor(pesos.length * 0.97)] : 1;
  return { pts, max: q };
}

export function porEstado(data, idx) {
  const P = data.pedidos;
  const rows = data.estados.map((uf) => ({
    uf, nombre: NOMBRE_ESTADO[uf] ?? uf, pedidos: 0, facturacion: 0, nr: 0, sr: 0, ent: 0, aTiempo: 0, sd: 0, tarde: 0, sl: 0,
  }));
  for (const i of idx) {
    const r = rows[P.s[i]];
    r.pedidos++;
    if (!data.anulados.has(P.st[i])) r.facturacion += P.v[i] ?? 0;
    if (P.r[i] != null) { r.nr++; r.sr += P.r[i]; }
    if (P.d[i] != null && P.l[i] != null) {
      r.ent++; r.sd += P.d[i];
      if (P.l[i] <= 0) r.aTiempo++; else { r.tarde++; r.sl += P.l[i]; }
    }
  }
  return rows.filter((r) => r.pedidos > 0).map((r) => ({
    ...r, nota: mean(r.sr, r.nr), pctATiempo: mean(r.aTiempo, r.ent), plazo: mean(r.sd, r.ent), retraso: mean(r.sl, r.tarde),
  }));
}

export function serieMensual(data, idx, from, to) {
  const P = data.pedidos;
  const rows = [];
  for (let m = from; m <= to; m++) rows.push({ m, mes: data.meses[m], facturacion: 0, pedidos: 0, nr: 0, sr: 0 });
  for (const i of idx) {
    const r = rows[P.m[i] - from];
    r.pedidos++;
    if (!data.anulados.has(P.st[i])) r.facturacion += P.v[i] ?? 0;
    if (P.r[i] != null) { r.nr++; r.sr += P.r[i]; }
  }
  return rows.map((r) => ({ ...r, nota: r.nr >= 20 ? r.sr / r.nr : null }));
}

export function embudo(data, idx) {
  const P = data.pedidos;
  const etapas = [0, 0, 0, 0];
  const estados = {};
  for (const i of idx) {
    for (let e = 0; e < P.e[i]; e++) etapas[e]++;
    const s = data.estadosPedido[P.st[i]];
    estados[s] = (estados[s] ?? 0) + 1;
  }
  const nombres = ["Pedidos realizados", "Pago aprobado", "Entregado al transportista", "Entregado al cliente"];
  return { etapas: etapas.map((n, i) => ({ nombre: nombres[i], n })), estados };
}

export function valoracionPorRetraso(data, idx) {
  const P = data.pedidos;
  const tramos = TRAMOS_RETRASO.map((t) => ({ ...t, n: 0, sr: 0 }));
  const grupos = { aTiempo: [0, 0, 0], tarde: [0, 0, 0] }; // [insatisfecho, neutro, satisfecho]
  for (const i of idx) {
    const l = P.l[i], r = P.r[i];
    if (l == null || r == null) continue;
    const t = tramos.find((t) => t.test(l));
    if (t) { t.n++; t.sr += r; }
    const g = l <= 0 ? grupos.aTiempo : grupos.tarde;
    g[r <= 2 ? 0 : r >= 4 ? 2 : 1]++;
  }
  return { tramos: tramos.map((t) => ({ id: t.id, label: t.label, n: t.n, nota: t.n ? t.sr / t.n : null })), grupos };
}

// --- Formato (es-ES; la moneda del dataset es el real brasileño)
const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

export const fmt = {
  int: (v) => (v == null ? "—" : nf0.format(v)),
  dec: (v) => (v == null ? "—" : nf1.format(v)),
  dec2: (v) => (v == null ? "—" : nf2.format(v)),
  brl: (v) => (v == null ? "—" : `R$ ${v >= 10000 ? compact.format(v) : nf2.format(v)}`),
  brlAxis: (v) => compact.format(v),
  pct: (v) => (v == null ? "—" : `${nf1.format(v * 100)} %`),
  compact: (v) => compact.format(v),
};

const mesFmt = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric" });
const mesCorto = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" });
export const etiquetaMes = (ym, corto = false) => {
  const [y, m] = ym.split("-").map(Number);
  return (corto ? mesCorto : mesFmt).format(new Date(y, m - 1, 1));
};
