
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Parser, Language } from "web-tree-sitter";
import { getWasmPath } from "tree-sitter-wasm";

type SymbolInfo = {
  name: string;
  kind: string;
  startLine: number;
  endLine: number;
};

type FileInfo = {
  path: string;
  language: string;
  imports: string[];
  symbols: SymbolInfo[];
};

type DependencyEdge = {
  source: string;
  target: string;
  importPath: string;
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".vercel",
]);

const EXTENSIONS: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "tsx",
};

const MAX_FILES = 500;
const MAX_FILE_BYTES = 1024 * 1024;

async function getParsers() {
  await Parser.init();

  const parser = new Parser();

  const languages = {
    javascript: await Language.load(getWasmPath("javascript")),
    typescript: await Language.load(getWasmPath("typescript")),
    tsx: await Language.load(getWasmPath("tsx")),
  };

  return { parser, languages };
}

async function findSourceFiles(
  current: string,
  results: string[] = [],
): Promise<string[]> {
  if (results.length >= MAX_FILES) {
    return results;
  }

  const entries = await readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= MAX_FILES) break;

    const fullPath = path.join(current, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      await findSourceFiles(fullPath, results);
      continue;
    }

    if (!entry.isFile()) continue;

    if (EXTENSIONS[path.extname(entry.name)]) {
      results.push(fullPath);
    }
  }

  return results;
}

export async function indexLocalCodebase(root: string) {
  const absoluteRoot = path.resolve(root);
  const rootStats = await stat(absoluteRoot);

  if (!rootStats.isDirectory()) {
    throw new Error("The codebase root must be a directory.");
  }

  const files = await findSourceFiles(absoluteRoot);
  const { parser, languages } = await getParsers();

  const indexedFiles: FileInfo[] = [];

  try {
    for (const filePath of files) {
      const fileStats = await stat(filePath);

      if (fileStats.size > MAX_FILE_BYTES) continue;

      const source = await readFile(filePath, "utf8");
      const extension = path.extname(filePath);
      const languageName = EXTENSIONS[extension];

      const language = languages[languageName as keyof typeof languages];
      parser.setLanguage(language);

      const tree = parser.parse(source);

      if (!tree) continue;

      try {
        const rootNode = tree.rootNode;

        const imports = rootNode
          .descendantsOfType([
            "import_statement",
            "import_declaration",
          ])
          .map((node) => node.text);

        const symbolNodes = rootNode.descendantsOfType([
          "function_declaration",
          "generator_function_declaration",
          "method_definition",
          "class_declaration",
          "class",
          "interface_declaration",
          "type_alias_declaration",
          "enum_declaration",
        ]);

        const symbols: SymbolInfo[] = symbolNodes.map((node) => {
          const nameNode = node.childForFieldName("name");

          return {
            name: nameNode?.text ?? "(anonymous)",
            kind: node.type,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
          };
        });

        indexedFiles.push({
          path: path.relative(absoluteRoot, filePath).replace(/\\/g, "/"),
          language: languageName,
          imports,
          symbols,
        });
      } finally {
        tree.delete();
      }
    }
  } finally {
    parser.delete();
  }

  // Build relationships between files using relative imports.
  const filePaths = new Set(indexedFiles.map((file) => file.path));
  const edges: DependencyEdge[] = [];

  for (const file of indexedFiles) {
    for (const importStatement of file.imports) {
      const match = importStatement.match(
        /(?:from\s*|import\s*)["']([^"']+)["']/,
      );

      if (!match) continue;

      const importPath = match[1];

      // Ignore packages such as "react" and "express".
      if (!importPath.startsWith(".")) continue;

      const resolvedBase = path.posix.normalize(
        path.posix.join(path.posix.dirname(file.path), importPath),
      );

      
const candidates = [
  resolvedBase,

  // TypeScript projects often use .js import paths
  // even when the actual source file is .ts.
  resolvedBase.replace(/\.js$/, ".ts"),
  resolvedBase.replace(/\.jsx$/, ".tsx"),

  `${resolvedBase}.ts`,
  `${resolvedBase}.tsx`,
  `${resolvedBase}.js`,
  `${resolvedBase}.jsx`,
  `${resolvedBase}.mjs`,
  `${resolvedBase}.cjs`,
  `${resolvedBase}.d.ts`,
  `${resolvedBase}/index.ts`,
  `${resolvedBase}/index.tsx`,
  `${resolvedBase}/index.js`,
].filter((candidate, index, all) =>
  all.indexOf(candidate) === index
);


      const target = candidates.find((candidate) =>
        filePaths.has(candidate),
      );

      if (!target) continue;

      edges.push({
        source: file.path,
        target,
        importPath,
      });
    }
  }

  return {
    root: absoluteRoot,
    totalFiles: indexedFiles.length,
    files: indexedFiles,
    edges,
  };
}
