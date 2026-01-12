repo_slug = "opencloud-eu/web"
docker_repo_slug = "opencloudeu/web"

ALPINE_GIT = "alpine/git:latest"
APACHE_TIKA = "apache/tika:2.8.0.0"
COLLABORA_CODE = "collabora/code:25.04.7.3.1"
KEYCLOAK = "quay.io/keycloak/keycloak:25.0.0"
MINIO_MC = "minio/mc:RELEASE.2021-10-07T04-19-58Z"
OC_CI_BAZEL_BUILDIFIER = "quay.io/opencloudeu/bazel-buildifier-ci:latest"
OC_CI_GOLANG = "quay.io/opencloudeu/golang-ci:1.25"
OC_CI_NODEJS = "quay.io/opencloudeu/nodejs-ci:24"
OC_CI_NODEJS_ALPINE = "quay.io/opencloudeu/nodejs-alpine-ci:24"
OC_CI_WAIT_FOR = "quay.io/opencloudeu/wait-for-ci:latest"
ONLYOFFICE_DOCUMENT_SERVER = "onlyoffice/documentserver:8.1.3"
PLUGINS_GH_PAGES = "plugins/gh-pages:1"
PLUGINS_GITHUB_RELEASE = "plugins/github-release:1"
PLUGINS_GIT_ACTION = "quay.io/thegeeklab/wp-git-action:2"
PLUGINS_S3 = "plugins/s3:1.5"
PLUGINS_S3_CACHE = "plugins/s3-cache:1"
PLUGINS_SLACK = "plugins/slack:1"
POSTGRES_ALPINE = "postgres:alpine3.18"
OPENLDAP = "bitnamilegacy/openldap:2.6"
READY_RELEASE_GO = "woodpeckerci/plugin-ready-release-go:latest"

WEB_PUBLISH_NPM_PACKAGES = ["babel-preset", "design-system", "eslint-config", "extension-sdk", "prettier-config", "tsconfig", "web-client", "web-pkg", "web-test-helpers"]
WEB_PUBLISH_NPM_ORGANIZATION = "@opencloud-eu"
CACHE_S3_SERVER = "https://s3.ci.opencloud.eu"

dir = {
    "base": "/woodpecker/src/github.com/opencloud-eu/web",
    "web": "/woodpecker/src/github.com/opencloud-eu/web/web",
    "app": "/srv/app",
    "openCloudConfig": "/woodpecker/src/github.com/opencloud-eu/web/web/tests/woodpecker/config-opencloud.json",
    "openCloudRevaDataRoot": "/srv/app/tmp/opencloud/opencloud/data/",
    "federatedOpenCloudConfig": "/woodpecker/src/github.com/opencloud-eu/web/web/tests/woodpecker/config-opencloud-federated.json",
    "ocmProviders": "/woodpecker/src/github.com/opencloud-eu/web/web/tests/woodpecker/providers.json",
    "playwrightBrowsersArchive": "/woodpecker/src/github.com/opencloud-eu/web/web/playwright-browsers.tar.gz",
}

config = {
    "app": "web",
    "rocketchat": {
        "channel": "builds",
        "from_secret": "rocketchat_talk_webhook",
    },
    "branches": [
        "main",
        "stable-*",
    ],
    "pnpmlint": True,
    "pnpmformat": True,
    "e2e": {
        "1": {
            "earlyFail": True,
            "skip": False,
            "suites": [
                "journeys",
                "smoke",
            ],
            "browsers": [
                "chromium",
                "firefox",
                "webkit",
            ],
        },
        "2": {
            "earlyFail": True,
            "skip": False,
            "suites": [
                "admin-settings",
                "spaces",
            ],
        },
        "3": {
            "earlyFail": True,
            "skip": False,
            "tikaNeeded": True,
            "suites": [
                "search",
                "shares",
            ],
            "extraServerEnvironment": {
                "FRONTEND_FULL_TEXT_SEARCH_ENABLED": True,
                "SEARCH_EXTRACTOR_TYPE": "tika",
                "SEARCH_EXTRACTOR_TIKA_TIKA_URL": "http://tika:9998",
                "SEARCH_EXTRACTOR_CS3SOURCE_INSECURE": True,
            },
        },
        "4": {
            "earlyFail": True,
            "skip": False,
            "suites": [
                "navigation",
                "user-settings",
                "file-action",
                "app-store",
            ],
        },
        "a11y": {
            "earlyFail": True,
            "skip": False,
            "suites": [
                "a11y",
            ],
            "browsers": [
                "chromium",
                "firefox",
                "webkit",
            ],
        },
        "app-provider": {
            "skip": False,
            "suites": [
                "app-provider",
            ],
            "extraServerEnvironment": {
                "GATEWAY_GRPC_ADDR": "0.0.0.0:9142",
                "MICRO_REGISTRY": "nats-js-kv",
                "MICRO_REGISTRY_ADDRESS": "0.0.0.0:9233",
                "NATS_NATS_HOST": "0.0.0.0",
                "NATS_NATS_PORT": 9233,
                "COLLABORA_DOMAIN": "collabora:9980",
                "WEB_UI_CONFIG_FILE": None,
            },
        },
        "app-provider-onlyOffice": {
            "skip": False,
            "suites": [
                "app-provider-onlyOffice",
            ],
            "extraServerEnvironment": {
                "GATEWAY_GRPC_ADDR": "0.0.0.0:9142",
                "MICRO_REGISTRY": "nats-js-kv",
                "MICRO_REGISTRY_ADDRESS": "0.0.0.0:9233",
                "NATS_NATS_HOST": "0.0.0.0",
                "NATS_NATS_PORT": 9233,
                "ONLYOFFICE_DOMAIN": "onlyoffice:443",
                "WEB_UI_CONFIG_FILE": None,
            },
        },
        "oidc-refresh-token": {
            "skip": False,
            "features": [
                "cucumber/features/oidc/refreshToken.feature",
            ],
            "extraServerEnvironment": {
                "IDP_ACCESS_TOKEN_EXPIRATION": 30,
                "WEB_OIDC_SCOPE": "openid profile email offline_access",
            },
        },
        "oidc-iframe": {
            "skip": False,
            "features": [
                "cucumber/features/oidc/iframeTokenRenewal.feature",
            ],
            "extraServerEnvironment": {
                "IDP_ACCESS_TOKEN_EXPIRATION": 30,
            },
        },
        "ocm": {
            "earlyFail": True,
            "skip": False,
            "federationServer": True,
            "suites": [
                "ocm",
            ],
            "extraServerEnvironment": {
                "OC_ADD_RUN_SERVICES": "ocm",
                "OC_ENABLE_OCM": True,
                "GRAPH_INCLUDE_OCM_SHAREES": True,
                "OCM_OCM_INVITE_MANAGER_INSECURE": True,
                "OCM_OCM_SHARE_PROVIDER_INSECURE": True,
                "OCM_OCM_STORAGE_PROVIDER_INSECURE": True,
                "OCM_OCM_PROVIDER_AUTHORIZER_PROVIDERS_FILE": "%s" % dir["ocmProviders"],
            },
        },
        "mobile-view": {
            "skip": False,
            "suites": [
                "mobile-view",
            ],
        },
        "localization-de": {
            "skip": False,
            "features": [
                "cucumber/features/a11y/smoke.feature",
            ],
            "extraServerEnvironment": {
                "OC_DEFAULT_LANGUAGE": "de",
            },
        },
    },
    "build": True,
}

