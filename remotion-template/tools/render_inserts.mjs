// Render các đoạn chèn HyperFrames (cảnh có "insert" trong kịch bản) thành public/inserts/*.mp4
// rồi ghi đường dẫn vào public/timeline.json để Remotion phát chúng đúng chỗ.
//
//   node tools/render_inserts.mjs            (chạy trong remotion-template, sau bước tạo giọng)
//
// Cảnh trong kịch bản:  { "hold": 7, "insert": { "hf": "chapter", "vars": { "title": "..." } }, ... }
// Lỗi ở đây không chặn video: cảnh đó sẽ dùng nền Remotion thay thế.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HF = path.join(ROOT, "hyperframes");
const PUB = path.join(ROOT, "public");
const OUT = path.join(PUB, "inserts");
const OVERLAP = 0.6; // giây chèn thêm cho đoạn hòa trộn với cảnh sau

const tlPath = path.join(PUB, "timeline.json");
const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const jobs = tl.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.insert && s.insert.hf);
if (!jobs.length) {
  console.log("[CHÈN] Không có cảnh HyperFrames nào.");
  process.exit(0);
}

const env = {
  ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_SKIP_SKILLS: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1", DO_NOT_TRACK: "1",
};
const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, env, stdio: "inherit", shell: false });

// cài một lần
if (!fs.existsSync(path.join(HF, "node_modules", "hyperframes"))) {
  console.log("[CHÈN] Cài HyperFrames (lần đầu)...");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["install", "--no-audit", "--no-fund"], { cwd: HF, env, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    console.warn("[CHÈN] Không cài được HyperFrames (cần Node.js >= 22) — bỏ qua, dùng nền Remotion.");
    process.exit(0);
  }
}
fs.mkdirSync(path.join(HF, "fonts"), { recursive: true });
for (const f of fs.readdirSync(path.join(PUB, "fonts"))) {
  if (f.endsWith(".woff2")) fs.copyFileSync(path.join(PUB, "fonts", f), path.join(HF, "fonts", f));
}
fs.mkdirSync(OUT, { recursive: true });

const shared = ["common.css", "common.js"].map((f) => fs.readFileSync(path.join(HF, f), "utf8")).join("");
const bin = path.join(HF, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
const fps = tl.fps || 30;
let ok = 0;

for (const { s, i } of jobs) {
  const next = tl.scenes[i + 1];
  const span = (next ? next.start : tl.duration) - (i === 0 ? 0 : s.start);
  const dur = Math.max(1, Math.round((span + (next ? OVERLAP : 0)) * 100) / 100);
  const tplFile = path.join(HF, `${s.insert.hf}.html`);
  if (!fs.existsSync(tplFile)) {
    console.warn(`[CHÈN] Không có mẫu ${s.insert.hf}.html — bỏ qua cảnh ${i + 1}`);
    continue;
  }
  const tpl = fs.readFileSync(tplFile, "utf8");
  const vars = s.insert.vars || {};
  const key = createHash("sha1").update(tpl + shared + JSON.stringify(vars) + dur + tl.width + tl.height).digest("hex").slice(0, 12);
  const name = `${s.insert.hf}-${key}.mp4`;
  const out = path.join(OUT, name);
  if (!fs.existsSync(out)) {
    const html = path.join(HF, `${s.insert.hf}.__render__.html`);
    fs.writeFileSync(html, tpl.replaceAll("__DUR__", String(dur)));
    console.log(`[CHÈN] Cảnh ${i + 1}: ${s.insert.hf} (${dur}s) → inserts/${name}`);
    const varArg = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
    const r = run(process.execPath, [bin, "render", "-c", path.basename(html), "-o", out, "-f", String(fps), "-q", "high",
      "--variables", JSON.stringify(varArg)], HF);
    fs.rmSync(html, { force: true });
    if (r.status !== 0 || !fs.existsSync(out)) {
      console.warn(`[CHÈN] Render lỗi ở cảnh ${i + 1} — dùng nền Remotion thay thế.`);
      delete s.insertFile;
      continue;
    }
  } else {
    console.log(`[CHÈN] Cảnh ${i + 1}: dùng lại inserts/${name}`);
  }
  s.insertFile = `inserts/${name}`;
  ok++;
}

fs.writeFileSync(tlPath, JSON.stringify(tl, null, 2));
console.log(`[CHÈN] Xong ${ok}/${jobs.length} đoạn HyperFrames.`);
