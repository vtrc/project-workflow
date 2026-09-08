import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const retiredFields = /^\s*(artifact_root|outputs|artifact|output_file|on_exists):/m

async function load(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
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
  }

  assert.match(example, /inputs: \[first-step\]/)
  assert.match(recipe, /inputs: \[clarify-with-grilling\]/)
  assert.match(bootstrap, /^steps: \[\]$/m)
})
