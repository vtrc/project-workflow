# Delegation Contract

## Authority

The orchestrator owns the Work Item Record, Artifact Registry, current binding,
and transitions. A subagent owns only its bounded assignment. It must not select
a binding, advance the workflow, or write another owner's artifact.

## Dispatch packet

For a `subagent` or resolved `auto` binding, send one packet containing:

1. work-item and task identifiers;
2. declared step and binding role;
3. objective, scope, exclusions, and write authority;
4. ready input identifiers and locations;
5. resolved model and reasoning effort;
6. invocation mode, expected output, artifact identifier, and collision rule; and
7. completion evidence and required terminal report.

An inline binding records the same context in the Work Item Record without a
subagent packet.

## Invocation boundary

`compose` is the recommended default. The parent workflow resolves the named
local Skill from the recipe, reads its `SKILL.md`, and applies its instructions
in the active agent context using declared ready inputs and output contract. This
is instruction composition, not a portable nested host invocation. Record the
composed binding and observed outcome; do not claim the host executed an
independent black-box Skill.

Before composition, require a matching local `SKILL.md` and reject a policy that
sets `allow_implicit_invocation: false`, `allow_model_invocation: false`, or
`allow_composition: false`. No policy file means the local Skill uses the normal
implicit-composition default.

`user_explicit` is an opt-out for recipes requiring human selection. It blocks a
hands-off workflow; do not ask the user to invoke it as an intermediate
workaround. `host_permitted` requires a known host feature and confirmation; a
generic instruction-only workflow cannot assume one. Model and reasoning are
resolved recipe intent; composition cannot switch active model without host
support.

## Terminal report

Every subagent returns `completed`, `blocked`, or `needs-decision`, with outcome,
evidence, and each output's identifier, owner, expected and actual paths,
lifecycle state, and input lineage.

## Consolidation

The orchestrator checks the report against the active binding, registers valid
outputs, applies the completion rule, and follows only the declared transition.
A report cannot override recipe order or ownership.