# minio mc environment variables
minio_mc_environment = {
    "CACHE_BUCKET": {
        "from_secret": "cache_s3_bucket",
    },
    "MC_HOST": CACHE_S3_SERVER,
    "AWS_ACCESS_KEY_ID": {
        "from_secret": "cache_s3_access_key",
    },
    "AWS_SECRET_ACCESS_KEY": {
        "from_secret": "cache_s3_secret_key",
    },
    "PUBLIC_BUCKET": "public",
}

web_workspace = {
    "base": dir["base"],
    "path": config["app"],
}

event = {
    "base": {
        "event": ["push", "manual"],
        "branch": ["main", "stable-*"],
    },
    "main_branch": {
        "event": ["push", "manual"],
        "branch": "main",
    },
    "pull_request": {
        "event": "pull_request",
    },
    "tag": {
        "event": "tag",
    },
    "cron": {
        "event": "cron",
        "branch": "main",
    },
}

def main(ctx):
    if ctx.build.event == "cron" and ctx.build.sender == "translation-sync":
        return translation_sync(ctx)
    is_release_pr = (ctx.build.event == "pull_request" and ctx.build.sender == "openclouders" and "🎉 release" in ctx.build.title.lower())
    if is_release_pr:
        return licenseCheck()

    release = readyReleaseGo()

    before = beforePipelines(ctx)

    stages = pipelinesDependsOn(stagePipelines(ctx), before)

    if not stages:
        print("Errors detected. Review messages above.")
        return []

    after = pipelinesDependsOn(afterPipelines(ctx), pnpmCache(ctx)) + designSystemDocs(ctx)

    pipelines = release + before + stages + after

    return pipelines

def beforePipelines(ctx):
    return checkStarlark() + \
           licenseCheck() + \
           pnpmCache(ctx) + \
           cacheOpenCloudPipeline(ctx) + \
           pipelinesDependsOn(buildCacheWeb(ctx), pnpmCache(ctx)) + \
           pipelinesDependsOn(pnpmlint(ctx, "lint"), pnpmCache(ctx)) + \
           pipelinesDependsOn(pnpmlint(ctx, "format"), pnpmCache(ctx))

def stagePipelines(ctx):
    unit_test_pipelines = unitTests(ctx)

    # run only unit tests when publishing a standalone package
    if determineReleasePackage(ctx) != None:
        return unit_test_pipelines

    e2e_pipelines = e2eTests(ctx)

    keycloak_pipelines = e2eTestsOnKeycloak(ctx)
    return unit_test_pipelines + e2e_pipelines + keycloak_pipelines

def afterPipelines(ctx):
    return publishRelease(ctx) + [purgeBuildArtifactCache(ctx), purgeOpencloudBuildCache(ctx), purgeBrowserCache(ctx), purgeTracingCache(ctx)] + pipelinesDependsOn(notifyMatrix(), stagePipelines(ctx))

def translation_sync(ctx):
    return [{
        "name": "translation-sync",
        "steps": [
            {
                "name": "translation-update",
                "image": OC_CI_NODEJS,
                "commands": [
                    # FIXME: remove node install as soon as we have our own node 22 image
                    "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash",
                    'export NVM_DIR="$HOME/.nvm"',
                    "[ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\"",
                    "nvm install 22",
                    "nvm use 22",
                    "corepack enable pnpm",
                    "make l10n-read",
                    "curl -o- https://raw.githubusercontent.com/transifex/cli/master/install.sh | bash",
                    ". ~/.profile",
                    "make l10n-push",
                    "make l10n-pull",
                    "rm tx",
                    "make l10n-write",
                    "make l10n-clean",
                    "git checkout pnpm-lock.yaml",  # ignore possible changes in package.lock
                ],
                "environment": {
                    "TX_TOKEN": {
                        "from_secret": "tx_token",
                    },
                },
            },
            {
                "name": "translation-push",
                "image": PLUGINS_GIT_ACTION,
                "settings": {
                    "action": ["commit", "push"],
                    "branch": ctx.build.branch,
                    "message": "[tx] updated from transifex",
                    "author_name": "opencloudeu",
                    "author_email": "devops@opencloud.eu",
                    "netrc_username": {
                        "from_secret": "github_username",
                    },
                    "netrc_password": {
                        "from_secret": "github_token",
                    },
                    "empty_commit": False,
                },
            },
        ],
        "when": [
            {
                "event": "cron",
                "cron": "translation-sync",
            },
        ],
    }]

def pnpmCache(ctx):
    return [{
        "name": "cache-pnpm",
        "workspace": web_workspace,
        "steps": installPnpm() +
                 rebuildBuildArtifactCache(ctx, "pnpm", ".pnpm-store") +
                 checkBrowsersCache() +
                 installBrowsers() +
                 cacheBrowsers(),
        "when": [
            event["base"],
            event["cron"],
            event["tag"],
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "cache"),
                },
            },
        ],
    }]

# lintType can be "lint" or "format"
def pnpmlint(ctx, lintType):
    pipelines = []
    name = "pnpm" + lintType
    if name not in config:
        return pipelines

    if type(config[name]) == "bool":
        if not config[name]:
            return pipelines

    steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + installPnpm()
    if name == "pnpmformat":
        steps += formatCheck()
    else:
        steps += lint()
    result = {
        "name": name,
        "workspace": web_workspace,
        "steps": steps,
        "when": [
            event["tag"],
            event["cron"],
            {
                "event": ["push", "manual"],
                "branch": config["branches"],
            },
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "lint"),
                },
            },
        ],
    }

    pipelines.append(result)

    return pipelines

def publishRelease(ctx):
    pipelines = []

    if "build" not in config:
        return pipelines

    if type(config["build"]) == "bool":
        if not config["build"]:
            return pipelines

    steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + installPnpm() + buildAndPublishRelease(ctx)

    build_pipeline = {
        "name": "publish-release",
        "workspace": web_workspace,
        "steps": steps,
        "when": [event["tag"]],
    }

    pipelines.append(build_pipeline)

    return pipelines

def readyReleaseGo():
    return [
        {
            "name": "release",
            "steps": [
                {
                    "name": "release-helper",
                    "image": READY_RELEASE_GO,
                    "settings": {
                        "git_email": "devops@opencloud.eu",
                        "forge_type": "github",
                        "forge_token": {
                            "from_secret": "github_token",
                        },
                    },
                },
            ],
            "when": [
                {
                    "event": ["push"],
                    "branch": "${CI_REPO_DEFAULT_BRANCH}",
                },
            ],
        },
    ]

def buildCacheWeb(ctx):
    return [{
        "name": "cache-web",
        "workspace": web_workspace,
        "steps": restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") +
                 installPnpm() +
                 [{
                     "name": "build-web",
                     "image": OC_CI_NODEJS,
                     "environment": {
                         "NO_INSTALL": True,
                     },
                     "commands": [
                         "make dist",
                     ],
                 }] +
                 rebuildBuildArtifactCache(ctx, "web-dist", "dist"),
        "when": [
            event["base"],
            event["cron"],
            event["tag"],
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "cache"),
                },
            },
        ],
    }]

