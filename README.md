# `exchange-service` — Intercambio Navideño 2026 API

Backend independiente para `exchange-client` construido con **Node.js (v22+)**, **Express 5**, **SQLite nativo (`node:sqlite`)** y **Arquitectura Hexagonal (Puertos y Adaptadores)**, optimizado para la **capa gratuita de Fly.io**.

---

## Arquitectura Hexagonal

```text
src/
├── domain/                       # Reglas puras del negocio (sin Express ni SQLite)
│   ├── constants.js              # Valores por defecto 2026, campos configurables y roles
│   ├── errors.js                 # DomainError (statusCode + message)
│   └── validators.js             # Reglas de asignación de amigo secreto, roles y correos
├── application/                  # Casos de uso y contratos (Puertos)
│   ├── ports/index.js            # Contratos: ExchangeRepositoryPort, MailerPort, CryptoPort
│   └── use-cases/
│       ├── auth.use-cases.js
│       ├── participant.use-cases.js
│       ├── gift.use-cases.js
│       └── exchange.use-cases.js
├── infrastructure/               # Adaptadores de entrada (HTTP) y salida (DB, Cripto, SMTP)
│   ├── config/env.js             # Carga de .env y configuración
│   ├── security/aes-crypto.adapter.js            # AES-256-GCM, HMAC-SHA256, SHA-256, scrypt
│   ├── persistence/sqlite-exchange.repository.js # Adaptador SQLite (node:sqlite)
│   ├── mail/smtp-mailer.adapter.js               # Adaptador SMTP TLS/STARTTLS + outbox local
│   └── http/
│       ├── app.js                # Servidor Express + CORS
│       ├── middlewares/          # auth.middleware.js, error.middleware.js
│       └── routes/               # health, auth, participant, gift, exchange
└── index.js                      # Composition Root (inyección de dependencias)
```

---

## Ejecución local

```bash
cd /home/oswaldo/Documentos/Intercamibio/exchange-service
npm install
npm start        # o npm run dev (con auto-reload)
npm test         # pruebas de integración Express + SQLite + cifrado
```

- API local: `http://localhost:3000/api` (`GET /api/health`)
- **Base de datos limpia por defecto:** el servicio **no contiene usuarios ni contraseñas hardcodeadas**. Si no defines `ADMIN_EMAIL` y `ADMIN_PASSWORD`, arranca con 0 usuarios.
- Para crear tu administrador inicial en local, copia `.env.example` a `.env` y define `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME`.
- Feature flag de correos: `EMAIL_ENABLED=false` por defecto.

---

## Creación del Usuario Administrador en Producción (Fly.io)

Por seguridad en producción, el usuario **Super Admin** se crea únicamente a partir de los **Secrets (variables de entorno)** configurados en Fly.io al iniciar el servicio con la base de datos limpia:

1. **Antes del primer deploy** (o sobre un volumen limpio `/data`), define los secretos obligatorios en Fly.io:
   - **Desde la web de Fly.io:** entra a tu app → **Secrets** → agrega uno por uno:
     - `DATA_ENCRYPTION_KEY`: clave secreta aleatoria de 64 caracteres hex (generada con `openssl rand -hex 32`)
     - `ADMIN_EMAIL`: tu correo real de administrador
     - `ADMIN_PASSWORD`: tu contraseña segura de producción
     - `ADMIN_NAME`: tu nombre (ej. `Oswaldo`)
     - `APP_URL`: `https://TU_USUARIO.github.io/gift-exchange`
     - `CORS_ORIGINS`: `https://TU_USUARIO.github.io,http://localhost:4200`
   - **O desde CLI:**
     ```bash
     fly secrets set \
       DATA_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
       ADMIN_EMAIL="tu-admin@tudominio.com" \
       ADMIN_PASSWORD="TuPasswordSegura2026!" \
       ADMIN_NAME="Administrador" \
       APP_URL="https://TU_USUARIO.github.io/gift-exchange" \
       CORS_ORIGINS="https://TU_USUARIO.github.io,http://localhost:4200"
     ```
2. **Al iniciar la máquina en Fly.io**, el repositorio SQLite verifica si ya existe un usuario con `ADMIN_EMAIL`:
   - Si **no existe**, crea automáticamente el usuario y participante con `role = 'admin'`, `is_admin = 1`, `email_confirmed = 1`, contraseña hasheada con `scrypt` y correo/nombre cifrados con **AES-256-GCM**.
   - Si **ya existe** (en reinicios posteriores), **no lo duplica** ni sobrescribe sus datos.
3. **Verificación en logs:**
   ```bash
   fly logs
   ```
   Verás:
   `[exchange-service] Super Admin verificado/creado desde variables de entorno (ADMIN_EMAIL / ADMIN_PASSWORD).`
4. **Buena práctica adicional (opcional):** una vez que inicies sesión y confirmes acceso al Panel Admin, puedes eliminar `ADMIN_PASSWORD` de los secretos de Fly.io (`fly secrets unset ADMIN_PASSWORD` o desde **Dashboard → Secrets**) ya que tu cuenta ya quedó guardada de forma segura en el volumen persistente `/data/exchange-2026.sqlite`.
5. **Cómo reiniciar la BD en blanco en Fly.io (si alguna vez necesitas empezar de cero):**
   ```bash
   fly ssh console -C "rm -f /data/exchange-2026.sqlite /data/exchange-2026.sqlite-wal /data/exchange-2026.sqlite-shm"
   fly machine restart
   ```
   Al reiniciarse, el servicio recreará el esquema vacío de 2026 y volverá a crear únicamente el Super Admin definido en los secretos.

---

## Consideraciones de la Capa Gratuita de Fly.io

