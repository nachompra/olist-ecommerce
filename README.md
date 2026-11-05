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

## Desarrollo

```powershell
npm install
npm run dev                  # http://localhost:5173
```

## Despliegue

El panel es estático (HTML + JS + `public/data/orders.json`), así que admite dos destinos:

**GitHub Pages (gratuito).** Cada push a `main` ejecuta `.github/workflows/pages.yml`, que compila con
`BASE_PATH=/<nombre-del-repo>/` y publica `dist/`. Publicado en https://nachompra.github.io/olist-ecommerce/.
Requisito único: en *Settings → Pages* del repo, *Source* = **GitHub Actions**.

**Docker (servidor propio).** Imagen multi-etapa: compila con Node y sirve con nginx en el puerto 80
(publicado como 8080).

```powershell
docker compose up -d --build    # http://localhost:8080
```

El mapa base (Esri Light/Dark Gray Canvas) se carga desde internet en el navegador del usuario.

## Licencia de los datos

[Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce),
publicado bajo licencia CC BY-NC-SA 4.0. `public/data/orders.json` es un derivado agregado de ese dataset y se
distribuye bajo la misma licencia, con uso no comercial.
