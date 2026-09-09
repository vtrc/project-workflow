import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function load(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function definition(schema, name) {
  const marker = `  ${name}:\n`
  const start = schema.indexOf(marker)
  assert.notEqual(start, -1, `Expected definition: ${name}`)

  const nextDefinition = schema.slice(start + marker.length).search(/\n  [^\s]/)
  return schema.slice(
    start,
    nextDefinition === -1 ? undefined : start + marker.length + nextDefinition,
  )
}

test('defines a step-owned artifact schema', async () => {
  const schema = await load('workflow.schema.yaml')
  const step = definition(schema, 'step')
  const binding = definition(schema, 'binding')
  const role = definition(schema, 'role')

  assert.doesNotMatch(schema, /^  artifact_root:/m)
  assert.doesNotMatch(schema, /^  - artifact_root$/m)

  assert.match(step, /      prompt:\n        type: string\n        minLength: 1/)
  assert.match(step, /context supplied to the delegated Step runner/i)
  assert.doesNotMatch(step, /^      outputs:/m)

  assert.doesNotMatch(binding, /^      (artifact|output_file|on_exists):/m)
  assert.doesNotMatch(binding, /^    allOf:/m)

  assert.match(role, /      - primary\n      - supporting\n      - review/)
  assert.doesNotMatch(role, /fallback/)
})

test('canonical schema examples omit retired artifact configuration', async () => {
  const schema = await load('workflow.schema.yaml')

  assert.doesNotMatch(schema, /^\s+(artifact_root|outputs|artifact|output_file|on_exists):/m)
})

test('defines the v2 step dependency schema', async () => {
  const schema = await load('workflow.schema.yaml')
  const step = definition(schema, 'step')
  const binding = definition(schema, 'binding')

  assert.match(schema, /required:\n(?:[\s\S]*\n)?  - id\n(?:[\s\S]*\n)?  - default_delegation\n(?:[\s\S]*\n)?  - model\n(?:[\s\S]*\n)?  - reasoning_effort\n(?:[\s\S]*\n)?  - steps/)
  assert.match(step, /required:[\s\S]*- inputs/)
  assert.match(step, /inputs:\n        type: array\n        minItems: 0\n        uniqueItems: true/)
  assert.match(step, /inputs:[\s\S]*preceding Step IDs/i)
  assert.doesNotMatch(schema, /default_invocation|default_on_blocked|on_success|completion|execution/)
  assert.doesNotMatch(binding, /required:[\s\S]*- required/)
  assert.doesNotMatch(binding, /invocation|reasoning_effort|model|artifact|output_file|on_exists/)
})

test('defines the orchestrator contract for a single step-owned public artifact', async () => {
  const orchestrator = await load('.agents/skills/workflow-orchestrator/SKILL.md')
  const recipe = await load('.agents/skills/workflow-orchestrator/references/recipe-schema.md')
  const artifacts = await load('.agents/skills/workflow-orchestrator/references/artifact-contract.md')
  const delegation = await load('.agents/skills/workflow-orchestrator/references/delegation-contract.md')

  assert.match(orchestrator, /exactly one `primary`/i)
  assert.match(orchestrator, /\.workflow\/artifacts\/<step\.id>\.md/)
  assert.match(orchestrator, /structured step result/i)
  assert.match(orchestrator, /file\s+existence alone is not success/i)

  assert.match(recipe, /Path: `\.workflow\/artifacts\/<step\.id>\.md`/i)
  assert.doesNotMatch(recipe, /^artifact_root:/m)
  assert.doesNotMatch(recipe, /^\s+outputs:/m)
  assert.doesNotMatch(recipe, /fallback producer/i)
  assert.match(recipe, /supporting.*review.*context only/is)

  assert.match(artifacts, /runtime registry\s+exclusively owns status, `run_id`, revisions, checksums, lineage, replacement,\s+and collision policy/i)
  assert.match(artifacts, /primary.*only.*public artifact producer/is)
  assert.match(artifacts, /supporting.*review.*never publish separate public\s+artifacts/is)

  assert.match(orchestrator, /`inputs`.*dependency graph|dependency graph.*`inputs`/is)
  assert.match(orchestrator, /delegated Step runner.*loads.*Skills/is)
  assert.match(orchestrator, /primary success.*Step completion|Step completion.*primary success/is)
  assert.match(orchestrator, /always asks the user|persist.*ask the user/is)
  assert.doesNotMatch(orchestrator, /on_success|on_blocked|default_on_blocked|default_invocation|user_explicit|host_permitted|execution:|completion:/)

  assert.match(recipe, /inputs.*required|required.*inputs/is)
  assert.match(recipe, /fan-out|fan-in|joins?/i)
  assert.doesNotMatch(recipe, /default_on_blocked|default_invocation|on_success|on_blocked|execution:|completion:|invocation:|required:/)
  assert.match(delegation, /Step runner.*loads.*primary|loads.*supporting.*review/is)
  assert.match(delegation, /Step-level delegation/is)
  assert.match(delegation, /persist and ask the user/i)
  assert.doesNotMatch(delegation, /user_explicit|host_permitted|invocation mode|completion rule|declared transition/)
})
