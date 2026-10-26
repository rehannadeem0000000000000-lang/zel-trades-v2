#!/usr/bin/env bash
# Builds the signed Zel Signals Android APK:
#   static Next.js export -> Capacitor Android project -> Gradle assembleRelease -> apksigner verify
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-$HOME/jdk/jdk-21.0.13+9}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

KEYSTORE="android/app/zel-signals-release.keystore"
KEYPROPS="android/keystore.properties"
APK_OUT="releases/ZelSignals-release.apk"

# 1) Static export. API routes cannot run inside an APK, so they are moved aside for this build only.
BACKUP_DIR="$(mktemp -d)"
restore_api() {
  if [ -d "$BACKUP_DIR/api" ]; then
    rm -rf src/app/api
    mv "$BACKUP_DIR/api" src/app/api
  fi
}
trap restore_api EXIT
if [ -d src/app/api ]; then mv src/app/api "$BACKUP_DIR/api"; fi
rm -rf out
APK_BUILD=1 npx next build
restore_api
trap - EXIT

# 2) Native Android project (created once) and web asset sync
if [ ! -d android ]; then npx cap add android; fi
npx cap sync android

# 3) Release signing key (generated once, reused afterwards)
if [ ! -f "$KEYSTORE" ]; then
  STORE_PASS="$(openssl rand -hex 16)"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" -storetype PKCS12 \
    -alias zelsignals -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
    -dname "CN=Zel Signals, OU=Mobile, O=Zel, C=US"
  printf 'storeFile=zel-signals-release.keystore\nstorePassword=%s\nkeyAlias=zelsignals\nkeyPassword=%s\n' \
    "$STORE_PASS" "$STORE_PASS" > "$KEYPROPS"
  chmod 600 "$KEYPROPS"
fi

# 4) Signed release build
(cd android && chmod +x gradlew && ./gradlew --no-daemon assembleRelease)

mkdir -p releases
cp android/app/build/outputs/apk/release/app-release.apk "$APK_OUT"

# 5) Verify the signature
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
"$BT/apksigner" verify --verbose --print-certs "$APK_OUT"
ls -lh "$APK_OUT"
echo "APK_READY: $APK_OUT"
