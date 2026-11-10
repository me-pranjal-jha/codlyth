const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getApiHealth() {
  const response = await fetch(`${API_URL}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Codlyth API is unavailable");
  }

  return response.json();
}


export type CodeGraph = {
  totalNodes: number;
  totalEdges: number;
  nodes: {
    id: string;
    label: string;
    type: "file";
    language: string;
    symbolCount: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label: string;
  }[];
};

export async function getCodeGraph(): Promise<CodeGraph> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const response = await fetch(`${apiUrl}/api/graph`);

  if (!response.ok) {
    throw new Error("Failed to load the codebase graph.");
  }

  return response.json();
}
