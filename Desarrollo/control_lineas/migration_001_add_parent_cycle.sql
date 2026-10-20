/*
  Migración para bases existentes de Línea Clara.
  Selecciona la base de datos de la aplicación en phpMyAdmin antes de ejecutar.
  Ejecuta este archivo una sola vez.
*/

ALTER TABLE phone_lines
  ADD COLUMN parent_account VARCHAR(160) NULL AFTER client,
  ADD COLUMN cycle VARCHAR(80) NULL AFTER parent_account,
  ADD INDEX idx_phone_lines_parent_account (parent_account),
  ADD INDEX idx_phone_lines_cycle (cycle);
