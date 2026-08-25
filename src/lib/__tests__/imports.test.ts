import fs from "fs";
import path from "path";

function getAllSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllSourceFiles(fullPath));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Code Health - Import Cleanliness", () => {
  it("should have no unused type or value imports across source files", () => {
    const srcDir = path.resolve(__dirname, "../../..");
    const files = getAllSourceFiles(srcDir);
    const unusedImports: string[] = [];

    for (const filePath of files) {
      if (filePath.includes("node_modules") || filePath.includes(".next")) {
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      // Remove comments
      const contentNoComments = content
        .replace(/\/\/.*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

      // Find import statements
      const importRegex = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?/g;
      let match: RegExpExecArray | null;

      const importStatements: string[] = [];
      while ((match = importRegex.exec(contentNoComments)) !== null) {
        importStatements.push(match[0]);
      }

      let body = contentNoComments;
      for (const stmt of importStatements) {
        body = body.replace(stmt, "");
      }

      for (const stmt of importStatements) {
        const bracesMatch = /\{([\s\S]*?)\}/.exec(stmt);
        if (bracesMatch) {
          const specifiers = bracesMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
          for (const spec of specifiers) {
            const cleanName = spec.split(/\s+/).pop()!;
            const regex = new RegExp(`\\b${cleanName}\\b`);
            if (!regex.test(body)) {
              const relativePath = path.relative(srcDir, filePath);
              unusedImports.push(`${relativePath}: '${cleanName}' in \`${stmt.trim()}\``);
            }
          }
        }
      }
    }

    expect(unusedImports).toEqual([]);
  });
});
