# Local Agent Release Pipeline
# Implements lint, test, audit, and release gates

.PHONY: help lint test audit release benchmark clean

# Default target
help:
	@echo "Available targets:"
	@echo "  lint      - Run ESLint across all packages"
	@echo "  test      - Run tests for all packages"
	@echo "  audit     - Run security audit and license check"
	@echo "  release   - Full release pipeline (lint + test + audit + build)"
	@echo "  benchmark - Run ROMA benchmark suite"
	@echo "  clean     - Clean build artifacts"

# Lint all packages
lint:
	@echo "🔍 Running ESLint..."
	@npx eslint . --ext .ts,.tsx --max-warnings 0
	@echo "✅ Linting passed"

# Test all packages
test:
	@echo "🧪 Running tests..."
	@npm run test --workspaces
	@echo "✅ Tests passed"

# Security audit
audit:
	@echo "🔒 Running security audit..."
	@npm audit --production --audit-level moderate
	@echo "✅ Security audit passed"
	@echo "📄 Checking licenses..."
	@npx license-checker --production --failOn "(GPL OR LGPL OR AGPL)"
	@echo "✅ License check passed"

# Benchmark suite (requires ROMA services running)
benchmark:
	@echo "📊 Running benchmark suite..."
	@if [ -f "ci-bench.yml" ]; then \
		docker compose -f ci-bench.yml up --exit-code-from bench; \
	else \
		echo "Benchmark config not found, running basic tests..."; \
		npm run test --workspaces; \
	fi
	@echo "✅ Benchmarks completed"

# Full release pipeline
release: lint test audit
	@echo "🏗️ Building all packages..."
	@npm run build --workspaces
	@echo "✅ Release build completed"
	@echo "🚀 Ready for deployment"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.log" -delete 2>/dev/null || true
	@echo "✅ Cleanup completed"

# Development helpers
dev-setup:
	@echo "🔧 Setting up development environment..."
	@npm install --workspaces
	@echo "✅ Development environment ready"

# CI/CD helper
ci: release benchmark
	@echo "🎉 CI/CD pipeline completed successfully"
