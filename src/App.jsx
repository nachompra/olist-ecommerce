import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import HeatMap from "./HeatMap.jsx";
import {
  ESTADO_PEDIDO_ES, NOMBRE_ESTADO, REGIONES, embudo, etiquetaMes, filtrar, fmt, kpisLogistica, kpisVentas,
  loadData, porEstado, puntosMapa, serieMensual, valoracionPorRetraso,
} from "./data.js";
import { Card, ChartTooltip, Kpi, PALETA, Toggle, useDark } from "./ui.jsx";

// Los meses anteriores a 2017 y posteriores a ago-2018 tienen muy pocos pedidos (datos incompletos)
const MES_INICIO = "2017-01";
const MES_FIN = "2018-08";

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { loadData().then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <main className="estado-carga">⚠️ {error}</main>;
  if (!data) return <main className="estado-carga">Cargando datos…</main>;
  return <Dashboard data={data} />;
}

function Dashboard({ data }) {
  const dark = useDark();
  const pal = PALETA[dark ? "dark" : "light"];
  const inicio = data.meses.indexOf(MES_INICIO);
  const fin = data.meses.indexOf(MES_FIN);
  const filtroInicial = { from: inicio, to: fin, region: "", estado: "", cat: "" };

  const [tab, setTabState] = useState(() => (window.location.hash === "#logistica" ? "logistica" : "ventas"));
  const setTab = (t) => { setTabState(t); window.history.replaceState(null, "", `#${t}`); };
  const [f, setF] = useState(() => filtroDesdeUrl(data, filtroInicial));
  const set = (patch) => setF((old) => ({ ...old, ...patch }));
  useEffect(() => { filtroAUrl(data, f, filtroInicial); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = useMemo(() => filtrar(data, f), [data, f]);
  // Referencia de los KPI: media global (todo Brasil, todas las categorías, periodo completo)
  const idxGlobal = useMemo(() => filtrar(data, { from: inicio, to: fin, region: "", estado: "", cat: "" }), [data, inicio, fin]);

  const zona = f.estado ? `${NOMBRE_ESTADO[f.estado]} (${f.estado})` : f.region || "Todo Brasil";

  return (
    <main>
      <header className="cabecera">
        <div>
          <h1>Olist · Panel de zona</h1>
          <p className="sub">
            {zona} · {etiquetaMes(data.meses[f.from])} – {etiquetaMes(data.meses[f.to])}
            {f.cat !== "" && <> · {data.categorias[f.cat]}</>} · {fmt.int(idx.length)} pedidos
          </p>
        </div>
        <nav className="tabs" role="tablist" aria-label="Secciones">
          <button role="tab" aria-selected={tab === "ventas"} onClick={() => setTab("ventas")}>Ventas y satisfacción</button>
          <button role="tab" aria-selected={tab === "logistica"} onClick={() => setTab("logistica")}>Logística</button>
        </nav>
      </header>

      <Filtros data={data} f={f} set={set} inicio={inicio} fin={fin} reset={() => setF(filtroInicial)} />

      {tab === "ventas"
        ? <TabVentas data={data} f={f} set={set} idx={idx} idxGlobal={idxGlobal} pal={pal} dark={dark} />
        : <TabLogistica data={data} set={set} idx={idx} idxGlobal={idxGlobal} pal={pal} />}

      <footer className="pie">
        Fuente: Brazilian E-Commerce Public Dataset by Olist (Kaggle). Importes en reales brasileños (R$), precio + envío;
        la facturación excluye pedidos cancelados o no disponibles. Cada pedido se asigna a la categoría de su artículo de mayor precio.
        Las variaciones de los indicadores se calculan frente a la media global (todo Brasil, todas las categorías,
        {" "}{etiquetaMes(MES_INICIO)} – {etiquetaMes(MES_FIN)}); pedidos y facturación muestran su peso sobre el total.
      </footer>
    </main>
  );
}

// Los filtros viven en la URL (?desde=2018-01&hasta=2018-08&region=Sur&estado=RS&cat=12) para poder compartir la vista
function filtroDesdeUrl(data, def) {
  const q = new URLSearchParams(window.location.search);
  const mes = (k, d) => { const i = data.meses.indexOf(q.get(k)); return i >= def.from && i <= def.to ? i : d; };
  const from = mes("desde", def.from), to = mes("hasta", def.to);
  const estado = data.estados.includes(q.get("estado")) ? q.get("estado") : "";
  const region = REGIONES[q.get("region")] && (!estado || REGIONES[q.get("region")].includes(estado)) ? q.get("region") : "";
  const cat = data.categorias[q.get("cat")] ? q.get("cat") : "";
  return { from: Math.min(from, to), to: Math.max(from, to), region, estado, cat };
}

function filtroAUrl(data, f, def) {
  const q = new URLSearchParams();
  if (f.from !== def.from) q.set("desde", data.meses[f.from]);
  if (f.to !== def.to) q.set("hasta", data.meses[f.to]);
  if (f.region) q.set("region", f.region);
  if (f.estado) q.set("estado", f.estado);
  if (f.cat !== "") q.set("cat", f.cat);
  const s = q.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`);
}

// ---------------------------------------------------------------------------------------------
function Filtros({ data, f, set, inicio, fin, reset }) {
  const estados = (f.region ? REGIONES[f.region] : data.estados).filter((uf) => data.estados.includes(uf)).sort();
  const cats = data.categorias.map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c, "es"));

  return (
    <div className="filtros" role="search" aria-label="Filtros">
      <RangoMeses meses={data.meses} min={inicio} max={fin} from={f.from} to={f.to} onChange={set} />
      <label>Región
        <select value={f.region} onChange={(e) => set({ region: e.target.value, estado: "" })}>
          <option value="">Todas</option>
          {Object.keys(REGIONES).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label>Estado
        <select value={f.estado} onChange={(e) => set({ estado: e.target.value })}>
          <option value="">Todos</option>
          {estados.map((uf) => <option key={uf} value={uf}>{NOMBRE_ESTADO[uf]} ({uf})</option>)}
        </select>
      </label>
      <label>Categoría
        <select value={f.cat} onChange={(e) => set({ cat: e.target.value })}>
          <option value="">Todas</option>
          {cats.map(({ c, i }) => <option key={i} value={i}>{c}</option>)}
        </select>
      </label>
      <button type="button" className="btn-sec" onClick={reset}>Restablecer</button>
    </div>
  );
}

/** Selector continuo de periodo: dos asas sobre la misma pista (mes inicial y final) */
function RangoMeses({ meses, min, max, from, to, onChange }) {
  const pct = (i) => ((i - min) / (max - min)) * 100;
  // Si las asas coinciden en el extremo derecho, la inicial debe quedar encima para poder arrastrarla
  const desdeArriba = from > (min + max) / 2;
  return (
    <div className="rango">
      <div className="rango-titulo">
        <span>Periodo</span>
        <b>{etiquetaMes(meses[from])} – {etiquetaMes(meses[to])}</b>
      </div>
      <div className="rango-pista">
        <div className="rango-sel" style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }} />
        <input type="range" min={min} max={max} step={1} value={from} style={{ zIndex: desdeArriba ? 2 : 1 }}
               aria-label="Mes inicial" aria-valuetext={etiquetaMes(meses[from])}
               onChange={(e) => onChange({ from: Math.min(Number(e.target.value), to) })} />
        <input type="range" min={min} max={max} step={1} value={to}
               aria-label="Mes final" aria-valuetext={etiquetaMes(meses[to])}
               onChange={(e) => onChange({ to: Math.max(Number(e.target.value), from) })} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
function TabVentas({ data, f, set, idx, idxGlobal, pal, dark }) {
  const [metrica, setMetrica] = useState("pedidos");
  const k = useMemo(() => kpisVentas(data, idx), [data, idx]);
  const g = useMemo(() => kpisVentas(data, idxGlobal), [data, idxGlobal]);
  const puntos = useMemo(() => puntosMapa(data, idx, metrica), [data, idx, metrica]);
  // El ranking ignora el filtro de estado para dar contexto: muestra la región (o Brasil) con el estado resaltado
  const estados = useMemo(() => porEstado(data, f.estado ? filtrar(data, { ...f, estado: "" }) : idx), [data, idx, f]);
  const serie = useMemo(() => serieMensual(data, idx, f.from, f.to), [data, idx, f.from, f.to]);

  const ranking = [...estados].sort((a, b) => b[metrica] - a[metrica]);
  const maxR = ranking[0]?.[metrica] || 1;
  const fmtM = metrica === "pedidos" ? fmt.int : fmt.brl;

  return (
    <div role="tabpanel">
      <section className="kpis">
        <Kpi label="Facturación" value={fmt.brl(k.facturacion)} cuota={k.facturacion / g.facturacion} />
        <Kpi label="Pedidos" value={fmt.int(k.pedidos)} cuota={k.pedidos / g.pedidos} />
        <Kpi label="Ticket medio" value={fmt.brl(k.ticket)} actual={k.ticket} media={g.ticket} />
        <Kpi label="Nota media" value={k.nota == null ? "—" : `${fmt.dec2(k.nota)} / 5`} actual={k.nota} media={g.nota}
             tipo="abs" fmtAbs={fmt.dec2} hint={`${fmt.int(k.valoraciones)} valoraciones`} />
        <Kpi label="Clientes satisfechos (4–5★)" value={fmt.pct(k.satisfechos)} actual={k.satisfechos} media={g.satisfechos} tipo="pp" />
        <Kpi label="Clientes insatisfechos (1–2★)" value={fmt.pct(k.insatisfechos)} actual={k.insatisfechos} media={g.insatisfechos}
             tipo="pp" mejorSiSube={false} />
      </section>
      <p className="nota-kpis">*Variaciones vs. media total de datos disponibles</p>

      <div className="grid-mapa">
        <Card
          title="Distribución territorial"
          subtitle={metrica === "pedidos" ? "Concentración de pedidos por ubicación del cliente" : "Concentración de la facturación por ubicación del cliente"}
          actions={<Toggle label="Métrica del mapa" value={metrica} onChange={setMetrica}
                           options={[{ value: "pedidos", label: "Pedidos" }, { value: "facturacion", label: "Facturación" }]} />}
        >
          <HeatMap puntos={puntos} dark={dark} ajustarA={f.estado || f.region} />
        </Card>
        <Card title="Ranking por estado" subtitle={`${metrica === "pedidos" ? "Pedidos" : "Facturación"} y nota media · clic para filtrar`}>
          <ol className="ranking">
            {ranking.slice(0, 12).map((r) => (
              <li key={r.uf}>
                <button type="button" onClick={() => set({ estado: f.estado === r.uf ? "" : r.uf })} aria-pressed={f.estado === r.uf}
                        title={`${r.nombre}: ${fmtM(r[metrica])} · nota ${fmt.dec2(r.nota)}`}>
                  <span className="r-uf">{r.uf}</span>
                  <span className="r-barra"><i style={{ width: `${(r[metrica] / maxR) * 100}%`, background: pal.s1 }} /></span>
                  <span className="r-valor">{fmtM(r[metrica])}</span>
                  <span className="r-nota">★ {fmt.dec(r.nota)}</span>
                </button>
              </li>
            ))}
          </ol>
          {ranking.length > 12 && <p className="sub nota-pie">Se muestran los 12 primeros de {ranking.length} estados.</p>}
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Facturación mensual" subtitle="R$ · precio + envío">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={serie} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={pal.grid} />
              <XAxis dataKey="mes" tickFormatter={(m) => etiquetaMes(m, true)} stroke={pal.axis} tick={{ fill: pal.muted, fontSize: 12 }} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={fmt.brlAxis} stroke="none" tick={{ fill: pal.muted, fontSize: 12 }} width={60} />
              <Tooltip cursor={{ stroke: pal.axis }} content={<ChartTooltip fmtLabel={(m) => etiquetaMes(m)} fmtValue={fmt.brl} />} />
              <Area dataKey="facturacion" stroke={pal.s1} strokeWidth={2} fill={pal.s1} fillOpacity={0.1}
                    activeDot={{ r: 5, stroke: pal.surface, strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Nota media mensual" subtitle="Valoración de 1 a 5 · meses con al menos 20 valoraciones">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={pal.grid} />
              <XAxis dataKey="mes" tickFormatter={(m) => etiquetaMes(m, true)} stroke={pal.axis} tick={{ fill: pal.muted, fontSize: 12 }} tickLine={false} minTickGap={16} />
              <YAxis domain={[(min) => Math.max(1, Math.floor(min * 2) / 2 - 0.5), 5]} tickFormatter={fmt.dec} stroke="none" tick={{ fill: pal.muted, fontSize: 12 }} width={40} />
              <Tooltip cursor={{ stroke: pal.axis }} content={<ChartTooltip fmtLabel={(m) => etiquetaMes(m)} fmtValue={fmt.dec2} />} />
              <Line dataKey="nota" stroke={pal.s1} strokeWidth={2} dot={false} connectNulls
                    activeDot={{ r: 5, stroke: pal.surface, strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
function TabLogistica({ data, set, idx, idxGlobal, pal }) {
  const k = useMemo(() => kpisLogistica(data, idx), [data, idx]);
  const g = useMemo(() => kpisLogistica(data, idxGlobal), [data, idxGlobal]);
  const fun = useMemo(() => embudo(data, idx), [data, idx]);
  const val = useMemo(() => valoracionPorRetraso(data, idx), [data, idx]);
  const estados = useMemo(() => porEstado(data, idx), [data, idx]);
  const dias = (v) => `${fmt.dec(v)} días`;

  return (
    <div role="tabpanel">
      <section className="kpis">
        <Kpi label="Entregas a tiempo" value={fmt.pct(k.aTiempo)} actual={k.aTiempo} media={g.aTiempo} tipo="pp"
             hint={`${fmt.int(k.entregados)} entregados`} />
        <Kpi label="Plazo medio de entrega" value={dias(k.plazo)} actual={k.plazo} media={g.plazo} tipo="abs" fmtAbs={fmt.dec} mejorSiSube={false} />
        <Kpi label="Retraso medio (pedidos tardíos)" value={dias(k.retrasoMedio)} actual={k.retrasoMedio} media={g.retrasoMedio}
             tipo="abs" fmtAbs={fmt.dec} mejorSiSube={false} hint={`${fmt.int(k.tarde)} con retraso`} />
        <Kpi label="Aprobación del pago" value={`${fmt.dec(k.aprobacionH)} h`} actual={k.aprobacionH} media={g.aprobacionH}
             tipo="abs" fmtAbs={fmt.dec} mejorSiSube={false} />
        <Kpi label="Hasta el transportista" value={dias(k.diasTransportista)} actual={k.diasTransportista} media={g.diasTransportista}
             tipo="abs" fmtAbs={fmt.dec} mejorSiSube={false} />
        <Kpi label="Coste medio de envío" value={fmt.brl(k.flete)} actual={k.flete} media={g.flete} mejorSiSube={false} />
        <Kpi label="Cancelados / no disponibles" value={fmt.pct(k.anulados)} actual={k.anulados} media={g.anulados} tipo="pp" mejorSiSube={false} />
      </section>
      <p className="nota-kpis">*Variaciones vs. media total de datos disponibles</p>

      <div className="grid-2">
        <Card title="Embudo de envío" subtitle="Pedidos que alcanzan cada etapa y conversión desde la anterior">
          <Embudo fun={fun} pal={pal} />
        </Card>
        <Card title="Estado actual de los pedidos" subtitle="Situación registrada en el sistema">
          <EstadosPedido estados={fun.estados} total={idx.length} pal={pal} />
        </Card>
      </div>

      <h2 className="seccion">Valoraciones y retrasos</h2>
      <div className="grid-2">
        <Card title="Nota media según el retraso" subtitle="Días respecto a la fecha estimada de entrega">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={val.tramos} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={pal.grid} />
              <XAxis dataKey="label" stroke={pal.axis} tick={{ fill: pal.muted, fontSize: 12 }} tickLine={false} interval={0} />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke="none" tick={{ fill: pal.muted, fontSize: 12 }} width={30} />
              <Tooltip cursor={{ fill: pal.grid, opacity: 0.5 }}
                       content={<ChartTooltip fmtValue={(v, p) => `${fmt.dec2(v)} · ${fmt.int(p.n)} pedidos`} />} />
              <Bar dataKey="nota" fill={pal.s1} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="nota" position="top" formatter={fmt.dec} fill={pal.muted} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Satisfacción: a tiempo frente a con retraso" subtitle="Reparto de valoraciones en pedidos entregados">
          <Satisfaccion grupos={val.grupos} pal={pal} />
        </Card>
      </div>

      <Card title="Resumen por estado" subtitle="Entregas, retrasos y valoración · clic en una fila para filtrar" className="mt">
        <TablaEstados filas={estados} onSelect={(uf) => set({ estado: uf })} />
      </Card>
    </div>
  );
}

function Embudo({ fun, pal }) {
  const base = fun.etapas[0].n || 1;
  return (
    <ol className="embudo">
      {fun.etapas.map((e, i) => {
        const conv = i > 0 && fun.etapas[i - 1].n ? e.n / fun.etapas[i - 1].n : null;
        return (
          <li key={e.nombre} title={`${e.nombre}: ${fmt.int(e.n)} (${fmt.pct(e.n / base)} del total)`}>
            <div className="e-texto">
              <span>{e.nombre}</span>
              <strong>{fmt.int(e.n)}</strong>
            </div>
            <div className="e-pista"><i style={{ width: `${(e.n / base) * 100}%`, background: pal.embudo[i] }} /></div>
            <div className="e-conv">
              {fmt.pct(e.n / base)} del total{conv != null && <> · <b>{fmt.pct(conv)}</b> desde la etapa anterior</>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EstadosPedido({ estados, total, pal }) {
  const filas = Object.entries(estados).sort((a, b) => b[1] - a[1]);
  const max = filas[0]?.[1] || 1;
  return (
    <table className="tabla compacta">
      <thead><tr><th>Estado</th><th className="num">Pedidos</th><th className="num">%</th><th aria-hidden="true" /></tr></thead>
      <tbody>
        {filas.map(([s, n]) => (
          <tr key={s}>
            <td>{ESTADO_PEDIDO_ES[s] ?? s}</td>
            <td className="num">{fmt.int(n)}</td>
            <td className="num">{fmt.pct(n / total)}</td>
            <td className="barra-celda"><i style={{ width: `${Math.max((n / max) * 100, 1)}%`, background: pal.s1 }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Satisfaccion({ grupos, pal }) {
  const partes = [
    { label: "Insatisfecho (1–2★)", color: pal.neg, tinta: "#ffffff" },
    { label: "Neutral (3★)", color: pal.mid, tinta: pal === PALETA.light ? "#0b0b0b" : "#ffffff" },
    { label: "Satisfecho (4–5★)", color: pal.pos, tinta: "#ffffff" },
  ];
  const filas = [["Entregado a tiempo", grupos.aTiempo], ["Entregado con retraso", grupos.tarde]];
  return (
    <div className="satisf">
      <ul className="leyenda">
        {partes.map((p) => <li key={p.label}><i style={{ background: p.color }} />{p.label}</li>)}
      </ul>
      {filas.map(([nombre, g]) => {
        const tot = g[0] + g[1] + g[2];
        return (
          <div key={nombre} className="seg-fila">
            <div className="seg-titulo"><span>{nombre}</span><span className="sub">{fmt.int(tot)} valoraciones</span></div>
            <div className="seg" role="img" aria-label={`${nombre}: ${partes.map((p, i) => `${p.label} ${fmt.pct(tot ? g[i] / tot : 0)}`).join(", ")}`}>
              {g.map((n, i) => n > 0 && (
                <div key={i} style={{ flexGrow: n, background: partes[i].color, color: partes[i].tinta }}
                     title={`${partes[i].label}: ${fmt.int(n)} (${fmt.pct(n / tot)})`}>
                  {n / tot >= 0.08 && fmt.pct(n / tot)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const COLUMNAS = [
  { id: "nombre", label: "Estado", fmt: (v, r) => `${v} (${r.uf})` },
  { id: "pedidos", label: "Pedidos", fmt: fmt.int, num: true },
  { id: "pctATiempo", label: "A tiempo", fmt: fmt.pct, num: true },
  { id: "plazo", label: "Plazo medio (días)", fmt: fmt.dec, num: true },
  { id: "retraso", label: "Retraso medio tardíos (días)", fmt: fmt.dec, num: true },
  { id: "nota", label: "Nota media", fmt: fmt.dec2, num: true },
];

function TablaEstados({ filas, onSelect }) {
  const [orden, setOrden] = useState({ col: "pctATiempo", asc: true });
  const datos = [...filas].sort((a, b) => {
    const x = a[orden.col] ?? -Infinity, y = b[orden.col] ?? -Infinity;
    const c = typeof x === "string" ? x.localeCompare(y, "es") : x - y;
    return orden.asc ? c : -c;
  });
  return (
    <div className="tabla-scroll">
      <table className="tabla">
        <thead>
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c.id} className={c.num ? "num" : ""} aria-sort={orden.col === c.id ? (orden.asc ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => setOrden({ col: c.id, asc: orden.col === c.id ? !orden.asc : true })}>
                  {c.label}{orden.col === c.id ? (orden.asc ? " ↑" : " ↓") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((r) => (
            <tr key={r.uf} tabIndex={0} onClick={() => onSelect(r.uf)} onKeyDown={(e) => e.key === "Enter" && onSelect(r.uf)}>
              {COLUMNAS.map((c) => <td key={c.id} className={c.num ? "num" : ""}>{c.fmt(r[c.id], r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
