
export type GraphNode = {
  id: string;
  label: string;
  type: "file";
  language: string;
  symbolCount: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

type IndexedFile = {
  path: string;
  language: string;
  symbols: { name: string }[];
};

type IndexedEdge = {
  source: string;
  target: string;
  importPath: string;
};

export function buildGraphData(
  files: IndexedFile[],
  edges: IndexedEdge[],
) {
  const nodes: GraphNode[] = files.map((file) => ({
    id: file.path,
    label: file.path.split("/").pop() ?? file.path,
    type: "file",
    language: file.language,
    symbolCount: file.symbols.length,
  }));

  const graphEdges: GraphEdge[] = edges.map((edge) => ({
    id: `${edge.source}->${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.importPath,
  }));

  return { nodes, edges: graphEdges };
}
