

export type NodeId = string;
export type AdjList = Record<NodeId, { to: NodeId; weight: number }[]>;


export function runBFS(adj: AdjList, source: NodeId): Record<NodeId, number> {
  const levels: Record<NodeId, number> = {};

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


export function runDFS(
  adj: AdjList,
  source: NodeId,
): { visited: NodeId[]; backEdges: number; hasCycle: boolean } {

  const color: Record<NodeId, number> = {};
  const visited: NodeId[] = [];
  let backEdges = 0;


  type StackItem = { node: NodeId; isReturn: boolean };
  const stack: StackItem[] = [{ node: source, isReturn: false }];

  while (stack.length > 0) {
    const { node, isReturn } = stack.pop()!;

    if (isReturn) {
      color[node] = 2; 
      continue;
    }

    if ((color[node] ?? 0) !== 0) continue; 

    color[node] = 1; 
    visited.push(node);


    stack.push({ node, isReturn: true });


    const neighbors = (adj[node] ?? []).slice().reverse();
    for (const { to: neighbor } of neighbors) {
      const nColor = color[neighbor] ?? 0;
      if (nColor === 0) {
        stack.push({ node: neighbor, isReturn: false });
      } else if (nColor === 1) {

        backEdges++;
      }
    }
  }

  return { visited, backEdges, hasCycle: backEdges > 0 };
}


export function runDijkstra(
  adj: AdjList,
  source: NodeId,
  target: NodeId,
): { path: NodeId[]; cost: number } | null {
  if (source === target) return { path: [source], cost: 0 };

  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};


  for (const node of Object.keys(adj)) {
    dist[node] = Infinity;
    prev[node] = null;
  }
  dist[source] = 0;

  const visited = new Set<NodeId>();

  const pq: [number, NodeId][] = [[0, source]];

  while (pq.length > 0) {

    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i][0] < pq[minIdx][0]) minIdx = i;
    }
    const [d, u] = pq.splice(minIdx, 1)[0];

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === target) break; 

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


  const path: NodeId[] = [];
  let curr: NodeId | null = target;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr] ?? null;
  }

  if (path[0] !== source) return null;
  return { path, cost: dist[target] };
}


export function runBellmanFord(
  nodes: NodeId[],
  edges: { from: NodeId; to: NodeId; weight: number }[],
  source: NodeId,
): { distances: Record<NodeId, number>; hasCycle: boolean } {
  const dist: Record<NodeId, number> = {};


  for (const node of nodes) {
    dist[node] = Infinity;
  }
  dist[source] = 0;

  const n = nodes.length;


  for (let i = 0; i < n - 1; i++) {
    for (const { from, to, weight } of edges) {
      if (dist[from] !== Infinity && dist[from] + weight < (dist[to] ?? Infinity)) {
        dist[to] = dist[from] + weight;
      }
    }
  }


  let hasCycle = false;
  for (const { from, to, weight } of edges) {
    if (dist[from] !== Infinity && dist[from] + weight < (dist[to] ?? Infinity)) {
      hasCycle = true;
      break;
    }
  }

  return { distances: dist, hasCycle };
}
