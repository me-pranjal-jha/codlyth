
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { indexLocalCodebase } from "./indexer.js";
import path from "node:path";
import { buildGraphData } from "./graph.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Define the structure of a valid task.
const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
});

// Define the possible task statuses.
type TaskStatus =
  | "queued"
  | "planning"
  | "working"
  | "testing"
  | "completed"
  | "failed";

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
};

// Temporary in-memory storage.
// We'll replace this with PostgreSQL in a later step.
const tasks: Task[] = [];

// API home
app.get("/", (_req, res) => {
  res.json({
    name: "Codlyth API",
    message: "Your AI software engineer is getting ready.",
    endpoints: ["/health", "/api/tasks"],
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "codlyth-api",
    timestamp: new Date().toISOString(),
  });
});

// Create a task
app.post("/api/tasks", (req, res) => {
  const result = createTaskSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid task data",
      details: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const task: Task = {
    id: randomUUID(),
    title: result.data.title,
    description: result.data.description,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);

  return res.status(201).json({ task });
});

// List all tasks
app.get("/api/tasks", (_req, res) => {
  return res.status(200).json({
    tasks,
    count: tasks.length,
  });
});

// Handle invalid JSON and other errors.
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof SyntaxError && "status" in error && error.status === 400) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    console.error("API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  },
);


app.post("/api/index/local", async (_req, res) => {
  try {
    // apps/api is two levels below the project root.
    const projectRoot = path.resolve(process.cwd(), "../..");

    const result = await indexLocalCodebase(projectRoot);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Codebase indexing failed:", error);

    return res.status(500).json({
      error: "Could not index the local codebase.",
    });
  }
});

app.get("/api/graph", async (_req, res) => {
  try {
    const projectRoot = path.resolve(process.cwd(), "../..");
    const result = await indexLocalCodebase(projectRoot);

    const graph = buildGraphData(result.files, result.edges);

    return res.status(200).json({
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      nodes: graph.nodes,
      edges: graph.edges,
    });
  } catch (error) {
    console.error("Graph generation failed:", error);

    return res.status(500).json({
      error: "Could not generate the codebase graph.",
    });
  }
});


app.listen(PORT, () => {
  console.log(`Codlyth API running at http://localhost:${PORT}`);
});
