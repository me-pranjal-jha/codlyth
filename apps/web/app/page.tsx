
"use client";

import { useCallback, useEffect, useState } from "react";
import CodeGraphView from "../src/components/CodeGraphView";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiHealth = {
  status: string;
  service: string;
  timestamp: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  status: "queued" | "planning" | "working" | "testing" | "completed" | "failed";
  createdAt: string;
};

export default function Home() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setTaskError(null);

      const response = await fetch(`${API_URL}/api/tasks`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data: { tasks: Task[]; count: number } =
        await response.json();

      setTasks(data.tasks);
    } catch {
      setTaskError("Could not load tasks. Check that the API is running.");
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkApi() {
      try {
        setChecking(true);
        setError(null);

        const response = await fetch(`${API_URL}/health`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }

        const data: ApiHealth = await response.json();

        if (!cancelled) {
          setHealth(data);
        }
      } catch {
        if (!cancelled) {
          setHealth(null);
          setError("Cannot reach the API. Make sure the backend is running.");
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    checkApi();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      setTaskError("Please enter both a task title and description.");
      return;
    }

    try {
      setCreating(true);
      setTaskError(null);

      const response = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const details = Array.isArray(data.details)
          ? data.details.map((item: { message: string }) => item.message).join(" ")
          : data.error ?? "Could not create task.";

        throw new Error(details);
      }

      setTasks((current) => [data.task as Task, ...current]);
      setTitle("");
      setDescription("");
    } catch (err) {
      setTaskError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 text-xl font-bold text-slate-950">
              C
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Codlyth</h1>
              <p className="text-sm text-slate-400">
                Your AI software engineer
              </p>
            </div>
          </div>

          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            LOCAL DEVELOPMENT
          </span>
        </header>

        <section className="py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            From issue to pull request
          </p>

          <h2 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Ship better code.
            <br />
            Let your AI agent do the work.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Understand repositories, plan code changes, run tests, and prepare
            pull requests—all from one workspace.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Backend connection</h3>
              <span
                className={`h-3 w-3 rounded-full ${
                  health ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Express API · localhost:4000
            </p>

            <p className="mt-5 text-xl font-semibold">
              {checking
                ? "Checking connection..."
                : health
                  ? "Connected"
                  : "Connection failed"}
            </p>

            {health && (
              <p className="mt-2 text-sm text-emerald-400">
                Service: {health.service}
              </p>
            )}

            {error && (
              <p className="mt-2 text-sm text-amber-300">{error}</p>
            )}

            {health && (
              <p className="mt-2 text-xs text-slate-500">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold">Create a coding task</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Describe something you want Codlyth to investigate or build.
              For now, tasks are queued but not executed by an AI agent.
            </p>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div>
                <label htmlFor="task-title" className="mb-2 block text-sm font-medium">
                  Task title
                </label>
                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="e.g. Analyze authentication flow"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="task-description" className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={5000}
                  required
                  rows={3}
                  placeholder="Explain what needs to be investigated or changed..."
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating task..." : "Create task"}
              </button>
            </form>

            {taskError && (
              <p role="alert" className="mt-4 text-sm text-amber-300">
                {taskError}
              </p>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold">Your tasks</h3>
              <p className="mt-1 text-sm text-slate-400">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"} in your queue
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadTasks()}
              disabled={tasksLoading}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
            >
              {tasksLoading ? "Refreshing..." : "Refresh tasks"}
            </button>
          </div>

          {tasksLoading && tasks.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              Loading tasks...
            </p>
          ) : tasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              No tasks yet. Create your first coding task above.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h4 className="font-semibold">{task.title}</h4>
                    <span className="rounded-full border border-cyan-900 bg-cyan-950/60 px-3 py-1 text-xs font-medium text-cyan-300">
                      {task.status}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                    {task.description}
                  </p>

                  <p className="mt-4 text-xs text-slate-500">
                    Created {new Date(task.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="mt-10">
          <CodeGraphView />
        </section>
        <footer className="mt-16 border-t border-slate-800 pt-6 text-sm text-slate-500">
          Codlyth · Built step by step.
        </footer>
      </div>
    </main>
  );
}
