"""Preprocesa los CSV de Olist (data/raw/) en public/data/orders.json.

Genera un registro por pedido en formato columnar (listas paralelas) para que el
dashboard pueda filtrar y agregar en el navegador sin cargar los 120 MB originales.

Uso:  uv run prep.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data" / "orders.json"

CATEGORIAS_ES = {
    "agro_industria_e_comercio": "Agroindustria y comercio",
    "alimentos": "Alimentación",
    "alimentos_bebidas": "Alimentación y bebidas",
    "artes": "Arte",
    "artes_e_artesanato": "Arte y artesanía",
    "artigos_de_festas": "Artículos de fiesta",
    "artigos_de_natal": "Artículos de Navidad",
    "audio": "Audio",
    "automotivo": "Automoción",
    "bebes": "Bebés",
    "bebidas": "Bebidas",
    "beleza_saude": "Belleza y salud",
    "brinquedos": "Juguetes",
    "cama_mesa_banho": "Cama, mesa y baño",
    "casa_conforto": "Confort del hogar",
    "casa_conforto_2": "Confort del hogar",
    "casa_construcao": "Construcción del hogar",
    "cds_dvds_musicais": "CD y DVD musicales",
    "cine_foto": "Cine y foto",
    "climatizacao": "Climatización",
    "consoles_games": "Consolas y videojuegos",
    "construcao_ferramentas_construcao": "Herramientas de construcción",
    "construcao_ferramentas_ferramentas": "Herramientas",
    "construcao_ferramentas_iluminacao": "Iluminación",
    "construcao_ferramentas_jardim": "Herramientas de jardín",
    "construcao_ferramentas_seguranca": "Seguridad (construcción)",
    "cool_stuff": "Artículos curiosos",
    "dvds_blu_ray": "DVD y Blu-ray",
    "eletrodomesticos": "Electrodomésticos",
    "eletrodomesticos_2": "Electrodomésticos",
    "eletronicos": "Electrónica",
    "eletroportateis": "Pequeño electrodoméstico",
    "esporte_lazer": "Deporte y ocio",
    "fashion_bolsas_e_acessorios": "Moda: bolsos y accesorios",
    "fashion_calcados": "Moda: calzado",
    "fashion_esporte": "Moda: deporte",
    "fashion_roupa_feminina": "Moda: mujer",
    "fashion_roupa_infanto_juvenil": "Moda: infantil",
    "fashion_roupa_masculina": "Moda: hombre",
    "fashion_underwear_e_moda_praia": "Moda: ropa interior y baño",
    "ferramentas_jardim": "Jardinería",
    "flores": "Flores",
    "fraldas_higiene": "Pañales e higiene",
    "industria_comercio_e_negocios": "Industria y negocios",
    "informatica_acessorios": "Informática y accesorios",
    "instrumentos_musicais": "Instrumentos musicales",
    "la_cuisine": "Cocina gourmet",
    "livros_importados": "Libros importados",
    "livros_interesse_geral": "Libros de interés general",
    "livros_tecnicos": "Libros técnicos",
    "malas_acessorios": "Maletas y accesorios",
    "market_place": "Marketplace",
    "moveis_colchao_e_estofado": "Colchones y tapicería",
    "moveis_cozinha_area_de_servico_jantar_e_jardim": "Muebles de cocina y jardín",
    "moveis_decoracao": "Muebles y decoración",
    "moveis_escritorio": "Muebles de oficina",
    "moveis_quarto": "Muebles de dormitorio",
    "moveis_sala": "Muebles de salón",
    "musica": "Música",
    "papelaria": "Papelería",
    "pc_gamer": "PC gaming",
    "pcs": "Ordenadores",
    "perfumaria": "Perfumería",
    "pet_shop": "Mascotas",
    "portateis_casa_forno_e_cafe": "Hornos y cafeteras",
    "portateis_cozinha_e_preparadores_de_alimentos": "Robots de cocina",
    "relogios_presentes": "Relojes y regalos",
    "seguros_e_servicos": "Seguros y servicios",
    "sinalizacao_e_seguranca": "Señalización y seguridad",
    "tablets_impressao_imagem": "Tablets e impresión",
    "telefonia": "Telefonía móvil",
    "telefonia_fixa": "Telefonía fija",
    "utilidades_domesticas": "Menaje del hogar",
}
SIN_CATEGORIA = "Sin categoría"

ESTADOS_PEDIDO = ["delivered", "shipped", "invoiced", "processing", "approved", "created", "canceled", "unavailable"]

# Límites aproximados de Brasil para descartar coordenadas erróneas del CSV de geolocalización
LAT_MIN, LAT_MAX, LNG_MIN, LNG_MAX = -34.0, 5.5, -74.5, -34.5


def read(name, **kw):
    return pd.read_csv(RAW / f"olist_{name}_dataset.csv", **kw)


def main():
    ts = ["order_purchase_timestamp", "order_approved_at", "order_delivered_carrier_date",
          "order_delivered_customer_date", "order_estimated_delivery_date"]
    orders = read("orders", parse_dates=ts)
    customers = read("customers")
    items = read("order_items")
    products = read("products")
    reviews = read("order_reviews")
    geo = read("geolocation")

    # --- Geolocalización: una coordenada media por prefijo postal (dentro de Brasil)
    g = geo[geo.geolocation_lat.between(LAT_MIN, LAT_MAX) & geo.geolocation_lng.between(LNG_MIN, LNG_MAX)]
    g = g.groupby("geolocation_zip_code_prefix")[["geolocation_lat", "geolocation_lng"]].mean()

    # --- Importe y categoría principal (la del artículo de mayor precio) por pedido
    items = items.merge(products[["product_id", "product_category_name"]], on="product_id", how="left")
    items["cat"] = items.product_category_name.map(CATEGORIAS_ES).fillna(SIN_CATEGORIA)
    unmapped = set(items.product_category_name.dropna()) - set(CATEGORIAS_ES)
    if unmapped:
        print("AVISO: categorías sin traducir:", unmapped)
    agg = items.groupby("order_id").agg(price=("price", "sum"), freight=("freight_value", "sum"))
    main_cat = items.sort_values("price", ascending=False).drop_duplicates("order_id").set_index("order_id").cat

    # --- Valoración media por pedido
    score = reviews.groupby("order_id").review_score.mean()

    df = (orders.merge(customers[["customer_id", "customer_state", "customer_zip_code_prefix"]], on="customer_id")
                .set_index("order_id"))
    df = df.join(agg).join(main_cat.rename("cat")).join(score.rename("score"))
    df["cat"] = df.cat.fillna(SIN_CATEGORIA)

    # --- Derivados logísticos
    day = pd.Timedelta(days=1)
    df["deliv_days"] = (df.order_delivered_customer_date - df.order_purchase_timestamp) / day
    df["delay_days"] = (df.order_delivered_customer_date.dt.normalize() - df.order_estimated_delivery_date.dt.normalize()) / day
    df["approve_h"] = (df.order_approved_at - df.order_purchase_timestamp) / pd.Timedelta(hours=1)
    df["carrier_days"] = (df.order_delivered_carrier_date - df.order_purchase_timestamp) / day
    # Etapa del embudo alcanzada: 1 realizado, 2 aprobado, 3 enviado (transportista), 4 entregado
    df["stage"] = 1 + df.order_approved_at.notna().astype(int)
    df.loc[df.order_delivered_carrier_date.notna(), "stage"] = 3
    df.loc[df.order_delivered_customer_date.notna(), "stage"] = 4

    # --- Índices para comprimir
    period = df.order_purchase_timestamp.dt.to_period("M")
    months = pd.period_range(period.min(), period.max(), freq="M")
    states = sorted(df.customer_state.unique())
    cats = sorted(df.cat.unique(), key=lambda c: (c == SIN_CATEGORIA, c))
    zips = sorted(set(df.customer_zip_code_prefix) & set(g.index))
    zip_idx = {z: i for i, z in enumerate(zips)}

    def col(s, decimals):
        return [None if pd.isna(x) else (round(float(x), decimals) if decimals else int(round(x))) for x in s]

    out = {
        "generado": pd.Timestamp.now().isoformat(timespec="seconds"),
        "meses": [str(p) for p in months],
        "estados": states,
        "categorias": cats,
        "estadosPedido": ESTADOS_PEDIDO,
        "geo": [[round(g.loc[z, "geolocation_lat"], 3), round(g.loc[z, "geolocation_lng"], 3)] for z in zips],
        "pedidos": {
            "m": [months.get_loc(p) for p in period],
            "s": [states.index(s) for s in df.customer_state],
            "c": [cats.index(c) for c in df.cat],
            "z": [zip_idx.get(z) for z in df.customer_zip_code_prefix],
            "v": col(df.price.fillna(0) + df.freight.fillna(0), 2),
            "f": col(df.freight, 2),
            "r": col(df.score, 2),
            "st": [ESTADOS_PEDIDO.index(s) for s in df.order_status],
            "e": [int(x) for x in df.stage],
            "d": col(df.deliv_days, 1),
            "l": col(df.delay_days, 0),
            "a": col(df.approve_h, 1),
            "k": col(df.carrier_days, 1),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(df):,} pedidos · {len(zips):,} códigos postales · {OUT.stat().st_size / 1e6:.1f} MB -> {OUT}")


if __name__ == "__main__":
    main()
