#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Store the original working directory (should be the workspace root)
ORIGINAL_DIR=$(pwd)
echo "--- Starting setup in ${ORIGINAL_DIR} ---"

# 1. Define SDK installation directory
SDK_DIR="/home/vscode/android-sdk"
echo "SDK Installation directory: ${SDK_DIR}"
mkdir -p "${SDK_DIR}" # Ensure SDK root directory exists

# Use a temporary directory for download and unzip
TEMP_DIR=$(mktemp -d)
echo "Working temporarily in ${TEMP_DIR}"
cd "${TEMP_DIR}" # Change into temp dir

# 2. Download the latest command-line tools
echo "Downloading command-line tools..."
curl -fsSL -o commandlinetools-linux-13114758_latest.zip https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip

# 3. Unzip the tools
echo "Unzipping tools..."
unzip -q commandlinetools-linux-13114758_latest.zip

# 4. Prepare final SDK structure directory
mkdir -p "${SDK_DIR}/cmdline-tools"

# 5. Move the unzipped 'cmdline-tools' directory to the final location
echo "Moving tools to final destination: ${SDK_DIR}/cmdline-tools/latest"
mv "${TEMP_DIR}/cmdline-tools" "${SDK_DIR}/cmdline-tools/latest"

# 6. Clean up the temporary directory
echo "Cleaning up temporary directory ${TEMP_DIR}..."
# IMPORTANT: Change back to the original directory *before* removing temp dir
cd "${ORIGINAL_DIR}"
rm -rf "${TEMP_DIR}"
echo "Returned to ${ORIGINAL_DIR}"

# 7. Set Environment Variables for the current script session
echo "Setting environment variables (for current session)..."
export ANDROID_SDK_ROOT="${SDK_DIR}"
export ANDROID_HOME="${SDK_DIR}"
export PATH="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${PATH}"
echo "ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT}"
echo "ANDROID_HOME=${ANDROID_HOME}"
echo "Updated PATH=${PATH}"
echo "*** NOTE: Environment variables set for this script execution. Use local.properties for Gradle. ***"

# Define the path to sdkmanager
SDKMANAGER="${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager"

# 8. Verify sdkmanager
echo "Verifying sdkmanager..."
"${SDKMANAGER}" --version

# 9. Accept licenses
echo "Accepting licenses..."
yes | "${SDKMANAGER}" --licenses > /dev/null

# 10. Install required SDK components
PLATFORMS_VERSION="android-34"
BUILD_TOOLS_VERSION="34.0.0"
NDK_VERSION="26.1.10909125" # <--- DOUBLE CHECK THIS VERSION for RN 0.78!
echo "Installing SDK components: platform-tools, platforms;${PLATFORMS_VERSION}, build-tools;${BUILD_TOOLS_VERSION}, ndk;${NDK_VERSION}"
"${SDKMANAGER}" "platform-tools" "platforms;${PLATFORMS_VERSION}" "build-tools;${BUILD_TOOLS_VERSION}" "ndk;${NDK_VERSION}"

# 11. Create local.properties for Gradle
#     Now running from ORIGINAL_DIR (workspace root), so relative path works.
echo "Creating/Updating android/local.properties with SDK path..."
# Ensure the 'android' directory exists directly under the workspace root.
echo "sdk.dir=${SDK_DIR}" > android/local.properties
echo "Created android/local.properties"

echo "--- Android SDK setup script finished successfully ---"

# Optional: Add a reminder about .gitignore
echo "*** REMINDER: Ensure 'local.properties' is listed in your /android/.gitignore file! ***"