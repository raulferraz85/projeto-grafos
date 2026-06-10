/**
 * Algoritmos de grafos implementados 100% à mão para o grafo musical (Parte 2).
 * Proibido usar qualquer biblioteca que implemente BFS/DFS/Dijkstra/Bellman-Ford.
 * Estruturas auxiliares (fila, visited, predecessors) construídas explicitamente.
 */

export type NodeId = string;
export type AdjList = Record<NodeId, { to: NodeId; weight: number }[]>;

// ── BFS — Busca em Largura ────────────────────────────────────────────────────
// Percorre o grafo por camadas a partir de `source`.
// Retorna mapa nodeId → nível (distância em saltos).
// Complexidade: O(V + E)
export function runBFS(adj: AdjList, source: NodeId): Record<NodeId, number> {
  const levels: Record<NodeId, number> = {};
  // Fila implementada como array — push ao final, shift do início
  const queue: NodeId[] = [source];
  levels[source] = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels[current];

    for (const { to: neighbor } of adj[current] ?? []) {
      if (!(neighbor in levels)) {
        levels[neighbor] = currentLevel + 1;
        queue.push(neighbor);
      }
    }
  }

  return levels;
}

// ── DFS — Busca em Profundidade ───────────────────────────────────────────────
// Percorre o grafo em profundidade com coloração WHITE/GRAY/BLACK.
// Detecta back-edges (ciclos) em grafos dirigidos.
// Implementação iterativa com pilha explícita para evitar estouro de recursão.
// Complexidade: O(V + E)
export function runDFS(
  adj: AdjList,
  source: NodeId,
): { visited: NodeId[]; backEdges: number; hasCycle: boolean } {
  // Cores: 0 = branco (não visitado), 1 = cinza (na pilha), 2 = preto (concluído)
  const color: Record<NodeId, number> = {};
  const visited: NodeId[] = [];
  let backEdges = 0;

  // Pilha explícita com marcadores de entrada/saída
  // isReturn=true significa que estamos saindo do nó (tornando-o preto)
  type StackItem = { node: NodeId; isReturn: boolean };
  const stack: StackItem[] = [{ node: source, isReturn: false }];

  while (stack.length > 0) {
    const { node, isReturn } = stack.pop()!;

    if (isReturn) {
      color[node] = 2; // preto — processamento concluído
      continue;
    }

    if ((color[node] ?? 0) !== 0) continue; // já visitado

    color[node] = 1; // cinza — na pilha de execução
    visited.push(node);

    // Empurra marcador de saída antes dos filhos
    stack.push({ node, isReturn: true });

    // Empurra vizinhos em ordem reversa para manter ordem de visita
    const neighbors = (adj[node] ?? []).slice().reverse();
    for (const { to: neighbor } of neighbors) {
      const nColor = color[neighbor] ?? 0;
      if (nColor === 0) {
        stack.push({ node: neighbor, isReturn: false });
      } else if (nColor === 1) {
        // Vizinho cinza = back-edge = ciclo no grafo dirigido
        backEdges++;
      }
    }
  }

  return { visited, backEdges, hasCycle: backEdges > 0 };
}

// ── Dijkstra — Caminho mínimo com pesos ≥ 0 ──────────────────────────────────
// Fila de prioridade implementada como array com busca linear do mínimo (sem lib).
// Retorna o caminho mais curto e seu custo. Retorna null se inalcançável.
// Complexidade: O(V² + E) com array — adequado para grafos densos de ≤1000 nós
export function runDijkstra(
  adj: AdjList,
  source: NodeId,
  target: NodeId,
): { path: NodeId[]; cost: number } | null {
  if (source === target) return { path: [source], cost: 0 };

  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};

  // Inicializa todas as distâncias como infinito
  for (const node of Object.keys(adj)) {
    dist[node] = Infinity;
    prev[node] = null;
  }
  dist[source] = 0;

  const visited = new Set<NodeId>();
  // Fila de prioridade: array de [custo, nó] — busca manual pelo mínimo
  const pq: [number, NodeId][] = [[0, source]];

  while (pq.length > 0) {
    // Encontra o elemento com menor custo (busca linear — sem heap lib)
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i][0] < pq[minIdx][0]) minIdx = i;
    }
    const [d, u] = pq.splice(minIdx, 1)[0];

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === target) break; // parada antecipada ao atingir o destino

    for (const { to: v, weight } of adj[u] ?? []) {
      if (visited.has(v)) continue;
      const alt = d + weight;
      if (alt < (dist[v] ?? Infinity)) {
        dist[v] = alt;
        prev[v] = u;
        pq.push([alt, v]);
      }
    }
  }

  if (!isFinite(dist[target] ?? Infinity)) return null;

  // Reconstrói o caminho seguindo os predecessores de target até source
  const path: NodeId[] = [];
  let curr: NodeId | null = target;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr] ?? null;
  }

  if (path[0] !== source) return null;
  return { path, cost: dist[target] };
}

// ── Bellman-Ford — Pesos negativos + detecção de ciclos negativos ─────────────
// Relaxa todas as arestas |V|-1 vezes.
// Na iteração extra, se ainda houver relaxamento → ciclo negativo detectado.
// Complexidade: O(V × E)
export function runBellmanFord(
  nodes: NodeId[],
  edges: { from: NodeId; to: NodeId; weight: number }[],
  source: NodeId,
): { distances: Record<NodeId, number>; hasCycle: boolean } {
  const dist: Record<NodeId, number> = {};

  // Inicializa todas as distâncias como infinito
  for (const node of nodes) {
    dist[node] = Infinity;
  }
  dist[source] = 0;

  const n = nodes.length;

  // Relaxa arestas n-1 vezes
  for (let i = 0; i < n - 1; i++) {
    for (const { from, to, weight } of edges) {
      if (dist[from] !== Infinity && dist[from] + weight < (dist[to] ?? Infinity)) {
        dist[to] = dist[from] + weight;
      }
    }
  }

  // Verifica ciclos negativos: se ainda é possível relaxar após n-1 iterações, há ciclo negativo
  let hasCycle = false;
  for (const { from, to, weight } of edges) {
    if (dist[from] !== Infinity && dist[from] + weight < (dist[to] ?? Infinity)) {
      hasCycle = true;
      break;
    }
  }

  return { distances: dist, hasCycle };
}
