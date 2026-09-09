# Project Workflow

**[Read this in English](README.en.md)**

## Un ejemplo antes de empezar

Imagina que pides: **«Diseña un registro para mi proyecto»**. Project Workflow
conecta Skills locales mediante `.workflow/workflow.yaml`. El orquestador prepara
un Step listo, delega una unidad de ejecución y la Skill `primary` publica un único
artefacto derivado del ID del Step. No tienes que invocar Skills intermedias.

## Cómo funciona

```text
Conversación del usuario
        ↓
.workflow/workflow.yaml (grafo de dependencias mediante inputs)
        ↓
Step runner delegado
        ├─ Skills supporting/review aportan contexto
        └─ Skill primary publica un artefacto derivado
        ↓
.workflow/artifacts/<step.id>.md
        ↓
Steps cuyos inputs ya están listos
```

El runtime registry, no la receta, es propietario del estado, intentos, IDs de
 ejecución, revisiones, checksums, linaje, reemplazos y colisiones.

## Receta canónica

```yaml
# yaml-language-server: $schema=../workflow.schema.yaml
id: register-design-workflow
default_delegation: subagent
model: host_default
reasoning_effort: host_default
steps:
  - id: clarify-request
    inputs: []
    skills:
      - name: grilling
        role: primary
  - id: make-plan
    inputs: [clarify-request]
    prompt: Convierte la aclaración en un plan accionable.
    skills:
      - name: writing-plans
        role: primary
```

Un Step raíz usa `inputs: []`. Cada Step posterior solo referencia IDs anteriores.
Varios hijos pueden consumir el mismo padre (fan-out), y un Step con varios
`inputs` es un join que espera todos los artefactos listos. La disponibilidad se
deriva de `inputs`: no hay transiciones, salidas ni controles de invocación por
Skill escritos en la receta.

`model`, `reasoning_effort` y `delegation` son políticas de workflow/Step. Cada
binding solo contiene `name` y `role`: exactamente una Skill `primary` y, de forma
opcional, Skills `supporting` y `review`. El Step runner delegado carga todas,
pero solo `primary` produce `.workflow/artifacts/<step.id>.md`.

Si un Step queda bloqueado o necesita una decisión, el runtime conserva el estado
reanudable y pregunta al usuario. No existe un campo de política de bloqueo
escrito por el usuario.

## Importaciones heredadas

El lector puede aceptar declaraciones de artefacto retiradas solo cuando repiten
el ID/ruta derivados. La salida canónica las omite. Los campos retirados de
transición, ejecución, completion, invocación, overrides de bindings o política de
bloqueo nunca se descartan en silencio: los valores incompatibles producen un
diagnóstico de migración específico del campo.

## Instalación y primer uso

```text
git clone https://github.com/vtrc/project-workflow.git
cd project-workflow
mkdir -p .workflow && cp workflow.example.yaml .workflow/workflow.yaml
```

Sustituye las Skills de ejemplo por Skills disponibles en tu cliente y activa solo
la Skill de entrada `project-workflow` mediante el mecanismo nativo del cliente.

## Referencias técnicas

- [`workflow.schema.yaml`](workflow.schema.yaml): JSON Schema Draft 2020-12.
- [Schema de receta](.agents/skills/workflow-orchestrator/references/recipe-schema.md).
- [Contrato de artefactos](.agents/skills/workflow-orchestrator/references/artifact-contract.md).
- [Contrato de delegación](.agents/skills/workflow-orchestrator/references/delegation-contract.md).
- [Orquestador](.agents/skills/workflow-orchestrator/SKILL.md).