def unitTests(ctx):
    # sonar_env = {
    #     "SONAR_TOKEN": {
    #         "from_secret": "sonar_token",
    #     },
    # }
    # if ctx.build.event == "pull_request":
    #     sonar_env.update({
    #         "SONAR_PULL_REQUEST_BASE": "%s" % (ctx.build.target),
    #         "SONAR_PULL_REQUEST_BRANCH": "%s" % (ctx.build.source),
    #         "SONAR_PULL_REQUEST_KEY": "%s" % (ctx.build.ref.replace("refs/pull/", "").split("/")[0]),
    #     })

    return [{
        "name": "unit-tests",
        "workspace": web_workspace,
        "steps": restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") +
                 installPnpm() +
                 [
                     {
                         "name": "unit-tests",
                         "image": OC_CI_NODEJS_ALPINE,
                         "commands": [
                             "pnpm test:unit --coverage",
                         ],
                     },
                     # {
                     #     "name": "sonarcloud",
                     #     "image": SONARSOURCE_SONAR_SCANNER_CLI,
                     #     "environment": sonar_env,
                     # },
                 ],
        "when": [
            event["base"],
            event["cron"],
            event["tag"],
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "unit-tests"),
                },
            },
        ],
    }]

def e2eTests(ctx):
    default = {
        "skip": False,
        "logLevel": "2",
        "reportTracing": False,
        "db": "mysql:5.5",
        "suites": [],
        "features": [],
        "tikaNeeded": False,
        "federationServer": False,
        "failOnUncaughtConsoleError": False,
        "extraServerEnvironment": {},
        "browsers": ["chromium"],
    }

    e2e_trigger = [
        event["cron"],
        {
            "event": ["push", "manual"],
            "branch": config["branches"],
        },
        event["pull_request"],
        event["tag"],
    ]

    pipelines = []
    params = {}
    matrices = config["e2e"]

    for suite, matrix in matrices.items():
        for item in default:
            params[item] = matrix[item] if item in matrix else default[item]

        if "app-provider-onlyOffice" in suite and not "full-ci" in ctx.build.title.lower() and ctx.build.event != "cron":
            continue

        if "ocm" in suite and not "full-ci" in ctx.build.title.lower() and ctx.build.event != "cron":
            continue

        if "localization-de" in suite and "localization-de" not in ctx.build.title.lower():
            continue

        if params["skip"]:
            continue

        if "with-tracing" in ctx.build.title.lower():
            params["reportTracing"] = True

        browsers_for_suite = params["browsers"]

        for browser_name in browsers_for_suite:
            environment = {
                "HEADLESS": True,
                "RETRY": "1",
                "REPORT_TRACING": params["reportTracing"],
                "OC_BASE_URL": "opencloud:9200",
                "OC_SHOW_USER_EMAIL_IN_RESULTS": True,
                "FAIL_ON_UNCAUGHT_CONSOLE_ERR": True,
                "PLAYWRIGHT_BROWSERS_PATH": ".playwright",
                "BROWSER": browser_name,
                "TERM": "xterm-256color",
                "FORCE_COLOR": "1",
            }

            steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + \
                    installPnpm() + \
                    restoreBrowsersCache(browser_name) + \
                    restoreBuildArtifactCache(ctx, "web-dist", "dist") + \
                    restoreOpenCloudCache()

            if "app-provider-onlyOffice" in suite:
                environment["FAIL_ON_UNCAUGHT_CONSOLE_ERR"] = False
                steps += onlyofficeService() + \
                         waitForService("onlyoffice", "443") + \
                         openCloudService(params["extraServerEnvironment"]) + \
                         wopiCollaborationService("onlyoffice") + \
                         waitForService("wopi-onlyoffice", "9300")

            elif "app-provider" in suite:
                environment["FAIL_ON_UNCAUGHT_CONSOLE_ERR"] = False
                steps += collaboraService() + \
                         waitForService("collabora", "9980") + \
                         openCloudService(params["extraServerEnvironment"]) + \
                         wopiCollaborationService("collabora") + \
                         waitForService("wopi-collabora", "9300")

            elif "ocm" in suite:
                steps += openCloudService(params["extraServerEnvironment"]) + \
                         (openCloudService(params["extraServerEnvironment"], "federation") if params["federationServer"] else [])
            else:
                # OpenCloud specific steps
                steps += (tikaService() if params["tikaNeeded"] else []) + \
                         openCloudService(params["extraServerEnvironment"])

            if browser_name == "firefox" or browser_name == "webkit":
                environment["FAIL_ON_UNCAUGHT_CONSOLE_ERR"] = "False"

            command = "cd tests/e2e && bash run-e2e.sh "

            if "suites" in matrix:
                command += "--suites %s" % ",".join(params["suites"])
            elif "features" in matrix:
                command += "%s" % " ".join(params["features"])
            else:
                print("Error: No suites or features defined for e2e test suite '%s'" % suite)
                return []

            if "mobile-view" in suite:
                command = "pnpm test:e2e:mobile-parallel"
                pipeline_name = "e2e-tests-%s" % suite
            else:
                pipeline_name = "e2e-tests-%s-%s" % (suite, browser_name)

            if "localization-de" in suite:
                command = "RUN_LOCALIZATION_TEST_FOR_LANG=de pnpm test:e2e:cucumber tests/e2e/cucumber/features/a11y/smoke.feature"

            steps += [{
                         "name": "e2e-tests",
                         "image": OC_CI_NODEJS,
                         "environment": environment,
                         "commands": [
                             command,
                         ],
                     }] + \
                     uploadTracingResult(ctx)

            pipelines.append({
                "name": pipeline_name,
                "workspace": web_workspace,
                "steps": steps,
                "depends_on": ["cache-opencloud"],
                "when": e2e_trigger,
            })

    return pipelines

def notifyMatrix():
    pipelines = []

    result = {
        "name": "chat-notifications",
        "skip_clone": True,
        "runs_on": ["success", "failure"],
        "steps": [
            {
                "name": "notify-matrix",
                "image": OC_CI_GOLANG,
                "environment": {
                    "HTTP_PROXY": {
                        "from_secret": "ci_http_proxy",
                    },
                    "HTTPS_PROXY": {
                        "from_secret": "ci_http_proxy",
                    },
                    "MATRIX_HOME_SERVER": "matrix.org",
                    "MATRIX_ROOM_ALIAS": {
                        "from_secret": "opencloud-notifications-channel",
                    },
                    "MATRIX_USER": {
                        "from_secret": "opencloud-notifications-user",
                    },
                    "MATRIX_PASSWORD": {
                        "from_secret": "opencloud-notifications-user-password",
                    },
                    "QA_REPO": "https://github.com/opencloud-eu/qa.git",
                    "QA_REPO_BRANCH": "main",
                    "CI_WOODPECKER_URL": {
                        "from_secret": "oc_ci_url",
                    },
                    "CI_REPO_ID": "6",
                    "CI_WOODPECKER_TOKEN": "no-auth-needed-on-this-repo",
                },
                "commands": [
                    "git clone --single-branch --branch $QA_REPO_BRANCH $QA_REPO /tmp/qa",
                    "cd /tmp/qa/scripts/matrix-notification/",
                    "go run matrix-notification.go",
                ],
            },
        ],
        "when": [
            event["cron"],
            event["pull_request"],
            {
                "event": ["push", "manual"],
                "branch": "${CI_REPO_DEFAULT_BRANCH}",
            },
        ],
    }

    pipelines.append(result)
    return pipelines

