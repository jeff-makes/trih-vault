import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { register } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const loaderPath = path.join(here, "loader", "ts-loader.mjs");
const loaderUrl = pathToFileURL(loaderPath);

register(loaderUrl);
