### default environment
TAG ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "latest")
PORT ?= 8080

.PHONY: $(shell egrep -o '^(\._)?[a-z_-]+:' $(MAKEFILE_LIST) | sed 's/://')

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies using pnpm
	pnpm install

dev: ## Run development servers
	pnpm dev

build: ## Build
	pnpm build

typecheck: ## Run TypeScript type checking for client and server
	pnpm typecheck

lint: ## Run linter (oxlint)
	pnpm lint

lint-fix: ## Run linter and auto-fix (oxlint --fix)
	pnpm lint:fix

format: ## Format code with oxfmt
	pnpm format

format-check: ## Check code formatting with oxfmt
	pnpm format:check

storybook: ## Run Storybook development server
	pnpm storybook

build-storybook: ## Build static Storybook site
	pnpm build-storybook

clean: ## Remove build artifacts
	rm -rf dist storybook-static
