/**
 * sync.js — Sincronizador automático de resultados LEC → Firestore
 *
 * La API de Lolesports bloquea IPs de GitHub Actions con 403.
 * Solución: usamos el Wikia/Fandom API (lol.fandom.com) que es completamente
 * abierta y no tiene restricciones de IP. Es la misma fuente que usan
 * herramientas como Leaguepedia y tiene datos oficiales de LEC.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ─── Mapa código Leaguepedia → ID interno de la app ──────────────────────────
// "team" en Leaguepedia usa el nombre corto oficial
const TEAM_CODE_MAP = {
  "Fnatic":           "fnc",
  "G2 Esports":       "g2",
  "Karmine Corp":     "kc",
  "Team Vitality":    "vit",
  "KOI":              "mkoi",
  "Natus Vincere":    "navi",
  "SK Gaming":        "sk",
  "Team Heretics":    "th",
  "Shifters":         "shf",
  "Giantx":           "gx"
  // shortnames como fallback
  "FNC": "fnc",
  "G2":  "g2",
  "KC":  "kc",
  "VIT": "vit",
  "KOI": "mkoi",
  "NAVI":"navi",
  "GX":  "gx",
  "SK":  "sk",
  "TH":  "th",
  "SHF": "shf",
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
  return baseName;
}

// ─── Leaguepedia API (lol.fandom.com) ────────────────────────────────────────
// Documentación: https://lol.fandom.com/wiki/Help:Leaguepedia_API
async function getCompletedLecMatches() {
  // Obtener partidos completados de LEC 2026 Spring
  // ScoreboardGames tiene los resultados de cada partido con fecha y ganador
  const tournament = getTournamentName();
  
  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "MatchSchedule",
    fields: "Team1, Team2, Winner, DateTime_UTC, OverviewPage",
    where: `OverviewPage="${tournament}" AND Winner IS NOT NULL`,
    order_by: "DateTime_UTC DESC",
    limit: "100",
    format: "json",
  });

  const url = `https://lol.fandom.com/api.php?${params}`;
  console.log(`🔗 Consultando Leaguepedia: ${tournament}`);

  const res = await fetch(url, {
    headers: { "User-Agent": "PickemSync/1.0 (github-actions)" },
  });

  if (!res.ok) throw new Error(`Leaguepedia HTTP ${res.status}`);

  const json = await res.json();
  const rows = json.cargoquery || [];

  if (rows.length === 0) {
    console.warn("⚠️  Leaguepedia no devolvió resultados. Comprueba el nombre del torneo.");
  }

  return rows.map((r) => r.title);
}

function getTournamentName() {
  const splitId = (process.env.SPLIT_ID || "spring_2026").toLowerCase();
  if (splitId.includes("spring")) return "LEC/2026 Season/Spring Season";
  if (splitId.includes("summer")) return "LEC/2026 Season/Summer Season";
  return "LEC/2026 Season/Winter Season";
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

  let lecResults;
  try {
    lecResults = await getCompletedLecMatches();
  } catch (err) {
    console.error("❌ Error al consultar Leaguepedia:", err.message);
    process.exit(1);
  }
  console.log(`🌐 Resultados encontrados en Leaguepedia: ${lecResults.length}`);

  if (lecResults.length > 0) {
    console.log("📄 Ejemplo de resultado:", JSON.stringify(lecResults[0]));
  }

  let updated = 0;

  for (const appMatch of pending) {
    const appTime   = new Date(appMatch.startTime).getTime();
    const teamACode = appMatch.teamA?.shortName?.toUpperCase();
    const teamBCode = appMatch.teamB?.shortName?.toUpperCase();
    if (!teamACode || !teamBCode) continue;

    // Buscar en Leaguepedia por equipos + fecha (±4h de margen)
    const found = lecResults.find((r) => {
      const t1 = r.Team1?.toUpperCase();
      const t2 = r.Team2?.toUpperCase();

      // Comprobar que los equipos coinciden (en cualquier orden)
      const teamsMatch =
        (t1 === teamACode || getShortName(r.Team1) === teamACode) &&
        (t2 === teamBCode || getShortName(r.Team2) === teamBCode) ||
        (t1 === teamBCode || getShortName(r.Team1) === teamBCode) &&
        (t2 === teamACode || getShortName(r.Team2) === teamACode);

      if (!teamsMatch) return false;

      // Comprobar fecha (±4h)
      if (r.DateTime_UTC) {
        const apiTime = new Date(r.DateTime_UTC + " UTC").getTime();
        const diff    = Math.abs(apiTime - appTime);
        return diff < 4 * 60 * 60 * 1000;
      }
      return true; // si no hay fecha, confiar en los equipos
    });

    if (!found) continue;

    const winnerName = found.Winner;
    if (!winnerName) continue;

    // Determinar winnerId
    let winnerId = TEAM_CODE_MAP[winnerName] || null;

    // Si no está en el mapa por nombre completo, intentar por shortName
    if (!winnerId) {
      const shortWinner = getShortName(winnerName);
      winnerId = TEAM_CODE_MAP[shortWinner] || null;
    }

    // Último recurso: comparar con los equipos del partido
    if (!winnerId) {
      const winnerUpper = winnerName.toUpperCase();
      if (winnerUpper === teamACode || getShortName(winnerName) === teamACode) {
        winnerId = appMatch.teamA.id;
      } else if (winnerUpper === teamBCode || getShortName(winnerName) === teamBCode) {
        winnerId = appMatch.teamB.id;
      }
    }

    if (!winnerId) {
      console.warn(`⚠️  Ganador "${winnerName}" no mapeado — añádelo a TEAM_CODE_MAP`);
      continue;
    }

    const idx = allMatches.findIndex((m) => m.id === appMatch.id);
    allMatches[idx] = { ...allMatches[idx], isCompleted: true, winnerId };

    console.log(`✅ ${teamACode} vs ${teamBCode} → ganador: ${winnerName} (id: ${winnerId})`);
    updated++;
  }

  if (updated === 0) {
    console.log("\nℹ️  Sin resultados nuevos para sincronizar.");
    return;
  }

  await docRef.set({ allMatches }, { merge: true });
  console.log(`\n🎉 Firestore actualizado: ${updated} partido(s).`);
}

// Extrae un shortname aproximado del nombre completo del equipo
function getShortName(fullName) {
  if (!fullName) return "";
  const map = {
    "Fnatic":        "FNC",
    "G2 Esports":    "G2",
    "Karmine Corp":  "KC",
    "Team Vitality": "VIT",
    "KOI":           "KOI",
    "Natus Vincere": "NAVI",
    "SK Gaming":     "SK",
    "Team Heretics": "TH",
    "Giantx":        "GX",
    "Shifters":      "SHF",
  };
  return (map[fullName] || fullName.toUpperCase().substring(0, 3));
}

sync().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
