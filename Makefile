NAME := web
DIST := ${CURDIR}/dist
RELEASE := ${CURDIR}/release
NODE_MODULES := ${CURDIR}/node_modules

node_modules: package.json pnpm-lock.yaml
	[ -n "${NO_INSTALL}" ] || pnpm install --reporter=silent
	touch ${NODE_MODULES}

.PHONY: clean
clean:
	rm -rf ${DIST} ${RELEASE} ${NODE_MODULES}

.PHONY: release
release: clean
	make -f Makefile.release

#
# Release
# make this app compatible with the OpenCloud
# default build tools
#
.PHONY: dist
dist:
	make -f Makefile.release

.PHONY: l10n-push
l10n-push:
	make -C packages/web-runtime/l10n push

.PHONY: l10n-pull
l10n-pull:
	make -C packages/web-runtime/l10n pull

.PHONY: l10n-clean
l10n-clean:
	make -C packages/web-runtime/l10n clean

.PHONY: l10n-read
l10n-read: node_modules
	make -C packages/web-runtime/l10n extract

.PHONY: l10n-write
l10n-write: node_modules
	make -C packages/web-runtime/l10n translations

.PHONY: generate-qa-activity-report
generate-qa-activity-report: node_modules
	@if [ -z "${MONTH}" ] || [ -z "${YEAR}" ]; then \
		echo "Please set the MONTH and YEAR environment variables. Usage: make generate-qa-activity-report MONTH=<month> YEAR=<year>"; \
		exit 1; \
	fi
	pnpm exec node generate-qa-activity-report.js --month ${MONTH} --year ${YEAR}
