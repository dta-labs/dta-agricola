# Línea Clara

PWA en HTML, CSS y JavaScript con API PHP y almacenamiento MySQL.

## Instalación en el servidor

1. Requiere PHP 8.1 o posterior con la extensión `pdo_mysql`, y MySQL 8/MariaDB 10.4 o posterior.
2. En hosting compartido, crea la base de datos y su usuario desde cPanel/Plesk. Selecciona esa base en phpMyAdmin y después importa `database.sql`.
3. En un servidor administrado donde tengas permisos globales, puedes ejecutar primero `create_database.sql` y después importar `database.sql` dentro de `control_lineas`.
4. Edita `api/config.php` con el nombre real de la base, host, usuario y contraseña. Algunos proveedores agregan un prefijo al nombre y al usuario.
5. Si tu hosting permite variables de entorno, también puedes usar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
6. Publica todo el contenido de esta carpeta en el mismo dominio. La PWA consulta `./api/index.php`, por lo que no necesita CORS.
7. Usa HTTPS para habilitar la instalación de la PWA y el service worker.

## API

- `GET api/index.php`: lista registros.
- `POST api/index.php`: crea un registro mediante JSON.
- `PUT api/index.php?id=1`: actualiza un registro.
- `DELETE api/index.php?id=1`: elimina un registro.
- `DELETE api/index.php?all=1`: elimina todos los registros.

La API utiliza PDO, consultas preparadas, validación del servidor y respuestas JSON.

## Diagnóstico de conexión

Abre `https://tu-dominio/ruta/api/index.php?health=1`. Si la conexión está
correcta responderá con `ok: true`. En caso contrario indicará si fallan las
credenciales, el nombre de la base, los permisos, `pdo_mysql` o la tabla.
