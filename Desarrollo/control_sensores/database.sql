/*
  Estructura de Control de Sensores.
  En hosting compartido selecciona primero la base creada en cPanel
  (por ejemplo, dtaameri_control_sensores) y después importa este archivo.
*/

CREATE TABLE IF NOT EXISTS sensores (
  idSensor VARCHAR(191) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  alias VARCHAR(191) NULL,
  creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (idSensor),
  INDEX idx_sensores_tipo (tipo),
  INDEX idx_sensores_alias (alias)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redes_sensores (
  idRedSensores VARCHAR(191) NOT NULL,
  alias VARCHAR(191) NOT NULL,
  propietario VARCHAR(191) NULL,
  creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (idRedSensores),
  INDEX idx_redes_alias (alias),
  INDEX idx_redes_propietario (propietario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asignaciones (
  idSensor VARCHAR(191) NOT NULL,
  idRedSensores VARCHAR(191) NOT NULL,
  latitud DECIMAL(10,7) NULL,
  longitud DECIMAL(10,7) NULL,
  creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (idSensor),
  INDEX idx_asignaciones_red (idRedSensores),
  CONSTRAINT fk_asignacion_sensor FOREIGN KEY (idSensor) REFERENCES sensores (idSensor) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_asignacion_red FOREIGN KEY (idRedSensores) REFERENCES redes_sensores (idRedSensores) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

