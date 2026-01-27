import { getAuth } from "firebase/auth"
import { useEffect } from "react"

function App() {
  useEffect(() => {
    const test = async () => {
      const auth = getAuth()

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
