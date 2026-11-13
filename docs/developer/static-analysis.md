# Static Analysis

All static analysis tools configured in this app and how to use them.

## Quick Reference

| Tool           | Purpose                  | Command                  | In check:all |
| -------------- | ------------------------ | ------------------------ | ------------ |
| TypeScript     | Type checking            | `npm run typecheck`      | Yes          |
| ESLint         | Syntax, style, TS rules  | `npm run lint`           | Yes          |
| Prettier       | Code formatting          | `npm run format:check`   | Yes          |
| ast-grep       | Architecture patterns    | `npm run ast:lint`       | Yes          |
| React Compiler | Automatic memoization    | Build-time               | Yes          |
| cargo fmt      | Rust formatting          | `npm run rust:fmt:check` | Yes          |
| clippy         | Rust linting             | `npm run rust:clippy`    | Yes          |
| Vitest         | Frontend tests           | `npm run test:run`       | Yes          |
| cargo test     | Rust tests               | `npm run rust:test`      | Yes          |
| knip           | Unused code detection    | `npm run knip`           | No           |
| jscpd          | Duplicate code detection | `npm run jscpd`          | No           |

## Running All Checks

```bash
npm run check:all    # Must pass before commits
npm run fix:all      # Auto-fix what can be fixed
```

## Tool Details

### ESLint

Handles syntax, style, and TypeScript-specific rules.

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

Configuration in `eslint.config.js`.

React Compiler diagnostics use the existing
`eslint-plugin-react-hooks` recommended rules. Do not re-add the legacy
`eslint-plugin-react-compiler`: its Zod 3 dependency is affected by
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
The build-time `babel-plugin-react-compiler` remains enabled separately in Vite.

### Temporary Security Override

`package.json` pins **only** `@typescript-eslint/typescript-estree`'s minimatch
dependency to `11.0.8` for
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
As of 2026-11-13, `typescript-eslint@8.72.2` still requests minimatch `^10.2.2`.
This crosses a major version: minimatch 11 removes APIs such as `makeRe`, but
this consumer uses the retained `minimatch(path, pattern, { dot: true })` API.
Do not apply this override globally to other minimatch consumers.

When TypeScript ESLint supports a patched minimatch release directly, remove
this override and re-run lint, tests, build, and the full dependency audit
(`npm audit --include=dev`). Do not downgrade TypeScript ESLint or disable the
compiler rules just to obtain a clean audit.

### Prettier

Consistent code formatting.

```bash
npm run format:check   # Check formatting
npm run format         # Fix formatting
```

Configuration in `prettier.config.js`.

### ast-grep

Enforces architectural patterns ESLint can't detect. Catches violations like Zustand destructuring and hooks in wrong directories.

```bash
npm run ast:lint    # Scan for violations
npm run ast:fix     # Auto-fix where possible
```

**Key rules:**

- No Zustand destructuring (causes render cascades)
- Hooks must be in `hooks/` directory
- No store subscriptions in `lib/`

See [writing-ast-grep-rules.md](./writing-ast-grep-rules.md) for creating new rules.

### React Compiler

Handles memoization automatically at build time. You do **not** need to manually add:

- `useMemo` for computed values
- `useCallback` for function references
- `React.memo` for components

The compiler analyzes code and adds memoization where beneficial.

**Note:** The `getState()` pattern is still critical - it avoids store subscriptions, not memoization. See [state-management.md](./state-management.md).

### Rust Tooling

```bash
npm run rust:fmt:check   # Check formatting
npm run rust:fmt         # Fix formatting
npm run rust:clippy      # Lint with clippy
npm run rust:clippy:fix  # Auto-fix clippy warnings
npm run rust:test        # Run Rust tests
```

### knip (Periodic Cleanup)

Detects unused exports, dependencies, and files. Not in `check:all` - use periodically.

```bash
npm run knip
```

### jscpd (Periodic Cleanup)

Detects duplicated code blocks. Not in `check:all` - use periodically.

```bash
npm run jscpd
```

Use the `/cleanup` command for guided analysis and cleanup of both knip and jscpd findings.

## CI Integration

`check:all` runs in CI. Ensure it passes locally before pushing:

```bash
npm run check:all
```

## Adding New Rules

**ESLint:** Add rules to `eslint.config.js`

**ast-grep:** Create YAML files in `.ast-grep/rules/`. See [writing-ast-grep-rules.md](./writing-ast-grep-rules.md).

**Prettier:** Modify `prettier.config.js`
