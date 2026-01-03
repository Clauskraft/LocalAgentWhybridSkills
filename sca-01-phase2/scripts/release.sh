#!/bin/bash
# SCA-01 Release Script (Linux/macOS)
# Builds and publishes a new version to GitHub Releases

set -e

VERSION_BUMP="${1:-patch}"
DRY_RUN="${2:-false}"

echo "🚀 SCA-01 Release Script"
echo "========================="

# Check for GH_TOKEN
if [ -z "$GH_TOKEN" ] && [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GH_TOKEN or GITHUB_TOKEN environment variable required"
    echo "Set it with: export GH_TOKEN='<github_token>'"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

if [ "$DRY_RUN" = "true" ]; then
    echo "🧪 DRY RUN - No changes will be made"
    exit 0
fi

# Update version
echo -e "\n📝 Updating package.json..."
npm version "$VERSION_BUMP" --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📦 New version: $NEW_VERSION"

# Build
echo -e "\n🔨 Building application..."
npm run build

# Build and publish
echo -e "\n📤 Building and publishing to GitHub Releases..."
npx electron-builder --linux --publish always

# Git operations
echo -e "\n📤 Committing and pushing..."
git add -A
git commit -m "release: v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo -e "\n✅ Release v$NEW_VERSION published successfully!"
echo "🔗 https://github.com/Clauskraft/LocalAgentWhybridSkills/releases/tag/v$NEW_VERSION"

