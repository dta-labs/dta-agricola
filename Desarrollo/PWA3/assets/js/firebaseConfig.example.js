// PLANTILLA. Copiar este fichero a firebaseConfig.js en local y rellenar los valores.
// firebaseConfig.js esta en .gitignore: no se versiona porque lleva la clave de OpenWeather.
//
//   copy assets\js\firebaseConfig.example.js assets\js\firebaseConfig.js
//
// Nota: la apiKey de Firebase es un identificador publico del proyecto, no un secreto;
// la seguridad depende de las reglas de la base de datos. La clave de OpenWeather SI es un
// secreto y su sitio correcto es una Cloud Function, nunca el navegador.

var config = {
    apiKey: "<FIREBASE_WEB_API_KEY>",
    authDomain: "<PROYECTO>.firebaseapp.com",
    databaseURL: "https://<PROYECTO>.firebaseio.com",
    projectId: "<PROYECTO>",
    storageBucket: "<PROYECTO>.appspot.com",
    messagingSenderId: "<SENDER_ID>",
    appId: "<APP_ID>",
    measurementId: "<MEASUREMENT_ID>"
};

const OPENWEATHER_API_KEY = "<OPENWEATHER_API_KEY>";
