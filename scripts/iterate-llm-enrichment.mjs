#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";

const dotenvPath = path.resolve(process.cwd(), ".env.local");
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: dotenvPath });
} catch (error) {
  console.warn("Warning: dotenv not found, skipping .env.local loading");
}

const PIPELINE_CMD = ["npm", "run", "dev:pipeline", "--"];

const runCommand = (args, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      stdio: "inherit",
      env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${args.join(" ")} exited with code ${code}`));
      }
    });
  });

const runPipeline = async (label, extraArgs) => {
  console.log(`\n=== ${label} ===\n`);
  await runCommand([...PIPELINE_CMD, ...extraArgs]);
};

const runPlan = async (scope) => {
  let output = "";
  await new Promise((resolve, reject) => {
    const child = spawn(PIPELINE_CMD[0], [...PIPELINE_CMD.slice(1), "--plan", "--force-llm", scope], {
      env: process.env
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => process.stderr.write(chunk));

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Plan command failed"));
      }
    });
  });

  return !/Episodes requiring LLM enrichment:/i.test(output);
};

const iterateScope = async (scope, batchSize) => {
  console.log(`\n>>> Processing ${scope.toUpperCase()} in batches of ${batchSize}\n`);
  let completed = false;
  let iteration = 1;

  while (!completed) {
    console.log(`\n--- ${scope} batch ${iteration} ---`);
    await runPipeline(`${scope} batch ${iteration}`, ["--force-llm", scope, "--max-llm-calls", String(batchSize)]);
    completed = await runPlan(scope);
    iteration += 1;
  }

  console.log(`\n>>> ${scope.toUpperCase()} enrichment complete\n`);
};

const main = async () => {
  const batchSize = Number(process.argv[2] ?? "200");
  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    console.error("Batch size must be a positive integer.");
    process.exit(1);
  }

  await iterateScope("episodes", batchSize);
  await iterateScope("series", batchSize);
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
