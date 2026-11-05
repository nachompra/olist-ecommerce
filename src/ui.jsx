import { useEffect, useState } from "react";

export function useDark() {
  const q = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = (e) => setDark(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return dark;
}

// Colores para las marcas SVG de Recharts (el resto usa tokens CSS)
export const PALETA = {
  light: { s1: "#2a78d6", grid: "#e1e0d9", axis: "#c3c2b7", muted: "#898781", surface: "#fcfcfb",
           pos: "#2a78d6", neg: "#e34948", mid: "#c3c2b7", embudo: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"] },
  dark: { s1: "#3987e5", grid: "#2c2c2a", axis: "#383835", muted: "#898781", surface: "#1a1a19",
          pos: "#3987e5", neg: "#e66767", mid: "#5a5955", embudo: ["#184f95", "#256abf", "#3987e5", "#86b6ef"] },
};

const num1 = (v) => v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Tarjeta KPI.
 *  - cuota: peso sobre el total global (para magnitudes acumulativas: pedidos, facturación).
 *  - media: valor global de referencia; se muestra la variación frente a él.
 *    tipo "rel" => variación relativa (%), "pp" => puntos porcentuales, "abs" => diferencia absoluta (fmtAbs).
 *  - mejorSiSube: true/false para colorear el sentido.
 */
export function Kpi({ label, value, hint, actual, media, cuota, tipo = "rel", mejorSiSube = true, fmtAbs }) {
  let pie = <b className="delta">—</b>;
  if (cuota != null && Number.isFinite(cuota)) {
    pie = <b className="delta">{num1(cuota * 100)} % del total</b>;
  } else if (actual != null && media != null && media !== 0) {
    const d = tipo === "rel" ? actual / media - 1 : actual - media;
    const txt = tipo === "rel" ? `${num1(Math.abs(d) * 100)} %` : tipo === "pp" ? `${num1(Math.abs(d) * 100)} pp` : fmtAbs(Math.abs(d));
    if (!/[1-9]/.test(txt)) pie = <b className="delta">En la media*</b>;
    else {
      const bueno = (d > 0) === mejorSiSube;
      pie = <b className={`delta ${bueno ? "bueno" : "malo"}`}>{d > 0 ? "▲ +" : "▼ −"}{txt}*</b>;
    }
  }
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-valor">{value}</strong>
      <span className="kpi-pie">{pie}{hint && <span> · {hint}</span>}</span>
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Toggle({ value, options, onChange, label }) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tooltip común para Recharts: etiqueta del punto y valor (la métrica ya figura en el título del gráfico) */
export function ChartTooltip({ active, payload, label, fmtLabel, fmtValue }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="tt">
      <div className="tt-label">{fmtLabel ? fmtLabel(label, p.payload) : label}</div>
      <div className="tt-row"><i style={{ background: p.color ?? p.fill }} /><strong>{fmtValue(p.value, p.payload)}</strong></div>
    </div>
  );
}
