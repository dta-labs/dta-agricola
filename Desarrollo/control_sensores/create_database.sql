/*
  Solo para servidores donde el usuario tenga permisos administrativos.
  En cPanel crea la base y asigna el usuario desde "MySQL Databases".
*/
CREATE DATABASE IF NOT EXISTS control_sensores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'control_sensores_user'@'localhost' IDENTIFIED BY 'UNA_CONTRASENA_SEGURA';
GRANT SELECT, INSERT, UPDATE, DELETE ON control_sensores.* TO 'control_sensores_user'@'localhost';
FLUSH PRIVILEGES;
