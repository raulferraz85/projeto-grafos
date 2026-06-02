.PHONY: dev pipeline test clean install

PYTHON := .venv/bin/python
VENV   := .venv/bin/activate

# ──────────────────────────────────────────────────────────────────
# make dev  →  pipeline completo + abre o frontend no browser
# ──────────────────────────────────────────────────────────────────
dev: install pipeline
	@echo "==> Encerrando servidores anteriores na porta 5173..."
	@-lsof -ti :5173 | xargs kill -9 2>/dev/null; true
	@echo ""
	@echo "  ✈  Abrindo frontend em http://localhost:5173"
	@echo ""
	@cd frontend && npx vite --port 5173

# ──────────────────────────────────────────────────────────────────
# pipeline  →  gera out/ e data.json (sem subir o servidor)
# ──────────────────────────────────────────────────────────────────
pipeline: $(VENV)
	@echo "==> Métricas, rotas e visualizações → out/"
	@$(PYTHON) -m src.cli \
		--dataset data/aeroportos_data.csv \
		--adjacencias data/adjacencias_aeroportos.csv \
		--rotas data/rotas.csv \
		--out out/
	@echo "==> JSON consolidado → frontend/public/data.json"
	@$(PYTHON) scripts/build_data.py

# ──────────────────────────────────────────────────────────────────
# install  →  venv Python + node_modules (skip se já existir)
# ──────────────────────────────────────────────────────────────────
install: $(VENV) frontend/node_modules

$(VENV):
	@echo "==> Criando ambiente virtual Python..."
	@python3 -m venv .venv
	@$(PYTHON) -m pip install -q -U pip
	@$(PYTHON) -m pip install -q -r requirements.txt
	@echo "==> Dependências Python instaladas."

frontend/node_modules:
	@echo "==> Instalando dependências Node..."
	@cd frontend && npm install --silent
	@echo "==> node_modules prontos."

# ──────────────────────────────────────────────────────────────────
# test  →  roda a suíte pytest
# ──────────────────────────────────────────────────────────────────
test: $(VENV)
	@$(PYTHON) -m pytest tests/ -v

# ──────────────────────────────────────────────────────────────────
# clean  →  remove artefatos gerados (mantém .venv e node_modules)
# ──────────────────────────────────────────────────────────────────
clean:
	@rm -f out/*.json out/*.csv out/*.html out/*.png
	@rm -rf out/grafico_*
	@echo "==> out/ limpo."
