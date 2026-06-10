from __future__ import annotations

import csv
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "out"
FRONTEND_PUBLIC = ROOT / "frontend" / "public"
TARGET = FRONTEND_PUBLIC / "data.json"


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(2048)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;.\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(f, dialect=dialect)
        return [{(k or "").strip(): (v or "").strip() for k, v in row.items()} for row in reader]


def read_json(path: Path) -> Any:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


CITY_FIXES = {
    "Florian\ufffdpolis": "Florianópolis",
    "Bel\ufffdm": "Belém",
    "Goi\ufffdnia": "Goiânia",
    "S\ufffdo Paulo": "São Paulo",
    "Bras\ufffdlia": "Brasília",
}


def normalize_text(value: str) -> str:
    """Corrige caracteres mojibake comuns (latin-1 lido como utf-8) e replacement chars."""
    if not value:
        return value
    if value in CITY_FIXES:
        return CITY_FIXES[value]
    if "\ufffd" in value:
        for bad, good in CITY_FIXES.items():
            value = value.replace(bad, good)
        return value.replace("\ufffd", "")
    try:
        return value.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value


def load_airports() -> list[dict[str, str]]:
    rows = read_csv(DATA_DIR / "aeroportos_data.csv")
    airports = []
    for row in rows:
        airports.append(
            {
                "iata": row.get("iata", ""),
                "city": normalize_text(row.get("cidade", "")),
                "region": normalize_text(row.get("regiao", "")),
            }
        )
    return airports


def load_edges() -> list[dict[str, Any]]:
    """Lê as adjacências reais do grafo (formato: origem,destino,tipo_conexao,justificativa,peso)."""
    path = DATA_DIR / "adjacencias_aeroportos.csv"
    edges: list[dict[str, Any]] = []
    if not path.exists():
        return edges

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                weight = float(row.get("peso", 1.0) or 1.0)
            except ValueError:
                weight = 1.0
            edges.append(
                {
                    "source": row.get("origem", "").strip(),
                    "target": row.get("destino", "").strip(),
                    "connectionType": row.get("tipo_conexao", "").strip(),
                    "justification": normalize_text(row.get("justificativa", "").strip()),
                    "weight": weight,
                }
            )
    return edges

def load_ego() -> list[dict[str, Any]]:
    rows = read_csv(OUT_DIR / "ego_aeroportos.csv")
    ego = []
    for row in rows:
        ego.append(
            {
                "iata": row.get("aeroporto", ""),
                "degree": int(row.get("grau", 0) or 0),
                "egoOrder": int(row.get("ordem_ego", 0) or 0),
                "egoSize": int(row.get("tamanho_ego", 0) or 0),
                "egoDensity": float(row.get("densidade_ego", 0) or 0.0),
            }
        )
    return ego


def load_routes() -> list[dict[str, Any]]:
    rows = read_csv(OUT_DIR / "distancias_rotas.csv")
    routes = []
    for row in rows:
        path_str = row.get("caminho", "") or ""
        path = [p.strip() for p in path_str.split("->") if p.strip()] if path_str != "N/A" else []
        try:
            cost = float(row.get("custo", -1) or -1)
        except ValueError:
            cost = -1.0
        routes.append(
            {
                "origin": row.get("origem", ""),
                "destination": row.get("destino", ""),
                "cost": cost,
                "path": path,
                "hops": max(len(path) - 1, 0),
                "reachable": cost >= 0 and len(path) > 1,
            }
        )
    return routes


def build_neighbors(edges: list[dict[str, Any]]) -> dict[str, list[str]]:
    nb: dict[str, set[str]] = {}
    for e in edges:
        nb.setdefault(e["source"], set()).add(e["target"])
        nb.setdefault(e["target"], set()).add(e["source"])
    return {k: sorted(v) for k, v in nb.items()}