def installPnpm():
    return [{
        "name": "pnpm-install",
        "image": OC_CI_NODEJS,
        "commands": [
            'npm install --silent --global --force "$(jq -r ".packageManager" < package.json)"',
            "pnpm config set store-dir ./.pnpm-store",
            "pnpm install",
        ],
    }]

def installBrowsers():
    return [{
        "name": "install-browsers",
        "image": OC_CI_NODEJS,
        "environment": {
            "PLAYWRIGHT_BROWSERS_PATH": ".playwright",
        },
        "commands": [
            ". ./.woodpecker.env",
            "if $BROWSER_CACHE_FOUND; then exit 0; fi",
            "pnpm exec playwright install",
            "pnpm exec playwright install --list",
            "tar -czvf %s .playwright" % dir["playwrightBrowsersArchive"],
        ],
    }]

def lint():
    return [{
        "name": "lint",
        "image": OC_CI_NODEJS_ALPINE,
        "commands": [
            "pnpm lint",
        ],
    }]

def formatCheck():
    return [
        {
            "name": "format-check",
            "image": OC_CI_NODEJS_ALPINE,
            "commands": [
                "pnpm format:check",
            ],
        },
        {
            "name": "show-diff",
            "image": OC_CI_NODEJS_ALPINE,
            "commands": [
                "pnpm format:write",
                "git diff",
            ],
            "when": {
                "status": [
                    "failure",
                ],
            },
        },
    ]

def determineReleasePackage(ctx):
    if ctx.build.event != "tag":
        return None

    matches = [p for p in WEB_PUBLISH_NPM_PACKAGES if ctx.build.ref.startswith("refs/tags/%s-v" % p)]
    if len(matches) > 0:
        return matches[0]

    return None

def determineReleaseVersion(ctx):
    package = determineReleasePackage(ctx)
    if package == None:
        return ctx.build.ref.replace("refs/tags/v", "")

    return ctx.build.ref.replace("refs/tags/" + package + "-v", "")

