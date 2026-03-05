# AGENTS.md — rules for making changes in sqale

## Hard rules
- Hot paths must stay minimal: avoid extra loops, extra allocations, regex, and per-line object creation.
- Do not introduce new “state objects” or config knobs unless absolutely necessary.
  - Prefer using existing config and existing state. If you add new state, justify it in comments.
- Minimize loops: one pass whenever possible. If you add a loop, explain why it cannot be fused.
- Keep files small: **no file > 400 LOC**. Split by responsibility.
  - Exception: if splitting would materially reduce readability/correctness for tightly-coupled logic, exceeding 400 LOC is allowed with a brief inline justification near the change.
- Keep functions small:
  - Target `<=120 LOC` per function.
  - If a function exceeds `180 LOC`, split it before merge.
  - Orchestration functions must stay thin and delegate to helper functions/modules with explicit contracts (inputs/outputs, no extra passes, no extra mutable state).
- Commenting and naming clarity:
  - Use explicit domain names (avoid ambiguous names like `group`, `dirty`, `data`, `item` in non-trivial flows unless scoped by a clear suffix/prefix).
  - Add a short comment/JSDoc for non-obvious functions explaining: what it does, why it exists, and key return semantics.
  - Prefer concise function comments; use tagged JSDoc (`@param`, `@returns`) only when it materially improves clarity.
  - Skip comments only when behavior is obvious from the function name and types.
- Strict TypeScript:
  - No `any`. No implicit `unknown` without narrowing.
  - Avoid ad-hoc string unions sprinkled everywhere: use enums/constants for stable domains.
- Avoid refactors unless they directly:
  - reduce time in hot loops,
  - reduce syscalls,
  - reduce memory,
  - or remove duplicated logic that is already causing divergence/bugs.
- Minimal diffs: do not reformat or reorder unrelated code.
- Do not add compatibility fallback logic for mixed/partial deployments (old/new client-server combos) unless explicitly requested.

## Required workflow for changes
- Start by stating the invariant(s) impacted (1–5 bullets).
- Add a small reproducible fixture or a deterministic check for the behavior.
- Prefer changes that are locally verifiable (unit-level or fixture-level).

## Documentation scope
- Keep the phrase "document relevant changes" as the decision trigger.
- "Relevant changes" means docs that describe durable behavior/contracts, not an iteration changelog.
  - Update them when code changes task behavior, inputs/outputs, invariants, recovery/failure semantics, or operator-facing usage.
- README is structural overview:
  - Update only for structural/project-level changes (major feature, architecture shape, key view/pages).
  - Do not add iteration-level UI tuning details unless they change a durable user-facing capability/workflow.
- Prefer editing existing docs over adding new docs files.
- If no durable docs are impacted, explicitly state in the final response: `No documentation updates were required for this iteration.`
- If the user asks to document relevant changes in README and README is updated, end the final response with a detailed conventional commit message following the commit format rules below.

## Commit message format
- When asked for a detailed conventional commit message, use this structure:
  - Line 1: single-line subject in Conventional Commit format (`type(scope): summary`).
  - Line 2: blank line.
  - Remaining lines (optional): flat bullet list of concrete code changes.
- Do not add a prose paragraph between the subject and the bullet list.
- Do not mention documentation changes in the commit message body.
- Do not mention tests or validation commands in the commit message body.