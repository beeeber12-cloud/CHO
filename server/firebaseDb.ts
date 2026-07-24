import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { DatabaseSchema } from "../src/types";

let dbInstance: ReturnType<typeof getFirestore> | null = null;

export function getFirebaseFirestore() {
  if (dbInstance) return dbInstance;

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      
      if (config.firestoreDatabaseId) {
        dbInstance = getFirestore(app, config.firestoreDatabaseId);
      } else {
        dbInstance = getFirestore(app);
      }
      console.log("Firebase Firestore initialized successfully for project:", config.projectId);
      return dbInstance;
    }
  } catch (err) {
    console.error("Failed to initialize Firebase Firestore:", err);
  }
  return null;
}

export async function fetchFromFirestore(): Promise<DatabaseSchema | null> {
  const firestore = getFirebaseFirestore();
  if (!firestore) return null;

  try {
    const docRef = doc(firestore, "app_data", "main_db");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as DatabaseSchema;
      console.log("Loaded persistent database from Firebase Firestore.");
      return data;
    }
  } catch (err) {
    console.error("Error fetching from Firestore:", err);
  }
  return null;
}

export async function saveToFirestore(dbData: DatabaseSchema): Promise<void> {
  const firestore = getFirebaseFirestore();
  if (!firestore) return;

  try {
    const docRef = doc(firestore, "app_data", "main_db");
    await setDoc(docRef, {
      ...dbData,
      updatedAt: new Date().toISOString()
    });
    console.log("Saved database update to Firebase Firestore.");
  } catch (err) {
    console.error("Error saving to Firestore:", err);
  }
}
