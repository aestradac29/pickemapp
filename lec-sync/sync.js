/**
 * sync.js — Sincronizador automático de resultados LEC → Firestore
 * Fuente: api.lolesports.com (con headers de navegador para evitar el 403)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ─── Mapa shortName app → ID interno ─────────────────────────────────────────
const TEAM_CODE_MAP = {
  FNC:  "fnc",
  G2:   "gx",
  G2E:  "gx",
  KC:   "kc",
  KOI:  "mkoi",
  NAVI: "nvi",
  NVI:  "nvi",
  SK:   "sk",
  SHF:  "shf",
  TH:   "th",
  VIT:  "vit",
};

// ─── Firebase Admin ───────────────────────────────────────────────────────────
function initFirebase() {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Faltan variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

function getDocName(baseName, splitId) {
  const s = (splitId || "").toLowerCase();
  if (s.includes("spring")) return `${baseName}_spring_2026`;
  if (s.includes("summer")) return `${baseName}_summer_2026`;
  return baseName; // winter_2026 no lleva sufijo
}

// ─── Lolesports API con headers de navegador (evita el 403 desde servidores) ──
async function getCompletedLecMatches() {
  const headers = {
    "x-api-key":  "0TvQnueqKa5mxJntVWt0w4LlLfW6krZa",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Origin":     "https://lolesports.com",
    "Referer":    "https://lolesports.com/",
  };

  // Intentar obtener el ID de LEC dinámicamente
  let leagueId = "98767991302996019"; // ID fijo de LEC como fallback
  try {
    const leaguesRes = await fetch(
      "https://esports-api.lolesports.com/persisted/gw/getLeagues?hl=es-ES",
      { headers }
    );
    if (leaguesRes.ok) {
      const data = await leaguesRes.json();
      const lec  = data.data.leagues.find((l) => l.slug?.toLowerCase() === "lec");
      if (lec) leagueId = lec.id;
    } else {
      console.warn(`⚠️  getLeagues devolvió ${leaguesRes.status}, usando ID fijo de LEC`);
    }
  } catch (e) {
    console.warn("⚠️  Error en getLeagues, usando ID fijo:", e.message);
  }

  const url = `https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=es-ES&leagueId=${leagueId}`;
  const res  = await fetch(url, { headers });
  if (!res.ok) throw new Error(`getSchedule HTTP ${res.status}`);

  const json   = await res.json();
  const events = json.data.schedule.events || [];
  return events.filter((e) => e.type === "match" && e.state === "completed");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function sync() {
  const splitId = process.env.SPLIT_ID || "spring_2026";
  console.log(`\n🔄 Iniciando sync — Split: ${splitId}\n`);

  const db = initFirebase();

  const matchesDocName = getDocName("matches", splitId);
  const docRef = db.collection("admin_data").doc(matchesDocName);
  const snap   = await docRef.get();

  if (!snap.exists) {
    console.log("⚠️  Documento de partidos no encontrado en Firestore.");
    return;
  }

  const allMatches = snap.data().allMatches || [];
  const pending    = allMatches.filter((m) => !m.isCompleted);

  if (pending.length === 0) {
    console.log("✅ No hay partidos pendientes.");
    return;
  }
  console.log(`📋 Partidos pendientes en la app: ${pending.length}`);

  let lecCompleted;
  try {
    lecCompleted = await getCompletedLecMatches();
  } catch (err) {
    console.error("❌ Error al consultar Lolesports:", err.message);
    process.exit(1);
  }
  console.log(`🌐 Partidos completados en Lolesports: ${lecCompleted.length}`);

  let updated = 0;

  for (const appMatch of pending) {
    const appTime   = new Date(appMatch.startTime).getTime();
    const teamACode = appMatch.teamA?.shortName?.toUpperCase();
    const teamBCode = appMatch.teamB?.shortName?.toUpperCase();
    if (!teamACode || !teamBCode) continue;

    const found = lecCompleted.find((e) => {
      const diff  = Math.abs(new Date(e.startTime).getTime() - appTime);
      if (diff > 3 * 60 * 60 * 1000) return false;
      const codes = e.match.teams.map((t) => t.code?.toUpperCase());
      return codes.includes(teamACode) && codes.includes(teamBCode);
    });

    if (!found) continue;

    const winnerTeam = found.match.teams.find((t) => t.result?.outcome === "win");
    if (!winnerTeam) continue;

    const winnerCode = winnerTeam.code?.toUpperCase();
    let   winnerId   = null;

    if      (winnerCode === teamACode) winnerId = appMatch.teamA.id;
    else if (winnerCode === teamBCode) winnerId = appMatch.teamB.id;
    else    winnerId = TEAM_CODE_MAP[winnerCode] || null;

    if (!winnerId) {
      console.warn(`⚠️  Código "${winnerCode}" no mapeado — añádelo a TEAM_CODE_MAP`);
      continue;
    }

    const idx = allMatches.findIndex((m) => m.id === appMatch.id);
    allMatches[idx] = { ...allMatches[idx], isCompleted: true, winnerId };

    console.log(`✅ ${teamACode} vs ${teamBCode} → ganador: ${winnerCode} (id: ${winnerId})`);
    updated++;
  }

  if (updated === 0) {
    console.log("\nℹ️  Sin resultados nuevos para sincronizar.");
    return;
  }

  await docRef.set({ allMatches }, { merge: true });
  console.log(`\n🎉 Firestore actualizado: ${updated} partido(s).`);
}

sync().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
