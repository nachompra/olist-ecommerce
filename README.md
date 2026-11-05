# Olist · Panel de zona

Dashboard para managers de zona sobre el dataset público de e-commerce de Olist (Brasil, 2016–2018).

- **Ventas y satisfacción**: KPIs (facturación, pedidos, ticket medio, nota media, % satisfechos/insatisfechos),
  mapa de calor territorial (pedidos o facturación), ranking por estado y evolución mensual.
- **Logística**: KPIs (entregas a tiempo, plazos, retrasos, aprobación, coste de envío, cancelaciones),
  embudo de envío, estado de los pedidos y resumen de valoraciones frente a retrasos por estado.

Filtros globales: periodo, región, estado y categoría. Se guardan en la URL, así que una vista filtrada
se puede compartir con un enlace (por ejemplo `?region=Sur&desde=2018-01#logistica`).

## Datos

Los CSV originales no se suben a Git. Para regenerar `public/data/orders.json`:

```powershell
cd scripts
uv run download.py   # descarga el dataset con kagglehub a data/raw/
uv run prep.py       # cruza las tablas y genera public/data/orders.json
```

## Desarrollo y despliegue

```powershell
npm install
npm run dev                  # http://localhost:5173
docker compose up --build    # http://localhost:8080
```

El mapa base (Esri Light/Dark Gray Canvas) se carga desde internet en el navegador del usuario.
