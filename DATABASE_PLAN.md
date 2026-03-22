# Plan de Base de Datos para LoL Pick'em Pro

Para hacer que la aplicación sea funcional con múltiples usuarios, persistencia de datos y actualizaciones en tiempo real, esta es la estructura de datos que necesitarás implementar.

Recomendación tecnológica: **Supabase** (PostgreSQL) por su facilidad de uso relacional y capa gratuita generosa.

---

## 1. Tablas Maestras (Datos del Juego)

Estas tablas contienen la información oficial de la LEC (Equipos, Jugadores, Calendario).

### `splits` (Temporadas)
*Almacena la información de cada split (Invierno, Primavera, Verano).*
- `id`: String (PK) (ej: `'winter_2026'`)
- `name`: String (ej: `'Winter Split 2026'`)
- `status`: String (ej: `'active'`, `'upcoming'`, `'completed'`)
- `start_date`: Timestamp
- `end_date`: Timestamp

### `teams` (Equipos)
- `id`: String (PK) (ej: `'g2'`, `'fnc'`)
- `name`: String
- `short_name`: String (3 letras)
- `region`: String
- `logo_url`: String
- `color_hex`: String

### `players` (Jugadores)
- `id`: String (PK)
- `team_id`: String (FK -> teams.id)
- `name`: String (Nickname)
- `role`: Enum (`'TOP'`, `'JUNGLE'`, `'MID'`, `'ADC'`, `'SUPPORT'`)
- `photo_url`: String
- `fantasy_cost`: Integer (ej: `330`)
- `stats_kda`: Float
- `stats_avg_points`: Float

### `matches` (Partidos)
- `id`: UUID (PK)
- `split_id`: String (FK -> splits.id)
- `team_a_id`: String (FK -> teams.id)
- `team_b_id`: String (FK -> teams.id)
- `start_time`: Timestamp
- `stage`: String (ej: `'regular_season'`, `'playoffs'`)
- `status`: String (`'scheduled'`, `'live'`, `'finished'`)
- `winner_id`: String (FK -> teams.id) - *NULL hasta que termine el partido*

---

## 2. Tablas de Usuario (Datos de tus Amigos)

Estas tablas guardan lo que hacen tus usuarios en la app.

### `profiles` (Usuarios)
*Extiende la tabla de autenticación básica.*
- `id`: UUID (PK, vinculado a auth.users)
- `username`: String (Unique)
- `avatar_url`: String
- `total_score`: Integer (Puntuación global acumulada)
- `rank`: Integer

### `leagues` (Ligas de Amigos - Opcional)
*Para tener grupos privados de amigos.*
- `id`: UUID (PK)
- `name`: String
- `code`: String (Para invitar amigos)
- `owner_id`: UUID (FK -> profiles.id)

### `predictions` (Pick'ems)
*Guarda quién cree el usuario que ganará cada partido.*
- `id`: UUID (PK)
- `user_id`: UUID (FK -> profiles.id)
- `match_id`: UUID (FK -> matches.id)
- `predicted_winner_id`: String (FK -> teams.id)
- `points_earned`: Integer (Se calcula tras finalizar el partido)
- `created_at`: Timestamp

### `fantasy_teams` (Alineaciones Fantasy)
*El equipo de 5 jugadores que elige cada usuario.*
- `id`: UUID (PK)
- `user_id`: UUID (FK -> profiles.id)
- `split_id`: String (FK -> splits.id)
- `top_player_id`: String (FK -> players.id)
- `jng_player_id`: String (FK -> players.id)
- `mid_player_id`: String (FK -> players.id)
- `adc_player_id`: String (FK -> players.id)
- `sup_player_id`: String (FK -> players.id)
- `locked_at`: Timestamp (Fecha en que se guardó/bloqueó)

---

## Pasos para la Integración

1.  **Configurar Proyecto**: Crear proyecto en Supabase o Firebase.
2.  **Crear Tablas**: Ejecutar el script SQL basado en el esquema anterior.
3.  **Capa de Servicios**: Crear una carpeta `services/` en el frontend.
    *   `auth.ts`: Funciones de Login/Register.
    *   `api.ts`: Funciones para hacer `fetch` de los partidos y guardar predicciones.
4.  **Reemplazar Constantes**: Actualmente `constants.ts` tiene datos "hardcoded". El objetivo es que `constants.ts` desaparezca y los datos vengan de `api.ts`.
