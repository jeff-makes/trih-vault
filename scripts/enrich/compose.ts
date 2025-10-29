import fs from "fs";
import path from "path";

function read(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeIfChanged(p: string, data: any) {
  const next = JSON.stringify(data, null, 2) + "\n";
  const prev = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  if (prev !== next) fs.writeFileSync(p, next, "utf8");
}

const root = process.cwd();
const pub = (f: string) => path.join(root, "public", f);
const episodes = read(pub("episodes.json"));
const series = read(pub("series.json"));
writeIfChanged(pub("episodes.json"), episodes);
writeIfChanged(pub("series.json"), series);
