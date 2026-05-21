# SkyGraph · Frontend

Interface React (Vite + TypeScript + Tailwind + Framer Motion + Recharts) para
visualização do projeto **Rede de Aeroportos do Brasil**.

A fonte de verdade do frontend é **`public/data.json`**, gerado a partir de
`out/` + `data/` pelo script `scripts/build_data.py`.

## Como rodar

```bash
# 1. Instale dependências
cd frontend
npm install

# 2. Suba o ambiente de desenvolvimento (regenera data.json automaticamente)
npm run dev
# abre em http://localhost:5173

# 3. Build de produção
npm run build
npm run preview
```

> Os scripts `predev` e `prebuild` chamam `python3 ../scripts/build_data.py`
> automaticamente. Sempre que regerar a pasta `out/` no Python, basta rodar
> `npm run data` para atualizar o JSON consumido pelo frontend.

## O que tem

- **Hero** com métricas globais (ordem, tamanho, densidade)
- **Métricas por região** com cards e gráfico de densidade
- **Rankings** (mais conectados, maior densidade ego, maior ego-rede)
- **Rotas com Dijkstra**: dropdown origem/destino + visualização do caminho
- **Grafo da malha aérea** em SVG, com destaque do caminho selecionado
- **Catálogo de aeroportos** com busca, filtro por região, grau mínimo e ordenação

Toda a interface é alimentada **somente** por `public/data.json`. Nenhuma chamada
de API é feita.
