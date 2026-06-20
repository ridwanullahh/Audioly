// Bismillah Ar-Rahman Ar-Roheem
// Audioly - Production server for PaaS deployment
// Serves web app + mobile build downloads with cleanup of old builds

const express = require("express");
const compression = require("compression");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const BUILDS_DIR = path.join(__dirname, "public", "builds");
const WEB_DIR = path.join(__dirname, "public");

app.use(compression());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get("/api/builds", (_req, res) => {
  if (!fs.existsSync(BUILDS_DIR)) {
    return res.json({ builds: [] });
  }

  const files = fs.readdirSync(BUILDS_DIR)
    .filter((f) => /\.(apk|ipa|aab)$/i.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(BUILDS_DIR, f));
      return {
        name: f,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.birthtime.toISOString(),
        downloadUrl: `/builds/${f}`,
        platform: f.endsWith(".apk") ? "android" : f.endsWith(".ipa") ? "ios" : "android",
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  cleanupOldBuilds(files);
  res.json({ builds: files });
});

app.use("/builds", (req, res, next) => {
  const buildsDir = BUILDS_DIR;
  if (!fs.existsSync(buildsDir)) {
    return res.status(404).json({ error: "No builds available" });
  }
  express.static(buildsDir, {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".apk")) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
      }
    },
  })(req, res, next);
});

app.use(express.static(WEB_DIR, {
  maxAge: "1y",
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

app.get("*", (_req, res) => {
  res.sendFile(path.join(WEB_DIR, "index.html"));
});

function cleanupOldBuilds(builds) {
  const byPlatform = {};
  for (const build of builds) {
    if (!byPlatform[build.platform]) byPlatform[build.platform] = [];
    byPlatform[build.platform].push(build);
  }

  for (const platform of Object.keys(byPlatform)) {
    const platformBuilds = byPlatform[platform].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const toKeep = platformBuilds.slice(0, 1);
    const toDelete = platformBuilds.slice(1);

    for (const old of toDelete) {
      const filePath = path.join(BUILDS_DIR, old.name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
  console.log(`[Audioly] Server running on port ${PORT}`);
  console.log(`[Audioly] Serving web app from ${WEB_DIR}`);
  if (fs.existsSync(BUILDS_DIR)) {
    const builds = fs.readdirSync(BUILDS_DIR);
    console.log(`[Audioly] ${builds.length} build(s) available for download`);
  }
});
