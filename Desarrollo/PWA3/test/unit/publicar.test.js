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

test("REQ-102 los .bat de doble clic solo llaman a los comandos con comprobaciones y no se publican", () => {
  for (const [archivo, modo] of [["publicar-vista-previa.bat", "vista-previa"], ["publicar-produccion.bat", "produccion"]]) {
    const bat = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
    assert.match(bat, new RegExp("call npm run publicar:" + modo + "\\r\\n"), archivo);
    assert.match(bat, /cd \/d "%~dp0"/);
    assert.match(bat, /\r\npause\r\n$/);
    assert.doesNotMatch(bat, /firebase /, "no despliegan por su cuenta");
  }
  assert.ok(JSON.parse(fs.readFileSync(path.join(RAIZ, "firebase.json"), "utf8")).hosting.ignore.includes("**/*.bat"));
  assert.ok(pub.EXCLUSIONES_OBLIGATORIAS.includes("**/*.bat"));
});

test("las pruebas no dependen de comandos del sistema (Windows y Linux): solo node y git", () => {
  const recorrer = carpeta => fs.readdirSync(carpeta, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? recorrer(path.join(carpeta, e.name)) : (e.name.endsWith(".js") ? [path.join(carpeta, e.name)] : []));
  recorrer(path.join(RAIZ, "test")).forEach(archivo => {
    const fuente = fs.readFileSync(archivo, "utf8");
    assert.doesNotMatch(fuente, /execSync\(\s*["'`](find|grep|ls|cat|sed|awk|head|tail)\b/, path.relative(RAIZ, archivo));
  });
});

test("REQ-104 la prueba de arranque de verificar termina (antes --smoke se ignoraba y el servidor no se cerraba)", () => {
  const { recursosLocales } = require("../servir-local.js");
  assert.deepEqual(recursosLocales('<script src="./assets/js/a.js?v=1"></script><link href="./assets/css/b.css?v=2"><img src="./x.png"><a href="#y">'),
    ["/assets/js/a.js", "/assets/css/b.css"]);
  const fuente = fs.readFileSync(path.join(RAIZ, "test", "servir-local.js"), "utf8");
  assert.match(fuente, /else if \(process\.argv\.includes\("--smoke"\)\) \{\s*pruebaDeArranque\(\);/);
  assert.match(fuente, /servidor\.close\(\);/);
  const { spawnSync } = require("node:child_process");
  const r = spawnSync(process.execPath, [path.join(RAIZ, "test", "servir-local.js"), "--smoke"], { encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Prueba de arranque OK: \d+ recursos responden/);
});
