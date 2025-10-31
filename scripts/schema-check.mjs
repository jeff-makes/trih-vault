#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const SCHEMA_DIR = path.join(ROOT_DIR, "schema");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const SCHEMA_FILES = {
  episode: path.join(SCHEMA_DIR, "episode.public.schema.json"),
  series: path.join(SCHEMA_DIR, "series.public.schema.json"),
  cache: path.join(SCHEMA_DIR, "cache.llm.schema.json")
};

const TARGET_FILES = [
  { file: path.join(PUBLIC_DIR, "episodes.json"), schema: "episode", label: "public/episodes.json" },
  { file: path.join(PUBLIC_DIR, "series.json"), schema: "series", label: "public/series.json" },
  { file: path.join(DATA_DIR, "episodes-llm.json"), schema: "cache", label: "data/episodes-llm.json" },
  { file: path.join(DATA_DIR, "series-llm.json"), schema: "cache", label: "data/series-llm.json" }
];

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true, strict: false });
addFormats(ajv);

const loadJson = async (filePath) => {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
};

const formatErrors = (errors) =>
  (errors ?? [])
    .map((entry) => `${entry.instancePath || "(root)"} ${entry.message ?? ""}`.trim())
    .join("; ");

const validateFile = async ({ file, schema, label }, validators) => {
  const data = await loadJson(file);

  if (schema === "cache" && data && typeof data === "object" && !Array.isArray(data)) {
    const errors = Object.entries(data)
      .map(([key, value]) =>
        validators[schema](value) ? null : { key, errors: validators[schema].errors }
      )
      .filter(Boolean);

    if (errors.length > 0) {
      const message = errors
        .map((error) => `  • key ${error.key}: ${formatErrors(error.errors)}`)
        .join("\n");
      throw new Error(`Validation failed for ${label}:\n${message}`);
    }
    return;
  }

  if (Array.isArray(data)) {
    const errors = data
      .map((item, index) =>
        validators[schema](item) ? null : { index, errors: validators[schema].errors }
      )
      .filter(Boolean);

    if (errors.length > 0) {
      const message = errors
        .map((error) => `  • index ${error.index}: ${formatErrors(error.errors)}`)
        .join("\n");
      throw new Error(`Validation failed for ${label}:\n${message}`);
    }
  } else {
    if (!validators[schema](data)) {
      const details = formatErrors(validators[schema].errors);
      throw new Error(`Validation failed for ${label}:\n  • ${details}`);
    }
  }
};

const main = async () => {
  const validators = {};
  for (const [key, schemaPath] of Object.entries(SCHEMA_FILES)) {
    const schema = await loadJson(schemaPath);
    validators[key] = ajv.compile(schema);
  }

  for (const target of TARGET_FILES) {
    await validateFile(target, validators);
    console.log(`✓ ${target.label}`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
