# Delegation Contract

## Authority

The orchestrator owns the Work Item Record, dependency readiness, and runtime
registry handoff. A delegated Step runner owns one bounded Step execution unit;
it cannot choose another Step, advance the graph, or publish another Step's
artifact.

## Step dispatch packet

For a Step whose delegation policy resolves to `subagent` (or supported inline
execution), provide one handoff containing:

1. the work-item and Step identifiers;
2. the user conversation and optional `step.prompt`;
3. every declared ready input artifact and its registry lineage;
4. the workflow and Step model, reasoning, and delegation policy;
5. the Step's Skill bindings, with exactly one `primary`; and
6. the derived artifact ID/path and required structured result shape.

Step-level delegation is the policy for the whole execution unit, not a per-Skill
invocation setting.

## Step runner

The delegated Step runner loads supporting and review Skills to build context,
then loads the primary Skill to perform the public work. The primary is the sole
public producer and must return the structured Step result. The runner does not
invent output paths or runtime metadata.

## Blocked behavior and consolidation

If the Step needs information or cannot proceed, persist and ask the user while
retaining resumable state. The orchestrator validates the primary result, registers the one
derived artifact, and unlocks Steps whose `inputs` are now all ready. The runtime
registry remains authoritative for status, attempts, run IDs, revisions,
checksums, lineage, replacement, and collision policy.
