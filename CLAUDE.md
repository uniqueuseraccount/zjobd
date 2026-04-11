# Project Instructions

This project uses [metaswarm](https://github.com/dsifry/metaswarm), a multi-agent orchestration framework for Claude Code. It provides 18 specialized agents, a 9-phase development workflow, and quality gates that enforce TDD, coverage thresholds, and spec-driven development.

## How to Work in This Project

### Starting work

```text
/start-task
```

This is the default entry point. It primes the agent with relevant knowledge, guides you through scoping, and picks the right level of process for the task.

### Available Commands

| Command | Purpose |
|---|---|
| `/start-task` | Begin tracked work on a task |
| `/prime` | Load relevant knowledge before starting |
| `/review-design` | Trigger parallel design review gate (5 agents) |
| `/pr-shepherd <pr>` | Monitor a PR through to merge |
| `/self-reflect` | Extract learnings after a PR merge |
| `/handle-pr-comments` | Handle PR review comments |
| `/brainstorm` | Refine an idea before implementation |
| `/create-issue` | Create a well-structured GitHub Issue |
| `/external-tools-health` | Check status of external AI tools (Codex, Gemini) |
| `/setup` | Interactive guided setup — detects project, configures metaswarm |
| `/update` | Update metaswarm to latest version |
| `/status` | Run diagnostic checks on your installation |
| `/start` | Alias for `/start-task` |

## Testing

- **TDD is mandatory** — Write tests first, watch them fail, then implement
- **100% test coverage required** — Enforced via `.coverage-thresholds.json`

### Backend (Python/Flask)
- Test command: `pytest`
- Coverage command: `pytest --cov=backend --cov-fail-under=100`

### Frontend (React)
- Test command: `npm test`
- Coverage command: `npm test -- --coverage --watchAll=false`

## Coverage

Coverage thresholds are defined in `.coverage-thresholds.json`.

## Quality Gates

- **Design Review Gate**: Parallel 5-agent review (`/review-design`)
- **Plan Review Gate**: Automatic adversarial review after any implementation plan.
- **Coverage Gate**: Blocking gate before PR creation.

## Workflow Enforcement (MANDATORY)

These rules ensure the full metaswarm pipeline is followed.

### Execution Method Choice

When a plan is ready for execution, **always ask the user** which execution approach they want:

1. **Metaswarm orchestrated execution** — 4-phase loop per work unit.
2. **Subagent-driven development** (`superpowers:subagent-driven-development`) — Dispatch subagents per task.
3. **Parallel session** (`superpowers:executing-plans`) — Execute in a separate session.

## Code Quality

- Python: Ruff for linting and formatting.
- Frontend: ESLint + Prettier.
- All quality gates must pass before PR creation.
