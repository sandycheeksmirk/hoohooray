// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNAKWJGWCoC3nouuteomHnma5mm7AHH2A",
  authDomain: "hoohooray-e1b69.firebaseapp.com",
  projectId: "hoohooray-e1b69",
  storageBucket: "hoohooray-e1b69.firebasestorage.app",
  messagingSenderId: "195346936216",
  appId: "1:195346936216:web:344073d0a992ba01673bed",
  measurementId: "G-KYWDV2RB2S"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const analytics = typeof window !== "undefined" && app ? getAnalytics(app) : undefined;
export const db = getFirestore(app);
export { app };