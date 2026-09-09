import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const retiredFields = /^\s*(artifact_root|outputs|artifact|output_file|on_exists|default_on_blocked|default_invocation|on_success|on_blocked|execution|completion|invocation|required):/m

async function load(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function yamlExample(document) {
  const match = document.match(/```yaml\n([\s\S]*?)\n```/)
  assert.ok(match, 'Expected a YAML example')
  return match[1]
}

test('ships canonical recipes with step-owned derived artifacts', async () => {
  const [example, recipe, bootstrap] = await Promise.all([
    load('workflow.example.yaml'),
    load('.workflow/workflow.yaml'),
    load('.agents/skills/skill-discovery/references/workflow.yaml'),
  ])

  for (const document of [example, recipe, bootstrap]) {
    assert.doesNotMatch(document, retiredFields)
    assert.doesNotMatch(document, /^\s+role: fallback$/m)
    assert.match(document, /^default_delegation: subagent$/m)
  }

  assert.match(example, /inputs: \[\]/)
  assert.match(example, /inputs: \[first-step\]/)
  assert.match(example, /inputs: \[first-step\][\s\S]*inputs: \[first-step\]/)
  assert.match(recipe, /inputs: \[\]/)
  assert.match(recipe, /inputs: \[clarify-with-grilling\]/)
  assert.match(bootstrap, /^steps: \[\]$/m)
})

test('keeps runtime fixtures explicit about fan-out and join readiness', async () => {
  const registry = await load('tests/fixtures/step-owned-artifact-registry.yaml')

  assert.match(registry, /- id: review-with-grilling[\s\S]*inputs: \[clarify-with-grilling\]/)
  assert.match(registry, /- id: release-plan[\s\S]*inputs: \[clarify-with-grilling, review-with-grilling\]/)
  assert.match(registry, /join_requires_all_inputs: true/)
  assert.doesNotMatch(registry, /on_success|on_blocked|execution:|completion:|invocation:/)
})

test('documents the step-owned artifact handoff in both READMEs', async () => {
  const [spanish, english] = await Promise.all([load('README.md'), load('README.en.md')])

  for (const document of [spanish, english]) {
    const example = yamlExample(document)

    assert.doesNotMatch(example, retiredFields)
    assert.match(document, /\.workflow\/artifacts\/<step\.id>\.md/)
    assert.match(document, /prompt/i)
    assert.match(document, /primary.*supporting.*review/is)
    assert.match(document, /registry/i)
    assert.match(document, /legacy|heredad/i)
  }
})

test('reconciles runtime fixtures to canonical step-owned artifact identities', async () => {
  const [registry, workItem] = await Promise.all([
    load('tests/fixtures/step-owned-artifact-registry.yaml'),
    load('tests/fixtures/step-owned-work-item.yaml'),
  ])

  assert.match(
    registry,
    /- id: clarify-with-grilling[\s\S]*?expected_output_path: \.workflow\/artifacts\/clarify-with-grilling\.md[\s\S]*?actual_path: \.workflow\/artifacts\/clarify-with-grilling\.md[\s\S]*?inputs: \[user-request\]/,
  )
  assert.match(
    registry,
    /- id: plan-with-writing-plans[\s\S]*?expected_output_path: \.workflow\/artifacts\/plan-with-writing-plans\.md[\s\S]*?actual_path: \.workflow\/artifacts\/plan-with-writing-plans\.md[\s\S]*?inputs: \[clarify-with-grilling\]/,
  )

  assert.match(workItem, /^state: completed$/m)
  assert.match(workItem, /current:[\s\S]*?step_id: plan-with-writing-plans[\s\S]*?inputs: \[clarify-with-grilling\][\s\S]*?status: completed/)
  assert.match(
    workItem,
    /event: clarification-confirmed[\s\S]*?step_id: clarify-with-grilling[\s\S]*?status: completed[\s\S]*?artifact: clarify-with-grilling[\s\S]*?actual_path: \.workflow\/artifacts\/clarify-with-grilling\.md/,
  )
  assert.match(
    workItem,
    /event: binding-completed[\s\S]*?step_id: plan-with-writing-plans[\s\S]*?status: completed[\s\S]*?inputs: \[clarify-with-grilling\][\s\S]*?artifact: plan-with-writing-plans[\s\S]*?actual_path: \.workflow\/artifacts\/plan-with-writing-plans\.md/,
  )
  assert.match(workItem, /event: clarification-round[\s\S]*?status: settled/)
})
