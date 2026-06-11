import os
import json
import glob
import shutil

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import pandas as pd

from .lib.chart_style import REGION_COLORS, EDGE_COLORS, apply_chart_style

_EDGE_LABELS = {
    "hub_nacional":  "Hub nacional (91)",
    "hub_regional":  "Hub regional (232)",
    "regional":      "Voo regional (103)",
}

def generate_path_tree(graph, paths, out_path):
    colors_seq = ["#38bdf8", "#f97316", "#22c55e", "#a78bfa", "#facc15"]

    path_nodes_set = set()
    path_edges = []
    for i, (name, path) in enumerate(paths.items()):
        color = colors_seq[i % len(colors_seq)]
        for n in path:
            path_nodes_set.add(n)
        for j in range(len(path) - 1):
            path_edges.append((path[j], path[j + 1], color, name))

    nodes = []
    for iata in path_nodes_set:
        node = graph.nodes.get(iata)
        city = node.city if node else ""
        region = node.region if node else ""
        is_endpoint = any(
            iata == p[0] or iata == p[-1]
            for p in paths.values()
        )
        color = "#f1f5f9" if is_endpoint else "#64748b"
        nodes.append({
            "id":    iata,
            "label": iata,
            "title": f"<b>{iata}</b><br>{city}<br>{region}",
            "color": color,
            "size":  20 if is_endpoint else 14,
            "font":  {"size": 14, "color": "#0f172a"},
        })

    edges = []
    for eid, (u, v, color, name) in enumerate(path_edges):
        weight = 0.0
        for e in graph.adjacency_list.get(u, []):
            if e.target == v:
                weight = e.weight
                break
        edges.append({
            "id":    eid,
            "from":  u,
            "to":    v,
            "color": {"color": color, "highlight": color},
            "width": 6,
            "title": f"{name} ({weight:.0f} min)",
            "label": f"{weight:.0f} min",
            "font":  {"size": 11, "color": "#e2e8f0", "strokeWidth": 2, "strokeColor": "#0f172a"},
        })

    legend_items = "".join(
        f'<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">'
        f'<div style="width:24px;height:4px;background:{colors_seq[i % len(colors_seq)]};border-radius:2px;"></div>'
        f'<span style="font-size:13px;color:#cbd5e1;">{name.replace("->", " → ")}</span></div>'
        for i, name in enumerate(paths.keys())
    )

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Arvore de Percurso</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js"></script>
  <style>
    body {{ background:#0f172a; color:#e2e8f0; font-family:'Segoe UI',sans-serif; margin:0; display:flex; flex-direction:column; height:100vh; }}
    h1   {{ font-size:16px; padding:14px 20px; background:#1e293b; border-bottom:1px solid #334155; }}
    #legend {{ padding:10px 20px; background:#1e293b; border-bottom:1px solid #334155; display:flex; gap:24px; flex-wrap:wrap; }}
    #mynetwork {{ flex:1; }}
  </style>
</head>
<body>
  <h1>&#9992; Arvore de Percurso — Caminhos Obrigatorios</h1>
  <div id="legend">{legend_items}</div>
  <div id="mynetwork"></div>
  <script>
    const nodesDS = new vis.DataSet({json.dumps(nodes, ensure_ascii=False)});
    const edgesDS = new vis.DataSet({json.dumps(edges, ensure_ascii=False)});
    new vis.Network(document.getElementById('mynetwork'), {{nodes: nodesDS, edges: edgesDS}}, {{
      nodes: {{ shape: 'dot', borderWidth: 2 }},
      edges: {{ smooth: {{ type: 'curvedCW', roundness: 0.2 }}, arrows: 'to' }},
      physics: {{ enabled: false }},
      layout: {{ hierarchical: {{ direction: 'LR', sortMethod: 'directed', levelSeparation: 180, nodeSpacing: 80 }} }},
      interaction: {{ hover: true, tooltipDelay: 80 }},
    }});
  </script>
</body>
</html>"""

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Arvore de percurso gerada em: {out_path}")


REGION_ORDER = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]

_TIPO_LABELS = {
    "hub_nacional": "Hub nacional",
    "hub_regional": "Hub regional",
    "regional": "Voo regional",
}


def _apply_chart_style():
    apply_chart_style(titlesize=13, labelsize=11)


def _stats_box(ax, text: str, loc: str = "upper right"):
    ax.text(
        0.98 if "right" in loc else 0.02,
        0.98 if "upper" in loc else 0.02,
        text,
        transform=ax.transAxes,
        fontsize=9,
        verticalalignment="top" if "upper" in loc else "bottom",
        horizontalalignment="right" if "right" in loc else "left",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="white", edgecolor="#cbd5e1", alpha=0.92),
    )


def _bar_value_labels(ax, bars, fmt="{:.0f}", padding=3, **kwargs):
    for bar in bars:
        h = bar.get_height()
        w = bar.get_width()
        if h > 0 or w > 0:
            val = h if h else w
            if bar.get_x() < 0 or getattr(bar, "orientation", None) == "horizontal":
                ax.text(
                    bar.get_width() + padding / 100 * ax.get_xlim()[1],
                    bar.get_y() + bar.get_height() / 2,
                    fmt.format(val),
                    va="center",
                    ha="left",
                    fontsize=kwargs.get("fontsize", 9),
                )
            else:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + padding,
                    fmt.format(val),
                    ha="center",
                    va="bottom",
                    fontsize=kwargs.get("fontsize", 9),
                )


def _build_analise_md(
    titulo: str,
    pergunta: str,
    metricas: list[str],
    tabela_resumo: str,
    interpretacao: list[str],
    limitacoes: list[str],
) -> str:
    lines = [
        f"# {titulo}",
        "",
        f"**Pergunta analítica:** {pergunta}",
        "",
        "## Métricas e colunas",
        "",
    ]
    lines.extend(f"- {m}" for m in metricas)
    lines.extend(["", "## Principais números", "", tabela_resumo, "", "## Interpretação", ""])
    lines.extend(f"- {b}" for b in interpretacao)
    lines.extend(["", "## Limitações", ""])
    lines.extend(f"- {b}" for b in limitacoes)
    lines.append("")
    return "\n".join(lines)


def _df_to_md_table(df) -> str:
    if df.empty:
        return "_Sem dados._"
    header = "| " + " | ".join(str(c) for c in df.columns) + " |"
    sep = "| " + " | ".join("---" for _ in df.columns) + " |"
    rows = [
        "| " + " | ".join(str(v) for v in row) + " |"
        for row in df.itertuples(index=False, name=None)
    ]
    return "\n".join([header, sep] + rows)


def _save_chart_bundle(out_dir: str, slug: str, fig, analise_md: str) -> None:
    chart_dir = os.path.join(out_dir, f"grafico_{slug}")
    os.makedirs(chart_dir, exist_ok=True)
    png = os.path.join(chart_dir, f"grafico_{slug}.png")
    fig.savefig(png, dpi=150, bbox_inches="tight")
    plt.close(fig)
    with open(os.path.join(chart_dir, "analise.md"), "w", encoding="utf-8") as f:
        f.write(analise_md)


_LEGACY_PNGS = (
    "distribuicao_graus.png",
    "aeroportos_por_regiao.png",
    "densidade_por_regiao.png",
    "top_10_conectados.png",
    "grau_por_regiao_boxplot.png",
    "densidade_ego_por_regiao_violin.png",
    "composicao_tipos_conexao_por_regiao.png",
    "peso_conexoes_por_tipo_boxplot.png",
    "top_15_hubs_grau.png",
    "relacao_grau_vs_densidade_ego.png",
    "distribuicao_tempo_rotas_minimas.png",
    "heatmap_media_peso_origem_destino_regiao.png",
)


def generate_exploratory_plots(out_dir, data_dir="data"):
    for legacy in _LEGACY_PNGS:
        legacy_path = os.path.join(out_dir, legacy)
        if os.path.isfile(legacy_path):
            os.remove(legacy_path)
    for chart_dir in glob.glob(os.path.join(out_dir, "grafico_*")):
        if os.path.isdir(chart_dir):
            shutil.rmtree(chart_dir)

    _apply_chart_style()

    ego_df = pd.read_csv(os.path.join(out_dir, "ego_aeroportos.csv"))
    airports_df = pd.read_csv(os.path.join(data_dir, "aeroportos_data.csv"))
    adj_df = pd.read_csv(os.path.join(data_dir, "adjacencias_aeroportos.csv"))
    routes_df = pd.read_csv(os.path.join(out_dir, "distancias_rotas.csv"))

    with open(os.path.join(out_dir, "regioes.json"), encoding="utf-8") as f:
        regioes_data = json.load(f)
    with open(os.path.join(out_dir, "global.json"), encoding="utf-8") as f:
        global_data = json.load(f)

    region_map = airports_df.set_index("iata")["regiao"].to_dict()
    ego_df = ego_df.merge(
        airports_df[["iata", "regiao"]].rename(columns={"iata": "aeroporto"}),
        on="aeroporto", how="left",
    )
    ego_df["regiao"] = ego_df["regiao"].fillna("Desconhecida")

    adj_df = adj_df.rename(columns={"tipo_conexao": "tipo"})
    adj_df["regiao_origem"] = adj_df["origem"].map(region_map)
    adj_df["regiao_destino"] = adj_df["destino"].map(region_map)
    adj_df = adj_df.dropna(subset=["regiao_origem", "regiao_destino"])

    region_cats = [r for r in REGION_ORDER if r in ego_df["regiao"].unique()]

    _plot_grau_por_regiao(out_dir, ego_df, region_cats)
    _plot_densidade_ego_por_regiao(out_dir, ego_df, region_cats)
    _plot_composicao_conexoes(out_dir, adj_df, region_cats)
    _plot_duracao_por_tipo(out_dir, adj_df)
    _plot_top_hubs(out_dir, ego_df, region_cats)
    _plot_grau_vs_densidade_ego(out_dir, ego_df, region_cats)
    _plot_rotas_minimas(out_dir, routes_df)
    _plot_heatmap_duracao_regioes(out_dir, adj_df)
    _plot_metricas_regionais(out_dir, regioes_data, global_data)
    _plot_distribuicao_graus(out_dir, ego_df)

    print("10 visualizações analíticas geradas em out/grafico_*/")


def _plot_grau_por_regiao(out_dir, ego_df, region_cats):
    region_palette = dict(REGION_COLORS)
    grau_stats = (
        ego_df.groupby("regiao")["grau"]
        .agg(
            mediana="median", media="mean",
            q1=lambda s: s.quantile(0.25),
            q3=lambda s: s.quantile(0.75),
            n="count",
        )
        .reindex(region_cats)
    )
    fig, ax = plt.subplots(figsize=(10, 5))
    x = np.arange(len(region_cats))
    means = grau_stats["media"].values
    medians = grau_stats["mediana"].values
    yerr_iqr = np.array([
        np.maximum(means - grau_stats["q1"].values, 0),
        np.maximum(grau_stats["q3"].values - means, 0),
    ])
    bars = ax.bar(
        x, means, color=[region_palette.get(r, "#94a3b8") for r in region_cats],
        edgecolor="#334155", linewidth=0.6,
        yerr=yerr_iqr, capsize=4,
        error_kw={"elinewidth": 1.0, "ecolor": "#94a3b8", "alpha": 0.85},
    )
    ax.set_xticks(x)
    ax.set_xticklabels(region_cats, rotation=15)
    ax.set_ylim(bottom=0)
    for bar, mean, med in zip(bars, means, medians):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.25,
                f"{mean:.1f}", ha="center", va="bottom", fontsize=10, fontweight="bold")
        ax.text(bar.get_x() + bar.get_width() / 2, max(bar.get_height() * 0.15, 0.4),
                f"med={med:.0f}", ha="center", va="bottom", fontsize=8, color="#475569")
    n_total = int(grau_stats["n"].sum())
    ax.set_title(
        "Como o grau médio varia por região?\n"
        f"Barras = média · traço = IQR (P25–P75) · {n_total} aeroportos",
        pad=12,
    )
    ax.set_xlabel("Região")
    ax.set_ylabel("Grau médio (conexões diretas)")
    _stats_box(ax, f"n={n_total}\nμ global={ego_df['grau'].mean():.1f}\nmediana global={ego_df['grau'].median():.0f}")
    tbl = grau_stats.reset_index().rename(columns={"regiao": "Região"})
    tbl["mediana"] = tbl["mediana"].map(lambda v: f"{v:.0f}")
    tbl["media"] = tbl["media"].map(lambda v: f"{v:.1f}")
    tbl["q1"] = tbl["q1"].map(lambda v: f"{v:.1f}")
    tbl["q3"] = tbl["q3"].map(lambda v: f"{v:.1f}")
    tbl["n"] = tbl["n"].astype(int)
    _save_chart_bundle(out_dir, "grau_por_regiao", fig, _build_analise_md(
        "Grau por região",
        "Como o grau médio varia por região?",
        ["`ego_aeroportos.csv`: grau", "`aeroportos_data.csv`: região por IATA"],
        _df_to_md_table(tbl),
        [
            f"Região com maior grau médio: **{grau_stats['media'].idxmax()}** ({grau_stats['media'].max():.1f}).",
            f"Região com menor grau médio: **{grau_stats['media'].idxmin()}** ({grau_stats['media'].min():.1f}).",
            f"A mediana é **{grau_stats['mediana'].iloc[0]:.0f}** em todas as regiões — hubs puxam a média para cima; compare as barras e o IQR.",
        ],
        ["Média sensível a hubs (ex.: BEL); mediana sozinha não separa regiões neste dataset."],
    ))


def _plot_densidade_ego_por_regiao(out_dir, ego_df, region_cats):
    region_palette = dict(REGION_COLORS)
    stats = (
        ego_df.groupby("regiao")["densidade_ego"]
        .agg(media="mean", mediana="median", n="count")
        .reindex(region_cats)
    )
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(
        range(len(region_cats)), stats["media"].values,
        color=[region_palette.get(r, "#94a3b8") for r in region_cats],
        edgecolor="#334155", linewidth=0.6,
    )
    ax.set_xticks(range(len(region_cats)))
    ax.set_xticklabels(region_cats, rotation=15)
    ax.set_ylim(bottom=0)
    _bar_value_labels(ax, bars, fmt="{:.3f}", padding=0.002)
    ax.set_title(
        "Qual região tem ego-redes mais densas?\n"
        "Média da densidade da ego-rede por região",
        pad=12,
    )
    ax.set_xlabel("Região")
    ax.set_ylabel("Densidade ego média")
    _stats_box(
        ax,
        f"μ={ego_df['densidade_ego'].mean():.4f}\nmed={ego_df['densidade_ego'].median():.4f}",
        loc="upper left",
    )
    tbl = stats.reset_index().rename(columns={"regiao": "Região"})
    tbl["media"] = tbl["media"].map(lambda v: f"{v:.4f}")
    tbl["mediana"] = tbl["mediana"].map(lambda v: f"{v:.4f}")
    _save_chart_bundle(out_dir, "densidade_ego_por_regiao", fig, _build_analise_md(
        "Densidade ego por região",
        "Qual região tem ego-redes mais densas?",
        ["`ego_aeroportos.csv`: densidade_ego", "`aeroportos_data.csv`: região"],
        _df_to_md_table(tbl),
        [
            f"Maior coesão média local: **{stats['media'].idxmax()}** ({stats['media'].max():.4f}).",
            f"Menor média: **{stats['media'].idxmin()}** ({stats['media'].min():.4f}).",
            "Densidade ego alta indica que os vizinhos de um aeroporto também se conectam entre si.",
        ],
        ["Média regional pode mascarar aeroportos isolados dentro da mesma região."],
    ))


def _plot_composicao_conexoes(out_dir, adj_df, region_cats):
    tipo_by_region = (
        adj_df.groupby(["regiao_origem", "tipo"]).size().unstack(fill_value=0)
    )
    for col in ["hub_nacional", "hub_regional", "regional"]:
        if col not in tipo_by_region.columns:
            tipo_by_region[col] = 0
    tipo_by_region = tipo_by_region[["hub_nacional", "hub_regional", "regional"]]
    tipo_by_region = tipo_by_region.reindex(
        [r for r in REGION_ORDER if r in tipo_by_region.index]
    )
    tipo_pct = tipo_by_region.div(tipo_by_region.sum(axis=1), axis=0) * 100

    fig, ax = plt.subplots(figsize=(10, 5))
    bottom = np.zeros(len(tipo_pct))
    tipo_colors = [EDGE_COLORS[t] for t in ["hub_nacional", "hub_regional", "regional"]]
    for i, tipo in enumerate(["hub_nacional", "hub_regional", "regional"]):
        values = tipo_pct[tipo].values
        bars_stack = ax.bar(
            tipo_pct.index, values, bottom=bottom,
            label=_TIPO_LABELS[tipo], color=tipo_colors[i],
            edgecolor="#334155", linewidth=0.6,
        )
        for bar, val, bot in zip(bars_stack, values, bottom):
            if val >= 8:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bot + val / 2,
                    f"{val:.0f}%",
                    ha="center", va="center", fontsize=8, color="white", fontweight="bold",
                )
        bottom = bottom + values
    ax.set_title(
        "Qual o mix de tipos de conexão por região de origem?\n"
        "Participação percentual (arestas que partem de cada região)",
        pad=12,
    )
    ax.set_xlabel("Região de origem")
    ax.set_ylabel("Participação (%)")
    ax.set_ylim(0, 100)
    ax.legend(title="Tipo de conexão", fontsize=9, title_fontsize=9)
    ax.tick_params(axis="x", rotation=15)
    abs_rows = []
    for reg in tipo_by_region.index:
        row = tipo_by_region.loc[reg]
        abs_rows.append({
            "Região": reg,
            "Hub nacional": int(row["hub_nacional"]),
            "Hub regional": int(row["hub_regional"]),
            "Voo regional": int(row["regional"]),
            "Total": int(row.sum()),
        })
    abs_tbl = pd.DataFrame(abs_rows)
    _save_chart_bundle(out_dir, "composicao_conexoes", fig, _build_analise_md(
        "Composição das conexões",
        "Qual o mix hub nacional / regional / voo por região de origem?",
        ["`adjacencias_aeroportos.csv`: tipo_conexao, origem", "Região mapeada via IATA"],
        _df_to_md_table(abs_tbl) + "\n\n" + _df_to_md_table(
            tipo_pct.reset_index().rename(columns={"regiao_origem": "Região"}).round(1)
        ),
        [
            "Sudeste e Sul tendem a maior fatia de hub nacional (rotas de longo alcance).",
            "Centro-Oeste concentra proporção maior de voos regionais em alguns recortes.",
            "Percentuais no gráfico aparecem em segmentos ≥ 8%; totais absolutos na tabela acima.",
        ],
        ["Contagem por aresta direcionada na lista de adjacências (426 conexões no grafo)."],
    ))


def _plot_duracao_por_tipo(out_dir, adj_df):
    tipo_order = ["hub_nacional", "hub_regional", "regional"]
    dur_stats = adj_df.groupby("tipo")["peso"].agg(
        mediana="median",
        q1=lambda s: s.quantile(0.25),
        q3=lambda s: s.quantile(0.75),
        n="count",
    ).reindex(tipo_order)

    fig, ax = plt.subplots(figsize=(9, 5))
    x_tipo = np.arange(len(tipo_order))
    meds = dur_stats["mediana"].values
    bars = ax.bar(
        x_tipo, meds,
        color=[EDGE_COLORS[t] for t in tipo_order],
        edgecolor="#334155", linewidth=0.6,
    )
    ax.set_xticks(x_tipo)
    ax.set_xticklabels([_TIPO_LABELS[t] for t in tipo_order])
    ymax = max(meds) * 1.22 if len(meds) else 1
    ax.set_ylim(0, ymax)
    for bar, med, q1, q3 in zip(bars, meds, dur_stats["q1"], dur_stats["q3"]):
        cx = bar.get_x() + bar.get_width() / 2
        ax.text(cx, bar.get_height() + 2, f"{med:.0f} min",
                ha="center", va="bottom", fontsize=10, fontweight="bold")
        ax.text(
            cx, -0.10, f"P25–P75: {q1:.0f}–{q3:.0f}",
            transform=ax.get_xaxis_transform(),
            ha="center", va="top", fontsize=8, color="#64748b", clip_on=False,
        )
    ax.set_title(
        "Qual a duração típica por tipo de conexão?\n"
        "Mediana em minutos (faixa típica P25–P75 abaixo de cada barra)",
        pad=12,
    )
    ax.set_xlabel("Tipo de conexão")
    ax.set_ylabel("Duração mediana (min)")
    dur_tbl = dur_stats.reset_index()
    dur_tbl["tipo"] = dur_tbl["tipo"].map(_TIPO_LABELS)
    dur_tbl = dur_tbl.rename(columns={"tipo": "Tipo", "mediana": "Mediana", "q1": "P25", "q3": "P75"})
    _save_chart_bundle(out_dir, "duracao_por_tipo", fig, _build_analise_md(
        "Duração por tipo",
        "Qual a duração típica (mediana) por tipo de conexão?",
        ["`adjacencias_aeroportos.csv`: peso (min), tipo_conexao"],
        _df_to_md_table(dur_tbl),
        [
            f"Tipo com maior mediana: **{_TIPO_LABELS[dur_stats['mediana'].idxmax()]}** ({dur_stats['mediana'].max():.0f} min).",
            f"Tipo com menor mediana: **{_TIPO_LABELS[dur_stats['mediana'].idxmin()]}** ({dur_stats['mediana'].min():.0f} min).",
            "Peso = distância / 800 km/h + 30 min de manobra (modelo do dataset).",
        ],
        ["IQR (P25–P75) resume a dispersão típica; extremos isolados ficam fora dessa faixa."],
    ))


def _plot_top_hubs(out_dir, ego_df, region_cats):
    region_palette = dict(REGION_COLORS)
    top_15 = ego_df.nlargest(15, "grau").sort_values("grau")
    fig, ax = plt.subplots(figsize=(10, 7))
    bars = ax.barh(
        top_15["aeroporto"], top_15["grau"],
        color=[region_palette.get(r, "#94a3b8") for r in top_15["regiao"]],
        edgecolor="#334155", linewidth=0.8,
    )
    ax.bar_label(bars, padding=4, fontsize=9)
    if len(bars) > 0:
        bars[-1].set_edgecolor("#f97316")
        bars[-1].set_linewidth(2.5)
    hub1 = ego_df.loc[ego_df["grau"].idxmax()]
    ax.set_title(
        "Quais 15 aeroportos concentram mais conexões?\n"
        f"#1: {hub1['aeroporto']} (grau {int(hub1['grau'])})",
        pad=12,
    )
    ax.set_xlabel("Grau (conexões diretas)")
    ax.set_ylabel("Aeroporto (IATA)")
    patches = [mpatches.Patch(color=c, label=r) for r, c in region_palette.items()]
    ax.legend(handles=patches, title="Região", fontsize=8, title_fontsize=8, loc="lower right")
    top_tbl = top_15[["aeroporto", "regiao", "grau"]].rename(
        columns={"aeroporto": "IATA", "regiao": "Região", "grau": "Grau"}
    )
    _save_chart_bundle(out_dir, "top_hubs", fig, _build_analise_md(
        "Top hubs",
        "Quais aeroportos concentram mais conexões diretas?",
        ["`ego_aeroportos.csv`: grau", "`aeroportos_data.csv`: região"],
        _df_to_md_table(top_tbl.sort_values("Grau", ascending=False)),
        [
            f"**{hub1['aeroporto']}** lidera com grau **{int(hub1['grau'])}** ({hub1['regiao']}).",
            f"15º do ranking: **{top_15.iloc[-1]['aeroporto']}** (grau {int(top_15.iloc[-1]['grau'])}).",
            "Cores seguem a paleta regional do grafo interativo.",
        ],
        ["Ranking por grau simples; não pondera frequência de voos reais."],
    ))


def _plot_grau_vs_densidade_ego(out_dir, ego_df, region_cats):
    region_palette = dict(REGION_COLORS)
    pearson_r = ego_df["grau"].corr(ego_df["densidade_ego"])
    fig, ax = plt.subplots(figsize=(10, 6))
    for reg in region_cats:
        subset = ego_df[ego_df["regiao"] == reg]
        ax.scatter(
            subset["grau"], subset["densidade_ego"],
            label=reg, color=region_palette.get(reg, "#94a3b8"),
            alpha=0.75, s=50, edgecolors="#334155", linewidths=0.4,
        )
    if len(ego_df) > 1:
        z = np.polyfit(ego_df["grau"], ego_df["densidade_ego"], 1)
        x_line = np.linspace(ego_df["grau"].min(), ego_df["grau"].max(), 50)
        ax.plot(x_line, np.poly1d(z)(x_line), "--", color="#64748b", linewidth=1.2, label="Tendência")
    top5 = ego_df.nlargest(5, "grau")
    for _, row in top5.iterrows():
        ax.annotate(
            row["aeroporto"],
            (row["grau"], row["densidade_ego"]),
            fontsize=8, xytext=(4, 4), textcoords="offset points",
        )
    ax.set_title(
        "Hubs com grau alto são mais coesos localmente?\n"
        f"Correlação de Pearson r = {pearson_r:.3f}",
        pad=12,
    )
    ax.set_xlabel("Grau")
    ax.set_ylabel("Densidade da ego-rede")
    ax.legend(title="Região", fontsize=9, title_fontsize=9)
    _stats_box(ax, f"n={len(ego_df)}\nr={pearson_r:.3f}", loc="lower right")
    quad_text = (
        "Quadrante superior direito: hubs conectados e vizinhança densa; "
        "inferior direito: muitas conexões mas ego-rede esparsa."
    )
    _save_chart_bundle(out_dir, "grau_vs_densidade_ego", fig, _build_analise_md(
        "Grau vs densidade ego",
        "Aeroportos com grau alto têm ego-redes mais densas?",
        ["`ego_aeroportos.csv`: grau, densidade_ego"],
        _df_to_md_table(
            top5[["aeroporto", "grau", "densidade_ego", "regiao"]]
            .rename(columns={"aeroporto": "IATA", "regiao": "Região"})
        ),
        [
            f"Correlação linear r = **{pearson_r:.3f}** "
            + ("(positiva fraca a moderada)." if pearson_r > 0.2 else "(fraca ou inexistente)."),
            quad_text,
            "Top 5 por grau anotados no gráfico.",
        ],
        ["Correlação não implica causalidade; outliers regionais podem dominar r."],
    ))


def _plot_rotas_minimas(out_dir, routes_df):
    valid_routes = routes_df[routes_df["custo"] > 0].copy()
    valid_routes["rota"] = valid_routes["origem"] + "→" + valid_routes["destino"]
    valid_routes = valid_routes.sort_values("custo")

    fig, ax = plt.subplots(figsize=(10, max(4, 0.8 * len(valid_routes) + 2)))
    if not valid_routes.empty:
        bars = ax.barh(
            valid_routes["rota"], valid_routes["custo"],
            color="#38bdf8", edgecolor="#334155", linewidth=0.6,
        )
        ax.bar_label(bars, fmt="%.0f min", padding=4, fontsize=9)
        mean_cost = valid_routes["custo"].mean()
        ax.axvline(mean_cost, color="#f97316", linestyle="--", linewidth=1.5,
                   label=f"Média ({mean_cost:.0f} min)")
        ax.legend(fontsize=10)
        _stats_box(
            ax,
            f"n={len(valid_routes)}\nμ={mean_cost:.0f} min\nmed={valid_routes['custo'].median():.0f} min",
            loc="lower right",
        )
    else:
        ax.text(0.5, 0.5, "Sem rotas válidas", ha="center", va="center", transform=ax.transAxes)
    ax.set_title(
        "Quanto tempo leva cada rota obrigatória?\n"
        "Custo do caminho mínimo (Dijkstra) por par origem→destino",
        pad=12,
    )
    ax.set_xlabel("Tempo total (min)")
    ax.set_ylabel("Rota")
    route_tbl = valid_routes[["rota", "custo", "caminho"]].rename(
        columns={"rota": "Par", "custo": "Minutos", "caminho": "Caminho"}
    ) if not valid_routes.empty else pd.DataFrame()
    min_row = valid_routes.loc[valid_routes["custo"].idxmin()] if not valid_routes.empty else None
    max_row = valid_routes.loc[valid_routes["custo"].idxmax()] if not valid_routes.empty else None
    _save_chart_bundle(out_dir, "rotas_minimas", fig, _build_analise_md(
        "Rotas mínimas",
        "Quanto tempo leva cada rota em rotas.csv?",
        ["`distancias_rotas.csv`: custo, caminho", "`data/rotas.csv`: pares solicitados"],
        _df_to_md_table(route_tbl) if not route_tbl.empty else "_Sem rotas._",
        [
            f"Rota mais rápida: **{min_row['rota']}** ({min_row['custo']:.0f} min) — {min_row['caminho']}."
            if min_row is not None else "Sem dados.",
            f"Rota mais lenta: **{max_row['rota']}** ({max_row['custo']:.0f} min) — {max_row['caminho']}."
            if max_row is not None else "",
            "Uma barra por par (adequado para poucos pontos; histograma seria enganoso).",
        ],
        [f"Apenas **{len(valid_routes)}** rotas em `rotas.csv`; amostra pequena para inferência estatística."],
    ))


def _plot_heatmap_duracao_regioes(out_dir, adj_df):
    heatmap_df = (
        adj_df.groupby(["regiao_origem", "regiao_destino"])["peso"]
        .mean()
        .unstack()
    )
    heatmap_df = heatmap_df.reindex(
        index=[r for r in REGION_ORDER if r in heatmap_df.index],
        columns=[r for r in REGION_ORDER if r in heatmap_df.columns],
    )

    fig, ax = plt.subplots(figsize=(9, 7))
    flat_valid = heatmap_df.stack(future_stack=True).dropna()
    if heatmap_df.size > 0:
        mask_na = heatmap_df.isna()
        annot = heatmap_df.apply(
            lambda col: col.map(lambda v: f"{v:.0f}" if pd.notna(v) else "")
        )
        vmin, vmax = flat_valid.min(), flat_valid.max()
        sns.heatmap(
            heatmap_df,
            mask=mask_na,
            annot=annot,
            fmt="",
            cmap="YlOrRd",
            vmin=vmin,
            vmax=vmax,
            linewidths=0.5,
            linecolor="#cbd5e1",
            ax=ax,
            cbar_kws={"label": "Duração média (min)"},
        )
        for i in range(heatmap_df.shape[0]):
            for j in range(heatmap_df.shape[1]):
                if mask_na.iloc[i, j]:
                    ax.add_patch(
                        mpatches.Rectangle(
                            (j, i), 1, 1,
                            fill=True,
                            facecolor="#e2e8f0",
                            edgecolor="#64748b",
                            linewidth=0.8,
                            zorder=2,
                        )
                    )
                    ax.text(
                        j + 0.5, i + 0.5, "sem\nvoo",
                        ha="center", va="center",
                        fontsize=8, color="#475569", zorder=3,
                    )
        min_pair = flat_valid.idxmin()
        max_pair = flat_valid.idxmax()
    else:
        min_pair = max_pair = (None, None)
    ax.set_title(
        "Qual a duração média entre pares de regiões?\n"
        "Origem (linhas) × destino (colunas) · cinza = sem conexão direta",
        pad=12,
    )
    ax.set_xlabel("Região de destino")
    ax.set_ylabel("Região de origem")
    hm_long = heatmap_df.stack(future_stack=True).reset_index()
    hm_long.columns = ["Origem", "Destino", "Min médios"]
    hm_long["Min médios"] = hm_long["Min médios"].apply(
        lambda v: f"{v:.0f}" if pd.notna(v) else "sem voo direto"
    )
    missing_pairs = hm_long[hm_long["Min médios"] == "sem voo direto"]
    _save_chart_bundle(out_dir, "duracao_entre_regioes", fig, _build_analise_md(
        "Duração entre regiões",
        "Qual a duração média de conexão entre pares de regiões?",
        ["`adjacencias_aeroportos.csv`: peso, origem, destino", "Agregação: média por par regional"],
        _df_to_md_table(hm_long) if not hm_long.empty else "_Sem dados._",
        [
            f"Par mais curto (média): **{min_pair[0]} → {min_pair[1]}** ({flat_valid.min():.0f} min)."
            if not flat_valid.empty else "",
            f"Par mais longo (média): **{max_pair[0]} → {max_pair[1]}** ({flat_valid.max():.0f} min)."
            if not flat_valid.empty else "",
            "Escala de cores: amarelo (menor) a vermelho (maior) em minutos.",
            "Células cinza: não há voo direto entre as regiões no dataset "
            + (
                f"(ex.: **{missing_pairs.iloc[0]['Origem']} → {missing_pairs.iloc[0]['Destino']}**)."
                if not missing_pairs.empty else ""
            ),
        ],
        ["Média por par regional; conexões podem existir com escalas em outras rotas."],
    ))


def _plot_metricas_regionais(out_dir, regioes_data, global_data):
    region_palette = dict(REGION_COLORS)
    reg_df = pd.DataFrame(regioes_data).rename(
        columns={"region": "regiao", "order": "ordem", "size": "tamanho", "density": "densidade"}
    )
    region_order = [r for r in REGION_ORDER if r in reg_df["regiao"].values]
    reg_df = reg_df.set_index("regiao").reindex(region_order).reset_index()

    fig, axes = plt.subplots(1, 3, figsize=(14, 5), sharex=True)
    metrics = [
        ("ordem", "Ordem (vértices)", "{:.0f}"),
        ("tamanho", "Tamanho (arestas)", "{:.0f}"),
        ("densidade", "Densidade", "{:.3f}"),
    ]
    for ax_m, (col, ylabel, fmt) in zip(axes, metrics):
        vals = reg_df[col].values
        bars = ax_m.bar(
            range(len(reg_df)), vals,
            color=[region_palette.get(r, "#94a3b8") for r in reg_df["regiao"]],
            edgecolor="#334155", linewidth=0.6,
        )
        for bar, val in zip(bars, vals):
            ax_m.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + (0.02 * max(vals) if max(vals) else 0.01),
                fmt.format(val),
                ha="center", va="bottom", fontsize=8,
            )
        ax_m.set_xticks(range(len(reg_df)))
        ax_m.set_xticklabels(reg_df["regiao"], rotation=20, ha="right")
        ax_m.set_ylim(bottom=0)
        ax_m.set_ylabel(ylabel)
        ax_m.set_title(ylabel, fontsize=11)
    fig.suptitle(
        "Como variam ordem, tamanho e densidade do subgrafo por região?\n"
        f"Grafo global: ordem {global_data['order']}, "
        f"tamanho {global_data['size']}, densidade {global_data['density']:.4f}",
        fontsize=13, y=1.02,
    )
    fig.tight_layout()
    reg_tbl = reg_df.copy()
    reg_tbl["densidade"] = reg_tbl["densidade"].map(lambda v: f"{v:.4f}")
    _save_chart_bundle(out_dir, "metricas_regionais", fig, _build_analise_md(
        "Métricas regionais",
        "Como ordem, tamanho e densidade do subgrafo induzido variam por região?",
        ["`regioes.json`: order, size, density por região", "`global.json`: métricas do grafo completo"],
        _df_to_md_table(reg_tbl.rename(columns={"regiao": "Região"})),
        [
            f"Maior densidade regional: **{reg_df.loc[reg_df['densidade'].idxmax(), 'regiao']}**.",
            f"Maior subgrafo (ordem): **{reg_df.loc[reg_df['ordem'].idxmax(), 'regiao']}** ({int(reg_df['ordem'].max())} vértices).",
            f"Grafo completo: {global_data['order']} aeroportos, {global_data['size']} conexões.",
        ],
        ["Subgrafos são induzidos por região; arestas só entre aeroportos da mesma região."],
    ))


def _plot_distribuicao_graus(out_dir, ego_df):
    graus = ego_df["grau"].values
    hub_threshold = float(np.percentile(graus, 90))
    bins = np.arange(graus.min(), graus.max() + 2) - 0.5

    fig, ax = plt.subplots(figsize=(11, 5.5))
    counts, bin_edges, patches = ax.hist(
        graus, bins=bins, edgecolor="#334155", linewidth=0.6,
    )
    for patch, left in zip(patches, bin_edges[:-1]):
        center = left + 0.5
        patch.set_facecolor("#ef4444" if center >= hub_threshold else "#38bdf8")
    ax.axvline(hub_threshold, color="#ef4444", linestyle="--", linewidth=1.5,
               label=f"Limiar de hub (P90 = grau {hub_threshold:.0f})")
    ax.axvline(graus.mean(), color="#facc15", linestyle="-.", linewidth=1.5,
               label=f"Média ({graus.mean():.1f})")
    top5_hubs = ego_df.nlargest(5, "grau")
    y_annot = max(counts) * 0.55
    for rank, (_, row) in enumerate(top5_hubs.iterrows()):
        ax.annotate(
            f"{row['aeroporto']} ({int(row['grau'])})",
            xy=(row["grau"], 1), xytext=(row["grau"], y_annot + rank * max(counts) * 0.08),
            ha="center", fontsize=8, color="#7f1d1d",
            arrowprops=dict(arrowstyle="->", color="#ef4444", lw=0.8),
        )
    hub_count = int((graus >= hub_threshold).sum())
    ax.set_title(
        "Como se distribuem os graus dos aeroportos?\n"
        f"Histograma com hubs destacados (grau ≥ P90): {hub_count} aeroportos concentram as conexões",
        pad=12,
    )
    ax.set_xlabel("Grau (número de conexões diretas)")
    ax.set_ylabel("Número de aeroportos")
    handles, labels = ax.get_legend_handles_labels()
    handles += [
        mpatches.Patch(color="#38bdf8", label="Aeroporto comum"),
        mpatches.Patch(color="#ef4444", label="Hub (grau ≥ P90)"),
    ]
    ax.legend(handles=handles, fontsize=9)
    _stats_box(
        ax,
        f"n={len(graus)}\nmín={graus.min()} · máx={graus.max()}\n"
        f"μ={graus.mean():.1f} · med={np.median(graus):.0f}",
    )
    hist_tbl = pd.DataFrame({
        "Estatística": ["Mínimo", "Mediana", "Média", "P90 (limiar hub)", "Máximo", "Hubs (≥P90)"],
        "Valor": [
            f"{graus.min():.0f}", f"{np.median(graus):.0f}", f"{graus.mean():.1f}",
            f"{hub_threshold:.0f}", f"{graus.max():.0f}", f"{hub_count}",
        ],
    })
    _save_chart_bundle(out_dir, "distribuicao_graus", fig, _build_analise_md(
        "Distribuição de graus",
        "Como se distribuem os graus dos aeroportos da malha?",
        ["`ego_aeroportos.csv`: grau de cada aeroporto"],
        _df_to_md_table(hist_tbl),
        [
            "A distribuição é **assimétrica à direita**: a maioria dos aeroportos tem poucas "
            "conexões e uma minoria (hubs, em vermelho) concentra grande parte das arestas.",
            f"O limiar de hub (P90) é grau **{hub_threshold:.0f}**; {hub_count} aeroportos estão acima dele "
            f"(top: {', '.join(top5_hubs['aeroporto'].tolist())}).",
            "Padrão típico de redes de transporte hub-and-spoke: a média "
            f"({graus.mean():.1f}) fica bem acima da mediana ({np.median(graus):.0f}).",
            "Gestalt — Proximidade: a separação visual entre o corpo (azul) e a cauda (vermelho) "
            "agrupa os hubs sem precisar de rótulos.",
        ],
        [
            "Grau conta conexões distintas, não frequência de voos; um hub com poucas rotas "
            "muito frequentes seria subestimado.",
        ],
    ))
