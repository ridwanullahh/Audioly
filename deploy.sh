#!/bin/bash
# Bismillah Ar-Rahman Ar-Roheem
# Audioly - One-command deployment script
# Builds web export + mobile APK and prepares for PaaS deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "بسم الله الرحمن الرحيم"
echo "=== Audioly Deploy Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}▸ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# Parse args
DEPLOY_WEB=false
DEPLOY_MOBILE=false
DEPLOY_DOCKER=false
BUILD_ONLY=false

for arg in "$@"; do
  case $arg in
    --web) DEPLOY_WEB=true ;;
    --mobile) DEPLOY_MOBILE=true ;;
    --docker) DEPLOY_DOCKER=true ;;
    --build-only) BUILD_ONLY=true ;;
    --all) DEPLOY_WEB=true; DEPLOY_MOBILE=true ;;
    *) ;;
  esac
done

if [ "$DEPLOY_WEB" = false ] && [ "$DEPLOY_MOBILE" = false ] && [ "$DEPLOY_DOCKER" = false ]; then
  DEPLOY_WEB=true
  DEPLOY_MOBILE=true
fi

# Check prerequisites
step "Checking prerequisites..."
command -v node >/dev/null 2>&1 || fail "Node.js is required"
command -v npx >/dev/null 2>&1 || fail "npx is required"
success "Prerequisites OK"

# Clean old builds
step "Cleaning old build artifacts..."
rm -rf dist/web
rm -rf public/builds/*.apk 2>/dev/null || true
rm -rf public/builds/*.ipa 2>/dev/null || true
success "Old artifacts cleaned"

# Install dependencies
step "Installing dependencies..."
npm install --legacy-peer-deps --silent 2>/dev/null || npm install --legacy-peer-deps
success "Dependencies installed"

# Build web export
if [ "$DEPLOY_WEB" = true ]; then
  step "Building web export..."
  npx expo export --platform web --output-dir dist/web
  success "Web export complete"

  # Prepare public directory
  mkdir -p public/builds
  cp -r dist/web/* public/ 2>/dev/null || true
  success "Web files prepared for serving"
fi

# Build mobile APK
if [ "$DEPLOY_MOBILE" = true ]; then
  step "Building mobile APK..."

  mkdir -p public/builds

  # Check for EAS CLI
  if command -v eas >/dev/null 2>&1; then
    echo "  Using EAS Build..."
    eas build --platform android --profile preview --non-interactive --no-wait 2>/dev/null || {
      warn "EAS Build requires authentication. Building locally instead."
      build_local_apk
    }
  else
    echo "  Building APK locally with debug keystore..."
    build_local_apk
  fi
fi

build_local_apk() {
  # Generate debug keystore if it doesn't exist
  KEYSTORE_DIR="$HOME/.android"
  KEYSTORE="$KEYSTORE_DIR/debug.keystore"
  mkdir -p "$KEYSTORE_DIR"

  if [ ! -f "$KEYSTORE" ]; then
    if command -v keytool >/dev/null 2>&1; then
      keytool -genkey -v \
        -keystore "$KEYSTORE" \
        -storepass android \
        -alias androiddebugkey \
        -keypass android \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=Android Debug,O=Android,C=US" \
        2>/dev/null
      success "Debug keystore generated (free, no credentials needed)"
    else
      warn "keytool not found. Install JDK for APK signing."
      warn "APK will be unsigned — use 'adb install -r' for testing."
    fi
  fi

  # Use npx expo prebuild + build locally if possible
  if command -v java >/dev/null 2>&1; then
    npx expo prebuild --platform android --clean 2>/dev/null || true
    if [ -d "android" ]; then
      cd android
      if [ -f "./gradlew" ]; then
        chmod +x ./gradlew
        ./gradlew assembleRelease -Pandroid.injected.signing.store.file="$KEYSTORE" \
          -Pandroid.injected.signing.store.password=android \
          -Pandroid.injected.signing.key.alias=androiddebugkey \
          -Pandroid.injected.signing.key.password=android \
          2>/dev/null || warn "Gradle build requires Android SDK"

        APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
          cp "$APK_PATH" "$SCRIPT_DIR/public/builds/audioly.apk"
          success "APK built and signed with debug keystore"
        fi
      fi
      cd "$SCRIPT_DIR"
    fi
  else
    warn "Java/JDK not installed. Skipping local APK build."
    warn "Use 'eas build --platform android' for cloud builds."
  fi
}

# Docker build
if [ "$DEPLOY_DOCKER" = true ]; then
  step "Building Docker image..."
  docker build -t audioly:latest .
  success "Docker image built: audioly:latest"

  if [ "$BUILD_ONLY" = false ]; then
    echo ""
    echo "  Run with: docker run -p 3000:3000 audioly:latest"
    echo "  Or push:  docker push <registry>/audioly:latest"
  fi
fi

# Summary
echo ""
echo "================================"
echo "  Build Summary"
echo "================================"
if [ "$DEPLOY_WEB" = true ]; then
  WEB_SIZE=$(du -sh dist/web 2>/dev/null | cut -f1)
  echo -e "  Web Export: ${GREEN}dist/web${NC} ($WEB_SIZE)"
fi
if [ "$DEPLOY_MOBILE" = true ] && [ -d "public/builds" ]; then
  BUILDS_COUNT=$(ls public/builds/*.apk 2>/dev/null | wc -l)
  echo -e "  Mobile Builds: ${GREEN}$BUILDS_COUNT APK(s)${NC} in public/builds/"
fi
echo "================================"

if [ "$BUILD_ONLY" = false ] && [ "$DEPLOY_WEB" = true ]; then
  echo ""
  echo "  Start server: node server.js"
  echo "  Open browser: http://localhost:3000"
fi

echo ""
echo "الحمد لله رب العالمين"
echo "بسم الله الرحمن الرحيم"
