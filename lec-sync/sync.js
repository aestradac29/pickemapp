/**
 * sync.js - Sincronizador automatico de resultados LEC a Firestore
 * Fuente: Leaguepedia (lol.fandom.com/api.php)
 *
 * NOTA: En MatchSchedule, el campo Winner es un numero:
 *   1 = gana Team1
 *   2 = gana Team2
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const LEAGUEPEDIA_API = "https://lol.fandom.com/api.php";

const OVERVIEW_PAGES = {
  spring_2026: "LEC/2026 Season/Spring Season",
  winter_2026: "LEC/2026 Season/Versus Season",
  summer_2026: "LEC/2026 Season/Summer Season",
};

// Mapa nombre Leaguepedia -> ID interno de la app
const TEAM_NAME_MAP = {
  "Fnatic":        "fnc",
  "G2 Esports":    "g2",
  "GIANTX":        "gx",
  "Karmine Corp":  "kc",
  "Team Vitality": "vit",
  "Movistar KOI":  "mkoi",
  "Natus Vincere": "nvi",
  "SK Gaming":     "sk",
  "Team Heretics": "th",
  "Shifters":      "shf",
  "Karmine Corp Blue": "kcb",
  "Los Ratones":   "rat",
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

function normalizeSplit(splitId) {
  const s = (splitId || "").toLowerCase();
  if (s.includes("spring")) return "spring_2026";
  if (s.includes("summer")) return "summer_2026";
  return "winter_2026";
}

function resolveTeamIdByName(teamName) {
  if (!teamName) return null;
  if (TEAM_NAME_MAP[teamName]) return TEAM_NAME_MAP[teamName];
  return null;
}

async function leaguepediaQuery(where, fields, limit) {
  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "MatchSchedule",
    fields: fields,
    where: where,
    order_by: "DateTime_UTC DESC",
    limit: String(limit || 100),
    format: "json",
  });

  const url = LEAGUEPEDIA_API + "?" + params.toString();
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 PickemSync/1.0",
      "Accept": "application/json",
    },
  });

  if (!res.ok) throw new Error("Leaguepedia HTTP " + res.status);
  const json = await res.json();
  if (json.error) throw new Error("Leaguepedia error: " + JSON.stringify(json.error));
  return (json.cargoquery || []).map(function(r) { return r.title; });
}

async function getLecResults(splitId) {
  const normalized = normalizeSplit(splitId);
  const overviewPage = OVERVIEW_PAGES[normalized];
  console.log("Buscando en: " + overviewPage);

  const where = 'OverviewPage="' + overviewPage + '" AND Winner IS NOT NULL AND Winner != ""';
  // Winner es 1 o 2, Team1 y Team2 son los nombres de los equipos
  const results = await leaguepediaQuery(where, "Team1, Team2, Winner, DateTime_UTC", 100);

  console.log("Resultados obtenidos: " + results.length);
  if (results.length > 0) {
    results.slice(0, 3).forEach(function(r) {
      var winnerName = r.Winner === "1" ? r.Team1 : r.Winner === "2" ? r.Team2 : "?";
      console.log("  " + r.Team1 + " vs " + r.Team2 + " -> ganador: " + winnerName + " (Winner=" + r.Winner + ")");
    });
  }

  return results;
}

async function sync() {
  const splitId = process.env.SPLIT_ID || "spring_2026";
  console.log("\nIniciando sync - Split: " + splitId + "\n");

  const db = initFirebase();

  const docName = getDocName("matches", splitId);
  const docRef = db.collection("admin_data").doc(docName);
  const snap = await docRef.get();

  if (!snap.exists) {
    console.log("Documento de partidos no encontrado.");
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
    lecResults = await getLecResults(splitId);
  } catch (err) {
    console.error("Error Leaguepedia: " + err.message);
    process.exit(1);
  }

  if (lecResults.length === 0) {
    console.log("Sin resultados de Leaguepedia.");
    return;
  }

  var updated = 0;

  for (var i = 0; i < pending.length; i++) {
    var appMatch = pending[i];
    var appTime = new Date(appMatch.startTime).getTime();
    var teamA = appMatch.teamA || {};
    var teamB = appMatch.teamB || {};

    var found = null;
    for (var j = 0; j < lecResults.length; j++) {
      var r = lecResults[j];

      // Resolver IDs de los equipos de Leaguepedia
      var r_t1_id = resolveTeamIdByName(r.Team1);
      var r_t2_id = resolveTeamIdByName(r.Team2);

      // Comparar por ID interno o por nombre
      var t1matchesA = r_t1_id === teamA.id || (r.Team1 || "").toUpperCase() === (teamA.shortName || "").toUpperCase();
      var t1matchesB = r_t1_id === teamB.id || (r.Team1 || "").toUpperCase() === (teamB.shortName || "").toUpperCase();
      var t2matchesA = r_t2_id === teamA.id || (r.Team2 || "").toUpperCase() === (teamA.shortName || "").toUpperCase();
      var t2matchesB = r_t2_id === teamB.id || (r.Team2 || "").toUpperCase() === (teamB.shortName || "").toUpperCase();

      var teamsMatch = (t1matchesA && t2matchesB) || (t1matchesB && t2matchesA);
      if (!teamsMatch) continue;

      // Verificar fecha (margen 6h)
      if (r.DateTime_UTC) {
        var apiTime = new Date(r.DateTime_UTC + " UTC").getTime();
        if (Math.abs(apiTime - appTime) > 6 * 60 * 60 * 1000) continue;
      }

      found = r;
      break;
    }

    if (!found) continue;

    // Winner=1 -> gana Team1, Winner=2 -> gana Team2
    var winnerName = null;
    if (found.Winner === "1" || found.Winner === 1) {
      winnerName = found.Team1;
    } else if (found.Winner === "2" || found.Winner === 2) {
      winnerName = found.Team2;
    } else {
      console.log("Winner inesperado: " + found.Winner);
      continue;
    }

    // Resolver a ID interno
    var winnerId = resolveTeamIdByName(winnerName);
    if (!winnerId) {
      // Fallback: comparar con los equipos del partido
      var r_t1_id = resolveTeamIdByName(found.Team1);
      var r_t2_id = resolveTeamIdByName(found.Team2);
      if (winnerName === found.Team1) {
        winnerId = r_t1_id || (resolveTeamIdByName(found.Team1) === teamA.id ? teamA.id : teamB.id);
      } else {
        winnerId = r_t2_id || (resolveTeamIdByName(found.Team2) === teamB.id ? teamB.id : teamA.id);
      }
    }

    if (!winnerId) {
      console.log("No se pudo resolver el ID para: " + winnerName + " - anadelo a TEAM_NAME_MAP");
      continue;
    }

    var idx = allMatches.findIndex(function(m) { return m.id === appMatch.id; });
    allMatches[idx] = Object.assign({}, allMatches[idx], { isCompleted: true, winnerId: winnerId });
    console.log("OK: " + (teamA.shortName || "") + " vs " + (teamB.shortName || "") + " -> " + winnerName + " (id: " + winnerId + ")");
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
