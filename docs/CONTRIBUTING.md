# Contributing Guidelines

Thank you for your interest in contributing!

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v24+)
- [Rust](https://rustup.rs/) (latest stable)
- Target-platform [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- Familiarity with React, TypeScript, and Rust

### Setup

```bash
git clone https://github.com/Max-Samson/Mtimer.git
cd Mtimer
npm ci --include=dev
npm run dev
npm run check:all
```

## How to Contribute

### Issues

- **Bug Reports**: Use the bug report template
- **Feature Requests**: Use the feature request template
- **Security Issues**: See [SECURITY.md](SECURITY.md)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes following the guidelines below
4. Run `npm run check:all`, `npm run test:e2e`, and `npm run build:frontend`; record failures or unavailable native checks explicitly
5. Commit using conventional commits
6. Push and open a Pull Request

## Code Guidelines

### TypeScript/React

- Use TypeScript for all new code
- Follow existing component patterns
- See `docs/developer/` for architecture patterns

### Rust

- Use `cargo fmt` and `cargo clippy`
- Use typed `Result` errors for Tauri commands, preserving the existing generated frontend contract
- See `docs/developer/rust-architecture.md`

## Quality Gates

All PRs must pass:

- TypeScript type checking
- ESLint and Prettier
- Rust formatting and clippy
- Frontend logic/component and Rust tests
- Offline Chromium user flows/layout checks
- Dependency audit

```bash
npm run check:all
npm exec playwright -- install chromium  # first setup / browser version change
npm run test:e2e
npm run build:frontend
npm audit --include=dev
```

`check:all` includes static checks and frontend/Rust unit tests, not browser E2E or coverage. The frontend production build is an additional local recommendation, not currently a separate required CI job. Missing Cargo is a failed/incomplete full gate, not a successful frontend-only check. Full-source coverage is currently below the retained 60% thresholds; do not lower thresholds or exclude uncovered code to hide this gap.

See [workflow and command migration](developer/testing-workflow.md), [test boundaries](developer/testing.md), [UI contract](developer/ui-contract.md), and [local packaging vs release](developer/releases.md). Configured CI jobs must actually pass before merge; a local commit is not evidence of cross-platform validation.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add user authentication
fix(ui): resolve sidebar toggle issue
docs: update installation instructions
refactor(store): simplify state management
test: add preferences tests
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Code Review

- Keep PRs focused and reasonably sized
- Write clear PR descriptions
- Respond to feedback promptly
- Update documentation as needed

## Legal

By contributing, you agree that your contributions will be licensed under the same license as the project.