La capa gratuita personal de Fly.io otorga **$5 USD/mes de crédito de uso** (al agregar tarjeta; sin tarjeta solo da un trial temporal) y permite hasta 3 máquinas. Este proyecto está ajustado en `fly.toml` para mantenerse muy por debajo de ese límite:

| Recurso | Configuración en `fly.toml` | Costo aproximado |
| :--- | :--- | :--- |
| **Máquinas** | **1 sola máquina** (`shared-cpu-1x`, `256mb`) con `auto_stop_machines = "stop"` y `min_machines_running = 0` | ~$0.20 – $1.94 USD/mes (0 cuando está dormida) |
| **Volumen SQLite** | `1gb` montado en `/data` (`exchange_data`) | **$0.15 USD/mes** (se cobra aunque la máquina esté detenida) |
| **Red / IP** | IPv4 compartida + IPv6 (por defecto) | **$0** (no agregues IPv4 dedicada, cuesta $2/mes) |
| **Total estimado** | Cubierto holgadamente por el crédito de **$5 USD/mes** | **~$0.35 – $2.10 USD/mes** |

> **Regla crítica con SQLite en Fly.io:** usa siempre **1 sola máquina** (`--ha=false` en CLI o `1 machine` en el dashboard). Por defecto Fly intenta crear 2 máquinas para alta disponibilidad; con SQLite en un volumen local, 2 máquinas crearían 2 bases de datos separadas y además duplicarían el consumo.

---

## Formas de hacer Deploy en Fly.io

### Opción 1 (Sin CLI): Directamente desde la página web de Fly.io
Puedes desplegar todo desde tu navegador conectando tu repositorio de GitHub:

1. **Sube `exchange-service` a un repositorio de GitHub** (incluyendo `Dockerfile` y `fly.toml`, después de cambiar el campo `app` en `fly.toml` por un nombre único).
2. Entra a [https://fly.io/dashboard](https://fly.io/dashboard) e inicia sesión.
3. Haz clic en **Launch / New App** y elige **Deploy from GitHub Repository**.
4. Autoriza la **Fly.io GitHub App** y selecciona tu repositorio `exchange-service`.
5. En la pantalla de configuración web (**Launch UI**):
   - Verifica el **nombre de la app** y la **región** (ej. `dfw`).
   - En recursos / máquinas, selecciona **1 máquina** (`shared-cpu-1x`, `256MB`) y **Auto-stop: enabled** (para no gastar crédito sin tráfico).
   - Confirma el **Volumen persistente** de **1 GB** montado en `/data` (`exchange_data`).
   - En **Secrets / Environment Variables**, agrega:
     - `DATA_ENCRYPTION_KEY`: frase aleatoria larga (puedes generarla con `openssl rand -hex 32`)
     - `ADMIN_EMAIL`: correo de tu administrador
     - `ADMIN_PASSWORD`: contraseña segura del administrador
     - `ADMIN_NAME`: `Administrador`
     - `APP_URL`: `https://TU_USUARIO.github.io/gift-exchange`
     - `CORS_ORIGINS`: `https://TU_USUARIO.github.io,http://localhost:4200`
6. Haz clic en **Confirm & Deploy**. Fly.io construirá el `Dockerfile` y publicará la API automáticamente.
7. *(Opcional — Despliegue automático en cada push):* dentro de tu app en el dashboard ve a **Deployments → Settings**, activa **Auto-deploying** y elige la rama `main`.

---

### Opción 2: Despliegue automático con GitHub Actions
Este repositorio ya incluye `.github/workflows/deploy-fly.yml` (corre `npm test` y despliega con `--ha=false`):

1. Crea tu app en Fly.io (Opción 1 o CLI) y genera un token de deploy desde el dashboard de Fly.io (**Account → Tokens → Create token**) o con `fly tokens create deploy`.
2. En GitHub → repositorio `exchange-service` → **Settings → Secrets and variables → Actions → Secrets**, crea:
   - `FLY_API_TOKEN` = el token generado.
3. Haz push a `main` (o ejecuta **Actions → Deploy exchange-service to Fly.io → Run workflow**).

---

### Opción 3: Manual desde tu terminal con `flyctl`

```bash
# 1. Instalar CLI e iniciar sesión
curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Crear la app (usa el mismo nombre de fly.toml)
cd /home/oswaldo/Documentos/Intercamibio/exchange-service
fly apps create exchange-service-2026

# 3. Crear volumen persistente de 1 GB (misma región que fly.toml)
fly volumes create exchange_data --region dfw --size 1

# 4. Configurar secretos
fly secrets set \
  DATA_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  ADMIN_EMAIL="admin@tudominio.com" \
  ADMIN_PASSWORD="TuPasswordSegura2026!" \
  ADMIN_NAME="Administrador" \
  APP_URL="https://TU_USUARIO.github.io/gift-exchange" \
  CORS_ORIGINS="https://TU_USUARIO.github.io,http://localhost:4200"

# 5. Desplegar con 1 sola máquina (--ha=false)
fly deploy --ha=false
```

---

## Conectar con el Frontend en GitHub Pages (`exchange-client`)

1. Verifica que tu servicio responde:
   ```bash
   curl https://<tu-app>.fly.dev/api/health
   ```
2. En el repositorio `exchange-client` en GitHub → **Settings → Secrets and variables → Actions → Variables**, crea:
   - **Name:** `API_URL`
   - **Value:** `https://<tu-app>.fly.dev/api`
3. Ejecuta el workflow **Deploy to GitHub Pages** en `exchange-client`.
4. Inicia sesión en GitHub Pages con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

> **Nota sobre cold start:** como `auto_stop_machines = "stop"` duerme la máquina al quedar inactiva, la primera petición después de un rato puede tardar ~2–4 segundos en despertar el servidor; las siguientes respuestas son instantáneas.
