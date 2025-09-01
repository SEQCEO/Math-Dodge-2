# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Math-Dodge-2 is currently an empty repository. This file will be updated as the project develops.

## Development Setup

*To be added once the project technology stack is chosen and initialized.*

## Architecture

*To be added once the project structure is established.*

## Common Commands

*To be added once build tools and development workflow are set up.*

## 🔎 Fast-path CLI helpers

| Task | Prefer | Why | Example commands (+ real-world use cases) |
|------|--------|-----|-------------------------------------------|
| **Enumerate files / dirs** | `fd --hidden --type f <globs>` | 10-20× faster than `find`; multi-threaded; honours `.gitignore`. | • List all TypeScript sources: `fd -e ts -e tsx src/`<br>• Audit SQL migrations: `fd -e sql scripts/`<br>• Count hidden configs: `fd --hidden -d 1 -t f -g '.*rc*'`<br>• Find version files: `rg -0 --files -g '.nvmrc' -g '.node-version'` |
| **Plain-text / regex search** | `rg --json -n '<regex>' <paths>` | Rust-fast, Unicode-safe; `--json` gives machine-parsable hits (no ANSI). | • Find **all** `TODO:` tags → `rg --json -n 'TODO:' src/ \| jq -r '.[].data.path.text'`<br>• Track env-var usage → `rg --json -o 'process\\.env\\.([A-Z0-9_]+)' \| jq -r '.[].data.submatches[].match.text' \| sort -u`<br>• Exclude tests → `rg --json -Ttest 'setState\\(' src/`<br>• Find all API routes → `fd -g 'route.ts' app/api/` |
| **Structural (AST) search** | `tree-sitter query --json <query.scm> <files>` | Parses once, returns exact node spans; zero false positives—perfect for renames. | • Find every exported `GET` handler:<br>```scm<br>(function_declaration name: (identifier) @name (#match? @name "^GET$"))<br>```<br>`tree-sitter query --json find-get.scm app/api/**/*.ts`<br>• Locate deprecated JSX props:<br>`tree-sitter query --json find-oldProp.scm src/**/*.tsx` |
| **Cross-repo / deep history** | `src search -json '<pattern>'` | Millisecond searches over Sourcegraph's index; supports structural & regex; works on public or self-hosted SG. | • See how FFmpeg sets up filters →<br>`src search -json 'repo:^github.com/FFmpeg/FFmpeg$ AVFilterGraph'`<br>• Track a hook across all org repos →<br>`src search -json 'repo:^github.com/my-org/.* file:useSession\\.tsx "useSession("'`<br>• Blame-free "who added X line" queries with `--commit` filters |

### Usage guidance for Claude

1. **File lists** → use `fd`, not `find` (`fd` hides binary & ignored paths by default).  
2. **Literal / regex search** → call `rg --json` in one shot; parse the JSON array instead of parsing colored output.  
3. **Need exact definitions or call sites** → build a small Tree-sitter query and feed the JSON back into the chain.  
4. **Repo-wide or cross-repo intelligence** → fall back to `src search`; the JSON stream already includes file/line offsets.  
5. If the legacy tool is unavoidable (tiny VM, no Rust binaries), fall back gracefully—but **prefer the above stack when available**.

### Common project-specific patterns

• **Find all env vars**: `rg 'process\.env\.' --type ts --type js -o -r '$1' 'process\.env\.([A-Z0-9_]+)' | sort -u`  
• **List API endpoints**: `fd -g 'route.@(ts|js)' app/api | sed 's|^app/api||' | sed 's|/route\.[tj]s$||'`  
• **Check migrations**: `fd . scripts/ -e sql | sort -V`  
• **Find unused deps**: `rg --json -o 'from ["'\'']([^"'\'']+)["'\'']' -t ts -t tsx | jq -r '.[].data.submatches[].match.text' | sort -u`