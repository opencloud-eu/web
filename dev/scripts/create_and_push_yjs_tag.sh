#!/bin/bash

# This script creates and pushes the release tag for the yjs server image.
# The yjs server has its own version, independent of the web app version.
# Pushing the tag triggers the CI pipeline that builds and publishes the image.

set -e

cd "$(dirname "$0")/../.."

VERSION=$(node -p "require('./services/yjs/package.json').version")
TAG="yjs-v${VERSION}"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
	echo "$TAG already exists locally"
	exit 1
fi

if git ls-remote --exit-code origin "refs/tags/$TAG" >/dev/null 2>&1; then
	echo "$TAG already exists on origin"
	exit 1
fi

git tag -s -a "$TAG" -m "$TAG"
git push origin "$TAG"

echo "$TAG has been created and pushed"
