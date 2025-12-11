repo_slug = "opencloud-eu/web"
docker_repo_slug = "opencloudeu/web"

ALPINE_GIT = "alpine/git:latest"
APACHE_TIKA = "apache/tika:2.8.0.0"
COLLABORA_CODE = "collabora/code:24.04.13.2.1"
CS3ORG_WOPI_SERVER = "cs3org/wopiserver:v10.3.0"
KEYCLOAK = "quay.io/keycloak/keycloak:25.0.0"
MINIO_MC = "minio/mc:RELEASE.2021-10-07T04-19-58Z"
OC_CI_ALPINE = "owncloudci/alpine:latest"
OC_CI_BAZEL_BUILDIFIER = "owncloudci/bazel-buildifier"
OC_CI_DRONE_ANSIBLE = "owncloudci/drone-ansible:latest"
OC_CI_DRONE_SKIP_PIPELINE = "owncloudci/drone-skip-pipeline"
OC_CI_GOLANG = "docker.io/golang:1.24"
OC_CI_HUGO = "owncloudci/hugo:0.115.2"
OC_CI_NODEJS = "owncloudci/nodejs:20"
OC_CI_WAIT_FOR = "owncloudci/wait-for:latest"
OC_UBUNTU = "owncloud/ubuntu:20.04"
ONLYOFFICE_DOCUMENT_SERVER = "onlyoffice/documentserver:8.1.3"
PLUGINS_GH_PAGES = "plugins/gh-pages:1"
PLUGINS_GIT_ACTION = "plugins/git-action:1"
PLUGINS_GITHUB_RELEASE = "plugins/github-release:1"
PLUGINS_S3 = "plugins/s3:1.5"
PLUGINS_S3_CACHE = "plugins/s3-cache:1"
PLUGINS_SLACK = "plugins/slack:1"
POSTGRES_ALPINE = "postgres:alpine3.18"
SONARSOURCE_SONAR_SCANNER_CLI = "sonarsource/sonar-scanner-cli:5.0"
TOOLHIPPIE_CALENS = "toolhippie/calens:latest"
READY_RELEASE_GO = "woodpeckerci/plugin-ready-release-go:latest"

WEB_PUBLISH_NPM_PACKAGES = ["babel-preset", "design-system", "eslint-config", "extension-sdk", "prettier-config", "tsconfig", "web-client", "web-pkg", "web-test-helpers"]
WEB_PUBLISH_NPM_ORGANIZATION = "@opencloud-eu"
CACHE_S3_SERVER = "https://s3.ci.opencloud.eu"

