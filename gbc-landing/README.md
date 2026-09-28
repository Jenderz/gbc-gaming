# GBC Gaming - Landing Page & Despliegue en cPanel

Guía de despliegue para la landing page en el dominio principal (`gbc-gaming.com`) y el sistema operativo en el subdominio (`mi.gbc-gaming.com`).

---

## 📌 1. Landing Page (`gbc-gaming.com`)

- **Objetivo**: Mostrar la página en construcción a los visitantes del dominio principal.
- **Botón "Ingresar" y "Acceder al Panel"**: Ambos botones dirigen a `https://mi.gbc-gaming.com`.
- **Ubicación en cPanel**: Carpeta raíz del dominio principal (generalmente `public_html/`).

### Pasos para subir la Landing:
1. Entra a tu **cPanel** > **Administrador de Archivos** (*File Manager*).
2. Abre la carpeta `public_html/` (la raíz de `gbc-gaming.com`).
3. Sube el contenido de la carpeta local `gbc-landing/`:
   - `index.html`
   - `css/`
   - `assets/`
   - `.htaccess`
4. Al entrar a `https://gbc-gaming.com` verás la landing con el botón de ingreso apuntando a `mi.gbc-gaming.com`.

---

## 🚀 2. Instalación en la carpeta de `mi.gbc-gaming.com` en cPanel

El subdominio `mi.gbc-gaming.com` aloja el sistema de gestión (Frontend React + Backend PHP).

### Paso 1: Crear el Subdominio en cPanel
1. En cPanel, busca la sección **Dominios** (*Domains*) o **Subdominios** (*Subdomains*).
2. Haz clic en **Crear un nuevo dominio** (*Create a New Domain*).
3. Escribe: `mi.gbc-gaming.com`.
4. Desmarca la opción *"Share document root" / "Compartir raíz de documento"*.
5. cPanel te indicará la ruta de la carpeta (habitualmente será `mi.gbc-gaming.com` o `public_html/mi`).
6. Haz clic en **Enviar** (*Submit*).

---

### Paso 2: Compilar y Subir el Frontend (React)
1. En tu máquina local, compila el frontend ejecutando:
   ```bash
   cd lyberate-frontend
   npm run build
   ```
   Esto generará la carpeta `dist/`.
2. Comprime en un archivo `.zip` los archivos **que están dentro de `lyberate-frontend/dist/`** (`index.html`, carpeta `assets/`, etc.).
3. En el Administrador de Archivos de cPanel, entra a la carpeta del subdominio (ej: `mi.gbc-gaming.com`).
4. Sube y extrae el `.zip` directamente en la raíz de esa carpeta.

---

### Paso 3: Subir el Backend API (PHP)
1. Dentro de la carpeta de `mi.gbc-gaming.com`, crea una carpeta llamada **`api`**.
2. Sube todos los archivos de `lyberate-backend/` dentro de esa carpeta `api/`:
   - `index.php`
   - `.htaccess`
   - carpetas `controllers/`, `models/`, `middleware/`, `config/`, etc.
3. Edita el archivo `config/database.php` en cPanel con los datos de tu base de datos MySQL (creada previamente en cPanel > Bases de datos MySQL).
4. De esta manera, el frontend interactuará de forma nativa con `https://mi.gbc-gaming.com/api`.

---

### Paso 4: Certificado SSL (HTTPS)
1. En cPanel, ve a **SSL/TLS Status** o **Let's Encrypt SSL**.
2. Asegúrate de que `gbc-gaming.com` y `mi.gbc-gaming.com` tengan su candado verde activo (*AutoSSL*).
