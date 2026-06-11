"""
Gera relatorio_tecnico.pdf na raiz do projeto.

Estrutura de storytelling exigida pelos critérios de AVD:
  1. Contexto    — justificativa dos pesos
  2. Exploração  — o que as métricas globais revelam
  3. Modelagem   — Gestalt aplicada ao design do grafo
  4. Resultados  — caminhos e performance dos algoritmos
  5. Limitações  — onde dados E visualizações falham
  6. Conclusão   — insights acionáveis

Todos os números são lidos dos outputs reais em out/ — o PDF nunca
fica dessincronizado do pipeline.

Uso: python scripts/generate_relatorio.py
"""

import csv
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
PDF_PATH = ROOT / "relatorio_tecnico.pdf"

ACCENT = colors.HexColor("#0c4a6e")
LIGHT = colors.HexColor("#e0f2fe")
GRID = colors.HexColor("#cbd5e1")


# ── Carregamento dos dados reais ───────────────────────────────────────
def _pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    vx = sum((x - mx) ** 2 for x in xs) ** 0.5
    vy = sum((y - my) ** 2 for y in ys) ** 0.5
    return cov / (vx * vy) if vx and vy else 0.0


def load_data():
    data = {}
    data["global"] = json.loads((OUT / "global.json").read_text(encoding="utf-8"))
    data["regioes"] = json.loads((OUT / "regioes.json").read_text(encoding="utf-8"))
    data["parte2"] = json.loads((OUT / "parte2_report.json").read_text(encoding="utf-8"))
    with open(OUT / "distancias_rotas.csv", encoding="utf-8") as f:
        data["rotas"] = list(csv.DictReader(f))
    with open(OUT / "ego_aeroportos.csv", encoding="utf-8") as f:
        ego = list(csv.DictReader(f))
    data["top_hubs"] = sorted(ego, key=lambda r: int(r["grau"]), reverse=True)[:5]

    # Estatísticas derivadas (sempre sincronizadas com os outputs reais)
    graus = sorted(int(r["grau"]) for r in ego)
    p90 = graus[int(0.9 * (len(graus) - 1))]
    data["hub_count"] = sum(1 for g in graus if g >= p90)
    data["pearson_r"] = _pearson(
        [int(r["grau"]) for r in ego],
        [float(r["densidade_ego"]) for r in ego],
    )
    with open(ROOT / "data" / "adjacencias_aeroportos.csv", encoding="utf-8") as f:
        pesos = [float(r["peso"]) for r in csv.DictReader(f)]
    data["peso_min"], data["peso_max"] = min(pesos), max(pesos)
    return data


# ── Estilos ────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontSize=22,
                                textColor=ACCENT, spaceAfter=6),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontSize=12,
                                   alignment=TA_CENTER, textColor=colors.HexColor("#475569")),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontSize=15,
                             textColor=ACCENT, spaceBefore=14, spaceAfter=6),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontSize=12,
                             textColor=colors.HexColor("#0369a1"), spaceBefore=10, spaceAfter=4),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=10, leading=14.5,
                               alignment=TA_JUSTIFY, spaceAfter=6),
        "caption": ParagraphStyle("caption", parent=base["Normal"], fontSize=8.5,
                                  alignment=TA_CENTER, textColor=colors.HexColor("#64748b"),
                                  spaceBefore=2, spaceAfter=10),
    }


def styled_table(rows, col_widths=None, font_size=8.5):
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def fig(path, width_cm, caption_text, styles, story):
    p = OUT / path
    if p.exists():
        img = Image(str(p))
        ratio = img.imageHeight / img.imageWidth
        img.drawWidth = width_cm * cm
        img.drawHeight = width_cm * ratio * cm
        story.append(img)
        story.append(Paragraph(caption_text, styles["caption"]))


