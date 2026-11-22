/**
 * REQ-149 - Reglas puras de las alertas push de sensores (sin Firebase, para probarlas en Node).
 *
 * - Redes de sensores (dayLogs, 8 valores por sensor): humedad relativa (`hr`). Humedad del suelo (`h`) y
 *   temperatura (`t`) siguen en index.js.
 * - Neveras e invernaderos (logs, 3 valores por sensor):
 *     SHT2 [hr, t, vcc] -> temperatura (`t`) y humedad relativa (`h`)
 *     Psi  [p, p2, vcc] -> presion (`psi`)     Fl [q, q2, vcc] -> caudal (`fl`)     Irms [i, i2, vcc] -> corriente (`i`)
 *     Contact (puerta) no tiene limites.
 * Solo se avisa del parametro cuyo bloque tiene la casilla "avisar" (`<param>.notify`) marcada (REQ-054/145).
 */
"use strict";

const VALORES_POR_SENSOR_NEVERA = 3;
const SENSORES_MAXIMOS = 10;
const TIPOS_NEVERA = new Set(["Nevera", "Invernadero"]);

function numero(valor) {
  if (valor === null || valor === undefined || valor === "" || valor === "NaN" || valor === "NAN") return null;
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function datosCrudos(dataRaw) {
  if (Array.isArray(dataRaw)) return dataRaw;
  if (typeof dataRaw !== "string") return [];
  try {
    const d = JSON.parse(dataRaw);
    return Array.isArray(d) ? d : [];
  } catch (e) {
    return [];
  }
}

function avisar(umbrales) {
  return !!(umbrales && (umbrales.notify === true || umbrales.notify === "true"));
}

/** Cruce de umbral: { direction: "baja"|"alta", threshold, thresholdKind: "lower"|"upper" } o null. */
function cruce(valor, umbrales) {
  if (valor === null || !umbrales) return null;
  let min = numero(umbrales.minValue);
  let max = numero(umbrales.maxValue);
  if (min !== null && max !== null && min > max) { const x = min; min = max; max = x; }
  if (min !== null && valor < min) return { direction: "baja", threshold: min, thresholdKind: "lower" };
  if (max !== null && valor > max) return { direction: "alta", threshold: max, thresholdKind: "upper" };
  return null;
}

// Parametros de neveras/invernaderos por tipo de sensor: campo de umbrales, posicion del valor y textos.
const PARAMETROS_NEVERA = {
  SHT2: [
    { campo: "t", posicion: 1, metric: "Temperatura", unit: " C", baja: "Temperatura baja", alta: "Temperatura alta" },
    { campo: "h", posicion: 0, metric: "Humedad relativa", unit: "%", baja: "Humedad baja", alta: "Humedad alta" },
  ],
  Psi: [{ campo: "psi", posicion: 0, metric: "Presión", unit: " psi", baja: "Presión baja", alta: "Presión alta" }],
  Fl: [{ campo: "fl", posicion: 0, metric: "Caudal", unit: " L/min", baja: "Caudal bajo", alta: "Caudal alto" }],
  Irms: [{ campo: "i", posicion: 0, metric: "Corriente", unit: " A", baja: "Corriente baja", alta: "Corriente alta" }],
  Contact: [],
};

function claveDeSensor(sensors, indice) {
  return sensors && sensors[`S${indice}`] ? `S${indice}` : `S${indice + 1}`;
}

/** Alertas de un registro de nevera/invernadero (logs/{id}): una por sensor y parametro fuera de sus limites. */
function alertasDeNevera(log, sensors) {
  const datos = datosCrudos(log && log.dataRaw);
  const total = Math.min(numero(sensors && sensors.sensorNumber) || SENSORES_MAXIMOS, SENSORES_MAXIMOS);
  const alertas = [];
  for (let indice = 0; indice < total; indice += 1) {
    const sensorKey = claveDeSensor(sensors, indice);
    const sensor = sensors && sensors[sensorKey];
    if (!sensor || !sensor.id) continue;
    const parametros = PARAMETROS_NEVERA[sensor.type] || PARAMETROS_NEVERA.SHT2;   // sin tipo: SHT2
    parametros.forEach((p) => {
      const umbrales = sensor[p.campo];
      if (!avisar(umbrales)) return;
      const value = numero(datos[indice * VALORES_POR_SENSOR_NEVERA + p.posicion]);
      const c = cruce(value, umbrales);
      if (!c) return;
      alertas.push({
        sensor: `S${indice + 1}`,
        sensorKey,
        sensorLabel: sensor.alias || sensor.id || sensorKey,
        metric: p.metric,
        metricKey: p.campo,
        value,
        unit: p.unit,
        direction: c.direction,
        threshold: c.threshold,
        thresholdKind: c.thresholdKind,
        message: c.direction === "baja" ? p.baja : p.alta,
      });
    });
  }
  return alertas;
}

/** Alerta de humedad relativa de un sensor de red (lectura de getSensorReadings: values.Hr y sensor.hr). */
function alertaDeHumedadRelativa(lectura) {
  if (!lectura || !lectura.sensor || !avisar(lectura.sensor.hr)) return null;
  const value = numero(lectura.values && lectura.values.Hr);
  const c = cruce(value, lectura.sensor.hr);
  if (!c) return null;
  return {
    sensor: lectura.sensorName,
    sensorKey: lectura.sensorKey,
    sensorLabel: lectura.sensorLabel,
    metric: "Humedad relativa",
    metricKey: "Hr",
    value,
    unit: "%",
    direction: c.direction,
    threshold: c.threshold,
    thresholdKind: c.thresholdKind,
    message: c.direction === "baja" ? "Humedad relativa baja" : "Humedad relativa alta",
  };
}

function firma(alerta) {
  return `${alerta.sensorKey || alerta.sensor}:${alerta.metricKey}:${alerta.thresholdKind}`;
}

/**
 * Cuales alertas de nevera se envian: al cruzar el umbral (no estaba en el registro anterior) o, si sigue fuera,
 * como recordatorio cada 3 h (`puedeRecordar(alerta)` decide; en index.js es una transaccion en la base).
 * Las camaras se vigilan tambien de noche (sin la pausa nocturna de las redes de sensores).
 */
async function alertasANotificar(actuales, anteriores, puedeRecordar) {
  const previas = new Set((anteriores || []).map(firma));
  const salida = [];
  for (const alerta of actuales || []) {
    if (!previas.has(firma(alerta))) {
      if (await puedeRecordar(alerta, true)) salida.push(alerta);
    } else if (await puedeRecordar(alerta, false)) {
      salida.push(alerta);
    }
  }
  return salida;
}

module.exports = {
  TIPOS_NEVERA,
  PARAMETROS_NEVERA,
  numero,
  datosCrudos,
  cruce,
  alertasDeNevera,
  alertaDeHumedadRelativa,
  alertasANotificar,
  firma,
};
