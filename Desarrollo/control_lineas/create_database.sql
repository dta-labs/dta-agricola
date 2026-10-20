/*
  Ejecuta este archivo solamente si tu usuario MySQL tiene permiso
  para crear bases de datos y usuarios. En hosting compartido normalmente
  debes realizar estos pasos desde cPanel, Plesk o el panel del proveedor.
*/

CREATE DATABASE IF NOT EXISTS control_lineas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

/* Cambia la contraseña antes de ejecutar las sentencias siguientes. */
CREATE USER IF NOT EXISTS 'control_lineas_user'@'localhost'
  IDENTIFIED BY 'UNA_CONTRASENA_SEGURA';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON control_lineas.*
  TO 'control_lineas_user'@'localhost';

FLUSH PRIVILEGES;
