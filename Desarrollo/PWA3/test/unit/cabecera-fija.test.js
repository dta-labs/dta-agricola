"use strict";

/**
 * REQ-137 - La cabecera ya no se corta al trabajar con el mapa: alto del mapa segun el espacio real y
 * #contenido / la pagina siempre arriba (salvo mientras se escribe).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CORE = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "js", "core.js"), "utf8").replace(/\r\n/g, "\n");

test("REQ-137 el alto del mapa se ajusta al espacio visible debajo de la cabecera", () => {
  assert.match(CORE, /function ajustarAltoDelSistema\(\) \{/);
  assert.match(CORE, /const altoVisible = \(window\.visualViewport && window\.visualViewport\.height\) \|\| window\.innerHeight;/);
  assert.match(CORE, /const alto = Math\.max\(260, Math\.floor\(altoVisible - fila\.getBoundingClientRect\(\)\.top\)\);/);
  assert.match(CORE, /if \(windowsName == "sistema"\) \$timeout\(ajustarAltoDelSistema\);/);
  assert.match(CORE, /window\.visualViewport\.addEventListener\("resize", alCambiarTamano\)/);
});

test("REQ-137 #contenido y la pagina vuelven arriba si algo los desplaza, salvo al escribir en un campo", () => {
  assert.match(CORE, /function volverArriba\(\) \{\n\s*const contenido = document\.getElementById\("contenido"\);\n\s*if \(contenido && \(contenido\.scrollTop \|\| contenido\.scrollLeft\)\) \{ contenido\.scrollTop = 0; contenido\.scrollLeft = 0; \}\n\s*if \(!editandoCampo\(\) && \(window\.scrollY \|\| window\.scrollX\)\) window\.scrollTo\(0, 0\);/);
  assert.match(CORE, /contenido\.addEventListener\("scroll", volverArriba, \{ passive: true \}\);/);
  assert.match(CORE, /document\.addEventListener\("focusout", \(\) => setTimeout\(volverArriba, 150\)\);/);
  assert.match(CORE, /return !!activo && \(\/\^\(INPUT\|TEXTAREA\|SELECT\)\$\/\.test\(activo\.tagName\) \|\| activo\.isContentEditable\);/);
});
