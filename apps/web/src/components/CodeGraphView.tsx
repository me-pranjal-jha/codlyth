
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getCodeGraph, type CodeGraph } from "../lib/api";

export default function CodeGraphView() {
  const [graph, setGraph] = useState<CodeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCodeGraph();
      setGraph(data);
    } catch {
      setError("Couldn't load the codebase graph. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const nodes: Node[] = (graph?.nodes ?? []).map((file, index) => ({
    id: file.id,
    position: {
      x: 100 + (index % 3) * 260,
      y: 80 + Math.floor(index / 3) * 160,
    },
    data: {
      label: (
        <div className="min-w-36">
          <div className="font-semibold">{file.label}</div>
          <div className="mt-1 text-xs opacity-70">{file.language}</div>
          <div className="text-xs opacity-70">
            {file.symbolCount} symbols
          </div>
        </div>
      ),
    },
    style: {
      width: 190,
      padding: 12,
      borderRadius: 12,
      border:
        selectedFile === file.id
          ? "2px solid #6366f1"
          : "1px solid #52525b",
      background: "#18181b",
      color: "#fafafa",
    },
  }));

  const edges: Edge[] = (graph?.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
    style: { stroke: "#818cf8", strokeWidth: 2 },
    labelStyle: { fill: "#a1a1aa", fontSize: 11 },
  }));

  const selectedNode = graph?.nodes.find(
    (file) => file.id === selectedFile,
  );

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Indexing codebase…</div>;
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 p-5">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => void loadGraph()}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Codebase Explorer</h2>
          <p className="text-sm text-zinc-500">
            Explore files and follow their import relationships.
          </p>
        </div>

        <button
          onClick={() => void loadGraph()}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-100 hover:text-zinc-900"
        >
          Refresh graph
        </button>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="rounded-lg border px-3 py-2">
          {graph?.totalNodes ?? 0} files
        </span>
        <span className="rounded-lg border px-3 py-2">
          {graph?.totalEdges ?? 0} dependencies
        </span>
      </div>

      <div className="h-[560px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          onNodeClick={(_, node) => setSelectedFile(node.id)}
          onPaneClick={() => setSelectedFile(null)}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">{selectedNode.label}</h3>
          <p className="mt-1 break-all text-sm text-zinc-500">
            {selectedNode.id}
          </p>
          <p className="mt-2 text-sm">
            Language: {selectedNode.language}
          </p>
          <p className="text-sm">
            Symbols detected: {selectedNode.symbolCount}
          </p>
        </div>
      )}
    </section>
  );
}
