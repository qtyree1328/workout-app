/* Optional cloud sync. Leave this as null and Crux stays fully local (nothing is sent anywhere).

   To turn sync on, follow README.md -> "Cloud sync with Firebase (optional)", then replace the
   null below with the config object Firebase shows you for your web app, for example:

   window.CRUX_FIREBASE = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };

   These values are not secrets: access is controlled by firestore.rules (each signed-in user can only
   read and write their own data). */
window.CRUX_FIREBASE = {
  apiKey: "AIzaSyDxBgktCLi0Tj6Z9tBITIkSo7LUVI8p8dA",
  authDomain: "hutchout-ef5f9.firebaseapp.com",
  projectId: "hutchout-ef5f9",
  storageBucket: "hutchout-ef5f9.firebasestorage.app",
  messagingSenderId: "487203953790",
  appId: "1:487203953790:web:58d378c7b43f78bb754c2f",
  measurementId: "G-1LN56N63P4"
};
