import { getAuth } from "firebase/auth"
import { useEffect } from "react"

export default function TestApi() {
  useEffect(() => {
    const test = async () => {
      const auth = getAuth()

      if (!auth.currentUser) {
        console.log("No hay usuario logueado")
        return
      }

      // 🔐 1. Obtener token de Firebase
      const token = await auth.currentUser.getIdToken()

      // 🌍 2. Llamar a tu Worker
      const res = await fetch("https://pickemapp.pages.dev", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // 📦 3. Ver respuesta
      const data = await res.json()
      console.log("Respuesta API:", data)
    }

    test()
  }, [])

  return <div>Mira la consola 👀</div>
}
