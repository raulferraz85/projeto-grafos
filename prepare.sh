#!/usr/bin/env bash
# Gera out/ (pipeline Python) + frontend/public/data.json.
# Depois disso: cd frontend && npm run dev
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PYTHON_BOOT="${PYTHON:-python3}"
VENV_DIR="$ROOT/.venv"

if ! command -v "$PYTHON_BOOT" &>/dev/null; then
  echo "Erro: Python não encontrado (tente: PYTHON=python3.11 $0)" >&2
  exit 1
fi

if command -v npm &>/dev/null; then
  HAS_NPM=1
else
  HAS_NPM=0
  echo "Aviso: npm não encontrado — instale Node para rodar o frontend." >&2
fi

echo "==> [1/5] Ambiente virtual Python (.venv)"
if [[ ! -f "$VENV_DIR/bin/activate" ]]; then
  "$PYTHON_BOOT" -m venv "$VENV_DIR"
fi
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"
PYTHON="$VENV_DIR/bin/python"

echo "==> [2/5] Dependências Python"
"$PYTHON" -m pip install -q -U pip
"$PYTHON" -m pip install -q -r "$ROOT/requirements.txt"

echo "==> [3/5] Métricas, rotas e visualizações → out/"
"$PYTHON" -m src.cli \
  --dataset data/aeroportos_data.csv \
  --adjacencias data/adjacencias_aeroportos.csv \
  --rotas data/rotas.csv \
  --out out/

echo "==> [4/5] JSON consolidado → frontend/public/data.json"
"$PYTHON" scripts/build_data.py

if [[ "$HAS_NPM" -eq 1 ]]; then
  echo "==> [5/5] Dependências do frontend (npm)"
  if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
    (cd "$ROOT/frontend" && npm install)
  else
    echo "    node_modules já existe — pulando npm install"
  fi
else
  echo "==> [5/5] Pulado (npm ausente)"
fi

echo ""
echo "Pronto. Para abrir o app:"
echo "  cd frontend && npm run dev"
echo "  → http://localhost:5173"
