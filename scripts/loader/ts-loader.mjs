import { readFile } from "fs/promises";

export async function load(url, context, defaultLoad) {
  if (url.endsWith(".ts")) {
    const source = await readFile(new URL(url), "utf8");
    return {
      format: "module",
      source,
      shortCircuit: true,
    };
  }
  return defaultLoad(url, context, defaultLoad);
}
