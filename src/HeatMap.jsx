import { useEffect, useRef } from "react";
import L from "./leaflet-setup.js";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";

const BRASIL = { center: [-14.5, -52], zoom: 4 };

// Rampa secuencial azul (claro = poco, oscuro = mucho). En modo oscuro se invierte la luminosidad.
const GRADIENTE = {
  light: { 0.15: "#b7d3f6", 0.4: "#6da7ec", 0.65: "#2a78d6", 0.85: "#1c5cab", 1: "#0d366b" },
  dark: { 0.15: "#184f95", 0.4: "#256abf", 0.65: "#3987e5", 0.85: "#86b6ef", 1: "#cde2fb" },
};

export default function HeatMap({ puntos, dark, ajustarA }) {
  const el = useRef(null);
  const map = useRef(null);
  const heat = useRef(null);
  const tiles = useRef(null);

  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false, minZoom: 3 }).setView(BRASIL.center, BRASIL.zoom);
    heat.current = L.heatLayer([], { radius: 10, blur: 14, minOpacity: 0.2, maxZoom: 4 }).addTo(m);
    map.current = m;
    return () => m.remove();
  }, []);

  useEffect(() => {
    tiles.current?.remove();
    // Mapa base gris neutro de Esri (sin clave de API) para que el calor sea lo único con color
    const capa = dark ? "World_Dark_Gray_Base" : "World_Light_Gray_Base";
    tiles.current = L.tileLayer(
      `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${capa}/MapServer/tile/{z}/{y}/{x}`,
      { maxZoom: 16, attribution: "Teselas © Esri — Esri, HERE, Garmin, © OpenStreetMap" },
    ).addTo(map.current);
  }, [dark]);

  useEffect(() => {
    heat.current.setOptions({ max: puntos.max * 4, gradient: GRADIENTE[dark ? "dark" : "light"] });
    heat.current.setLatLngs(puntos.pts);
  }, [puntos, dark]);

  // Encuadre: todo Brasil, o la zona seleccionada
  useEffect(() => {
    if (!ajustarA || !puntos.pts.length) { map.current.setView(BRASIL.center, BRASIL.zoom); return; }
    // Encuadra el 96 % central de los puntos: el dataset tiene algunas coordenadas mal asignadas
    const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
    const lats = puntos.pts.map((p) => p[0]).sort((a, b) => a - b);
    const lngs = puntos.pts.map((p) => p[1]).sort((a, b) => a - b);
    const b = L.latLngBounds([q(lats, 0.02), q(lngs, 0.02)], [q(lats, 0.98), q(lngs, 0.98)]);
    map.current.fitBounds(b, { padding: [20, 20], maxZoom: 8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajustarA]);

  return (
    <div className="mapa-wrap">
      <div ref={el} className="mapa" role="img" aria-label="Mapa de calor de la distribución de pedidos en Brasil" />
      <div className="mapa-leyenda" aria-hidden="true">
        <span>Menos</span><i className={dark ? "rampa dark" : "rampa"} /><span>Más</span>
      </div>
    </div>
  );
}
