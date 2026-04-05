import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// THIS IS WHERE YOU PASTE YOUR FIREBASE CONFIG
// REPLACE THE ENTIRE object below with the one you saved in your notebook!
window.__firebase_config = JSON.stringify({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

window.__app_id = "blister-sisters-prod";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
