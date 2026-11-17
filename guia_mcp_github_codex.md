# Conectar el MCP de GitHub en Codex CLI

Guía rápida para que Codex pueda leer y escribir en un repositorio de GitHub (contenido, ramas, commits y pull requests) usando el **servidor MCP remoto oficial de GitHub** y un **fine-grained Personal Access Token (PAT)**.

> **Idea clave:** el token **nunca** va dentro de `config.toml`. En la configuración solo se indica el *nombre* de la variable de entorno; el valor real vive en tu shell.

---

## Requisitos

- Codex CLI instalado y actualizado (`codex --version`)
- Una cuenta de GitHub con acceso al repositorio que quieres usar
- Terminal con Bash/Zsh (macOS/Linux) o PowerShell (Windows)

---

## Paso 1 — Configurar `config.toml`

Codex lee la configuración de servidores MCP desde:

| Alcance | Ruta |
|---|---|
| Global (todos tus proyectos) | `~/.codex/config.toml` |
| Proyecto (solo este repo) | `.codex/config.toml` en la raíz del proyecto |

Agrega el bloque del servidor de GitHub:

```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
# The Codex daemon does not inherit variables defined in the interactive shell.
http_headers_helper = '''
/bin/zsh -c '
  source "$HOME/.zshrc" >/dev/null || exit 1
  : "${GITHUB_PAT_TOKEN:?GITHUB_PAT_TOKEN is not set}"
  printf "{\"Authorization\":\"Bearer %s\"}\n" "$GITHUB_PAT_TOKEN"
'
'''
```

**Qué hace cada campo:**

- `[mcp_servers.github]` → registra un servidor MCP con el identificador `github`.
- `url` → endpoint del servidor MCP remoto de GitHub (transporte HTTP, no necesitas Docker ni instalar nada local).
- `bearer_token_env_var` → Codex toma el valor de esa variable y lo envía como `Authorization: Bearer <token>` en cada petición.

> Si usas el `.codex/config.toml` del proyecto, el archivo es seguro de commitear porque **no contiene el secreto**, solo el nombre de la variable.

---

## Paso 2 — Crear el fine-grained PAT en GitHub

Abre: **https://github.com/settings/personal-access-tokens/new**

Completa el formulario con estos valores (principio de mínimo privilegio):

| Campo | Valor |
|---|---|
| **Token name** | `token-door-list` |
| **Description** | *(opcional)* p. ej. `Codex MCP - curso door-list` |
| **Resource owner** | `pazteddy` (tu usuario) |
| **Expiration** | `30 days` |
| **Repository access** | **Only select repositories** → `pazteddy/test-codex-door-list` |

### Permisos (pestaña *Repositories*)

Usa **+ Add permissions** para agregar:

| Permiso | Acceso | Para qué lo usa Codex |
|---|---|---|
| **Contents** | Read and write | Leer archivos, crear ramas, hacer commits y push |
| **Metadata** | Read-only *(obligatorio, se agrega solo)* | Leer información básica del repositorio |
| **Pull requests** | Read and write | Crear, listar, comentar y revisar PRs |

La pestaña **Account** se queda en `0` permisos.

Haz clic en **Generate token** y **copia el token inmediatamente** (empieza con `github_pat_...`). GitHub solo lo muestra una vez.

> 💡 ¿Necesitas que Codex también trabaje con issues? Agrega **Issues → Read and write**. Solo concede lo que realmente vas a usar.

---

## Paso 3 — Exportar la variable de entorno

### macOS / Linux (Bash o Zsh)

Solo para la sesión actual de la terminal:

```bash
export GITHUB_PAT_TOKEN="github_pat_XXXXXXXXXXXXXXXX"
```

Para que persista entre sesiones, agrégala a tu archivo de shell:

```bash
# Zsh (macOS por defecto)
echo 'export GITHUB_PAT_TOKEN="github_pat_XXXXXXXXXXXXXXXX"' >> ~/.zshrc
source ~/.zshrc

# Bash
echo 'export GITHUB_PAT_TOKEN="github_pat_XXXXXXXXXXXXXXXX"' >> ~/.bashrc
source ~/.bashrc
```

### Windows (PowerShell)

```powershell
# Solo la sesión actual
$env:GITHUB_PAT_TOKEN = "github_pat_XXXXXXXXXXXXXXXX"

# Persistente (abre una terminal nueva después)
setx GITHUB_PAT_TOKEN "github_pat_XXXXXXXXXXXXXXXX"
```

Verifica que la variable existe (sin imprimir el token completo):

```bash
echo ${GITHUB_PAT_TOKEN:0:11}   # debería mostrar: github_pat_
```

> ⚠️ Codex hereda las variables del shell desde donde lo lanzas. Si exportaste la variable en otra terminal, **inicia Codex en la misma** o recarga tu `.zshrc`/`.bashrc`.

---

## Paso 4 — Verificar la conexión

Desde la terminal:

```bash
codex mcp list
```

Deberías ver `github` en la lista de servidores configurados.

Dentro de Codex, usa el comando:

```
/mcp
```

para ver el servidor `github` conectado y las herramientas que expone.

Prueba con este prompt, si es exitosa la conexión:

```text
Usa el MCP de GitHub para listar los pull requests abiertos
del repositorio usuario/tu-repositorio.
```

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `401 Unauthorized` | Variable vacía o token mal copiado | Revisa `echo ${GITHUB_PAT_TOKEN:0:11}` y relanza Codex desde esa terminal |
| `403` / `Resource not accessible` | Falta un permiso o el repo no está seleccionado | Edita el token en GitHub y agrega el permiso o el repositorio |
| `github` no aparece en `/mcp` | `config.toml` en otra ruta o con error de sintaxis | Confirma la ruta (`~/.codex/config.toml` o `.codex/config.toml`) y el bloque TOML |
| Funcionaba y dejó de funcionar | El token expiró (30 días) | Regenera el token y vuelve a exportar la variable |

---

## Buenas prácticas de seguridad

- ✅ Usa **fine-grained PATs** limitados a los repositorios exactos del proyecto.
- ✅ Pon **expiración corta** y rota el token al terminar el curso o la demo.
- ❌ Nunca pegues el token en `config.toml`, en el código ni en un commit.
- ❌ No compartas capturas de pantalla donde se vea el token generado.
- 🔁 Si el token se filtra: **revócalo de inmediato** en *Settings → Developer settings → Personal access tokens*.