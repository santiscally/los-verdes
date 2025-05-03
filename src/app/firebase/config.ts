// src/firebase/config.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyARDrgr-cCQe_g0gVqAOEwJRsS3Ik9u-mk",
  authDomain: "los-verdes-ab4ad.firebaseapp.com",
  projectId: "los-verdes-ab4ad",
  storageBucket: "los-verdes-ab4ad.firebasestorage.app",
  messagingSenderId: "487765646559",
  appId: "1:487765646559:web:10ad810c003ee31e42dd6a"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios de Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;