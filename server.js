const express = require("express");
const compression = require("compression");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, "dist");
const ARTIFACT_DIRS = [
  path.join(__dirname, "dist", "builds"),
  path.join(__dirname, "artifacts"),
  path.join(__dirname, "android", "app", "build", "outputs", "apk", "release"),
  path.join(__dirname, "android", "app", "build", "outputs", "apk", "debug"),
];

app.use(compression());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get("/api/builds", (_req, res) => {
  const builds = [];
  for (const dir of ARTIFACT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(apk|ipa|aab)$/i.test(f)) continue;
      const filePath = path.join(dir, f);
      const stat = fs.statSync(filePath);
      builds.push({
        name: f,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        downloadUrl: `/builds/${f}`,
        platform: f.endsWith(".apk") ? "android" : f.endsWith(".ipa") ? "ios" : "android",
        dir,
      });
    }
  }
  builds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  cleanupOldBuilds(builds);
  res.json({ builds: builds.map(({ dir, ...b }) => b) });
});

app.get("/builds/:filename", (req, res) => {
  for (const dir of ARTIFACT_DIRS) {
    const filePath = path.join(dir, req.params.filename);
    if (fs.existsSync(filePath)) {
      if (req.params.filename.endsWith(".apk")) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
      }
      return res.sendFile(filePath);
    }
  }
  res.status(404).json({ error: "Build not found" });
});

app.use(express.static(WEB_DIR, {
  maxAge: "1y",
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
  },
}));

app.get("*", (_req, res) => {
  res.sendFile(path.join(WEB_DIR, "index.html"));
});

function cleanupOldBuilds(builds) {
  const byPlatform = {};
  for (const b of builds) {
    if (!byPlatform[b.platform]) byPlatform[b.platform] = [];
    byPlatform[b.platform].push(b);
  }
  for (const platform of Object.keys(byPlatform)) {
    const sorted = byPlatform[platform].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (const old of sorted.slice(1)) {
      const fp = path.join(old.dir, old.name);
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        console.log(`[cleanup] Removed old ${platform} build: ${old.name}`);
      }
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Audioly] Server on port ${PORT}, serving ${WEB_DIR}`);
});
