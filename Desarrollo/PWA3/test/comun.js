/**
 * Utilidades compartidas por los scripts de prueba.
 *
 * Lee la configuracion de ../assets/js/firebaseConfig.js (fichero LOCAL, ignorado por git) y habla
 * con Firebase por REST con la cuenta de prueba: no hace falta ninguna clave de administrador.
 */
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const CONFIG = path.join(RAIZ, "assets", "js", "firebaseConfig.js");

function leerConfig() {
  if (!fs.existsSync(CONFIG)) {
    throw new Error(
      "Falta assets/js/firebaseConfig.js.\n" +
      "Copialo desde el ejemplo:  copy assets\\js\\firebaseConfig.example.js assets\\js\\firebaseConfig.js"
    );
  }
  const texto = fs.readFileSync(CONFIG, "utf8");
  const apiKey = (texto.match(/apiKey:\s*"([^"]+)"/) || [])[1];
  const databaseURL = (texto.match(/databaseURL:\s*"([^"]+)"/) || [])[1];
  if (!apiKey || !databaseURL) {
    throw new Error("firebaseConfig.js no tiene apiKey o databaseURL. Revisa el fichero.");
  }
  return { apiKey, databaseURL };
}

async function autenticar(config, opciones) {
  const email = process.env.DTA_TEST_EMAIL || opciones.email;
  const password = process.env.DTA_TEST_PASSWORD || opciones.password;
  if (!email || !password) {
    throw new Error("Faltan credenciales de prueba. Usa DTA_TEST_EMAIL y DTA_TEST_PASSWORD.");
  }
  for (const verbo of ["signInWithPassword", "signUp"]) {
    const respuesta = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:${verbo}?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const datos = await respuesta.json();
    if (respuesta.ok) {
      if (verbo === "signUp") console.log("  cuenta de prueba creada: " + email);
      return { idToken: datos.idToken, usuario: datos.localId, email: datos.email };
    }
    if (verbo === "signInWithPassword") {
      console.log("  no se pudo entrar con esa cuenta, se intenta crearla...");
      continue;
    }
    throw new Error("Firebase Auth: " + (datos.error && datos.error.message || "error desconocido"));
  }
}

const dash = (email) => email.replace(/\./g, "-");

async function db(config, token, metodo, ruta, cuerpo) {
  const url = `${config.databaseURL}/${ruta}.json?auth=${token}`;
  const respuesta = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) {
    throw new Error(`DB ${metodo} ${ruta}: HTTP ${respuesta.status} ${await respuesta.text()}`);
  }
  const texto = await respuesta.text();
  return texto ? JSON.parse(texto) : null;
}

module.exports = { leerConfig, autenticar, db, dash };
