SHELL := /bin/bash

.PHONY: mvp test lint audit release dev dev-ui clean
.PHONY: docs-sanity

# Build
mvp:
	npm run build

# Development
dev:
	npm run dev -- run

dev-ui:
	npm run dev:ui

dev-doctor:
	npm run dev -- doctor

dev-approve:
	npm run dev -- approve

# Testing
test:
	npm run test

# Linting
lint:
	npm run lint

# Docs sanity checks (prevent drift in README/docs references)
docs-sanity:
	npm run docs:sanity

# Security audit
audit:
	npm audit --audit-level=high

# Full release pipeline
release: lint test audit mvp
	@echo "Release pipeline complete."

# Clean build artifacts
clean:
	rm -rf build dist logs

# Install dependencies
install:
	npm install

# Run with full access (DANGEROUS)
run-full:
	SCA_FULL_ACCESS=true npm run dev -- run

# Run with auto-approve (VERY DANGEROUS)
run-auto:
	SCA_FULL_ACCESS=true SCA_AUTO_APPROVE=true npm run dev -- run

