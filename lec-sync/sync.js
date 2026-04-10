/**
 * sync.js - Sincronizador automatico de resultados LEC a Firestore
 * Fuente: Leaguepedia (lol.fandom.com) - sin restricciones de IP
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Mapa nombre Leaguepedia -> ID interno de la app
const TEAM_NAME_MAP = {
  "Fnatic": "fnc",
  "G2 Esports": "gx",
  "Karmine Corp": "kc",
  "Team Vitality": "vit",
  "KOI": "mkoi",
  "Natus Vincere": "nvi",
  "SK Gaming": "sk",
  "Team Heretics": "th",
};

// Mapa shortname -> ID (fallback)
const TEAM_SHORT_MAP = {
  "FNC": "fnc",
  "G2": "gx",
  "KC": "kc",
  "VIT": "vit",
  "KOI": "mkoi",
  "NAVI": "nvi",
  "NVI": "nvi",
  "SK": "sk",
  "TH": "th",
  "SHF": "shf",
};

function initFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Faltan variables de entorno de Firebase");
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

function getDocName(baseName, splitId) {
  const s = (splitId || "").toLowerCase();
  if (s.includes("spring")) return baseName + "_spring_2026";
  if (s.includes("summer")) return baseName + "_summer_2026";
  return baseName;
}

function getTournamentName(splitId) {
  const s = (splitId || "").toLowerCase();
  if (s.includes("spring")) return "LEC/2026 Season/Spring Season";
  if (s.includes("summer")) return "LEC/2026 Season/Summer Season";
  return "LEC/2026 Season/Winter Season";
}

function resolveTeamId(teamName) {
  if (!teamName) return null;
  if (TEAM_NAME_MAP[teamName]) return TEAM_NAME_MAP[teamName];
  const upper = teamName.toUpperCase();
  if (TEAM_SHORT_MAP[upper]) return TEAM_SHORT_MAP[upper];
  return null;
}

function teamMatches(lecName, appShortName) {
  if (!lecName || !appShortName) return false;
  const upper = appShortName.toUpperCase();
  if (lecName.toUpperCase() === upper) return true;
  const short = getShortFromFull(lecName);
  return short === upper;
}

function getShortFromFull(fullName) {
  const map = {
    "Fnatic": "FNC",
    "G2 Esports": "G2",
    "Karmine Corp": "KC",
    "Team Vitality": "VIT",
    "KOI": "KOI",
    "Natus Vincere": "NAVI",
    "SK Gaming": "SK",
    "Team Heretics": "TH",
  };
  return map[fullName] || fullName.toUpperCase().substring(0, 3);
}

async function getLeaguepediaResults(splitId) {
  const tournament = getTournamentName(splitId);
  console.log("Consultando Leaguepedia: " + tournament);

  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "MatchSchedule",
    fields: "Team1, Team2, Winner, DateTime_UTC, OverviewPage",
    where: 'OverviewPage="' + tournament + '" AND Winner IS NOT NULL',
    order_by: "DateTime_UTC DESC",
    limit: "100",
    format: "json",
  });

  const url = "https://lol.fandom.com/api.php?" + params.toString();
  const res = await fetch(url, {
    headers: { "User-Agent": "PickemSync/1.0 (github-actions)" },
  });

  if (!res.ok) throw new Error("Leaguepedia HTTP " + res.status);

  const json = await res.json();
  const rows = json.cargoquery || [];
  return rows.map(function(r) { return r.title; });
}

async function sync() {
  const splitId = process.env.SPLIT_ID || "spring_2026";
  console.log("\nIniciando sync - Split: " + splitId + "\n");

  const db = initFirebase();

  const docName = getDocName("matches", splitId);
  const docRef = db.collection("admin_data").doc(docName);
  const snap = await docRef.get();

  if (!snap.exists) {
    console.log("Documento de partidos no encontrado en Firestore.");
    return;
  }

  const allMatches = snap.data().allMatches || [];
  const pending = allMatches.filter(function(m) { return !m.isCompleted; });

  if (pending.length === 0) {
    console.log("No hay partidos pendientes.");
    return;
  }
  console.log("Partidos pendientes en la app: " + pending.length);

  var lecResults;
  try {
    lecResults = await getLeaguepediaResults(splitId);
  } catch (err) {
    console.error("Error al consultar Leaguepedia: " + err.message);
    process.exit(1);
  }
  console.log("Resultados en Leaguepedia: " + lecResults.length);

  if (lecResults.length > 0) {
    console.log("Ejemplo: " + JSON.stringify(lecResults[0]));
  }

  var updated = 0;

  for (var i = 0; i < pending.length; i++) {
    var appMatch = pending[i];
    var appTime = new Date(appMatch.startTime).getTime();
    var teamAShort = appMatch.teamA && appMatch.teamA.shortName ? appMatch.teamA.shortName.toUpperCase() : null;
    var teamBShort = appMatch.teamB && appMatch.teamB.shortName ? appMatch.teamB.shortName.toUpperCase() : null;

    if (!teamAShort || !teamBShort) continue;

    var found = null;
    for (var j = 0; j < lecResults.length; j++) {
      var r = lecResults[j];
      var t1matches = teamMatches(r.Team1, teamAShort) || teamMatches(r.Team1, teamBShort);
      var t2matches = teamMatches(r.Team2, teamAShort) || teamMatches(r.Team2, teamBShort);

      if (!t1matches || !t2matches) continue;

      if (r.DateTime_UTC) {
        var apiTime = new Date(r.DateTime_UTC + " UTC").getTime();
        if (Math.abs(apiTime - appTime) > 4 * 60 * 60 * 1000) continue;
      }

      found = r;
      break;
    }

    if (!found) continue;
    if (!found.Winner) continue;

    var winnerId = resolveTeamId(found.Winner);

    if (!winnerId) {
      var winnerShort = getShortFromFull(found.Winner).toUpperCase();
      if (winnerShort === teamAShort) winnerId = appMatch.teamA.id;
      else if (winnerShort === teamBShort) winnerId = appMatch.teamB.id;
    }

    if (!winnerId) {
      console.log("Ganador no mapeado: " + found.Winner + " - anadelo a TEAM_NAME_MAP");
      continue;
    }

    var idx = allMatches.findIndex(function(m) { return m.id === appMatch.id; });
    allMatches[idx] = Object.assign({}, allMatches[idx], { isCompleted: true, winnerId: winnerId });

    console.log("OK: " + teamAShort + " vs " + teamBShort + " -> ganador: " + found.Winner + " (id: " + winnerId + ")");
    updated++;
  }

  if (updated === 0) {
    console.log("\nSin resultados nuevos para sincronizar.");
    return;
  }

  await docRef.set({ allMatches: allMatches }, { merge: true });
  console.log("\nFirestore actualizado: " + updated + " partido(s).");
}

sync().catch(function(err) {
  console.error("Error fatal: " + err.message);
  process.exit(1);
});