dir = {
    "base": "/woodpecker/src/github.com/opencloud-eu/web",
    "web": "/woodpecker/src/github.com/opencloud-eu/web/web",
    "opencloud": "/woodpecker/src/github.com/opencloud-eu/opencloud",
    "commentsFile": "/woodpecker/src/github.com/opencloud/web/comments.file",
    "app": "/srv/app",
    "openCloudConfig": "/woodpecker/src/github.com/opencloud-eu/web/web/tests/woodpecker/config-opencloud.json",
    "openCloudIdentifierRegistrationConfig": "/woodpecker/src/github.com/opencloud/web/tests/woodpecker/identifier-registration.yml",
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
        "app-provider": {
            "skip": False,
            "suites": [
                "app-provider",
                "app-provider-onlyOffice",
            ],
            "extraServerEnvironment": {
                "GATEWAY_GRPC_ADDR": "0.0.0.0:9142",
                "MICRO_REGISTRY": "nats-js-kv",
                "MICRO_REGISTRY_ADDRESS": "0.0.0.0:9233",
                "NATS_NATS_HOST": "0.0.0.0",
                "NATS_NATS_PORT": 9233,
                "COLLABORA_DOMAIN": "collabora:9980",
                "ONLYOFFICE_DOMAIN": "onlyoffice:443",
                "FRONTEND_APP_HANDLER_SECURE_VIEW_APP_ADDR": "eu.opencloud.api.collaboration.Collabora",
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

go_step_volumes = [{
    "name": "server",
    "path": dir["app"],
}, {
    "name": "gopath",
    "path": "/go",
}]

web_workspace = {
    "base": dir["base"],
    "path": config["app"],
}

def main(ctx):
    if ctx.build.event == "cron" and ctx.build.sender == "translation-sync":
        return translation_sync(ctx)
    is_release_pr = (ctx.build.event == "pull_request" and ctx.build.event == "openclouders" and "🎉 release" in ctx.build.title.lower())
    if is_release_pr:
        return licenseCheck()

    release = readyReleaseGo()

    before = beforePipelines(ctx)

    stages = pipelinesDependsOn(stagePipelines(ctx), before)

    if (stages == False):
        print("Errors detected. Review messages above.")
        return []

    after = pipelinesDependsOn(afterPipelines(ctx), pnpmCache(ctx))

    pipelines = release + before + stages + after

    # deploys = example_deploys(ctx)
    # if ctx.build.event != "cron":
    #     # run example deploys on cron even if some prior pipelines fail
    #     deploys = pipelinesDependsOn(deploys, pipelines)
    #
    # pipelines = pipelines + deploys + pipelinesDependsOn(
    #     [
    #         purgeBuildArtifactCache(ctx),
    #     ],
    #     pipelines,
    # )
    #
    # pipelineSanityChecks(ctx, pipelines)
    return pipelines

def beforePipelines(ctx):
    return checkStarlark() + \
           licenseCheck(ctx) + \
           pnpmCache(ctx) + \
           cacheOpenCloudPipeline(ctx) + \
           pipelinesDependsOn(buildCacheWeb(ctx), pnpmCache(ctx)) + \
           pipelinesDependsOn(pnpmlint(ctx, "lint"), pnpmCache(ctx)) + \
           pipelinesDependsOn(pnpmlint(ctx, "format"), pnpmCache(ctx))
    # documentation(ctx) + \ # ToDo used to be before pnpmCache

def stagePipelines(ctx):
    unit_test_pipelines = unitTests(ctx)

    # run only unit tests when publishing a standalone package
    if (determineReleasePackage(ctx) != None):
        return unit_test_pipelines

    e2e_pipelines = e2eTests(ctx)

    # keycloak_pipelines = e2eTestsOnKeycloak(ctx)
    return unit_test_pipelines + e2e_pipelines

def afterPipelines(ctx):
    return publishRelease(ctx)
    # pipelinesDependsOn(notify(), build(ctx))  # ToDo build should depend on notify, but that does not work yet

def pnpmCache(ctx):
    return [{
        "name": "cache-pnpm",
        "workspace": {
            "base": dir["base"],
            "path": config["app"],
        },
        "steps": installPnpm() +
                 rebuildBuildArtifactCache(ctx, "pnpm", ".pnpm-store") +
                 checkBrowsersCache() +
                 installBrowsers() +
                 cacheBrowsers(),
        "when": [
            {
                "event": ["push", "manual"],
                "branch": ["main", "stable-*"],
            },
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "cache"),
                },
            },
            {
                "event": "tag",
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
        "workspace": {
            "base": dir["base"],
            "path": config["app"],
        },
        "steps": steps,
        "when": [
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
            {
                "event": "tag",
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
        "workspace": {
            "base": dir["base"],
            "path": config["app"],
        },
        "steps": steps,
        "when": [
            {
                "event": "tag",
            },
        ],
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
                        "release_branch": "stable-2.1",
                        "forge_token": {
                            "from_secret": "github_token",
                        },
                    },
                },
            ],
            "when": [
                {
                    "event": ["push"],
                    "branch": "stable-2.1",
                },
            ],
        },
    ]

def buildCacheWeb(ctx):
    return [{
        "name": "cache-web",
        "workspace": {
            "base": dir["base"],
            "path": config["app"],
        },
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
            {
                "event": ["push", "manual"],
                "branch": ["main", "stable-*"],
            },
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "cache"),
                },
            },
            {
                "event": "tag",
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
        "workspace": {
            "base": dir["base"],
            "path": config["app"],
        },
        "steps": restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") +
                 installPnpm() +
                 [
                     {
                         "name": "unit-tests",
                         "image": OC_CI_NODEJS,
                         "commands": [
                             "pnpm build:tokens",
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
            {
                "event": ["push", "manual"],
                "branch": ["main", "stable-*"],
            },
            {
                "event": "pull_request",
                "path": {
                    "exclude": skipIfUnchanged(ctx, "unit-tests"),
                },
            },
            {
                "event": "tag",
            },
        ],
    }]

def e2eTests(ctx):
    e2e_workspace = {
        "base": dir["base"],
        "path": config["app"],
    }

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
    }

    e2e_trigger = [
        {
            "event": ["push", "manual"],
            "branch": config["branches"],
        },
        {
            "event": "pull_request",
        },
        {
            "event": "tag",
        },
    ]

    pipelines = []
    params = {}
    matrices = config["e2e"]

    for suite, matrix in matrices.items():
        for item in default:
            params[item] = matrix[item] if item in matrix else default[item]

        if "app-provider" in suite and not "full-ci" in ctx.build.title.lower() and ctx.build.event != "cron":
            continue

        if "ocm" in suite and not "full-ci" in ctx.build.title.lower() and ctx.build.event != "cron":
            continue

        if params["skip"]:
            continue

        if ("with-tracing" in ctx.build.title.lower()):
            params["reportTracing"] = True

        environment = {
            "HEADLESS": True,
            "RETRY": "1",
            "REPORT_TRACING": params["reportTracing"],
            "OC_BASE_URL": "opencloud:9200",
            "OC_SHOW_USER_EMAIL_IN_RESULTS": True,
            "FAIL_ON_UNCAUGHT_CONSOLE_ERR": True,
            "PLAYWRIGHT_BROWSERS_PATH": ".playwright",
            "BROWSER": "chromium",
        }

        steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + \
                installPnpm() + \
                restoreBrowsersCache() + \
                restoreBuildArtifactCache(ctx, "web-dist", "dist")

        if ctx.build.event == "cron":
            steps += restoreBuildArtifactCache(ctx, "opencloud", "opencloud")
        else:
            steps += restoreOpenCloudCache()

        if "app-provider" in suite:
            environment["FAIL_ON_UNCAUGHT_CONSOLE_ERR"] = False

            # app-provider specific steps
            steps += collaboraService() + \
                     onlyofficeService() + \
                     waitForServices("online-offices", ["collabora:9980", "onlyoffice:443"]) + \
                     openCloudService(params["extraServerEnvironment"]) + \
                     wopiCollaborationService("collabora") + \
                     wopiCollaborationService("onlyoffice") + \
                     waitForServices("wopi", ["wopi-collabora:9300", "wopi-onlyoffice:9300"])
        elif "ocm" in suite:
            steps += openCloudService(params["extraServerEnvironment"]) + \
                     (openCloudService(params["extraServerEnvironment"], "federation") if params["federationServer"] else [])
        else:
            # OpenCloud specific steps
            steps += (tikaService() if params["tikaNeeded"] else []) + \
                     openCloudService(params["extraServerEnvironment"])

        command = "bash run-e2e.sh "
        if "suites" in matrix:
            command += "--suites %s" % ",".join(params["suites"])
        elif "features" in matrix:
            command += "%s" % " ".join(params["features"])
        else:
            print("Error: No suites or features defined for e2e test suite '%s'" % suite)
            return []

        steps += [{
                     "name": "e2e-tests",
                     "image": OC_CI_NODEJS,
                     "environment": environment,
                     "commands": [
                         "cd tests/e2e",
                         command,
                     ],
                 }] + \
                 uploadTracingResult(ctx)

        pipelines.append({
            "name": "e2e-tests-%s" % suite,
            "workspace": e2e_workspace,
            "steps": steps,
            "depends_on": ["cache-opencloud"],
            "when": e2e_trigger,
        })
    return pipelines

