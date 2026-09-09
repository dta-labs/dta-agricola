const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase)

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.sendNotifications =  functions.database.ref('notification/{notificationId}').onWrite((event) => {
    if (event.data.previous.val()) {
        return;
    }
    if (!event.data.exist()) {
        return;
    }
    const NOTIFICATION_SNAPSHOT = event.data;
    const payload = {
        notification: {
            title: `DTA-Agrícola alerta!`,
            body: `Falla de ${NOTIFICATION_SNAPSHOT.val().message}`,
            click_action: `https://${functions.config().firebase.authDomain}`
        }
    }
    console.info(payload);
});