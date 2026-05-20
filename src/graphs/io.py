import csv
from typing import List, Tuple
from .graph import Node, Graph

def load_airports(file_path: str) -> List[Node]:
    """Carrega os dados dos aeroportos a partir de um arquivo CSV."""
    airports = []
    with open(file_path, mode='r', encoding='latin-1') as f:
        reader = csv.DictReader(f)
        for row in reader:
            airports.append(Node(
                iata=row['iata'],
                city=row['cidade'],
                region=row['regiao']
            ))
    return airports

def load_adjacencies(file_path: str, graph: Graph):
    """
    Analisa o arquivo adjacencias_aeroportos.csv.
    Lida com o formato separado por pontos: origem.destino.tipo_conexao.justificativa.weight
    """
    with open(file_path, mode='r', encoding='latin-1') as f:
        # Pula o cabeçalho
        header = f.readline().strip()
        
        # Lê o restante do arquivo
        for line in f:
            line = line.strip()
            if not line:
                continue
            
            # O formato do arquivo é peculiar: "REC.SSA.regional.""mesma região"".1"
            # Remove as aspas externas e divide pelo ponto
            clean_line = line.strip('"')
            parts = clean_line.split('.')
            
            if len(parts) >= 5:
                origem = parts[0]
                destino = parts[1]
                tipo = parts[2]
                
                # A justificativa pode conter pontos se não foi citada corretamente, 
                # mas aqui parece simples o suficiente.
                justificativa = parts[3].strip('"')
                try:
                    peso = float(parts[4])
                except ValueError:
                    peso = 1.0
                
                graph.add_edge(origem, destino, tipo, justificativa, peso)

def load_routes(file_path: str) -> List[Tuple]:
    """Carrega os pares de rotas para cálculo de distância."""
    routes = []
    with open(file_path, mode='r', encoding='latin-1') as f:
        reader = csv.DictReader(f)
        for row in reader:
            routes.append((row['origem'], row['destino']))
    return routes
