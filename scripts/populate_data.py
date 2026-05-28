import csv
import pandas as pd
import numpy as np
from pathlib import Path
import subprocess
import os

# Caminhos
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
AIRPORTS_CSV = DATA_DIR / "aeroportos_data.csv"
ADJACENCIES_CSV = DATA_DIR / "adjacencias_aeroportos.csv"

# Configurações
OUR_AIRPORTS_URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv"

REGION_MAP = {
    'BR-SP': 'Sudeste', 'BR-RJ': 'Sudeste', 'BR-MG': 'Sudeste', 'BR-ES': 'Sudeste',
    'BR-PR': 'Sul', 'BR-SC': 'Sul', 'BR-RS': 'Sul',
    'BR-BA': 'Nordeste', 'BR-PE': 'Nordeste', 'BR-CE': 'Nordeste', 'BR-RN': 'Nordeste',
    'BR-PB': 'Nordeste', 'BR-AL': 'Nordeste', 'BR-SE': 'Nordeste', 'BR-MA': 'Nordeste', 'BR-PI': 'Nordeste',
    'BR-AM': 'Norte', 'BR-PA': 'Norte', 'BR-AC': 'Norte', 'BR-RO': 'Norte', 'BR-RR': 'Norte', 'BR-AP': 'Norte', 'BR-TO': 'Norte',
    'BR-DF': 'Centro-Oeste', 'BR-GO': 'Centro-Oeste', 'BR-MT': 'Centro-Oeste', 'BR-MS': 'Centro-Oeste'
}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Raio da Terra em km
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

def get_duration(lat1, lon1, lat2, lon2):
    dist = haversine(lat1, lon1, lat2, lon2)
    # Estimativa: 800km/h velocidade média + 30 min para decolagem/pouso
    duration = (dist / 800) * 60 + 30
    return int(round(duration))

def main():
    print("Baixando dados do OurAirports...")
    try:
        df_all = pd.read_csv(OUR_AIRPORTS_URL)
    except Exception as e:
        print(f"Erro ao baixar dados: {e}")
        return

    # Filtrar aeroportos brasileiros com código IATA
    br_airports = df_all[
        (df_all['iso_country'] == 'BR') & 
        (df_all['iata_code'].notnull()) &
        (df_all['type'].isin(['medium_airport', 'large_airport']))
    ].copy()
    
    br_airports['regiao'] = br_airports['iso_region'].map(REGION_MAP).fillna('Brasil')
    
    # 1. Atualizar aeroportos_data.csv
    airports_final = br_airports[['iata_code', 'municipality', 'regiao']].rename(
        columns={'iata_code': 'iata', 'municipality': 'cidade'}
    )
    airports_final.to_csv(AIRPORTS_CSV, index=False)
    print(f"Salvo {len(airports_final)} aeroportos em {AIRPORTS_CSV}")

    # 2. Gerar conexões (Adjacências)
    # Principais hubs brasileiros
    hubs = ['GRU', 'CGH', 'BSB', 'GIG', 'SDU', 'VCP', 'CNF', 'SSA', 'REC', 'FOR', 'POA', 'CWB', 'BEL', 'MAO']
    
    connections = []
    processed_pairs = set()
    hubs_set = set(hubs)

    def get_tipo_justificativa(u, v):
        if u in hubs_set and v in hubs_set:
            return 'hub_nacional', 'conexao entre hubs nacionais de alta demanda'
        elif u in hubs_set or v in hubs_set:
            return 'hub_regional', 'conexao ao hub nacional mais proximo'
        else:
            return 'regional', 'voo regional entre aeroportos da mesma regiao'

    def add_conn(u_row, v_row):
        u, v = u_row['iata_code'], v_row['iata_code']
        pair = tuple(sorted((u, v)))
        if u != v and pair not in processed_pairs:
            weight = get_duration(u_row['latitude_deg'], u_row['longitude_deg'],
                                 v_row['latitude_deg'], v_row['longitude_deg'])
            tipo, justificativa = get_tipo_justificativa(u, v)
            connections.append((u, v, tipo, justificativa, weight))
            processed_pairs.add(pair)

    hub_df = br_airports[br_airports['iata_code'].isin(hubs)]
    for i, row1 in hub_df.iterrows():
        for j, row2 in hub_df.iterrows():
            add_conn(row1, row2)

    # Melhoria na Densidade: Conexões mais realistas
    np.random.seed(42) # Para resultados consistentes
    for i, row in br_airports.iterrows():
        if row['iata_code'] not in hubs:
            # 1. Conectar aos 2 HUBS mais próximos (Redundância de malha)
            distances = hub_df.apply(lambda h: haversine(row['latitude_deg'], row['longitude_deg'], 
                                                        h['latitude_deg'], h['longitude_deg']), axis=1)
            closest_hubs_idx = distances.nsmallest(2).index
            for idx in closest_hubs_idx:
                add_conn(row, hub_df.loc[idx])
            
            # 2. Voo Regional: Conectar a 1 aeroporto aleatório da mesma região
            # Isso quebra a densidade de 100% e cria triângulos mais complexos
            same_region = br_airports[
                (br_airports['regiao'] == row['regiao']) & 
                (br_airports['iata_code'] != row['iata_code'])
            ]
            if not same_region.empty:
                random_neighbor = same_region.sample(1).iloc[0]
                add_conn(row, random_neighbor)

    # Salvar adjacencias_aeroportos.csv (formato: origem,destino,tipo_conexao,justificativa,peso)
    with open(ADJACENCIES_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(['origem', 'destino', 'tipo_conexao', 'justificativa', 'peso'])
        for conn in connections:
            writer.writerow(conn)

    print(f"Salvo {len(connections)} conexões em {ADJACENCIES_CSV}")

    # 3. Rodar build_data.py para atualizar o frontend
    print("Atualizando data.json...")
    try:
        subprocess.run(["python3", "scripts/build_data.py"], check=True)
        print("Sucesso!")
    except subprocess.CalledProcessError as e:
        print(f"Erro ao rodar build_data.py: {e}")

if __name__ == "__main__":
    main()
