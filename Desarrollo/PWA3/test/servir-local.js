/**
 * Servidor estatico minimo para probar PWA3 en local. Sin dependencias ni certificados.
 *
 * Es OPCIONAL: tambien vale Live Server de VSCode (ya configurado en .vscode/settings.json,
 * puerto 5502), o cualquier servidor estatico. Lo unico imprescindible es que la RAIZ servida
 * sea la carpeta PWA3, para que ./assets, ./sw.js y ./firebase-messaging-sw.js resuelvan.
 *
 *   node test/servir-local.js            ->  http://localhost:8090
 *   PORT=9000 node test/servir-local.js
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

servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log("PWA3 en local: http://localhost:" + PUERTO + "/");
  console.log("MODO PRUEBA: no desplegar. Solo sistemas con prefijo TEST_.");
  console.log("Raiz servida: " + RAIZ);
});
