# Agentes de Door List

Perfiles reutilizables del repositorio en `.codex/agents/*.toml`, en el [formato oficial de agentes de Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents). Cada perfil define su rol, alcance, archivos editables, verificaciones y condiciones para acceder a servicios reales. Heredan el modelo y los permisos de la sesión.

| Nombre | Responsabilidad | Zona principal |
| --- | --- | --- |
| `door-accessibility` | Accesibilidad y operación en puerta: QR, email y check-in | `app/scan/`, API y helpers de check-in |
| `ticket-email` | Entrega y reenvío de entradas, QR y correo transaccional | `lib/email/`, API y botón de reenvío, `app/entradas/` |
| `e2e-testing` | Recorrido completo y soporte de Playwright | `tests/e2e/`, `playwright.config.mjs` y scripts E2E |

## Cómo invocarlos

Pide en una sesión de Codex abierta sobre este repositorio:

- «Usa el agente `door-accessibility` para revisar el foco y los mensajes de error de /scan».
- «Usa el agente `ticket-email` para mejorar el reintento de un reenvío de entrada».
- «Usa el agente `e2e-testing` para ejecutar las pruebas locales de cámara y preparar el flujo completo».

También puedes pedir los tres en paralelo, indicando una tarea independiente para cada nombre. Guardar estos perfiles no inicia agentes ni concede autorización permanente para acceder a BD, instalar dependencias o enviar correos.

## Límites y coordinación

La lista de archivos de cada TOML es una instrucción de alcance, no un aislamiento del sistema de archivos. Los agentes pueden consultar código relacionado; para editar fuera de su lista deben comunicar la necesidad al agente principal y recibir la asignación correspondiente. Los segmentos `[eventId]`, `[registrationId]` y `[code]` son carpetas literales; `**` representa su contenido recursivo.

Todos siguen `AGENTS.md`. Las autorizaciones explícitas ya otorgadas se reutilizan para la misma acción y entorno. Los cambios compartidos se coordinan antes de editar y cada entrega distingue verificaciones reales, simuladas, omitidas y pendientes.
