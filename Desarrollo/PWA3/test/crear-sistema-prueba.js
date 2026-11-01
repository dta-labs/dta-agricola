/**
 * Crea un SISTEMA DE PRUEBA en la base de datos de Firebase.
 *
 *   set DTA_TEST_EMAIL=qa.local@dta-agricola.test
 *   set DTA_TEST_PASSWORD=TuClaveDePrueba123
 *   node test/crear-sistema-prueba.js --nombre="Estacion QA" --tipo=Sensor
 *   node test/crear-sistema-prueba.js --nombre="Camara QA"  --tipo=Nevera
 *   node test/crear-sistema-prueba.js --plantilla=-Nxxxx   (copia la FORMA de un sistema real)
 *
 * El sistema siempre se llama TEST_<algo>: los scripts de limpieza solo borran ese prefijo.
 * Entra con una CUENTA DE PRUEBA, nunca con la de un cliente.
 */
const { leerConfig, autenticar, db, dash } = require("./comun");

function arg(nombre, defecto) {
  const encontrado = process.argv.find((a) => a.startsWith("--" + nombre + "="));
  if (!encontrado) return defecto;
  return encontrado.slice(nombre.length + 3);
}

const tiene = (nombre) => process.argv.includes("--" + nombre);

function fechaDispositivo(diasAtras) {
  const d = new Date(Date.now() - diasAtras * 24 * 3600 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  let h = d.getHours();
  const sufijo = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  const hh = String(h).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${dia} ${hh}${mm}${sufijo}`;
}

async function main() {
  const config = leerConfig();
  const nombre = arg("nombre", "Sistema QA");
  const tipo = arg("tipo", "Sensor");
  const plantilla = arg("plantilla", "");
  console.log("MODO PRUEBA sobre la base de datos de produccion: " + config.databaseURL);

  const sesion = await autenticar(config, {});
  console.log("  sesion: " + sesion.email);

  let settings;
  if (plantilla) {
    console.log("  leyendo la FORMA del sistema real " + plantilla + " (solo lectura)");
    const real = await db(config, sesion.idToken, "GET", "systems/" + plantilla + "/settings");
    if (!real) throw new Error("No existe systems/" + plantilla + "/settings");
    settings = JSON.parse(JSON.stringify(real));
  } else {
    settings = {
      status: "ON",
      operationMode: 10,
      sensingMode: 1,
      sleepingTime: 10,
      sensors: {
        sensorNumber: 2,
        S1: { name: "Suelo", type: "soilMoisture", unit: "%" },
        S2: { name: "Aire", type: "temperature", unit: "C" },
      },
      plan: {},
    };
  }
  settings.name = "TEST " + nombre;
  settings.type = tipo;
  settings.status = settings.status || "ON";

  const clave = "TEST_" + nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);
  settings.key = clave;

  await db(config, sesion.idToken, "PUT", "systems/" + clave + "/settings", settings);

  // vinculos usuario <-> sistema, igual que hace la app
  await db(config, sesion.idToken, "PUT", "users/" + dash(sesion.email) + "/systems/" + clave, "propietario");
  await db(config, sesion.idToken, "PUT", "systems/" + clave + "/users/" + dash(sesion.email),
    { alias: "QA", role: "propietario" });

  // unas lecturas para que las graficas tengan algo
  const base = { S1: 42, S2: 22 };
  for (let i = 8; i >= 1; i -= 1) {
    const fecha = fechaDispositivo(i);
    await db(config, sesion.idToken, "PUT", "systems/" + clave + "/logs/" + fecha.replace(/\s+/g, "_"), {
      date: fecha,
      state: "ON",
      S1: String(base.S1 + Math.round(Math.sin(i) * 8)),
      S2: String(base.S2 + Math.round(Math.cos(i) * 4)),
    });
    await db(config, sesion.idToken, "PUT", "systems/" + clave + "/dayLogs/" + fecha.replace(/\s+/g, "_"), {
      date: fecha,
      S1: String(base.S1 + Math.round(Math.sin(i) * 6)),
      S2: String(base.S2 + Math.round(Math.cos(i) * 3)),
    });
  }

  console.log("");
  console.log("  SISTEMA DE PRUEBA CREADO");
  console.log("    clave : " + clave);
  console.log("    nombre: " + settings.name);
  console.log("    tipo  : " + tipo);
  console.log("");
  console.log("  Para verlo: abre http://localhost:8080 con la cuenta " + sesion.email);
  console.log("  Para borrarlo: node test/borrar-sistema-prueba.js");
}

main().catch((error) => {
  console.error("");
  console.error("ERROR: " + error.message);
  process.exit(1);
});
