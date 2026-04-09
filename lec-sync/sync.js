/**
 * sync.js — Sincronizador automático de resultados LEC → Firestore
 *
 * Flujo:
 *  1. Consulta la API de Lolesports para obtener partidos LEC recientes/en directo
 *  2. Carga los partidos pendientes de la app desde Firestore
 *  3. Por cada partido que haya terminado en Lolesports y esté sin completar
 *     en Firestore, lo actualiza con el ganador correcto.
 *
 * Variables de entorno necesarias:
 *  FIREBASE_PROJECT_ID      — p.ej. "pickem-pro-12345"
 *  FIREBASE_CLIENT_EMAIL    — del service account JSON
 *  FIREBASE_PRIVATE_KEY     — del service account JSON (con \n reales)
 *  SPLIT_ID                 — "spring_2026" | "winter_2026" | "summer_2026"
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ─── Configuración ────────────────────────────────────────────────────────────

const LOLESPORTS_API = "https://esports-api.lolesports.com/persisted/gw";
const API_KEY = "0TvQnueqKa5mxJntVWt0w4LlLfW6krZa"; // Clave pública de la comunidad
const LEAGUE_SLUG = "lec";

// Mapa de shortnames de Lolesports → IDs internos de la app
// Ajusta si añades/cambias equipos en la app
const TEAM_SLUG_MAP = {
  FNC: "fnc",
  GX: "gx",
  G2: "g2",
  KC: "kc",
  KOI: "mkoi",
  NAVI: "navi",
  SK: "sk",
  SHF: "shf",
  TH: "th",
  VIT: "vit",
};

// ─── Firebase Admin ───────────────────────────────────────────────────────────

function initFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // GitHub Actions almacena el \n como literal; lo convertimos de vuelta
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de entorno: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return getFirestore();
}

// ─── Helpers de nombre de documento (igual que _getDocName en la app) ─────────

function getDocName(baseName, splitId) {
  const normalized = normalizeSplitId(splitId);
  if (normalized === "winter_2026") return baseName;
  return `${baseName}_${normalized}`;
}

function normalizeSplitId(splitId) {
  if (!splitId) return "winter_2026";
  const s = splitId.toLowerCase();
  if (s.includes("spring")) return "spring_2026";
  if (s.includes("summer")) return "summer_2026";
  return "winter_2026";
}

// ─── Lolesports API ───────────────────────────────────────────────────────────

async function fetchLeagues() {
  const url = `${LOLESPORTS_API}/getLeagues?hl=es-ES`;
  const res = await fetch(url, { headers: { "x-api-key": API_KEY } });
  if (!res.ok) throw new Error(`getLeagues HTTP ${res.status}`);
  const json = await res.json();
  return json.data.leagues;
}

async function fetchSchedule(leagueId) {
  const url = `${LOLESPORTS_API}/getSchedule?hl=es-ES&leagueId=${leagueId}`;
  const res = await fetch(url, { headers: { "x-api-key": API_KEY } });
  if (!res.ok) throw new Error(`getSchedule HTTP ${res.status}`);
  const json = await res.json();
  return json.data.schedule.events || [];
}

async function getLecLeagueId() {
  const leagues = await fetchLeagues();
  const lec = leagues.find(
    (l) => l.slug?.toLowerCase() === LEAGUE_SLUG
  );
  if (!lec) throw new Error("No se encontró la LEC en la API de Lolesports");
  return lec.id;
}

/**
 * Devuelve solo los partidos completados de las últimas ~4 semanas.
 * Cada evento tiene: startTime, state ("completed"|"unstarted"|"inProgress"),
 * match.teams[{name, code, result:{outcome:"win"|"loss"}}]
 */
async function getCompletedLecMatches() {
  const leagueId = await getLecLeagueId();
  const events = await fetchSchedule(leagueId);
  return events.filter((e) => e.type === "match" && e.state === "completed");
}

// ─── Lógica principal ─────────────────────────────────────────────────────────

async function sync() {
  const splitId = process.env.SPLIT_ID || "spring_2026";
  console.log(`\n🔄 Iniciando sync — Split: ${splitId}\n`);

  // 1. Conectar a Firestore
  const db = initFirebase();

  // 2. Cargar partidos de la app desde Firestore
  const matchesDocName = getDocName("matches", splitId);
  const docRef = db.collection("admin_data").doc(matchesDocName);
  const snap = await docRef.get();

  if (!snap.exists) {
    console.log("⚠️  No existe el documento de partidos en Firestore. Nada que hacer.");
    return;
  }

  const allMatches = snap.data().allMatches || [];
  const pending = allMatches.filter((m) => !m.isCompleted);

  if (pending.length === 0) {
    console.log("✅ No hay partidos pendientes en la app.");
    return;
  }

  console.log(`📋 Partidos pendientes en la app: ${pending.length}`);

  // 3. Obtener partidos completados de Lolesports
  let lecCompleted;
  try {
    lecCompleted = await getCompletedLecMatches();
  } catch (err) {
    console.error("❌ Error al consultar la API de Lolesports:", err.message);
    process.exit(1);
  }

  console.log(`🌐 Partidos completados en Lolesports (últimas semanas): ${lecCompleted.length}`);

  // 4. Cruzar por fecha + equipos
  let updated = 0;

  for (const appMatch of pending) {
    const appTime = new Date(appMatch.startTime).getTime();
    const teamACode = appMatch.teamA?.shortName?.toUpperCase();
    const teamBCode = appMatch.teamB?.shortName?.toUpperCase();

    if (!teamACode || !teamBCode) continue;

    // Buscar en Lolesports un partido donde los mismos equipos jugaron en ±3h
    const match = lecCompleted.find((e) => {
      const apiTime = new Date(e.startTime).getTime();
      const timeDiff = Math.abs(apiTime - appTime);
      if (timeDiff > 3 * 60 * 60 * 1000) return false; // más de 3h de diferencia → no es

      const codes = e.match.teams.map((t) => t.code?.toUpperCase());
      return codes.includes(teamACode) && codes.includes(teamBCode);
    });

    if (!match) continue;

    // Determinar ganador
    const winnerTeam = match.match.teams.find(
      (t) => t.result?.outcome === "win"
    );
    if (!winnerTeam) continue;

    const winnerCode = winnerTeam.code?.toUpperCase();
    const winnerId =
      winnerCode === teamACode
        ? appMatch.teamA.id
        : winnerCode === teamBCode
          ? appMatch.teamB.id
          : TEAM_SLUG_MAP[winnerCode] || null;

    if (!winnerId) {
      console.warn(
        `⚠️  Ganador desconocido: código "${winnerCode}" — añádelo a TEAM_SLUG_MAP`
      );
      continue;
    }

    // Actualizar en el array local
    const idx = allMatches.findIndex((m) => m.id === appMatch.id);
    allMatches[idx] = {
      ...allMatches[idx],
      isCompleted: true,
      winnerId,
    };

    console.log(
      `✅ ${teamACode} vs ${teamBCode} → ganador: ${winnerCode} (id: ${winnerId})`
    );
    updated++;
  }

  if (updated === 0) {
    console.log("\nℹ️  No hay nuevos resultados para sincronizar.");
    return;
  }

  // 5. Guardar en Firestore (una sola escritura)
  await docRef.set({ allMatches }, { merge: true });
  console.log(`\n🎉 Firestore actualizado: ${updated} partido(s) completado(s).`);
}

sync().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
