#!/bin/bash

source .woodpecker.env

# Function to get the latest OpenCloud commit ID
get_latest_opencloud_commit_id() {
    echo "Getting latest commit ID for branch: $OPENCLOUD_BRANCH"
    latest_commit_id=$(git ls-remote https://github.com/opencloud-eu/opencloud.git "refs/heads/$OPENCLOUD_BRANCH" | cut -f 1)

    # Update the OPENCLOUD in the .woodpecker.env file
    env_file="./.woodpecker.env"
    sed -i "s/^OPENCLOUD_COMMITID=.*/OPENCLOUD_COMMITID=$latest_commit_id/" "$env_file"

    echo "Updated .woodpecker.env with latest commit ID: $latest_commit_id"
    cat $env_file
    exit 0
}

# Function to check if the cache exists for the given commit ID
check_opencloud_cache() {
    echo "Checking OpenCloud cache for commit ID: $OPENCLOUD_COMMITID"
    opencloud_cache=$(mc find s3/$CACHE_BUCKET/opencloud-build/$OPENCLOUD_COMMITID/opencloud 2>&1 | grep 'Object does not exist')

    if [[ "$opencloud_cache" != "" ]]
    then
        echo "$OPENCLOUD_COMMITID doesn't exist in cache."
        ENV="OPENCLOUD_CACHE_FOUND=false\n"
    else
      echo "$OPENCLOUD_COMMITID found in cache."
      ENV="OPENCLOUD_CACHE_FOUND=true\n"
    fi
}

# get playwright version from package.json
get_playwright_version() {
    if [[ ! -f "package.json" ]]; then
        echo "Error: package.json file not found."
    fi

    playwright_version=$(grep '"@playwright/test":' "package.json" | cut -d':' -f2 | tr -d '", ')
    if [[ -z "$playwright_version" ]]; then
        echo "Error: Playwright package not found in package.json." >&2
        exit 78
    fi

    echo "$playwright_version"
}

# Function to check if the cache exists for the given commit ID
check_browsers_cache() {
    get_playwright_version

    playwright_cache=$(mc find s3/$CACHE_BUCKET/web/browsers-cache/$playwright_version/playwright-browsers.tar.gz 2>&1 | grep 'Object does not exist')

    if [[ "$playwright_cache" != "" ]]
    then
        echo "Playwright v$playwright_version supported browsers doesn't exist in cache."
        ENV="BROWSER_CACHE_FOUND=false\n"
    else
      echo "Playwright v$playwright_version supported browsers found in cache."
      ENV="BROWSER_CACHE_FOUND=true\n"
    fi
}


if [[ "$1" == "" ]]; then
    echo "Usage: $0 [COMMAND]"
    echo "Commands:"
    echo -e "  get_latest_opencloud_commit_id \t get the latest OpenCloud commit ID"
    echo -e "  check_opencloud_cache \t\t check if the cache exists for the given commit ID"
    echo -e "  get_playwright_version \t get the playwright version from package.json"
    echo -e "  check_browsers_cache \t check if the browsers cache exists for the given playwright version"
    exit 1
fi

$1

echo -e $ENV >> .woodpecker.env
