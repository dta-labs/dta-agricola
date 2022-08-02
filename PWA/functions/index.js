const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase)

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.sendNotifications = functions.database.ref('/systems/{systemId}/logs/{logId}').onWrite((change, context) => {
    // if (change.before.exists()) {
    //     return;
    // } else {

    const NOTIFICATION_SNAPSHOT = change.after.val();
    let msg = ((NOTIFICATION_SNAPSHOT.voltage == "false" && NOTIFICATION_SNAPSHOT.state == "ON" && NOTIFICATION_SNAPSHOT.date == NOTIFICATION_SNAPSHOT.update) ? "electricidad" : 
                (NOTIFICATION_SNAPSHOT.safety == "false" && NOTIFICATION_SNAPSHOT.state == "ON" && NOTIFICATION_SNAPSHOT.date == NOTIFICATION_SNAPSHOT.update) ? "seguridad" : "");

    if (msg != "") {

        const systemId = context.params.systemId;

        admin.database().ref('/systems/' + systemId + '/settings/name').once('value').then((name) => {

            const payload = {
                notification: {
                    title: `DTA-Agrícola alerta!`,
                    body: `Falla de ${msg} en ${name.val()}`,
                    icon: `https://dta-agricola.web.app/assets/images/DTA-Agricola.png`,
					sound: `https://dta-agricola.web.app/assets/sounds/alarma-de-evacuacin-evacuacion.mp3`,
                    click_action: `https://dta-agricola.web.app/`
                    // click_action: `https://${functions.config().firebase.authDomain}`
                }
            }

            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24 //24 hours
            };

            return admin.database().ref('/users').once('value').then((data) => {

                const snapshot = data.val();
                console.info(snapshot);
                const tokens = [];

                for (let key in snapshot) {
                    if (snapshot[key].token) {
                        tokens.push(snapshot[key].token);
                    }
                }

                return admin.messaging().sendToDevice(tokens, payload)
                    .then((response) => {
                        console.log("Mensaje correctamente enviado:", response);
                        console.log(response.results[0].error);
                    })
                    .catch((error) => {
                        console.log("Error sending message:", error);
                    });
            });


            // return admin.database().ref('/tokens').once('value').then((data) => {

            //     const snapshot = data.val();
            //     const tokens = [];
            //     const tokensWithKey = [];

            //     for (let key in snapshot) {
            //         tokens.push(snapshot[key].token);
            //         tokensWithKey.push({
            //             token: snapshot[key].token,
            //             key: key
            //         });
            //     }

            //     function cleanInvalidTokens(tokensWithKey, results) {
            //         const invalidTokens = [];
            //         results.forEach((result, i) => {
            //             if (!result.error.code) return;
            //             console.error("Error con el token: " + tokensWithKey[i].key);
            //             switch (result.error.code) {
            //                 case "messaging/invalid-registration-token":
            //                 case "messaging/registration-token-not-registered":
            //                     invalidTokens.push(admin.database().ref("/tokens").child(NOTIFICATION_SNAPSHOT.key).remove());
            //                     break;
            //                 default:
            //                     break;
            //             }
            //         });
            //         return Promise.all(invalidTokens);
            //     }

            //     return admin.messaging().sendToDevice(tokens, payload)
            //         .then((response) => {
            //             cleanInvalidTokens(tokensWithKey, response.results);
            //             console.log("Mensaje correctamente enviado:", response);
            //             console.log(response.results[0].error);
            //         })
            //         .then(() => {
            //             admin.database().ref("/notifications").child(tokensWithKey[i].key).remove();
            //         })
            //         .catch((error) => {
            //             console.log("Error sending message:", error);
            //         });
            // });

        });
    }
    // }
});

