import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { useEffect } from "react"

function App() {

  const firebaseConfig = {
  apiKey: "AIzaSyBQYpUJcE7zi7RAjNTF4qj4Jflq4vpD-rM",
  authDomain: "pickem-pro-ab471.firebaseapp.com",
  projectId: "pickem-pro-ab471",
  storageBucket: "pickem-pro-ab471.firebasestorage.app",
  messagingSenderId: "39093532180",
  appId: "1:39093532180:web:5786502cf51322fe915901"
  };

  useEffect(() => {
    const test = async () => {
      const app = initializeApp(firebaseConfig);
      const auth = Auth.getAuth(app)

      if (!auth.currentUser) {
        console.log("No hay usuario logueado")
        return
      }

      const token = await auth.currentUser.getIdToken()

      const res = await fetch("pickem-api.llavespada-sora.workers.dev", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      console.log("Respuesta API:", data)
    }

    test()
  }, [])

  return (
    <div>
      <h1>App cargada</h1>
      <p>Mira la consola</p>
    </div>
  )
}

export default App
