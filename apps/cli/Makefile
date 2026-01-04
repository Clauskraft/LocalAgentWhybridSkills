SHELL := /bin/bash

.PHONY: mvp test lint audit release

mvp:
	npm run build

test:
	npm run test

lint:
	npm run lint

audit:
	npm audit --audit-level=high

release: lint test audit mvp
	@echo "Release pipeline complete."