def buildAndPublishRelease(ctx):
    steps = []
    package = determineReleasePackage(ctx)
    version = determineReleaseVersion(ctx)

    if package == None:
        steps += [
            {
                "name": "build-web",
                "image": OC_CI_NODEJS,
                "environment": {
                    "NO_INSTALL": True,
                },
                "commands": [
                    "cd %s" % dir["web"],
                    "make -f Makefile.release",
                ],
            },
            {
                "name": "publish-github-release",
                "image": PLUGINS_GITHUB_RELEASE,
                "settings": {
                    "api_key": {
                        "from_secret": "github_token",
                    },
                    "files": [
                        "release/*",
                    ],
                    "checksum": [
                        "md5",
                        "sha256",
                    ],
                    "title": ctx.build.ref.replace("refs/tags/v", ""),
                    "prerelease": len(ctx.build.ref.split("-")) > 1,
                },
                "when": [event["tag"]],
            },
        ]
    else:
        full_package_name = "%s/%s" % (WEB_PUBLISH_NPM_ORGANIZATION, package)
        steps.append(
            {
                "name": "publish",
                "image": OC_CI_NODEJS,
                "environment": {
                    "NPM_TOKEN": {
                        "from_secret": "npm_token",
                    },
                },
                "commands": [
                    "echo Build " + package + " " + version + " package.json: $(jq -r '.version' < packages/%s/package.json)" % package,
                    "[ \"$(jq -r '.version'  < packages/%s/package.json)\" = \"%s\" ] || (echo \"git tag does not match version in packages/%s/package.json\"; exit 1)" % (package, version, package),
                    "git checkout .",
                    "git clean -fd",
                    "git diff",
                    "git status",
                    "bash -c '[ \"%s\" == \"design-system\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    "bash -c '[ \"%s\" == \"web-client\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    "bash -c '[ \"%s\" == \"web-pkg\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    "bash -c '[ \"%s\" == \"web-test-helpers\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    # until https://github.com/pnpm/pnpm/issues/5775 is resolved, we print pnpm whoami because that fails when the npm_token is invalid
                    "env \"npm_config_//registry.npmjs.org/:_authToken=$${NPM_TOKEN}\" pnpm whoami",
                    "env \"npm_config_//registry.npmjs.org/:_authToken=$${NPM_TOKEN}\" pnpm publish --no-git-checks --filter %s --access public --tag latest" % full_package_name,
                ],
                "when": [event["tag"]],
            },
        )

    return steps

def openCloudService(extra_env_config = {}, deploy_type = "opencloud"):
    environment = {
        "IDM_ADMIN_PASSWORD": "admin",  # override the random admin password from `opencloud init`
        "OC_INSECURE": True,
        "OC_LOG_LEVEL": "error",
        "OC_JWT_SECRET": "some-opencloud-jwt-secret",
        "LDAP_GROUP_SUBSTRING_FILTER_TYPE": "any",
        "LDAP_USER_SUBSTRING_FILTER_TYPE": "any",
        "PROXY_ENABLE_BASIC_AUTH": True,
        "WEB_ASSET_CORE_PATH": "%s/dist" % dir["web"],
        "FRONTEND_SEARCH_MIN_LENGTH": "2",
        "OC_PASSWORD_POLICY_BANNED_PASSWORDS_LIST": "%s/tests/woodpecker/banned-passwords.txt" % dir["web"],
        "PROXY_CSP_CONFIG_FILE_LOCATION": "%s/tests/woodpecker/csp.yaml" % dir["web"],
        "OC_SHOW_USER_EMAIL_IN_RESULTS": True,
        # Needed for enabling all roles
        "GRAPH_AVAILABLE_ROLES": "b1e2218d-eef8-4d4c-b82d-0f1a1b48f3b5,a8d5fe5e-96e3-418d-825b-534dbdf22b99,fb6c3e19-e378-47e5-b277-9732f9de6e21,58c63c02-1d89-4572-916a-870abc5a1b7d,2d00ce52-1fc2-4dbc-8b95-a73b73395f5a,1c996275-f1c9-4e71-abdf-a42f6495e960,312c0871-5ef7-4b3a-85b6-0e4074c64049,aa97fe03-7980-45ac-9e50-b325749fd7e6,63e64e19-8d43-42ec-a738-2b6af2610efa",
        "ACTIVITYLOG_WRITE_BUFFER_DURATION": "0",
    }

    if deploy_type == "federation":
        environment["OC_URL"] = "https://federation-opencloud:10200"
        environment["PROXY_HTTP_ADDR"] = "federation-opencloud:10200"
        environment["WEB_UI_CONFIG_FILE"] = dir["federatedOpenCloudConfig"]
        container_name = "federation-opencloud"

    else:
        container_name = "opencloud"

        environment["OC_URL"] = "https://opencloud:9200"
        environment["WEB_UI_CONFIG_FILE"] = dir["openCloudConfig"]

    for config in extra_env_config:
        environment[config] = extra_env_config[config]

    wait_for_service = waitForService("opencloud", "9200")
    if "OC_EXCLUDE_RUN_SERVICES" not in environment or "idp" not in environment["OC_EXCLUDE_RUN_SERVICES"]:
        wait_for_service = [
            {
                "name": "wait-for-%s" % container_name,
                "image": OC_CI_GOLANG,
                "commands": [
                    "timeout 300 bash -c 'while [ $(curl -sk -uadmin:admin " +
                    "%s/graph/v1.0/users/admin " % environment["OC_URL"] +
                    "-w %{http_code} -o /dev/null) != 200 ]; do sleep 1; done'",
                ],
            },
        ]

    return [
        {
            "name": container_name,
            "image": OC_CI_GOLANG,
            "detach": True,
            "environment": environment,
            "commands": [
                "mkdir -p %s" % dir["openCloudRevaDataRoot"],
                "mkdir -p /srv/app/tmp/opencloud/storage/users/",
                "./opencloud init",
                "cp %s/tests/woodpecker/app-registry.yaml /root/.opencloud/config/app-registry.yaml" % dir["web"],
                "./opencloud server",
            ],
        },
    ] + wait_for_service

def checkForExistingOpenCloudCache(ctx):
    web_repo_path = "https://raw.githubusercontent.com/opencloud-eu/web/%s" % ctx.build.commit
    return [
        {
            "name": "check-for-existing-cache",
            "image": MINIO_MC,
            "environment": minio_mc_environment,
            "commands": [
                "curl -o .woodpecker.env %s/.woodpecker.env" % web_repo_path,
                "curl -o script.sh %s/tests/woodpecker/script.sh" % web_repo_path,
                ". ./.woodpecker.env",
                "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
                "mc ls --recursive s3/$CACHE_BUCKET/opencloud-build",
                "bash script.sh check_opencloud_cache",
            ],
        },
    ]

def cacheOpenCloudPipeline(ctx):
    steps = checkForExistingOpenCloudCache(ctx) + \
            buildOpenCloud() + \
            cacheOpenCloud()

    return [{
        "name": "cache-opencloud",
        "skip_clone": True,
        "steps": steps,
        "when": [
            event["base"],
            event["cron"],
            event["pull_request"],
            event["tag"],
        ],
    }]

def restoreOpenCloudCache():
    return [{
        "name": "restore-opencloud-cache",
        "image": MINIO_MC,
        "environment": minio_mc_environment,
        "commands": [
            ". ./.woodpecker.env",
            "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
            "mc cp -r -a s3/$CACHE_BUCKET/opencloud-build/$OPENCLOUD_COMMITID/opencloud %s" % dir["web"],
        ],
    }]

def buildOpenCloud():
    opencloud_repo_url = "https://github.com/opencloud-eu/opencloud.git"

    return [
        {
            "name": "clone-opencloud",
            "image": OC_CI_GOLANG,
            "commands": [
                ". ./.woodpecker.env",
                "if $OPENCLOUD_CACHE_FOUND; then exit 0; fi",
                # ToDo is the note below still correct?
                # NOTE: it is important to not start repo name with opencloud*
                # because we copy opencloud binary to root workspace
                # and upload binary <workspace>/opencloud to cache bucket.
                # This prevents accidental upload of opencloud repo to the cache
                "git clone -b $OPENCLOUD_BRANCH --single-branch %s repo_opencloud" % opencloud_repo_url,
                "cd repo_opencloud",
                "git checkout $OPENCLOUD_COMMITID",
            ],
        },
        {
            "name": "generate-opencloud",
            "image": OC_CI_NODEJS,
            "commands": [
                ". ./.woodpecker.env",
                "if $OPENCLOUD_CACHE_FOUND; then exit 0; fi",
                "cd repo_opencloud",
                "for i in $(seq 3); do make node-generate-prod && break || sleep 1; done",
            ],
        },
        {
            "name": "build-opencloud",
            "image": OC_CI_GOLANG,
            "commands": [
                ". ./.woodpecker.env",
                "if $OPENCLOUD_CACHE_FOUND; then exit 0; fi",
                "cd repo_opencloud",
                "for i in $(seq 3); do make -C opencloud build ENABLE_VIPS=1 && break || sleep 1; done",
                "cp opencloud/bin/opencloud %s/" % dir["base"],
            ],
        },
    ]

def cacheOpenCloud():
    return [{
        "name": "upload-opencloud-cache",
        "image": MINIO_MC,
        "environment": minio_mc_environment,
        "commands": [
            ". ./.woodpecker.env",
            "if $OPENCLOUD_CACHE_FOUND; then exit 0; fi",
            "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
            "mc cp -a %s/opencloud s3/$CACHE_BUCKET/opencloud-build/$OPENCLOUD_COMMITID/" % dir["base"],
            "mc ls --recursive s3/$CACHE_BUCKET/opencloud-build",
        ],
    }]

def checkStarlark():
    return [{
        "name": "check-starlark",
        "steps": [
            {
                "name": "format-check-starlark",
                "image": OC_CI_BAZEL_BUILDIFIER,
                "commands": [
                    "buildifier --mode=check .woodpecker.star",
                ],
            },
            {
                "name": "show-diff",
                "image": OC_CI_BAZEL_BUILDIFIER,
                "commands": [
                    "buildifier --mode=fix .woodpecker.star",
                    "git diff",
                ],
                "when": {
                    "status": [
                        "failure",
                    ],
                },
            },
        ],
        "when": [
            event["base"],
            event["cron"],
            event["pull_request"],
            event["tag"],
        ],
    }]

# ToDo use pnpm cache
def licenseCheck():
    return [{
        "name": "license-check",
        "steps": installPnpm() + [
            {
                "name": "node-check-licenses",
                "image": OC_CI_NODEJS,
                "commands": [
                    "pnpm licenses:check",
                ],
            },
            {
                "name": "node-save-licenses",
                "image": OC_CI_NODEJS,
                "commands": [
                    "pnpm licenses:csv",
                    "pnpm licenses:save",
                ],
            },
        ],
        "when": [
            event["cron"],
            event["pull_request"],
            event["tag"],
            event["main_branch"],
        ],
        "workspace": web_workspace,
    }]

def designSystemDocs(ctx):
    return [{
        "name": "design-system-docs",
        "steps": restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + installPnpm() + [
            {
                "name": "build",
                "image": OC_CI_NODEJS,
                "commands": [
                    # FIXME: remove node install as soon as we have our own node 22 image
                    "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash",
                    'export NVM_DIR="$HOME/.nvm"',
                    "[ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\"",
                    "nvm install 22",
                    "nvm use 22",
                    "corepack enable pnpm",
                    "pnpm --filter 'design-system' docs:build",
                    "cp -R packages/design-system/docs/.vitepress/dist docs",
                    # add dummy woodpecker config to disable CI on push to the docs branch
                    "printf 'def main(ctx):\n    return [{\n        \"name\":\"dummy-pipeline\",\n" +
                    "        \"steps\":[{\"name\":\"dummy-step\",\"image\":\"alpine:latest\"}],\n" +
                    "        \"when\":[{\"branch\":[\"main\"]}],\n    }]\n' > docs/.woodpecker.star",
                ],
            },
            {
                "name": "publish",
                "image": PLUGINS_GH_PAGES,
                "settings": {
                    "username": {
                        "from_secret": "github_username",
                    },
                    "password": {
                        "from_secret": "github_token",
                    },
                    "pages_directory": "docs/",
                    "copy_contents": True,
                    "target_branch": "design-system-docs",
                    "delete": True,
                },
                "when": [
                    {
                        "event": ["push"],
                        "branch": "${CI_REPO_DEFAULT_BRANCH}",
                        "path": "packages/design-system/**",
                    },
                ],
            },
        ],
        "when": [
            event["main_branch"],
        ],
        "workspace": web_workspace,
    }]

def pipelineDependsOn(pipeline, dependant_pipelines):
    if "depends_on" in pipeline.keys():
        pipeline["depends_on"] = pipeline["depends_on"] + getPipelineNames(dependant_pipelines)
    else:
        pipeline["depends_on"] = getPipelineNames(dependant_pipelines)
    return pipeline

def pipelinesDependsOn(pipelines, dependant_pipelines):
    pipes = []
    for pipeline in pipelines:
        pipes.append(pipelineDependsOn(pipeline, dependant_pipelines))

    return pipes

def getPipelineNames(pipelines = []):
    """getPipelineNames returns names of pipelines as a string array

    Args:
      pipelines: array of drone pipelines

    Returns:
      names of the given pipelines as string array
    """
    names = []
    for pipeline in pipelines:
        names.append(pipeline["name"])
    return names

def skipIfUnchanged(ctx, type):
    if "full-ci" in ctx.build.title.lower() or ctx.build.event == "tag" or ctx.build.event == "cron":
        return []

    base = [
        "^.github/.*",
        "^config/.*",
        "^dev/.*",
        "README.md",
    ]

    unit = [
        "^tests/e2e/.*",
    ]
    e2e = [
        "^__fixtures__/.*",
        "^__mocks__/.*",
        "^packages/.*/tests/.*",
        "^tests/unit/.*",
    ]

    skip = []
    if type == "e2e-tests" or type == "lint":
        skip = base + unit
    elif type == "unit-tests":
        skip = base + e2e
    elif type == "cache":
        skip = base

    return skip

def genericCache(name, action, mounts, cache_path):
    rebuild = False
    restore = False
    if action == "rebuild":
        rebuild = True
        action = "rebuild"
    else:
        restore = True
        action = "restore"

    step = {
        "name": "%s_%s" % (action, name),
        "image": PLUGINS_S3_CACHE,
        "settings": {
            "endpoint": CACHE_S3_SERVER,
            "rebuild": rebuild,
            "restore": restore,
            "mount": mounts,
            "access_key": {
                "from_secret": "cache_s3_access_key",
            },
            "secret_key": {
                "from_secret": "cache_s3_secret_key",
            },
            "filename": "%s.tar" % name,
            "path": cache_path,
            "fallback_path": cache_path,
        },
    }
    return step

def purgeCache(name, flush_path, flush_age):
    return {
        "name": name,
        "skip_clone": True,
        "when": [
            event["cron"],
            event["pull_request"],
            event["main_branch"],
        ],
        "runs_on": ["success", "failure"],
        "steps": {
            "purge": {
                "image": MINIO_MC,
                "environment": minio_mc_environment,
                "commands": [
                    "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
                    "to_delete=$(mc find s3/%s/ --older-than %sd)" % (flush_path, flush_age),
                    'if [ -z "$to_delete" ]; then exit 0; fi',
                    "mc rm $to_delete",
                ],
            },
        },
    }

def genericBuildArtifactCache(ctx, name, action, path):
    if action == "rebuild" or action == "restore":
        cache_path = "%s/%s/%s" % ("cache", repo_slug, ctx.build.commit + "-${CI_PIPELINE_NUMBER}")
        name = "%s_build_artifact_cache" % name
        return genericCache(name, action, [path], cache_path)

    if action == "purge":
        return purgeCache("purge_build_artifact_cache", "cache/opencloud-eu/web", 1)
    return []

def restoreBuildArtifactCache(ctx, name, path):
    return [genericBuildArtifactCache(ctx, name, "restore", path)]

def rebuildBuildArtifactCache(ctx, name, path):
    return [genericBuildArtifactCache(ctx, name, "rebuild", path)]

def purgeBuildArtifactCache(ctx):
    return genericBuildArtifactCache(ctx, "", "purge", [])

def purgeOpencloudBuildCache(ctx):
    return purgeCache("purge-opencloud-build-cache", "dev/opencloud-build", 21)

def purgeBrowserCache(ctx):
    return purgeCache("purge-browser-build-cache", "dev/web", 14)

def purgeTracingCache(ctx):
    return purgeCache("purge-playwright-tracing-cache", "public/web/tracing", 14)

def pipelineSanityChecks(pipelines):
    """pipelineSanityChecks helps the CI developers to find errors before running it

    These sanity checks are only executed on when converting starlark to yaml.
    Error outputs are only visible when the conversion is done with the drone cli.

    Args:
      pipelines: pipelines to be checked, normally you should run this on the return value of main()

    Returns:
      none
    """

    # check if name length of pipeline and steps are exceeded.
    max_name_length = 50
    for pipeline in pipelines:
        pipeline_name = pipeline["name"]
        if len(pipeline_name) > max_name_length:
            print("Error: pipeline name %s is longer than 50 characters" % pipeline_name)

        for step in pipeline["steps"]:
            step_name = step["name"]
            if len(step_name) > max_name_length:
                print("Error: step name %s in pipeline %s is longer than 50 characters" % (step_name, pipeline_name))

    # check for non existing depends_on
    possible_depends = []
    for pipeline in pipelines:
        possible_depends.append(pipeline["name"])

    for pipeline in pipelines:
        if "depends_on" in pipeline.keys():
            for depends in pipeline["depends_on"]:
                if not depends in possible_depends:
                    print("Error: depends_on %s for pipeline %s is not defined" % (depends, pipeline["name"]))

    # check for non declared volumes
    # for pipeline in pipelines:
    #   pipeline_volumes = []
    #   if "workspace" in pipeline.keys():
    #     for volume in pipeline["workspace"]:
    #       pipeline_volumes.append(volume["base"])
    #
    #   for step in pipeline["steps"]:
    #     if "workspace" in step.keys():
    #       for volume in step["workspace"]:
    #         if not volume["base"] in pipeline_volumes:
    #           print("Warning: volume %s for step %s is not defined in pipeline %s" % (volume["base"], step["name"], pipeline["name"]))

    # list used docker images
    print("")
    print("List of used docker images:")

    images = {}

    for pipeline in pipelines:
        for step in pipeline["steps"]:
            image = step["image"]
            if image in images.keys():
                images[image] = images[image] + 1
            else:
                images[image] = 1

    for image in images.keys():
        print(" %sx\t%s" % (images[image], image))

def uploadTracingResult(ctx):
    status = ["failure"]
    if "with-tracing" in ctx.build.title.lower():
        status = ["failure", "success"]

    return [{
        "name": "upload-tracing-result",
        "image": MINIO_MC,
        "environment": minio_mc_environment,
        "commands": [
            "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
            "mc cp -a %s/reports/e2e/playwright/tracing/* s3/$PUBLIC_BUCKET/web/tracing/$CI_REPO_NAME/$CI_PIPELINE_NUMBER/" % dir["web"],
            "cd %s/reports/e2e/playwright/tracing/" % dir["web"],
            'echo "To see the trace, please open the following link in the console"',
            'for f in *.zip; do echo "npx playwright show-trace $MC_HOST/$PUBLIC_BUCKET/web/tracing/$CI_REPO_NAME/$CI_PIPELINE_NUMBER/$f \n"; done',
        ],
        "when": {
            "status": status,
        },
    }]

def waitForService(host, port):
    return [{
        "name": "wait-for-%s" % host,
        "image": OC_CI_WAIT_FOR,
        "commands": [
            "wait-for -host %s -port %s -timeout 300" % (host, port),
        ],
    }]

def tikaService():
    return [{
        "name": "tika",
        "image": APACHE_TIKA,
        "detach": True,
    }] + waitForService("tika", "9998")

def collaboraService():
    return [
        {
            "name": "collabora",
            "image": COLLABORA_CODE,
            "detach": True,
            "environment": {
                "DONT_GEN_SSL_CERT": "set",
                "extra_params": "--o:ssl.enable=true --o:ssl.termination=true --o:home_mode.enable=true --o:net.frame_ancestors=https://opencloud:9200",
            },
            "commands": [
                "coolconfig generate-proof-key",
                "bash /start-collabora-online.sh",
            ],
        },
    ]

def onlyofficeService():
    return [
        {
            "name": "onlyoffice",
            "image": ONLYOFFICE_DOCUMENT_SERVER,
            "detach": True,
            "environment": {
                "WOPI_ENABLED": True,
                "USE_UNAUTHORIZED_STORAGE": True,  # self signed certificates
            },
            "commands": [
                "cp %s/tests/woodpecker/onlyoffice/local.json /etc/onlyoffice/documentserver/local.json" % dir["web"],
                "openssl req -x509 -newkey rsa:4096 -keyout onlyoffice.key -out onlyoffice.crt -sha256 -days 365 -batch -nodes",
                "mkdir -p /var/www/onlyoffice/Data/certs",
                "cp onlyoffice.key /var/www/onlyoffice/Data/certs/",
                "cp onlyoffice.crt /var/www/onlyoffice/Data/certs/",
                "chmod 400 /var/www/onlyoffice/Data/certs/onlyoffice.key",
                "/app/ds/run-document-server.sh",
            ],
        },
    ]

def wopiCollaborationService(name):
    service_name = "wopi-%s" % name
    environment = {
        "MICRO_REGISTRY": "nats-js-kv",
        "MICRO_REGISTRY_ADDRESS": "opencloud:9233",
        "COLLABORATION_GRPC_ADDR": "0.0.0.0:9301",
        "COLLABORATION_HTTP_ADDR": "0.0.0.0:9300",
        "COLLABORATION_APP_INSECURE": True,
        "COLLABORATION_CS3API_DATAGATEWAY_INSECURE": True,
        "OC_JWT_SECRET": "some-opencloud-jwt-secret",
        "COLLABORATION_WOPI_SECRET": "some-wopi-secret",
    }

    if name == "collabora":
        environment["COLLABORATION_APP_NAME"] = "Collabora"
        environment["COLLABORATION_APP_PRODUCT"] = "Collabora"
        environment["COLLABORATION_APP_ADDR"] = "https://collabora:9980"
        environment["COLLABORATION_APP_ICON"] = "https://collabora:9980/favicon.ico"
    elif name == "onlyoffice":
        environment["COLLABORATION_APP_NAME"] = "OnlyOffice"
        environment["COLLABORATION_APP_PRODUCT"] = "OnlyOffice"
        environment["COLLABORATION_APP_ADDR"] = "https://onlyoffice"
        environment["COLLABORATION_APP_ICON"] = "https://onlyoffice/web-apps/apps/documenteditor/main/resources/img/favicon.ico"

    environment["COLLABORATION_WOPI_SRC"] = "http://%s:9300" % service_name

    return [
        {
            "name": service_name,
            "image": OC_CI_GOLANG,
            "detach": True,
            "environment": environment,
            "commands": [
                "./opencloud collaboration server",
            ],
        },
    ]

def postgresService():
    return [
        {
            "name": "postgres",
            "image": POSTGRES_ALPINE,
            "environment": {
                "POSTGRES_DB": "keycloak",
                "POSTGRES_USER": "keycloak",
                "POSTGRES_PASSWORD": "keycloak",
            },
        },
    ]

def ldapService():
    return [
        {
            "name": "ldap-server",
            "image": OPENLDAP,
            "detach": True,
            "environment": {
                "BITNAMI_DEBUG": "true",
                "LDAP_TLS_VERIFY_CLIENT": "never",
                "LDAP_ENABLE_TLS": "yes",
                "LDAP_TLS_CA_FILE": "/opt/bitnami/openldap/share/openldap.crt",
                "LDAP_TLS_CERT_FILE": "/opt/bitnami/openldap/share/openldap.crt",
                "LDAP_TLS_KEY_FILE": "/opt/bitnami/openldap/share/openldap.key",
                "LDAP_ROOT": "dc=opencloud,dc=eu",
                "LDAP_ADMIN_PASSWORD": "admin",
            },
            "commands": [
                "mkdir -p /opt/bitnami/openldap/share",
                "mkdir -p /tmp/custom-scripts",
                "mkdir -p /tmp/ldif-files",
                "cp tests/woodpecker/ldap/*.ldif /tmp/ldif-files/",
                "cp tests/woodpecker/ldap/docker-entrypoint-override.sh /tmp/custom-scripts/",
                "chmod +x /tmp/custom-scripts/docker-entrypoint-override.sh",
                "/tmp/custom-scripts/docker-entrypoint-override.sh /opt/bitnami/scripts/openldap/run.sh",
            ],
            "backend_options": {
                "docker": {
                    "user": "0:0",
                },
            },
        },
    ] + waitForService("ldap-server", "1636") + waitForService("ldap-server", "1389")

def keycloakService():
    return [{
               "name": "generate-keycloak-certs",
               "image": OC_CI_NODEJS,
               "commands": [
                   "mkdir -p keycloak-certs",
                   "openssl req -x509 -newkey rsa:2048 -keyout keycloak-certs/keycloakkey.pem -out keycloak-certs/keycloakcrt.pem -nodes -days 365 -subj '/CN=keycloak'",
                   "chmod -R 755 keycloak-certs",
               ],
           }] + waitForService("postgres", "5432") + \
           [{
               "name": "keycloak",
               "image": KEYCLOAK,
               "detach": True,
               "environment": {
                   "OC_DOMAIN": "opencloud:9200",
                   "KC_HOSTNAME": "keycloak",
                   "KC_PORT": 8443,
                   "KC_DB": "postgres",
                   "KC_DB_URL": "jdbc:postgresql://postgres:5432/keycloak",
                   "KC_DB_USERNAME": "keycloak",
                   "KC_DB_PASSWORD": "keycloak",
                   "KC_FEATURES": "impersonation",
                   "KEYCLOAK_ADMIN": "admin",
                   "KEYCLOAK_ADMIN_PASSWORD": "admin",
                   "KC_HTTPS_CERTIFICATE_FILE": "./keycloak-certs/keycloakcrt.pem",
                   "KC_HTTPS_CERTIFICATE_KEY_FILE": "./keycloak-certs/keycloakkey.pem",
                   "LDAP_SERVER_URL": "ldaps://ldap-server:1636",
                   "LDAP_BIND_DN": "cn=admin,dc=opencloud,dc=eu",
                   "LDAP_BIND_PASSWORD": "admin",
                   "LDAP_USERS_DN": "ou=users,dc=opencloud,dc=eu",
               },
               "commands": [
                   "mkdir -p /opt/keycloak/data/import",
                   "cp tests/woodpecker/opencloud_keycloak/opencloud-ci-realm.dist.json /opt/keycloak/data/import/opencloud-realm.json",
                   "/opt/keycloak/bin/kc.sh start-dev --proxy-headers xforwarded --spi-connections-http-client-default-disable-trust-manager=true --import-realm --health-enabled=true",
               ],
           }] + waitForService("keycloak", "8443")

def e2eTestsOnKeycloak(ctx):
    steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + \
            installPnpm() + \
            restoreBrowsersCache("chromium") + \
            ldapService() + \
            keycloakService() + \
            restoreBuildArtifactCache(ctx, "web-dist", "dist") + \
            restoreOpenCloudCache()

    # configs to setup opencloud with keycloak and ldap
    environment = {
        "PROXY_AUTOPROVISION_ACCOUNTS": False,
        "PROXY_ROLE_ASSIGNMENT_DRIVER": "oidc",
        "OC_OIDC_ISSUER": "https://keycloak:8443/realms/openCloud",
        "PROXY_OIDC_REWRITE_WELLKNOWN": True,
        "WEB_OIDC_CLIENT_ID": "web",
        "PROXY_USER_OIDC_CLAIM": "uuid",
        "PROXY_USER_CS3_CLAIM": "userid",
        "OC_ADMIN_USER_ID": "",
        "OC_EXCLUDE_RUN_SERVICES": "idp,idm",
        "GRAPH_ASSIGN_DEFAULT_USER_ROLE": False,
        "SETTINGS_SETUP_DEFAULT_ASSIGNMENTS": False,
        "GRAPH_USERNAME_MATCH": "none",
        "KEYCLOAK_DOMAIN": "keycloak:8443",
        "OC_LOG_LEVEL": "debug",
        "OC_LDAP_URI": "ldaps://ldap-server:1636",
        "OC_LDAP_INSECURE": True,
        "OC_LDAP_BIND_DN": "cn=admin,dc=opencloud,dc=eu",
        "OC_LDAP_BIND_PASSWORD": "admin",

        # LDAP configs
        "OC_LDAP_GROUP_BASE_DN": "ou=groups,dc=opencloud,dc=eu",
        "OC_LDAP_GROUP_SCHEMA_ID": "entryUUID",
        "GRAPH_LDAP_GROUP_CREATE_BASE_DN": "ou=custom,ou=groups,dc=opencloud,dc=eu",
        "GRAPH_LDAP_REFINT_ENABLED": True,
        "OC_LDAP_USER_BASE_DN": "ou=users,dc=opencloud,dc=eu",
        "OC_LDAP_USER_FILTER": "(objectclass=inetOrgPerson)",
        "OC_LDAP_USER_SCHEMA_ID": "entryUUID",
        "OC_LDAP_DISABLE_USER_MECHANISM": "none",
        "GRAPH_LDAP_SERVER_UUID": "true",
        "FRONTEND_READONLY_USER_ATTRIBUTES": "user.onPremisesSamAccountName,user.displayName,user.mail,user.passwordProfile,user.accountEnabled,user.appRoleAssignments",
        "OC_LDAP_SERVER_WRITE_ENABLED": False,
    }

    steps += openCloudService(environment) + \
             [
                 {
                     "name": "e2e-tests",
                     "image": OC_CI_NODEJS,
                     "environment": {
                         "OC_BASE_URL": "opencloud:9200",
                         "HEADLESS": True,
                         "RETRY": "1",
                         "REPORT_TRACING": "with-tracing" in ctx.build.title.lower(),
                         "KEYCLOAK": True,
                         "KEYCLOAK_HOST": "keycloak:8443",
                         "PLAYWRIGHT_BROWSERS_PATH": ".playwright",
                         "BROWSER": "chromium",
                         "TERM": "xterm-256color",
                         "FORCE_COLOR": "1",
                     },
                     "commands": [
                         "cd tests/e2e",
                         "bash run-e2e.sh cucumber/features/keycloak",
                     ],
                 },
             ] + \
             uploadTracingResult(ctx)

    return [{
        "name": "e2e-test-on-keycloak",
        "workspace": web_workspace,
        "steps": steps,
        "services": postgresService(),
        "when": [
            event["base"],
            event["cron"],
            event["pull_request"],
            event["tag"],
        ],
    }]

def getOpenCloudlatestCommitId(ctx):
    web_repo_path = "https://raw.githubusercontent.com/opencloud-eu/web/%s" % ctx.build.commit
    return [
        {
            "name": "get-opencloud-latest-commit-id",
            "image": OC_CI_GOLANG,
            "commands": [
                "curl -o .woodpecker.env %s/.woodpecker.env" % web_repo_path,
                "curl -o script.sh %s/tests/woodpecker/script.sh" % web_repo_path,
                ". ./.woodpecker.env",
                "bash script.sh get_latest_opencloud_commit_id",
            ],
        },
    ]

def cacheBrowsers():
    return [
        {
            "name": "upload-browsers-cache",
            "image": MINIO_MC,
            "environment": minio_mc_environment,
            "commands": [
                ". ./.woodpecker.env",
                "if $BROWSER_CACHE_FOUND; then exit 0; fi",
                "playwright_version=$(bash tests/woodpecker/script.sh get_playwright_version)",
                "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
                "mc cp -r -a %s s3/$CACHE_BUCKET/web/browsers-cache/$playwright_version/" % dir["playwrightBrowsersArchive"],
                "mc ls --recursive s3/$CACHE_BUCKET/web",
            ],
        },
    ]

def checkBrowsersCache():
    return [{
        "name": "check-browsers-cache",
        "image": MINIO_MC,
        "environment": minio_mc_environment,
        "commands": [
            "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
            "mc ls --recursive s3/$CACHE_BUCKET/web",
            "bash tests/woodpecker/script.sh check_browsers_cache",
        ],
    }]

def restoreBrowsersCache(browser):
    return [
        {
            "name": "restore-browsers-cache",
            "image": MINIO_MC,
            "environment": minio_mc_environment,
            "commands": [
                "playwright_version=$(bash tests/woodpecker/script.sh get_playwright_version)",
                "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
                "mc cp -r -a s3/$CACHE_BUCKET/web/browsers-cache/$playwright_version/playwright-browsers.tar.gz %s" % dir["web"],
            ],
        },
        {
            "name": "unzip-browsers-cache",
            "image": OC_CI_GOLANG,
            "commands": [
                "tar -xvf %s -C ." % dir["playwrightBrowsersArchive"],
            ],
        },
    ]
