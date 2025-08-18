// This file provides compatibility exports for components that still reference the old firebase.ts
// It re-exports from the new firebaseClient.ts file

// Re-export from firebaseClient for backward compatibility
export { app, auth, db, onAuthStateChanged } from "./firebaseClient"
