import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Sustituye por tus datos reales (fetch a una API, JSON en /public, etc.)
const data = [
  { mes: "Ene", ventas: 4200, clientes: 120 },
  { mes: "Feb", ventas: 3800, clientes: 110 },
  { mes: "Mar", ventas: 5100, clientes: 140 },
  { mes: "Abr", ventas: 4700, clientes: 135 },
  { mes: "May", ventas: 6200, clientes: 160 },
  { mes: "Jun", ventas: 5900, clientes: 155 },
];

const total = data.reduce((s, d) => s + d.ventas, 0);

export default function App() {
  return (
    <main>
      <h1>📊 Dashboard</h1>
      <section className="kpis">
        <div className="card"><span>Ventas totales</span><strong>{total.toLocaleString("es-ES")} €</strong></div>
        <div className="card"><span>Clientes (último mes)</span><strong>{data.at(-1).clientes}</strong></div>
        <div className="card"><span>Meses</span><strong>{data.length}</strong></div>
      </section>
      <section className="charts">
        <div className="card">
          <h2>Ventas por mes</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" /><YAxis /><Tooltip />
              <Bar dataKey="ventas" fill="#4f6bed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Clientes</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" /><YAxis /><Tooltip />
              <Line dataKey="clientes" stroke="#e8743b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
