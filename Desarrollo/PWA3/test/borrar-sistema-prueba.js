/**
 * Lista y borra SOLO los sistemas cuyo id empieza por TEST_.
 *
 *   node test/borrar-sistema-prueba.js        -> solo lista (no borra nada)
 *   node test/borrar-sistema-prueba.js --si   -> borra de verdad
 *
 * Cualquier id que no empiece por TEST_ se ignora y se avisa. Esa es la garantia de que esto no
 * puede tocar un sistema real.
 */
const { leerConfig, autenticar, db } = require("./comun");

const PREFIJO = "TEST_";
const confirmado = process.argv.includes("--si");

async function main() {
  const config = leerConfig();
  const sesion = await autenticar(config, {});
  console.log("  sesion: " + sesion.email);

  const sistemas = (await db(config, sesion.idToken, "GET", "systems")) || {};
  const claves = Object.keys(sistemas);
  const prueba = claves.filter((k) => k.startsWith(PREFIJO));
  const reales = claves.filter((k) => !k.startsWith(PREFIJO));

  console.log("");
  console.log("  sistemas en la base de datos: " + claves.length);
  console.log("  de prueba (TEST_*):           " + prueba.length);
  console.log("  reales (se ignoran):          " + reales.length);
  console.log("");
  for (const k of prueba) {
    const nombre = sistemas[k] && sistemas[k].settings && sistemas[k].settings.name;
    console.log("    " + (confirmado ? "BORRANDO  " : "encontrado  ") + k + "   " + (nombre || ""));
  }

  if (!prueba.length) {
    console.log("  no hay nada que borrar.");
    return;
  }
  if (!confirmado) {
    console.log("");
    console.log("  Nada borrado. Repite con --si para eliminar esos " + prueba.length + " sistemas de prueba.");
    return;
  }

  for (const k of prueba) {
    if (!k.startsWith(PREFIJO)) {
      console.log("  OMITIDO (no es TEST_): " + k);
      continue;
    }
    await db(config, sesion.idToken, "DELETE", "systems/" + k);
  }

  // quitar los vinculos de los usuarios
  const usuarios = (await db(config, sesion.idToken, "GET", "users")) || {};
  for (const emailKey of Object.keys(usuarios)) {
    const vinculados = (await db(config, sesion.idToken, "GET", "users/" + emailKey + "/systems")) || {};
    for (const clave of Object.keys(vinculados)) {
      if (clave.startsWith(PREFIJO)) {
        await db(config, sesion.idToken, "DELETE", "users/" + emailKey + "/systems/" + clave);
      }
    }
  }
  console.log("  listo: " + prueba.length + " sistemas de prueba eliminados.");
}

main().catch((error) => {
  console.error("");
  console.error("ERROR: " + error.message);
  process.exit(1);
});
