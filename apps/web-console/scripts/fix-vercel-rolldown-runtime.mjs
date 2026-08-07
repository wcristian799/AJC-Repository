import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const functionsRoot = resolve(".vercel/output/functions");
const helper = `var __exportAll = (all, no_symbols) => {
  const target = {};
  for (const name in all) Object.defineProperty(target, name, {
    get: all[name],
    enumerable: true,
  });
  if (!no_symbols) Object.defineProperty(target, Symbol.toStringTag, { value: "Module" });
  return target;
};`;

async function listModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const pathname = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listModules(pathname)));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(pathname);
  }
  return files;
}

let patched = 0;
for (const pathname of await listModules(functionsRoot)) {
  const source = await readFile(pathname, "utf8");
  let changed = false;
  const output = source.replace(
    /import \{([^}]+)\} from "([^"]*\/_runtime\.mjs)";/g,
    (statement, rawSpecifiers, runtimePath) => {
      const specifiers = rawSpecifiers.split(",").map((item) => item.trim());
      if (!specifiers.includes("r as __exportAll")) return statement;
      changed = true;
      const remaining = specifiers.filter((item) => item !== "r as __exportAll");
      const runtimeImport = remaining.length
        ? `import { ${remaining.join(", ")} } from "${runtimePath}";\n`
        : "";
      return `${runtimeImport}${helper}`;
    },
  );
  if (!changed) continue;
  await writeFile(pathname, output, "utf8");
  patched += 1;
}

if (patched === 0) {
  throw new Error("Nenhum import do helper __exportAll foi encontrado no bundle Vercel");
}

console.log(`[vercel-ssr] helper __exportAll isolado em ${patched} chunks`);