def notify():
    pipelines = []

    result = {
        "name": "chat-notifications",
        "skip_clone": True,
        "steps": [
            {
                "name": "notify-rocketchat",
                "image": PLUGINS_SLACK,
                "settings": {
                    "webhook": {
                        "from_secret": config["rocketchat"]["from_secret"],
                    },
                    "channel": config["rocketchat"]["channel"],
                },
            },
        ],
        "when": [
            {
                "event": ["push", "manual"],
                "branch": config["branches"],
            },
            {
                "event": "pull_request",
            },
            {
                "event": "tag",
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
            "pnpm exec playwright install chromium --with-deps",
            "tar -czvf %s .playwright" % dir["playwrightBrowsersArchive"],
        ],
    }]

def lint():
    return [{
        "name": "lint",
        "image": OC_CI_NODEJS,
        "commands": [
            "pnpm lint",
        ],
    }]

def formatCheck():
    return [
        {
            "name": "format-check",
            "image": OC_CI_NODEJS,
            "commands": [
                "pnpm format:check",
            ],
        },
        {
            "name": "show-diff",
            "image": OC_CI_NODEJS,
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
                "when": [
                    {
                        "event": "tag",
                    },
                ],
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
                    "pnpm build:tokens",
                    "bash -c '[ \"%s\" == \"design-system\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    "bash -c '[ \"%s\" == \"web-client\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    "bash -c '[ \"%s\" == \"web-pkg\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    "bash -c '[ \"%s\" == \"web-test-helpers\" ] && pnpm --filter \"%s\" vite build || true'" % (package, full_package_name),
                    # until https://github.com/pnpm/pnpm/issues/5775 is resolved, we print pnpm whoami because that fails when the npm_token is invalid
                    "env \"npm_config_//registry.npmjs.org/:_authToken=$${NPM_TOKEN}\" pnpm whoami",
                    "env \"npm_config_//registry.npmjs.org/:_authToken=$${NPM_TOKEN}\" pnpm publish --no-git-checks --filter %s --access public --tag latest" % full_package_name,
                ],
                "when": [
                    {
                        "event": "tag",
                    },
                ],
            },
        )

    return steps