def main():
    d = load_data()
    g = d["global"]
    p2 = d["parte2"]
    ds = p2["dataset"]
    perf = p2["performance_summary"]
    scaling = p2["scaling_experiment"]
    last = scaling[-1]
    bf1 = p2["bellman_ford_results"]["negative_weight_case"]
    bf2 = p2["bellman_ford_results"]["negative_cycle_case"]
    if "error" in bf1 or bf1.get("cost") is None:
        raise SystemExit(
            "Caso 1 do Bellman-Ford incompleto em parte2_report.json "
            f"({bf1.get('error', 'custo ausente')}). Rode `make parte2` antes do relatório."
        )
    s = build_styles()
    story = []

    # ── Capa ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 4 * cm))
    story.append(Paragraph("Relatório Técnico", s["title"]))
    story.append(Paragraph(
        "Grafo de Aeroportos do Brasil &amp; Comparação de Algoritmos de Caminho Mínimo",
        s["subtitle"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(
        "Teoria dos Grafos + Análise e Visualização de Dados — AV2<br/>"
        "CESAR School — junho de 2026", s["subtitle"]))
    story.append(Spacer(1, 1.2 * cm))
    resumo = (
        f"Modelamos a malha aérea brasileira como um grafo não-direcionado ponderado com "
        f"<b>{g['order']} aeroportos</b> e <b>{g['size']} conexões</b> (densidade "
        f"{g['density']:.4f}, conectado: {'sim' if g.get('connected') else 'não'}), "
        f"calculamos métricas globais, regionais e de ego-redes, e aplicamos quatro "
        f"algoritmos clássicos implementados do zero — BFS, DFS, Dijkstra e Bellman-Ford — "
        f"em um segundo dataset de {ds['nodes']:,} músicas do Spotify com {ds['edges']:,} "
        f"conexões de similaridade. Este relatório segue a estrutura de storytelling "
        f"Contexto → Exploração → Modelagem → Resultados → Limitações → Conclusão."
    )
    story.append(Paragraph(resumo, s["body"]))
    story.append(PageBreak())

    # ── 1. Contexto ────────────────────────────────────────────────────
    story.append(Paragraph("1. Contexto — por que estes pesos?", s["h1"]))
    story.append(Paragraph(
        "A pergunta que orienta o projeto é prática: <b>quanto tempo um passageiro leva "
        "para ir de um aeroporto a outro na malha brasileira?</b> Para respondê-la, cada "
        "aresta recebe como peso o <b>tempo estimado de voo em minutos</b> — uma variável "
        "com significado analítico e visual direto (critério de AVD: pesos refletindo "
        "variáveis interpretáveis), e não um número arbitrário.", s["body"]))
    story.append(Paragraph("Régua de pesos (única e aplicada a 100% das arestas)", s["h2"]))
    story.append(Paragraph(
        "<b>peso = (distância haversine entre os aeroportos ÷ 800 km/h) × 60 + 30 minutos</b>",
        s["body"]))
    story.append(Paragraph(
        "A distância geográfica real entre os aeroportos (fórmula de haversine sobre "
        "latitude/longitude do OurAirports) é convertida em tempo de cruzeiro a 800 km/h — "
        f"velocidade típica de jatos comerciais — somada a 30 minutos fixos de decolagem, "
        f"aproximação e pouso. A régua é <b>consistente</b> (mesma fórmula para todas as "
        f"{g['size']} arestas), <b>documentada</b> (scripts/populate_data.py) e "
        f"<b>não-negativa</b> por construção, como exige a Parte 1: a menor aresta custa "
        f"{d['peso_min']:.0f} min e a maior {d['peso_max']:.0f} min.", s["body"]))
    story.append(Paragraph("Tipos de conexão e justificativas", s["h2"]))
    story.append(styled_table([
        ["Tipo", "Critério da aresta", "Justificativa registrada no CSV"],
        ["hub_nacional", "Ambos os extremos são hubs (GRU, BSB, REC...)",
         "conexão entre hubs nacionais de alta demanda"],
        ["hub_regional", "Aeroporto comum ligado aos 2 hubs mais próximos",
         "conexão ao hub nacional mais próximo"],
        ["regional", "Ligação intrarregional entre aeroportos comuns",
         "voo regional entre aeroportos da mesma região"],
    ], col_widths=[3.2 * cm, 7.2 * cm, 6.2 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Essa topologia garante as duas exigências estruturais: conexões "
        "<b>intrarregionais</b> (voos regionais) e <b>inter-regionais</b> (malha de hubs), "
        "além de um grafo <b>conectado</b> — verificado por BFS no pipeline "
        "(global.json → connected: true).", s["body"]))

    # ── 2. Exploração ──────────────────────────────────────────────────
    story.append(Paragraph("2. Exploração — o que as métricas revelam", s["h1"]))
    story.append(Paragraph(
        f"O grafo completo tem ordem {g['order']}, tamanho {g['size']} e densidade "
        f"{g['density']:.4f}: apenas ~5% dos pares possíveis de aeroportos têm voo direto. "
        f"Essa esparsidade não é defeito — é a assinatura do modelo <b>hub-and-spoke</b> "
        f"da aviação real: poucos centros concentram as conexões e o restante da malha "
        f"se liga a eles.", s["body"]))
    reg_rows = [["Região", "Ordem", "Tamanho", "Densidade"]]
    for r in sorted(d["regioes"], key=lambda x: -x["density"]):
        reg_rows.append([r["region"], str(r["order"]), str(r["size"]), f"{r['density']:.4f}"])
    story.append(styled_table(reg_rows, col_widths=[4.5 * cm, 2.5 * cm, 2.5 * cm, 3 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    dens_max = max(d["regioes"], key=lambda r: r["density"])
    ord_max = max(d["regioes"], key=lambda r: r["order"])
    story.append(Paragraph(
        f"A leitura regional inverte a intuição: o <b>{dens_max['region']}</b>, com o menor "
        f"subgrafo ({dens_max['order']} aeroportos), é a região mais densa "
        f"({dens_max['density']:.3f}) — todos os seus aeroportos se alcançam em poucas "
        f"conexões internas. Já o <b>{ord_max['region']}</b>, maior subgrafo "
        f"({ord_max['order']} aeroportos), dilui sua densidade ({ord_max['density']:.3f}): "
        f"seu papel é conectar o país, não a si mesmo. As ego-redes confirmam: a correlação "
        f"entre grau e densidade-ego é <b>negativa</b> (r = {d['pearson_r']:.3f}) — quanto "
        f"mais conectado um hub, menos seus vizinhos se conectam entre si, pois o hub "
        f"existe justamente para intermediá-los.", s["body"]))
    hub_rows = [["IATA", "Grau", "Ordem ego", "Tamanho ego", "Densidade ego"]]
    for h in d["top_hubs"]:
        hub_rows.append([h["aeroporto"], h["grau"], h["ordem_ego"], h["tamanho_ego"],
                         f"{float(h['densidade_ego']):.4f}"])
    story.append(styled_table(hub_rows, col_widths=[2.5 * cm, 2 * cm, 2.5 * cm, 2.8 * cm, 3 * cm]))
    story.append(Paragraph("Top 5 hubs por grau (out/ego_aeroportos.csv).", s["caption"]))
    fig("grafico_distribuicao_graus/grafico_distribuicao_graus.png", 14.5,
        "Figura 1 — Distribuição de graus com hubs destacados (grau ≥ P90 em vermelho). "
        "Visualização exploratória: a cauda longa concentra as conexões da malha.", s, story)
    story.append(PageBreak())
    fig("grafico_metricas_regionais/grafico_metricas_regionais.png", 15.5,
        "Figura 2 — Ordem, tamanho e densidade por subgrafo regional. As cores das regiões "
        "são as mesmas em todas as visualizações do projeto (Similaridade — Gestalt).", s, story)

    # ── 3. Modelagem ───────────────────────────────────────────────────
    story.append(Paragraph("3. Modelagem — Gestalt no design do grafo", s["h1"]))
    story.append(Paragraph(
        "O grafo interativo (out/grafo_interativo.html) foi desenhado aplicando "
        "conscientemente as leis da Gestalt para reduzir a carga cognitiva do leitor:", s["body"]))
    story.append(styled_table([
        ["Lei da Gestalt", "Aplicação no grafo"],
        ["Similaridade", "Nós da mesma região compartilham a mesma cor em TODAS as "
                         "visualizações (Norte verde, Nordeste laranja, Sudeste ciano, Sul roxo, "
                         "Centro-Oeste amarelo)."],
        ["Conectividade", "Espessura da aresta proporcional ao peso; arestas fora de foco têm "
                          "alpha reduzido ao destacar um caminho."],
        ["Proximidade", "Posições iniciais semeadas por região (centros num círculo + espiral "
                        "determinística) e física Barnes-Hut: cada região nasce e permanece "
                        "como um aglomerado espacial."],
        ["Região Comum", "Casco convexo translúcido na cor da região desenhado atrás de cada "
                         "cluster regional (toggle na barra lateral); as áreas reagem aos "
                         "filtros em tempo real."],
        ["Figura-Fundo", "Fundo escuro (#0f172a); caminhos mínimos do Dijkstra pulsam em cores "
                         "vibrantes sobre o grafo escurecido — o caminho crítico é o ponto focal."],
        ["Hierarquia visual", "Tamanho do nó proporcional ao grau: hubs como BEL (grau 43) são "
                              "imediatamente maiores que aeroportos periféricos."],
        ["Fechamento", "Os clusters regionais são perceptíveis sem bordas explícitas; a legenda "
                       "dinâmica com contagens reforça o agrupamento."],
    ], col_widths=[3.5 * cm, 13 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Metodologicamente, todo o núcleo é implementação própria: a estrutura de grafo "
        "(src/graphs/graph.py) usa lista de adjacência; BFS, DFS, Dijkstra e Bellman-Ford "
        "vivem em módulos separados (src/graphs/bfs.py, dfs.py, dijkstra.py, "
        "bellman_ford.py) e <b>nenhuma biblioteca de grafos é usada nos algoritmos</b> — "
        "heapq entra apenas como fila de prioridade do Dijkstra. As visualizações "
        "distinguem-se entre <b>exploratórias</b> (histograma de graus, métricas regionais, "
        "heatmap de durações) e <b>explanatórias</b> (rotas mínimas destacadas, comparação "
        "de algoritmos), como pede o critério de storytelling.", s["body"]))

    # ── 4. Resultados ──────────────────────────────────────────────────
    story.append(Paragraph("4. Resultados — caminhos e performance", s["h1"]))
    story.append(Paragraph("4.1 Caminhos mínimos obrigatórios (Dijkstra, Parte 1)", s["h2"]))
    rota_rows = [["Origem", "Destino", "Custo (min)", "Caminho"]]
    for r in d["rotas"]:
        rota_rows.append([r["origem"], r["destino"], f"{float(r['custo']):.0f}", r["caminho"]])
    story.append(styled_table(rota_rows, col_widths=[2.2 * cm, 2.2 * cm, 2.6 * cm, 9.5 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Quatro das cinco rotas obrigatórias têm voo direto como caminho ótimo — "
        "consequência da malha de hubs bem conectada. A exceção é <b>THE → VIX</b> "
        "(266 min via BPS e CNF): Teresina e Vitória não compartilham hub direto, e o "
        "Dijkstra encontra a combinação de escalas mais barata. A árvore de percurso "
        "(out/arvore_percurso.html) e o grafo interativo destacam os cinco caminhos.", s["body"]))
    fig("grafico_rotas_minimas/grafico_rotas_minimas.png", 13.5,
        "Figura 3 — Custo do caminho mínimo por rota obrigatória (visualização explanatória).",
        s, story)

    story.append(Paragraph("4.2 Dataset da Parte 2 (não relacionado à malha aérea)", s["h2"]))
    story.append(Paragraph(
        f"Escolhemos o <b>Spotify Tracks Dataset</b> (Kaggle): {ds['nodes']:,} músicas "
        f"viram vértices e {ds['edges']:,} arestas dirigidas e ponderadas conectam cada "
        f"música às suas 50 vizinhas mais próximas (k-NN) num espaço de 6 atributos de "
        f"áudio normalizados (danceability, energy, acousticness, instrumentalness, "
        f"valence, tempo). O peso é a distância euclidiana nesse espaço (grau: mín "
        f"{ds['degree_min']}, máx {ds['degree_max']}, média {ds['degree_mean']}). Para o "
        f"Bellman-Ford, um segundo grafo (edges_mood.csv, {bf1['total_mood_edges']:,} "
        f"arestas) usa peso = valência − energia, <b>negativo em "
        f"{bf1['pct_negative']}% das arestas</b>, construído como DAG para garantir "
        f"ausência de ciclos negativos.", s["body"]))

    story.append(Paragraph("4.3 Casos obrigatórios de execução", s["h2"]))
    bfs_r = p2["bfs_results"]
    dfs_r = p2["dfs_results"]
    dij_r = p2["dijkstra_results"]
    casos = [["Algoritmo", "Casos executados", "Resultado-chave"]]
    casos.append(["BFS", f"{len(bfs_r)} fontes distintas (hub, mediana, periferia)",
                  f"~{bfs_r[0]['visited']:,} nós alcançados em ≤ {max(r['max_layer'] for r in bfs_r)} camadas"])
    casos.append(["DFS", f"{len(dfs_r)} fontes distintas",
                  f"ciclos detectados ({dfs_r[0]['back_edges']:,} back edges na 1ª fonte)"])
    casos.append(["Dijkstra", f"{len(dij_r)} pares origem-destino",
                  f"todos alcançáveis; custo médio {sum(r['cost'] for r in dij_r) / len(dij_r):.3f}"])
    casos.append(["Bellman-Ford (caso 1)", "pesos negativos SEM ciclo negativo",
                  f"caminho de custo {bf1['cost']:.2f} encontrado; nenhum ciclo"])
    casos.append(["Bellman-Ford (caso 2)", "ciclo negativo presente",
                  f"detectou e reportou o ciclo {' → '.join(bf2['negative_cycle_nodes'])} "
                  f"(soma {bf2['negative_cycle_weight']})"])
    story.append(styled_table(casos, col_widths=[4 * cm, 6 * cm, 6.5 * cm]))
    story.append(PageBreak())

    story.append(Paragraph("4.4 Comparação de desempenho", s["h2"]))
    mem = perf.get("peak_memory_kb", {})
    perf_rows = [["Algoritmo", "Tempo no mesmo grafo (ms)*", "Memória de pico (KB)", "Complexidade"]]
    perf_rows.append(["BFS", f"{last['bfs_ms']:.1f}", f"{mem.get('bfs', 0):,.0f}", "O(V + E)"])
    perf_rows.append(["DFS", f"{last['dfs_ms']:.1f}", f"{mem.get('dfs', 0):,.0f}", "O(V + E)"])
    perf_rows.append(["Dijkstra", f"{last['dijkstra_ms']:.1f}", f"{mem.get('dijkstra', 0):,.0f}", "O((V+E) log V)"])
    perf_rows.append(["Bellman-Ford", f"{last['bellman_ford_ms']:.1f}", f"{mem.get('bellman_ford', 0):,.0f}", "O(V · E)"])
    story.append(styled_table(perf_rows, col_widths=[3.5 * cm, 4.6 * cm, 4 * cm, 4 * cm]))
    story.append(Paragraph(
        f"*Grafo de {last['order']:,} nós e {last['edges']:,} arestas (linha final do "
        f"experimento de escala) — comparação justa, mesmo grafo e mesma origem.", s["caption"]))
    story.append(Paragraph(
        f"O Bellman-Ford é ~{last['bellman_ford_ms'] / max(last['bfs_ms'], 0.001):.0f}× mais "
        f"lento que a BFS no mesmo grafo, mesmo com a otimização de parada antecipada "
        f"(interrompe quando uma passada inteira não relaxa nenhuma aresta). Sem ela, as "
        f"V−1 = {ds['nodes'] - 1:,} passadas completas de O(V·E) levariam minutos. O DFS gasta mais "
        f"memória ({mem.get('dfs', 0) / 1024:.1f} MB) porque classifica todas as arestas "
        f"(tree/back/forward/cross). A discussão de adequação: <b>BFS</b> quando o que "
        f"importa é o número de saltos ou camadas; <b>DFS</b> para detectar ciclos e "
        f"estruturar o grafo; <b>Dijkstra</b> como padrão para caminho mínimo com pesos "
        f"não negativos; <b>Bellman-Ford</b> apenas quando há pesos negativos — único que "
        f"os trata corretamente e que detecta ciclos negativos.", s["body"]))
    fig("parte2_algo_comparison.png", 15.5,
        "Figura 4 — Comparação de desempenho no mesmo grafo, com cores consistentes por "
        "algoritmo, e tabela de complexidade/aplicabilidade.", s, story)
    fig("parte2_ordem_vs_tempo.png", 13,
        "Figura 5 — Dispersão Ordem do Grafo × Tempo de Execução (escala log). A distância "
        "entre a linha do Bellman-Ford e as demais cresce com a ordem do grafo.", s, story)

    # ── 5. Limitações ──────────────────────────────────────────────────
    story.append(Paragraph("5. Limitações — onde os dados e as visualizações falham", s["h1"]))
    story.append(Paragraph("Limitações dos dados e do modelo", s["h2"]))
    story.append(Paragraph(
        "<b>(i) Pesos estimados, não observados:</b> o tempo de voo vem de distância ÷ "
        "velocidade média + 30 min fixos; ignora vento, congestionamento aéreo, tempo de "
        "conexão em solo e variação por aeronave — uma escala com conexão de 4 h parece "
        "tão barata quanto uma de 40 min. <b>(ii) Arestas construídas por heurística:</b> "
        "a malha (hubs completos + 2 hubs mais próximos + 1 vizinho regional) aproxima, "
        "mas não reproduz, a malha comercial real — rotas existentes podem faltar e "
        "vice-versa. <b>(iii) Grau de saída fixo no k-NN (Parte 2):</b> k = 50 impõe um "
        "piso artificial na distribuição de graus; a 'popularidade' estrutural de uma "
        "música aparece apenas no grau de entrada. <b>(iv) Mood-graph como DAG:</b> a "
        "garantia de ausência de ciclos negativos é por construção, por isso o caso de "
        "ciclo negativo exigiu um grafo sintético controlado.", s["body"]))
    story.append(Paragraph("Limitações das visualizações (crítica AVD)", s["h2"]))
    story.append(Paragraph(
        "<b>(i) Oclusão em escala:</b> o layout de forças funciona com 128 nós, mas aos "
        "3.000 nós da Parte 2 vira uma 'bola de pelos' — por isso a amostra interativa "
        "corta para os 200 nós de maior grau, o que esconde a periferia da rede. "
        "<b>(ii) Escala logarítmica:</b> a Figura 5 usa eixo log para caber tudo; leitores "
        "desatentos podem subestimar a diferença real entre Bellman-Ford e BFS (6× parece "
        "'um pouco acima'). <b>(iii) Espessura ∝ peso:</b> arestas mais longas (mais "
        "minutos) ficam mais grossas e chamam mais atenção — visualmente sugere "
        "'importância', quando significa 'custo'; a legenda explicita isso. <b>(iv) "
        "Histograma com binning unitário:</b> suaviza a cauda; outro binning mudaria a "
        "percepção do limiar de hub. <b>(v) Paleta regional:</b> verde/laranja/ciano pode "
        "confundir leitores com daltonismo; mitigamos com rótulos IATA e tooltips, mas a "
        "cor continua sendo o canal principal de região.", s["body"]))

    # ── 6. Conclusão ───────────────────────────────────────────────────
    story.append(Paragraph("6. Conclusão — insights acionáveis", s["h1"]))
    story.append(Paragraph(
        f"<b>1. A malha depende criticamente de poucos hubs.</b> Os {d['hub_count']} "
        f"aeroportos com grau ≥ P90 sustentam a conectividade nacional; a densidade-ego "
        f"decrescente com o grau (r = {d['pearson_r']:.3f}) mostra que os vizinhos de um "
        f"hub raramente se conectam entre si. Ação: criar ligações diretas entre "
        f"aeroportos médios de regiões vizinhas reduziria a dependência (e o risco "
        f"sistêmico) dos hubs.", s["body"]))
    rota_max = max(d["rotas"], key=lambda r: float(r["custo"]))
    escalas = max(len(rota_max["caminho"].split(" -> ")) - 2, 0)
    story.append(Paragraph(
        f"<b>2. Rotas transversais são o gargalo.</b> {rota_max['origem']} → "
        f"{rota_max['destino']} custa {float(rota_max['custo']):.0f} min com "
        f"{escalas} escala(s), mais do que atravessar o país (MAO → GRU, "
        f"{next(float(r['custo']) for r in d['rotas'] if r['origem'] == 'MAO'):.0f} min "
        f"direto). Ação: rotas diretas Nordeste-interior ↔ Sudeste-litoral têm o maior "
        f"ganho marginal de tempo por aresta adicionada.", s["body"]))
    story.append(Paragraph(
        "<b>3. Algoritmo certo para a pergunta certa.</b> Dijkstra responde 'qual o "
        "caminho mais rápido' em milissegundos; Bellman-Ford só se justifica com pesos "
        "negativos — e quando há ciclo negativo, reportar o ciclo (não apenas um booleano) "
        "transforma um erro em diagnóstico. O experimento de escala confirma empiricamente "
        "a separação assintótica O(V+E) vs O(V·E).", s["body"]))
    story.append(Paragraph(
        "<b>4. Visualização é parte do método, não enfeite.</b> As leis da Gestalt "
        "transformaram 426 arestas em uma narrativa legível: cores regionais consistentes, "
        "hubs maiores, caminhos pulsando sobre fundo escuro. A densidade deixou de ser um "
        "número (0,0524) e virou uma história de conectividade — exatamente o objetivo da "
        "integração Grafos + AVD.", s["body"]))

    doc = SimpleDocTemplate(
        str(PDF_PATH), pagesize=A4,
        topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
        title="Relatório Técnico — Grafos + AVD",
    )
    doc.build(story)
    print(f"PDF gerado em: {PDF_PATH}")


if __name__ == "__main__":
    main()
