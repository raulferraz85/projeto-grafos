import os
from pyvis.network import Network

os.makedirs("out", exist_ok=True)

net = Network(
    height="750px",
    width="100%",
    bgcolor="#0f172a",
    font_color="white",
    directed=False
)

net.toggle_physics(False)


aeroportos = {
    "REC": {"label": "REC\nRecife", "x": -500, "y": -100, "color": "#38bdf8"},
    "BSB": {"label": "BSB\nBrasília", "x": -250, "y": -100, "color": "#facc15"},
    "CWB": {"label": "CWB\nCuritiba", "x": 0, "y": -100, "color": "#22c55e"},
    "FLN": {"label": "FLN\nFlorianópolis", "x": 250, "y": -100, "color": "#22c55e"},
    "POA": {"label": "POA\nPorto Alegre", "x": 500, "y": -100, "color": "#22c55e"},
    "MAO": {"label": "MAO\nManaus", "x": -500, "y": 180, "color": "#fb923c"},
    "GRU": {"label": "GRU\nSão Paulo", "x": 0, "y": 180, "color": "#a78bfa"},
}

for codigo, info in aeroportos.items():
    net.add_node(
        codigo,
        label=info["label"],
        x=info["x"],
        y=info["y"],
        color=info["color"],
        size=35,
        shape="dot",
        font={
            "size": 18,
            "face": "arial",
            "color": "white",
            "strokeWidth": 3,
            "strokeColor": "#020617"
        },
        fixed=True
    )


arestas_rec_poa = [
    ("REC", "BSB"),
    ("BSB", "CWB"),
    ("CWB", "FLN"),
    ("FLN", "POA"),
]

for origem, destino in arestas_rec_poa:
    net.add_edge(
        origem,
        destino,
        color="#38bdf8",
        width=6,
        title="Caminho Recife → Porto Alegre"
    )


arestas_mao_gru = [
    ("MAO", "BSB"),
    ("BSB", "GRU"),
]

for origem, destino in arestas_mao_gru:
    net.add_edge(
        origem,
        destino,
        color="#f97316",
        width=6,
        title="Caminho Manaus → São Paulo"
    )

html_extra = """
<div style="
    position: absolute;
    top: 20px;
    left: 30px;
    z-index: 999;
    background: rgba(15, 23, 42, 0.9);
    padding: 16px 20px;
    border-radius: 14px;
    color: white;
    font-family: Arial;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
">
    <h2 style="margin: 0 0 10px 0;">Árvore de percurso</h2>
    <div><b style="color:#38bdf8;">●</b> Recife → Porto Alegre</div>
    <div><b style="color:#f97316;">●</b> Manaus → São Paulo</div>
</div>
"""

arquivo_saida = "out/arvore_percurso.html"

net.write_html(arquivo_saida, notebook=False)

with open(arquivo_saida, "r", encoding="utf-8") as f:
    html = f.read()

html = html.replace("<body>", "<body>" + html_extra)

with open(arquivo_saida, "w", encoding="utf-8") as f:
    f.write(html)

print("Arquivo gerado em: out/arvore_percurso.html")