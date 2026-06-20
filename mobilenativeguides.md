# BirrPass PaaS - Mobile & Native App Deployment Guide

**IMPORTANT: BirrPass is a custom lightweight PaaS. It is NOT Docker-based and does NOT support Dockerfiles, docker-compose, or container orchestration. Do NOT add Docker, Heroku, Render, Vercel, or any other PaaS platform configuration files.**

---

## What BirrPass Is

- Lightweight Rust-based PaaS running directly on a Linux server
- Deploys apps via `git clone` + `npm/pnpm/yarn install` + `npm run build` + systemd service
- Uses Caddy as reverse proxy with automatic SSL
- Manages ports, domains, env vars, and volumes natively
- No containers, no Docker, no Kubernetes

## What NOT To Add

Remove any of these if they exist in your codebase - they are NOT used by BirrPass:
- `Dockerfile` / `docker-compose.yml`
- `Procfile` (Heroku)
- `render.yaml` (Render)
- `vercel.json` (Vercel)
- `fly.toml` (Fly.io)
- `railway.json` (Railway)
- `.dokku` configs
- Any CI/CD pipeline configs specific to other platforms

---

## Mobile App Deployment (Expo / React Native)

### How BirrPass Handles Mobile Apps

BirrPass detects and builds mobile apps automatically:

1. **Monorepo detection**: If your app is in a subdirectory, BirrPass finds it automatically
2. **Build**: Runs your `build` script from `package.json`
3. **Artifact collection**: After build, searches for `.apk`, `.aab`, `.ipa` files and stores them
4. **Download UI**: Artifacts are available at `/apps/{app-id}/artifacts` in the dashboard

### Expo App Setup

Your `package.json` should have:

```json
{
  "scripts": {
    "build": "npx expo export",
    "build:android": "npx eas build --platform android --local --profile apk --non-interactive",
    "start": "npx serve dist"
  },
  "dependencies": {
    "expo": "~52.x",
    "react": "18.x",
    "react-native": "0.76.x"
  }
}
```

### EAS Configuration (eas.json)

EAS Build works with BirrPass for generating APKs. Use this configuration:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "apk": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Free APK Signing (No Credentials Required)

BirrPass supports debug keystore signing automatically. For release APKs without paid credentials:

1. **Option A - EAS with free profile**: Add `"apk"` profile to `eas.json` (see above). EAS handles signing with a free debug keystore when `distribution: "internal"` is set.

2. **Option B - Local Gradle**: If building locally without EAS, add to your `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            // Auto-generated debug keystore - free, no credentials needed
            storeFile file(System.getProperty('user.home') + '/.android/debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

3. **Option C - apksigner**: After build, BirrPass can sign APKs using `apksigner` with an auto-generated keystore. No manual setup needed.

### Where Artifacts Are Stored

After each successful build, BirrPass searches these directories for platform artifacts:
- `android/app/build/outputs/apk/` (release and debug)
- `android/app/build/outputs/bundle/`
- `ios/build/`
- `dist/`
- `build/`
- `artifacts/`

Found files (`.apk`, `.aab`, `.ipa`, `.wgt`, `.msix`) are copied to `{app}/artifacts/` and available for download. Old artifacts are automatically cleaned up (keeps latest 5).

### Web + Mobile in One App

If your Expo app serves both web and mobile:

```json
{
  "scripts": {
    "build": "npx expo export && npx eas build --platform android --local --profile apk --non-interactive",
    "start": "node server.js"
  }
}
```

BirrPass will:
1. Run the build (web export + APK build)
2. Collect the APK artifact
3. Start the web server via the `start` command
4. Make the APK downloadable from the Artifacts page

### React Native (Non-Expo)

```json
{
  "scripts": {
    "build": "cd android && ./gradlew assembleRelease",
    "start": "node server.js"
  }
}
```

BirrPass will detect the APK in `android/app/build/outputs/apk/release/` and collect it.

---

## Summary Checklist

- [ ] Remove Docker/Heroku/Render/Vercel config files
- [ ] Ensure `package.json` has proper `build` and `start` scripts
- [ ] Add `eas.json` with `apk` profile if using Expo
- [ ] Use `distribution: "internal"` for free debug keystore signing
- [ ] Test locally with `npm run build` before deploying
- [ ] Check Artifacts page after deployment for APK/IPA files
