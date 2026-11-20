/**
 * Servidor estatico minimo para probar PWA3 en local. Sin dependencias ni certificados.
 *
 * Es OPCIONAL: tambien vale Live Server de VSCode (ya configurado en .vscode/settings.json,
 * puerto 5502), o cualquier servidor estatico. Lo unico imprescindible es que la RAIZ servida
 * sea la carpeta PWA3, para que ./assets, ./sw.js y ./firebase-messaging-sw.js resuelvan.
 *
 *   node test/servir-local.js            ->  http://localhost:8090
 *   PORT=9000 node test/servir-local.js
 *   node test/servir-local.js --smoke    ->  prueba de arranque (REQ-104): sirve en un puerto libre, pide index.html,
 *                                            todos los scripts y estilos locales que enlaza y los service workers,
 *                                            y TERMINA (0 si todo responde 200; 1 con la lista de lo que falla).
 *                                            Antes el parametro se ignoraba y el servidor se quedaba escuchando:
 *                                            `npm run verificar` (y publicar) no terminaban nunca.
 *
 * Sirve la RAIZ de PWA3 (la misma carpeta que se desplegaria), con Cache-Control: no-store
 * para no pelearse con el service worker.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = Number(process.env.PORT || 8090);   // 8080 suele estar ocupado por otros servicios
const RAIZ = path.resolve(__dirname, "..");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

const servidor = http.createServer((peticion, respuesta) => {
  let ruta = decodeURIComponent(peticion.url.split("?")[0]);
  if (ruta === "/") ruta = "/index.html";
  const fichero = path.join(RAIZ, ruta);
  if (!fichero.startsWith(RAIZ)) {
    respuesta.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return respuesta.end("403 fuera de la raiz");
  }
  fs.readFile(fichero, (error, datos) => {
    if (error) {
      respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return respuesta.end("404 " + ruta);
    }
    respuesta.writeHead(200, {
      "Content-Type": TIPOS[path.extname(fichero).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    respuesta.end(datos);
  });
});

/** Rutas locales que enlaza index.html (src/href que empiezan por ./ o /, sin la parte ?v=). */
function recursosLocales(html) {
  const rutas = new Set();
  const re = /(?:src|href)="(\.?\/[^"#]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const ruta = m[1].split("?")[0].replace(/^\./, "");
    if (/\.(js|css)$/.test(ruta)) rutas.add(ruta);
  }
  return [...rutas];
}

function pedir(puerto, ruta) {
  return new Promise((resolver) => {
    http.get({ host: "127.0.0.1", port: puerto, path: encodeURI(ruta) }, (respuesta) => {
      respuesta.resume();
      respuesta.on("end", () => resolver({ ruta, estado: respuesta.statusCode }));
    }).on("error", (error) => resolver({ ruta, estado: 0, error: error.message }));
  });
}

function pruebaDeArranque() {
  servidor.listen(0, "127.0.0.1", async () => {
    const puerto = servidor.address().port;
    try {
      const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
      const rutas = ["/", "/index.html", "/sw.js", "/firebase-messaging-sw.js", "/manifest.json"]
        .filter((r) => r === "/" || fs.existsSync(path.join(RAIZ, r)))
        .concat(recursosLocales(html));
      const resultados = await Promise.all(rutas.map((r) => pedir(puerto, r)));
      const fallos = resultados.filter((r) => r.estado !== 200);
      if (fallos.length) {
        console.error("Prueba de arranque: " + fallos.length + " de " + resultados.length + " recursos no responden:");
        fallos.forEach((f) => console.error("  " + (f.estado || f.error) + "  " + f.ruta));
        process.exitCode = 1;
      } else {
        console.log("Prueba de arranque OK: " + resultados.length + " recursos responden (index.html, scripts, estilos y service workers).");
      }
    } catch (error) {
      console.error("Prueba de arranque: " + error.message);
      process.exitCode = 1;
    } finally {
      servidor.close();
    }
  });
}

if (require.main !== module) {
  // Importado desde una prueba: no arrancar nada.
} else if (process.argv.includes("--smoke")) {
  pruebaDeArranque();
} else {
  servidor.listen(PUERTO, "127.0.0.1", () => {
    console.log("PWA3 en local: http://localhost:" + PUERTO + "/");
    console.log("MODO PRUEBA: no desplegar. Solo sistemas con prefijo TEST_.");
    console.log("Raiz servida: " + RAIZ);
  });
}

module.exports = { recursosLocales };
