/*
  Línea Clara - estructura de tablas
  Compatible con MySQL 8.0+ y MariaDB 10.4+.

  IMPORTANTE: selecciona primero la base de datos creada desde el panel
  de tu hosting y después importa este archivo.
*/

CREATE TABLE IF NOT EXISTS phone_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  iccid VARCHAR(22) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  client VARCHAR(160) NOT NULL,
  parent_account VARCHAR(10) NULL,
  cycle VARCHAR(5) NULL,
  device VARCHAR(80) NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  installed_at DATE NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_phone_lines_iccid (iccid),
  KEY idx_phone_lines_phone (phone),
  KEY idx_phone_lines_client (client),
  KEY idx_phone_lines_parent_account (parent_account),
  KEY idx_phone_lines_cycle (cycle),
  KEY idx_phone_lines_status (status),
  KEY idx_phone_lines_updated_at (updated_at)
) ENGINE=InnoDB;

/* La tabla ha quedado creada. Configura sus credenciales en api/config.php. */
