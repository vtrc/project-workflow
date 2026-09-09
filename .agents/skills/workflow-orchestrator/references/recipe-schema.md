# Recipe Schema

`.workflow/workflow.yaml` is the canonical authored dependency graph. It declares
Step IDs, input edges, optional prompts, local Skill roles, and host policy
intents. Runtime status, attempts, and artifact history belong to the registry.

## Canonical shape

```yaml
id: <workflow-id>
default_delegation: subagent
model: host_default
reasoning_effort: host_default
steps:
  - id: research
    inputs: []
    skills:
      - name: research-skill
        role: primary
  - id: plan
    inputs: [research]
    prompt: Turn the research into an actionable plan.
    delegation: subagent
    model: host_default
    reasoning_effort: high
    skills:
      - name: plan-skill
        role: primary
```

The root fields are `id`, `default_delegation`, `model`, `reasoning_effort`, and
`steps`. Every Step requires the `id`, `inputs`, and `skills` fields; `inputs` is
required even for roots. A binding contains only
`name` and `role`; every Step has exactly one `primary` role.

## Graph constraints

- A root Step declares `inputs: []`.
- Every input names an earlier Step ID. Unknown, self, later, duplicate, or
  cyclic references are invalid.
- Multiple Steps may list one parent, creating fan-out.
- A Step may list multiple prior IDs, creating a join; it is ready only after all
  referenced artifacts are ready.
- Graph readiness is derived from `inputs`; there are no authored transitions.
- A blocked Step persists resumable state and asks the user.

## Field reference

| Level | Canonical fields | Meaning |
| --- | --- | --- |
| Workflow | `id`, `default_delegation`, `model`, `reasoning_effort`, `steps` | Workflow identity, host policy, and ordered graph. |
| Step | `id`, `inputs`, `prompt`, `model`, `reasoning_effort`, `delegation`, `skills` | Dependency edges, optional context, policy overrides, and Skill roles. |
| Binding | `name`, `role` | Exact local Skill and `primary`, `supporting`, or `review` responsibility. |

`model`, `reasoning_effort`, and `delegation` resolve from Step to workflow
defaults, while the host decides whether the requested policy is supported.
Bindings do not override policy.

## Derived artifact contract

Every successful Step owns exactly one public artifact:

- ID: `step.id`.
- Path: `.workflow/artifacts/<step.id>.md`.
- Producer: the Step's sole `primary` binding.

Supporting and review Skills contribute context only. `outputs`, `artifact_root`,
`artifact`, `output_file`, and `on_exists` are not authored fields. Compatible
legacy readers may accept redundant artifact declarations only when they equal the
derived ID/path; canonical saves omit them. Other retired fields must produce a
field-specific migration diagnostic rather than being silently discarded.

## Runtime boundary

The runtime registry exclusively owns status, attempts, run IDs, revisions,
checksums, lineage, replacement, and collision policy. The orchestrator validates
the primary's structured result and registers its derived artifact before a
consumer becomes ready. A file on disk without a valid result is not success.
