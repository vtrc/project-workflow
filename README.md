# Flujo personal basado en YAML

**[Read this in English](README.en.md)**

Este repositorio es un framework de workflow basado en instrucciones para clientes que implementan el estándar Agent Skills. Ofrece un único punto de entrada lógico y permite declarar en `workflow.yaml` qué Skills se componen, en qué orden y qué entregables persistentes producen. `$project-workflow` es el ejemplo de invocación estilo Codex; otros clientes compatibles usan su mecanismo nativo. No es una aplicación ni incluye Skills de terceros.

## Ruta rápida

1. Clona este repositorio en un proyecto con un cliente compatible con el estándar Agent Skills y Skills locales.
2. Copia [`workflow.example.yaml`](workflow.example.yaml) a `workflow.yaml` o adapta la receta existente.
3. Instala por separado las Skills que nombre la receta. La receta de ejemplo requiere `grilling` y `writing-plans`; no vienen incluidas.
4. Ejecuta el punto de entrada mediante el mecanismo nativo de tu cliente. En clientes estilo Codex:

   ```text
   $project-workflow
   Diseña un flujo sencillo de onboarding para mi proyecto.
   ```

5. Revisa el estado y los artefactos generados en `.workflow/`.

## Arquitectura

```text
Codex example: $project-workflow → workflow.yaml → workflow-orchestrator → .workflow/
   entrada             receta          composición             estado y entregables
```

| Componente | Responsabilidad |
| --- | --- |
| [`workflow.yaml`](workflow.yaml) | Fuente de verdad para pasos, bindings, transiciones y artefactos. |
| [`workflow.schema.yaml`](workflow.schema.yaml) | Schema JSON Schema Draft 2020-12 para validación estructural y autocompletado opcional. |
| [`project-workflow`](.agents/skills/project-workflow/SKILL.md) | Punto de entrada: valida la receta, persiste el estado y sigue las transiciones. |
| [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) | Contrato neutral para componer Skills y gestionar handoffs. |
| `.agents/skills/<name>/SKILL.md` | Fuente canónica de la Skill local; el adaptador puede mapearla a la ruta nativa del cliente. |
| `.workflow/` | Estado de ejecución y artefactos generados; no es código fuente. |

`compose` aplica una Skill local en el contexto activo del host; no inicia otro host independiente. Cada binding persiste su resultado antes de que el siguiente lo consuma.

## Configuración

Empieza con [`workflow.example.yaml`](workflow.example.yaml). La receta debe definir una lista ordenada de pasos y bindings; cada binding referencia una Skill local y un artefacto:

```yaml
skills:
  - name: my-local-skill       # nombre exacto del frontmatter de SKILL.md
    role: primary
    invocation: compose
    artifact: result-note
    output_file: .workflow/artifacts/result-note.md
    on_exists: version         # fail, overwrite o version
```

Puntos clave:

- La fuente canónica de la Skill debe existir en `.agents/skills/<name>/SKILL.md` y su frontmatter `name` debe coincidir; el adaptador del cliente puede descubrirla desde su ruta nativa mediante mapeo o configuración.
- `inputs` solo debe consumir artefactos anteriores que estén `ready`.
- `on_success` enlaza con un paso posterior o con `complete`; no inventa trabajo adicional.
- Define cada artefacto una sola vez y conserva su trazabilidad.

Consulta el [esquema de receta](.agents/skills/workflow-orchestrator/references/recipe-schema.md), el [contrato de artefactos](.agents/skills/workflow-orchestrator/references/artifact-contract.md) y el [contrato de delegación](.agents/skills/workflow-orchestrator/references/delegation-contract.md) para los detalles completos.

El [orquestador del workflow](.agents/skills/workflow-orchestrator/SKILL.md) define los límites de capacidades del host, los fallbacks y cómo se interpretan intenciones de receta como `model`, `reasoning_effort`, `delegation` y `execution: parallel`.

[`workflow.schema.yaml`](workflow.schema.yaml) comprueba la estructura, los
tipos y los enums básicos. La validación semántica —transiciones, readiness y
lineage de artefactos, elegibilidad de Skills y capacidades del host— sigue
siendo responsabilidad del orquestador.

## Ejecución y límites

Al ejecutar la Skill de entrada, el workflow carga y valida la receta, compone cada binding elegible y persiste los handoffs en `.workflow/`. Resuelve cualquier decisión del usuario o binding bloqueado antes de esperar el estado terminal `completed`.

`.workflow/` y las Skills externas no se incluyen en el repositorio publicado. Instala las Skills nombradas por tu receta en el host por separado. No hay runtime de aplicación, gestor de paquetes, base de datos ni servicio que instalar: solo necesitas un cliente compatible con el estándar Agent Skills que pueda mapear o configurar la fuente canónica `.agents/skills/` a su ruta nativa y respete los contratos de capacidades y composición. No se promete compatibilidad con clientes que no implementen ese estándar.