def documentation(ctx):
    return [
        {
            "name": "documentation",
            "steps": [
                {
                    "name": "prepare",
                    "image": OC_CI_ALPINE,
                    "commands": [
                        "make docs-copy",
                    ],
                },
                {
                    "name": "test",
                    "image": OC_CI_HUGO,
                    "commands": [
                        "cd hugo",
                        "hugo",
                    ],
                },
                {
                    "name": "list",
                    "image": OC_CI_ALPINE,
                    "commands": [
                        "tree hugo/public",
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
                        "target_branch": "docs",
                        "delete": True,
                    },
                    "when": {
                        "ref": {
                            "exclude": [
                                "refs/pull/**",
                            ],
                        },
                    },
                },
            ],
            "when": [
                {
                    "event": ["push", "manual"],
                    "branch": ["main"],
                },
                {
                    "event": "pull_request",
                },
            ],
        },
    ]

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
    }

    if deploy_type == "federation":
        environment["OC_URL"] = "https://federation-opencloud:10200"
        environment["PROXY_HTTP_ADDR"] = "federation-opencloud:10200"
        environment["WEB_UI_CONFIG_FILE"] = dir["federatedOpenCloudConfig"]
        container_name = "federation-opencloud"

        # ToDo - this seems to be unused, check whether its needed and remove if not?
        opencloud_domain = "federation-opencloud:10200"
    else:
        container_name = "opencloud"

        # ToDo - this seems to be unused, check whether its needed and remove if not?
        opencloud_domain = "opencloud:9200"
        environment["OC_URL"] = "https://opencloud:9200"
        environment["WEB_UI_CONFIG_FILE"] = dir["openCloudConfig"]

    for config in extra_env_config:
        environment[config] = extra_env_config[config]

    wait_for_service = waitForServices("opencloud", ["opencloud:9200"])
    if "OC_EXCLUDE_RUN_SERVICES" not in environment or "idp" not in environment["OC_EXCLUDE_RUN_SERVICES"]:
        wait_for_service = [
            {
                "name": "wait-for-%s" % container_name,
                "image": OC_CI_ALPINE,
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
    steps = []

    if ctx.build.event == "cron":
        steps = getOpenCloudlatestCommitId(ctx) + \
                buildOpenCloud() + \
                rebuildBuildArtifactCache(ctx, "opencloud", "opencloud")
    else:
        # Todo what is ENABLE_VIPS in buildOpenCloud for? Is it needed?
        steps = checkForExistingOpenCloudCache(ctx) + \
                buildOpenCloud(False) + \
                cacheOpenCloud()
    return [{
        "name": "cache-opencloud",
        "skip_clone": True,
        "steps": steps,
        "when": [
            {
                "event": ["push", "manual"],
                "branch": ["main", "stable-*"],
            },
            {
                "event": "pull_request",
            },
            {
                "event": "tag",
            },
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

def buildOpenCloud(enableVips = False):
    opencloud_repo_url = "https://github.com/opencloud-eu/opencloud.git"
    if enableVips:
        # Todo what is ENABLE_VIPS for? Is it needed?
        build_command = "for i in $(seq 3); do make -C opencloud build ENABLE_VIPS=1 && break || sleep 1; done"
    else:
        build_command = "for i in $(seq 3); do make -C opencloud build && break || sleep 1; done"
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
                "retry -t 3 'make node-generate-prod'",  # ToDo Get rid of 'retry' dependency as in https://github.com/opencloud-eu/opencloud/commit/c897ec321fcd6af40c3dcfc56b2b6cd195a6054f
            ],
        },
        {
            "name": "build-opencloud",
            "image": OC_CI_GOLANG,
            "commands": [
                ". ./.woodpecker.env",
                "if $OPENCLOUD_CACHE_FOUND; then exit 0; fi",
                "cd repo_opencloud",
                build_command,
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

def example_deploys(ctx):
    on_merge_deploy = [
        "opencloud_web/master.yml",
    ]
    nightly_deploy = []

    # if on master branch:
    configs = on_merge_deploy
    rebuild = False

    if ctx.build.event == "tag":
        configs = nightly_deploy
        rebuild = False

    if ctx.build.event == "cron":
        configs = on_merge_deploy + nightly_deploy
        rebuild = True

    deploys = []
    for config in configs:
        deploys.append(deploy(ctx, config, rebuild))

    return deploys

def deploy(ctx, config, rebuild):
    return {
        "name": "deploy_%s" % (config),
        "steps": [
            {
                "name": "clone continuous deployment playbook",
                "image": ALPINE_GIT,
                "commands": [
                    "cd deployments/continuous-deployment-config",
                    "git clone https://github.com/opencloud-eu/continuous-deployment.git",
                ],
            },
            {
                "name": "deploy",
                "image": OC_CI_DRONE_ANSIBLE,
                "failure": "ignore",
                "environment": {
                    "CONTINUOUS_DEPLOY_SERVERS_CONFIG": "../%s" % (config),
                    "REBUILD": "%s" % (rebuild),
                    "HCLOUD_API_TOKEN": {
                        "from_secret": "hcloud_api_token",
                    },
                    "CLOUDFLARE_API_TOKEN": {
                        "from_secret": "cloudflare_api_token",
                    },
                },
                "settings": {
                    "playbook": "deployments/continuous-deployment-config/continuous-deployment/playbook-all.yml",
                    "galaxy": "deployments/continuous-deployment-config/continuous-deployment/requirements.yml",
                    "requirements": "deployments/continuous-deployment-config/continuous-deployment/py-requirements.txt",
                    "inventory": "localhost",
                    "private_key": {
                        "from_secret": "ssh_private_key",
                    },
                },
            },
        ],
        "when": [
            {
                "event": ["push"],
                "branch": ["main"],
            },
        ],
    }

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
            {
                "event": ["push", "manual"],
                "branch": ["main", "stable-*"],
            },
            {
                "event": "pull_request",
            },
            {
                "event": "tag",
            },
        ],
    }]

# ToDo use pnpm cache
def licenseCheck(ctx):
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
            {
                "event": ["push", "manual"],
                "branch": "main",
            },
            {
                "event": "pull_request",
            },
            {
                "event": "tag",
            },
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
    ## FIXME: the 'exclude' feature (https://woodpecker-ci.org/docs/usage/workflow-syntax#path) does not seem to provide
    # what we need. It seems to skip the build as soon as one of the changed files matches an exclude pattern, we only
    # want to skip of ALL changed files match. So skip this condition for now:
    return []

    if "full-ci" in ctx.build.title.lower() or ctx.build.event == "tag" or ctx.build.event == "cron":
        return []

    base = [
        "^.github/.*",
        "^changelog/.*",
        "^config/.*",
        "^deployments/.*",
        "^dev/.*",
        "^docs/.*",
        "^packages/web-app-skeleton/.*",
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
    else:
        return []

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
            "filename": "%s.tar" % (name),
            "path": cache_path,
            "fallback_path": cache_path,
        },
    }
    return step

def genericCachePurge(flush_path):
    return {
        "name": "purge_build_artifact_cache",
        "skip_clone": True,
        "steps": [
            {
                "name": "purge-cache",
                "image": PLUGINS_S3_CACHE,
                "settings": {
                    "access_key": {
                        "from_secret": "cache_s3_access_key",
                    },
                    "secret_key": {
                        "from_secret": "cache_s3_secret_key",
                    },
                    "endpoint": CACHE_S3_SERVER,
                    "flush": True,
                    "flush_age": 1,
                    "flush_path": flush_path,
                },
            },
        ],
        "when": [
            {
                "event": ["push", "manual"],
                "branch": "main",
            },
            {
                "event": "pull_request",
            },
        ],
        "runs_on": ["success", "failure"],
    }

def genericBuildArtifactCache(ctx, name, action, path):
    if action == "rebuild" or action == "restore":
        cache_path = "%s/%s/%s" % ("cache", repo_slug, ctx.build.commit + "-${CI_PIPELINE_NUMBER}")
        name = "%s_build_artifact_cache" % (name)
        return genericCache(name, action, [path], cache_path)

    if action == "purge":
        flush_path = "%s/%s" % ("cache", repo_slug)
        return genericCachePurge(flush_path)
    return []

def restoreBuildArtifactCache(ctx, name, path):
    return [genericBuildArtifactCache(ctx, name, "restore", path)]

def rebuildBuildArtifactCache(ctx, name, path):
    return [genericBuildArtifactCache(ctx, name, "rebuild", path)]

def purgeBuildArtifactCache(ctx):
    return genericBuildArtifactCache(ctx, "", "purge", [])

def pipelineSanityChecks(ctx, pipelines):
    """pipelineSanityChecks helps the CI developers to find errors before running it

    These sanity checks are only executed on when converting starlark to yaml.
    Error outputs are only visible when the conversion is done with the drone cli.

    Args:
      ctx: drone passes a context with information which the pipeline can be adapted to
      pipelines: pipelines to be checked, normally you should run this on the return value of main()

    Returns:
      none
    """

    # check if name length of pipeline and steps are exceeded.
    max_name_length = 50
    for pipeline in pipelines:
        pipeline_name = pipeline["name"]
        if len(pipeline_name) > max_name_length:
            print("Error: pipeline name %s is longer than 50 characters" % (pipeline_name))

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
    if ("with-tracing" in ctx.build.title.lower()):
        status = ["failure", "success"]

    return [{
        "name": "upload-tracing-result",
        "image": MINIO_MC,
        "environment": minio_mc_environment,
        "commands": [
            "mc alias set s3 $MC_HOST $AWS_ACCESS_KEY_ID $AWS_SECRET_ACCESS_KEY",
            "mc cp -a %s/reports/e2e/playwright/tracing/* s3/$PUBLIC_BUCKET/web/tracing/$CI_PIPELINE_NUMBER/" % dir["web"],
            "cd %s/reports/e2e/playwright/tracing/" % dir["web"],
            'echo "To see the trace, please open the following link in the console"',
            'for f in *.zip; do echo "npx playwright show-trace $MC_HOST/$PUBLIC_BUCKET/web/tracing/$CI_PIPELINE_NUMBER/$f \n"; done',
        ],
        "when": {
            "status": status,
        },
    }]

def waitForServices(name, services = []):
    services = ",".join(services)
    return [{
        "name": "wait-for-%s" % name,
        "image": OC_CI_WAIT_FOR,
        "commands": [
            "wait-for -it %s -t 300" % services,
        ],
    }]

def tikaService():
    return [{
        "name": "tika",
        "image": APACHE_TIKA,
        "detach": True,
    }] + waitForServices("tika", ["tika:9998"])

def collaboraService():
    return [
        {
            "name": "collabora",
            "image": COLLABORA_CODE,
            "detach": True,
            "environment": {
                "DONT_GEN_SSL_CERT": "set",
                "extra_params": "--o:ssl.enable=true --o:ssl.termination=true --o:welcome.enable=false --o:net.frame_ancestors=https://opencloud:9200",
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

def buildDesignSystemDocs():
    return [{
        "name": "build-design-system-docs",
        "image": OC_CI_NODEJS,
        "commands": [
            "pnpm --filter @opencloud-eu/design-system build:docs",
        ],
    }]

def buildAndTestDesignSystem(ctx):
    design_system_trigger = [
        {
            "event": ["push", "manual"],
            "branch": ["main", "stable-*"],
        },
        {
            "event": "pull_request",
        },
        {
            "event": "tag",
        },
    ]

    steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + \
            installPnpm() + \
            buildDesignSystemDocs()

    return [{
        "name": "build-design-system-docs",
        "workspace": {
            "base": dir["base"],
            "path": config["app"],
        },
        "steps": steps,
        "when": design_system_trigger,
    }]

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

def keycloakService():
    return [{
               "name": "generate-keycloak-certs",
               "image": OC_CI_NODEJS,
               "commands": [
                   "mkdir -p keycloak-certs",
                   "openssl req -x509 -newkey rsa:2048 -keyout keycloak-certs/keycloakkey.pem -out keycloak-certs/keycloakcrt.pem -nodes -days 365 -subj '/CN=keycloak'",
                   "chmod -R 777 keycloak-certs",
               ],
               # "volumes": [
               #     {
               #         "name": "certs",
               #         "path": "/keycloak-certs",
               #     },
               # ],
           }] + waitForServices("postgres", ["postgres:5432"]) + \
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
               },
               "commands": [
                   "mkdir -p /opt/keycloak/data/import",
                   "cp tests/woodpecker/opencloud_keycloak/opencloud-ci-realm.dist.json /opt/keycloak/data/import/opencloud-realm.json",
                   "/opt/keycloak/bin/kc.sh start-dev --proxy-headers xforwarded --spi-connections-http-client-default-disable-trust-manager=true --import-realm --health-enabled=true",
               ],
               # "volumes": [
               #     {
               #         "name": "certs",
               #         "path": "/keycloak-certs",
               #     },
               # ],
           }] + waitForServices("keycloack", ["keycloak:8443"])

def e2eTestsOnKeycloak(ctx):
    e2e_Keycloak_tests = [
        "journeys",
        "admin-settings/users.feature:20",
        "admin-settings/users.feature:43",
        "admin-settings/users.feature:106",
        "admin-settings/users.feature:131",
        "admin-settings/users.feature:185",
        "admin-settings/spaces.feature",
        "admin-settings/groups.feature",
        "admin-settings/general.feature",
        "keycloak",
    ]

    e2e_volumes = [
        {
            "name": "uploads",
            "temp": {},
        },
        {
            "name": "configs",
            "temp": {},
        },
        {
            "name": "gopath",
            "temp": {},
        },
        {
            "name": "opencloud-config",
            "temp": {},
        },
        {
            "name": "certs",
            "temp": {},
        },
    ]

    if not "full-ci" in ctx.build.title.lower() and ctx.build.event != "cron":
        return []

    steps = restoreBuildArtifactCache(ctx, "pnpm", ".pnpm-store") + \
            installPnpm() + \
            restoreBrowsersCache() + \
            keycloakService() + \
            restoreBuildArtifactCache(ctx, "web-dist", "dist")
    if ctx.build.event == "cron":
        steps += restoreBuildArtifactCache(ctx, "opencloud", "opencloud")
    else:
        steps += restoreOpenCloudCache()

    # configs to setup opencloud with keycloak
    environment = {
        "PROXY_AUTOPROVISION_ACCOUNTS": True,
        "PROXY_ROLE_ASSIGNMENT_DRIVER": "oidc",
        "OC_OIDC_ISSUER": "https://keycloak:8443/realms/OpenCloud",
        "PROXY_OIDC_REWRITE_WELLKNOWN": True,
        "WEB_OIDC_CLIENT_ID": "web",
        "PROXY_USER_OIDC_CLAIM": "preferred_username",
        "PROXY_USER_CS3_CLAIM": "username",
        "OC_ADMIN_USER_ID": "",
        "OC_EXCLUDE_RUN_SERVICES": "idp",
        "GRAPH_ASSIGN_DEFAULT_USER_ROLE": False,
        "GRAPH_USERNAME_MATCH": "none",
        "KEYCLOAK_DOMAIN": "keycloak:8443",
    }

    steps += openCloudService(environment) + \
             [
                 {
                     "name": "e2e-tests",
                     "image": OC_CI_NODEJS,
                     "environment": {
                         "BASE_URL_OC": "opencloud:9200",
                         "HEADLESS": True,
                         "RETRY": "1",
                         "REPORT_TRACING": "with-tracing" in ctx.build.title.lower(),
                         "KEYCLOAK": True,
                         "KEYCLOAK_HOST": "keycloak:8443",
                         "PLAYWRIGHT_BROWSERS_PATH": ".playwright",
                         "BROWSER": "chromium",
                     },
                     "commands": [
                         "cd tests/e2e",
                         "bash run-e2e.sh %s" % " ".join(["cucumber/features/" + tests for tests in e2e_Keycloak_tests]),
                     ],
                 },
             ] + \
             uploadTracingResult(ctx)

    return [{
        "name": "e2e-test-on-keycloak",
        "workspace": web_workspace,
        "steps": steps,
        "services": postgresService(),
        "volumes": e2e_volumes,
        "when": [
            {
                "event": ["push", "manual"],
                "branch": ["main", "stable-*"],
            },
            {
                "event": "pull_request",
            },
            {
                "event": "tag",
            },
        ],
    }]

def getOpenCloudlatestCommitId(ctx):
    web_repo_path = "https://raw.githubusercontent.com/opencloud-eu/web/%s" % ctx.build.commit
    return [
        {
            "name": "get-opencloud-latest-commit-id",
            "image": OC_CI_ALPINE,
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

def restoreBrowsersCache():
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
            "image": OC_UBUNTU,
            "commands": [
                "tar -xvf %s -C ." % dir["playwrightBrowsersArchive"],
            ],
        },
    ]
