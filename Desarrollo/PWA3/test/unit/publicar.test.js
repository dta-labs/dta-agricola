"use strict";

/**
 * REQ-102 - Publicar con comprobaciones (sustituye al antiguo deploy.bat).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pub = require("../../scripts/publicar.js");

const RAIZ = path.join(__dirname, "..", "..");

test("REQ-102 firebase.json excluye secretos y carpetas internas (si no, no se publica)", () => {
  assert.deepEqual(pub.exclusionesQueFaltan(JSON.parse(fs.readFileSync(path.join(RAIZ, "firebase.json"), "utf8"))), []);
  assert.deepEqual(pub.exclusionesQueFaltan({ hosting: { ignore: ["server.key"] } }).sort(),
    pub.EXCLUSIONES_OBLIGATORIAS.filter(x => x !== "server.key").sort());
  assert.equal(pub.exclusionesQueFaltan({}).length, pub.EXCLUSIONES_OBLIGATORIAS.length);
});

test("REQ-102 git: los cambios sin guardar bloquean; los archivos nuevos solo avisan", () => {
  assert.deepEqual(pub.clasificarEstadoGit(" M assets/js/core.js\nD  viejo.js\n?? assets/images/copia.png\n"),
    { cambios: ["assets/js/core.js", "viejo.js"], nuevos: ["assets/images/copia.png"] });
  assert.deepEqual(pub.clasificarEstadoGit(""), { cambios: [], nuevos: [] });
});

test("REQ-102 comandos de firebase: vista previa en el canal pwa3; produccion con --only hosting", () => {
  assert.deepEqual(pub.argumentosFirebase("vista-previa"), ["hosting:channel:deploy", "pwa3", "--expires", "7d"]);
  assert.deepEqual(pub.argumentosFirebase("produccion"), ["deploy", "--only", "hosting"]);
  assert.throws(() => pub.argumentosFirebase("otro"), /Modo desconocido/);
});

test("REQ-102 scripts de npm y produccion con confirmacion escrita", () => {
  const paquete = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));
  assert.equal(paquete.scripts["publicar:vista-previa"], "node scripts/publicar.js vista-previa");
  assert.equal(paquete.scripts["publicar:produccion"], "node scripts/publicar.js produccion");
  const fuente = fs.readFileSync(path.join(RAIZ, "scripts", "publicar.js"), "utf8");
  assert.match(fuente, /if \(respuesta\.trim\(\) !== "PUBLICAR"\) detener\("Cancelado\."\);/);
  assert.match(fuente, /ejecutar\("npm", \["run", "verificar"\]/);
  const promote = fs.readFileSync(path.join(RAIZ, "PROMOTE.md"), "utf8");
  assert.doesNotMatch(promote, /^\s+firebase deploy --only hosting:dta-agricola\s*$/m, "el comando que fallaba ya no se indica");
});
