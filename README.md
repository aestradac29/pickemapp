# 🏆 Pick'em Pro — League of Legends Predictions & Fantasy

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_&_Auth-FFCA28?logo=firebase&logoColor=black&style=flat-square)](https://firebase.google.com/)

**Pick'em Pro** es una plataforma web full-stack premium e interactiva diseñada para organizar torneos de predicciones (Pick'ems) y ligas de **Fantasy de League of Legends** entre amigos. Cuenta con análisis avanzados, seguimiento en tiempo real y un potente panel de administración para gestionar jornadas, resultados, estadísticas detalladas y resolución de conflictos.

---

## ✨ Características Principales

### 🔮 1. Sistema de Pick'em (Predicciones)
* **Gestión por Jornadas (Matchdays):** Visualiza el calendario de partidos y realiza predicciones de los ganadores de cada serie.
* **Bloqueo Inteligente de Picks:** El sistema bloquea de forma automática los picks individuales para cada partido según su hora exacta de inicio (`startTime`), evitando modificaciones a destiempo.
* **Modo Espectador:** Permite ver las predicciones de otros usuarios de manera segura una vez que la jornada ha sido cerrada o el partido ha comenzado.
* **Fórmula Determinista:** En caso de que un usuario no guarde su pick a tiempo, el sistema cuenta con algoritmos deterministas o elecciones seguras para la resolución equitativa del juego.

### 🏔️ 2. Playoffs & Brackets
* Soporte para fases de eliminación directa y brackets dinámicos (Winners & Losers brackets).
* Multiplicadores específicos de puntuación para fases avanzadas (por ejemplo, x1.15 para Winners Bracket y x1.25 para la Gran Final).
* Posibilidad de editar títulos y etiquetas personalizadas para los brackets desde el rol de administrador.

### ⚔️ 3. Liga de Fantasy ("High Stakes")
Un completo módulo de Fantasy con un sistema de puntuación diseñado para premiar el juego agresivo y castigar los errores tácticos:
* **Draft de Equipo:** Configura tu alineación ideal compuesta por un Top, Jungla, Mid, ADC, y Support, además de seleccionar un **Capitán** que otorgará un **multiplicador de x1.5** a sus puntos.
* **Estadísticas Específicas por Rol:**
  * **TOP:** Bonos adicionales por daño al equipo ≥25%, daño a torretas ≥5000, y farm impecable (MPM ≥8.5).
  * **JUNGLE:** Recompensas colectivas por obtención del Alma de Dragón (≥4 dragones) y Barones asegurados.
  * **MID:** Bonos por daño al equipo ≥30% y daño a torretas ≥5000.
  * **ADC:** Puntuación extra por daño por minuto masivo (DPM ≥1000).
  * **SUPPORT:** Recompensas por puntuación de visión (factor x0.03), obtención de 10+ asistencias y control de primer dragón de la partida.
* **Desglose de Puntos (Breakdown Modal):** Los usuarios pueden pulsar sobre la puntuación de cualquier jugador para abrir un desglose interactivo detallado juego por juego (con soporte para ajustes de Spring Split BO5 con factor `3/5`).

### 🛡️ 4. Herramientas Avanzadas de Administración
* **Transición de Jornadas (Procesamiento de Precios):** Algoritmo automatizado que calcula el rendimiento del jugador en la jornada y actualiza dinámicamente sus costes de mercado para la siguiente semana.
* **Arrastre Automático (Carry Over):** Sistema inteligente que migra de forma automatizada las plantillas de los usuarios activos entre jornadas consecutivas para mitigar olvidos de alineaciones.
* **Inspector de Jornadas:** Panel de auditoría visual en tiempo real para examinar documentos corruptos de la base de datos de cualquier usuario de manera interactiva.
* **Consola de Recuperación de Emergencia:** Permite restaurar de forma masiva los equipos de los usuarios en una jornada específica desde el snapshot activo o datos históricos adyacentes.
* **Exclusión/Anulación de Jornadas:** Permite excluir (anular) jornadas específicas del cálculo del ranking global con un solo clic desde la interfaz de administración, recalculando al instante la tabla de clasificación.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion, Recharts.
* **Backend:** Express & Node.js, integrado con Vite en desarrollo mediante un middleware unificado.
* **Base de Datos & Auth:** Firebase (Firestore para almacenamiento reactivo de documentos y colecciones, Firebase Auth para perfiles seguros).
* **Entorno de Compilación:** Vite, TSX para ejecución ágil de servidores en TypeScript.

---

## 🚀 Instalación y Configuración Local

Sigue estos pasos para levantar la aplicación en tu entorno local.

### 📋 Prerrequisitos
* **Node.js** (versión 18 o superior recomendada)
* Una cuenta de **Firebase** para configurar tu propia base de datos de Firestore.

### 📦 Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/pickem-pro.git
cd pickem-pro
```

### ⚙️ Paso 2: Instalar Dependencias
Puedes usar npm, yarn o bun:
```bash
npm install
```

### 🔑 Paso 3: Configurar las Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basándote en `.env.example` si existe) y añade las credenciales de tu proyecto de Firebase. 

*Nota: Asegúrate de que las variables del cliente comiencen con `VITE_` para que Vite pueda cargarlas correctamente.*

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### ⚡ Paso 4: Levantar el Servidor de Desarrollo
Para levantar el servidor local con soporte completo para la API y middlewares de Vite de forma conjunta:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 🏗️ Paso 5: Compilar para Producción
Para generar los archivos estáticos listos para desplegar:
```bash
npm run build
```

---

## 📜 Reglas del Sistema de Puntuación (Fantasy)

| Estadística | Valor Base | Notas |
| :--- | :--- | :--- |
| **Kills (Asesinatos)** | `+1.5` | — |
| **Deaths (Muertes)** | `-1.0` | Sanción por muerte |
| **Assists (Asistencias)**| `+1.0` | — |
| **CS (Minions)** | `+0.01` | Por unidad eliminada |
| **Victoria de Mapa** | `+1.0` o `+3.0`| Sube a +3.0 en Spring Split |
| **MVP de la partida** | `+3.0` | Elegido oficialmente |
| **First Blood** | `+1.0` | — |
| **Partidazo (10+ Kills)**| `+3.0` | Premio por impacto masivo |
| **KDA Perfecto** | `+3.0` | 0 muertes con KDA ≥ 5 |
| **Doble Kill** | `+1.0` | — |
| **Triple Kill** | `+2.0` | — |
| **Quadra Kill** | `+3.0` | — |
| **Penta Kill** | `+4.0` | — |

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo `LICENSE` para obtener más información.

---

### 🌟 Contribuciones
¡Las contribuciones, sugerencias y reportes de fallos son bienvenidos! Siéntete libre de abrir un *Issue* o realizar un *Pull Request*. 

*Hecho con 💙 para los amantes del competitivo de League of Legends.*
