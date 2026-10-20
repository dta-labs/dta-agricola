const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuración SSL autofirmado para desarrollo
const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
};

const express = require('express');
const app = express();

app.use(express.static(__dirname));

// Crear servidor HTTPS
https.createServer(options, app)
  .listen(3000, () => {
    console.log('🚀 Servidor HTTPS corriendo en: https://localhost:3000');
    console.log('📱 Abre esta URL en tu navegador para probar notificaciones push');
  });
