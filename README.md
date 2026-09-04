# Flujo personal basado en YAML

**[Read this in English](README.en.md)**

Este repositorio es un framework de workflow basado en instrucciones para Agent Skills compatibles con Codex. Ofrece un único punto de entrada, `$workflow-personal`, y permite declarar en `workflow.yaml` qué Skills se componen, en qué orden y qué entregables persistentes producen. No es una aplicación ni incluye Skills de terceros.

## Ruta rápida

1. Clona este repositorio en un proyecto compatible con Agent Skills locales.
2. Copia [`workflow.example.yaml`](workflow.example.yaml) a `workflow.yaml` o adapta la receta existente.
3. Instala por separado las Skills que nombre la receta. La receta de ejemplo requiere `grilling` y `writing-plans`; no vienen incluidas.
4. Ejecuta el punto de entrada:

   ```text
   $workflow-personal
   Diseña un flujo sencillo de onboarding para mi proyecto.
   ```

5. Revisa el estado y los artefactos generados en `.workflow/`.

## Arquitectura

```text
$workflow-personal → workflow.yaml → workflow-orchestrator → .workflow/
   entrada             receta          composición             estado y entregables
```

| Componente | Responsabilidad |
| --- | --- |
| [`workflow.yaml`](workflow.yaml) | Fuente de verdad para pasos, bindings, transiciones y artefactos. |
| [`workflow-personal`](.agents/skills/workflow-personal/SKILL.md) | Punto de entrada: valida la receta, persiste el estado y sigue las transiciones. |
| [`workflow-orchestrator`](.agents/skills/workflow-orchestrator/SKILL.md) | Contrato neutral para componer Skills y gestionar handoffs. |
| `.agents/skills/<name>/SKILL.md` | Skill local seleccionada por la receta. |
| `.workflow/` | Estado de ejecución y artefactos generados; no es código fuente. |

`compose` aplica una Skill local en el contexto del agente actual; no inicia otro host independiente. Cada binding persiste su resultado antes de que el siguiente lo consuma.

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

- La Skill debe existir en `.agents/skills/<name>/SKILL.md` y su frontmatter `name` debe coincidir.
- `inputs` solo debe consumir artefactos anteriores que estén `ready`.
- `on_success` enlaza con un paso posterior o con `complete`; no inventa trabajo adicional.
- Define cada artefacto una sola vez y conserva su trazabilidad.

Consulta el [esquema de receta](.agents/skills/workflow-orchestrator/references/recipe-schema.md), el [contrato de artefactos](.agents/skills/workflow-orchestrator/references/artifact-contract.md) y el [contrato de delegación](.agents/skills/workflow-orchestrator/references/delegation-contract.md) para los detalles completos.

## Ejecución y límites

Al ejecutar `$workflow-personal`, el workflow carga y valida la receta, compone cada binding elegible y persiste los handoffs en `.workflow/`. Resuelve cualquier decisión del usuario o binding bloqueado antes de esperar el estado terminal `completed`.

`.workflow/` y las Skills externas no se incluyen en el repositorio publicado. Instala las Skills nombradas por tu receta en el host por separado. No hay runtime de aplicación, gestor de paquetes, base de datos ni servicio que instalar: solo necesitas un host compatible con Agent Skills que respete `.agents/skills/` y el contrato de composición.
