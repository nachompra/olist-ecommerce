"""Descarga el dataset Olist desde Kaggle y lo copia a data/raw/."""
import shutil
from pathlib import Path

import truststore

truststore.inject_into_ssl()  # usa los certificados de Windows (red con inspeccion TLS)

import kagglehub

path = kagglehub.dataset_download("olistbr/brazilian-ecommerce")
print("Path to dataset files:", path)

raw = Path(__file__).resolve().parent.parent / "data" / "raw"
raw.mkdir(parents=True, exist_ok=True)
for f in Path(path).glob("*.csv"):
    shutil.copy2(f, raw / f.name)
    print("copiado", f.name)
