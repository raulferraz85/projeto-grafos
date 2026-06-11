
import seaborn as sns
import matplotlib.pyplot as plt

REGION_COLORS = {
    "Norte":        "#22c55e",
    "Nordeste":     "#f97316",
    "Sudeste":      "#38bdf8",
    "Sul":          "#a78bfa",
    "Centro-Oeste": "#facc15",
}

EDGE_COLORS = {
    "hub_nacional":  "#ef4444",
    "hub_regional":  "#fb923c",
    "regional":      "#64748b",
}

ALGO_COLORS = {
    "BFS":          "#38bdf8",
    "DFS":          "#a78bfa",
    "Dijkstra":     "#22c55e",
    "Bellman-Ford": "#f97316",
}


def apply_chart_style(titlesize: int = 12, labelsize: int = 11) -> None:
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({
        "figure.facecolor": "white",
        "axes.facecolor":   "white",
        "font.size":        10,
        "axes.titlesize":   titlesize,
        "axes.labelsize":   labelsize,
    })