def build_rankings(airports_full: list[dict[str, Any]]) -> dict[str, Any]:
    if not airports_full:
        return {}

    by_degree = sorted(airports_full, key=lambda a: (-a["degree"], a["iata"]))
    by_density = sorted(airports_full, key=lambda a: (-a["egoDensity"], a["iata"]))
    by_ego_size = sorted(airports_full, key=lambda a: (-a["egoSize"], a["iata"]))

    return {
        "mostConnected": {"iata": by_degree[0]["iata"], "value": by_degree[0]["degree"]},
        "highestLocalDensity": {
            "iata": by_density[0]["iata"],
            "value": by_density[0]["egoDensity"],
        },
        "topConnected": [
            {"iata": a["iata"], "city": a["city"], "region": a["region"], "value": a["degree"]}
            for a in by_degree[:10]
        ],
        "topDensity": [
            {"iata": a["iata"], "city": a["city"], "region": a["region"], "value": a["egoDensity"]}
            for a in by_density[:10]
        ],
        "topEgoSize": [
            {"iata": a["iata"], "city": a["city"], "region": a["region"], "value": a["egoSize"]}
            for a in by_ego_size[:10]
        ],
    }


def load_parte2() -> dict[str, Any] | None:
    return read_json(OUT_DIR / "parte2_report.json")


def build_payload() -> dict[str, Any]:
    airports = load_airports()
    edges = load_edges()
    ego = load_ego()
    routes = load_routes()
    global_metrics = read_json(OUT_DIR / "global.json") or {}
    regions = read_json(OUT_DIR / "regioes.json") or []

    regions_normalized = [
        {
            "region": normalize_text(r.get("region", "")),
            "order": r.get("order", 0),
            "size": r.get("size", 0),
            "density": r.get("density", 0.0),
        }
        for r in regions
    ]

    neighbors = build_neighbors(edges)
    ego_by_iata = {item["iata"]: item for item in ego}
    airport_by_iata = {a["iata"]: a for a in airports}

    airports_full: list[dict[str, Any]] = []
    for iata, airport in airport_by_iata.items():
        info = ego_by_iata.get(iata, {})
        airports_full.append(
            {
                "iata": iata,
                "city": airport["city"],
                "region": airport["region"],
                "degree": info.get("degree", len(neighbors.get(iata, []))),
                "egoOrder": info.get("egoOrder", 0),
                "egoSize": info.get("egoSize", 0),
                "egoDensity": info.get("egoDensity", 0.0),
                "neighbors": neighbors.get(iata, []),
            }
        )
    airports_full.sort(key=lambda a: a["iata"])

    rankings = build_rankings(airports_full)

    connection_type_counts: dict[str, int] = {}
    for e in edges:
        connection_type_counts[e["connectionType"]] = connection_type_counts.get(e["connectionType"], 0) + 1

    parte2 = load_parte2()

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "global": global_metrics,
        "regions": regions_normalized,
        "airports": airports_full,
        "edges": edges,
        "routes": routes,
        "rankings": rankings,
        "stats": {
            "connectionTypes": [
                {"type": t, "count": c} for t, c in sorted(connection_type_counts.items())
            ],
            "regionCount": len({a["region"] for a in airports_full if a["region"]}),
            "airportCount": len(airports_full),
            "edgeCount": len(edges),
            "routeCount": len(routes),
        },
        "parte2": parte2,
    }


def main() -> None:
    payload = build_payload()
    FRONTEND_PUBLIC.mkdir(parents=True, exist_ok=True)
    with TARGET.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"data.json gerado em {TARGET.relative_to(ROOT)}")
    print(
        f"  - {payload['stats']['airportCount']} aeroportos,"
        f" {payload['stats']['edgeCount']} arestas,"
        f" {payload['stats']['routeCount']} rotas"
    )
    if payload.get("parte2"):
        ds = payload["parte2"].get("dataset", {})
        print(
            f"  - Parte 2: {ds.get('nodes', 0):,} músicas,"
            f" {ds.get('edges', 0):,} conexões"
        )
    else:
        print("  - Parte 2: não disponível (execute python scripts/generate_parte2.py && make parte2)")

    # Copia o grafo interativo para o frontend poder servi-lo como iframe
    src = OUT_DIR / "grafo_interativo.html"
    dst = FRONTEND_PUBLIC / "grafo_interativo.html"
    if src.exists():
        shutil.copy(src, dst)
        print(f"grafo_interativo.html copiado → {dst.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
