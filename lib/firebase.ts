// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0Ypu_qwbzYDyFfYtWLLVH2SZI88AK7bg",
  authDomain: "ready-ride.firebaseapp.com",
  projectId: "ready-ride",
  storageBucket: "gs://ready-ride.appspot.com",
  messagingSenderId: "523639096283",
  appId: "1:523639096283:web:db8b60be89d2addc0f1dfe",
  measurementId: "G-BBVGL61Y7E",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { app, auth, db, storage }
