import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

function getFilesRecursively(dir, extensions = [".js", ".jsx", ".md"]) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", "dist", ".system_generated"].includes(entry.name)) {
        results.push(...getFilesRecursively(fullPath, extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

test("Statutory Citations: No file references non-existent Regulation 17(2)", () => {
  const filesToScan = [
    ...getFilesRecursively(path.join(ROOT_DIR, "docs")),
    ...getFilesRecursively(path.join(ROOT_DIR, "sha-mvp/src")),
    ...getFilesRecursively(path.join(ROOT_DIR, "sha-mvp/tests"))
  ].filter(f => path.resolve(f) !== path.resolve(__filename));

  const violations = [];
  for (const file of filesToScan) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("17(2)") || content.includes("Regulation 17(2)") || content.includes("Reg 17(2)")) {
      violations.push(path.relative(ROOT_DIR, file));
    }
  }

  assert.deepEqual(violations, [], `Found forbidden '17(2)' citations in: ${violations.join(", ")}`);
});

test("Statutory Citations: No file references non-existent DPA Section 30(1)(e) or 30(1)(c)", () => {
  const filesToScan = [
    ...getFilesRecursively(path.join(ROOT_DIR, "docs")),
    ...getFilesRecursively(path.join(ROOT_DIR, "sha-mvp/src")),
    ...getFilesRecursively(path.join(ROOT_DIR, "sha-mvp/tests"))
  ].filter(f => path.resolve(f) !== path.resolve(__filename));

  const violations = [];
  for (const file of filesToScan) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("30(1)(e)") || content.includes("30(1)(c)")) {
      violations.push(path.relative(ROOT_DIR, file));
    }
  }

  assert.deepEqual(violations, [], `Found forbidden DPA citations in: ${violations.join(", ")}`);
});
