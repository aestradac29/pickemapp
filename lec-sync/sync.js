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

const TEAM_NAME_MAP = {
  "Fnatic":            "fnc",
  "G2 Esports":        "g2",
  "GIANTX":            "gx",
  "Karmine Corp":      "kc",
  "Team Vitality":     "vit",
  "KOI":               "mkoi",
  "Movistar KOI":      "mkoi",
  "Natus Vincere":     "nvi",
  "SK Gaming":         "sk",
  "Team Heretics":     "th",
  "Shifters":          "shf",
  "Karmine Corp Blue": "kcb",
  "Los Ratones":       "rat",
};

function initFirebase() {
  var projectId   = process.env.FIREBASE_PROJECT_ID;
  var clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  var privateKey  = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Faltan variables de entorno de Firebase");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

function getDocName(baseName, splitId) {
  var s = (splitId || "").toLowerCase();
  if (s.includes("spring")) return baseName + "_spring_2026";
  if (s.includes("summer")) return baseName + "_summer_2026";
  return baseName;
}

function normalizeSplit(splitId) {
  var s = (splitId || "").toLowerCase();
  if (s.includes("spring")) return "spring_2026";
  if (s.includes("summer")) return "summer_2026";
  return "winter_2026";
}

function resolveTeamIdByName(teamName) {
  if (!teamName) return null;
  return TEAM_NAME_MAP[teamName] || null;
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function leaguepediaQuery(where, fields, limit) {
  var params = new URLSearchParams({
    action:   "cargoquery",
    tables:   "MatchSchedule",
    fields:   fields,
    where:    where,
    order_by: "DateTime_UTC DESC",
    limit:    String(limit || 100),
    format:   "json",
    maxlag:   "5",
  });

  var url = LEAGUEPEDIA_API + "?" + params.toString();

  for (var attempt = 1; attempt <= 3; attempt++) {
    var res = await fetch(url, {
      headers: {
        "User-Agent": "PickemSync/1.0 (https://github.com/racinguista10/pickemapp; bot)",
      },
    });

    if (res.status === 429 || res.status === 503) {
      var waitSecs = attempt * 30;
      console.log("Rate limited (HTTP " + res.status + "). Esperando " + waitSecs + "s...");
      await sleep(waitSecs * 1000);
      continue;
    }

    if (!res.ok) throw new Error("Leaguepedia HTTP " + res.status);

    var json = await res.json();

    if (json.error && json.error.code === "ratelimited") {
      var waitSecs = attempt * 30;
      console.log("Rate limited (API). Esperando " + waitSecs + "s...");
      await sleep(waitSecs * 1000);
      continue;
    }

    if (json.error) throw new Error("Leaguepedia error: " + JSON.stringify(json.error));

    return (json.cargoquery || []).map(function(r) { return r.title; });
  }

  throw new Error("Rate limit persistente tras 3 intentos. Prueba mas tarde.");
}

async function getLecResults(splitId) {
  var normalized   = normalizeSplit(splitId);
  var overviewPage = OVERVIEW_PAGES[normalized];
  console.log("Buscando en: " + overviewPage);

  var where   = 'OverviewPage="' + overviewPage + '" AND Winner IS NOT NULL AND Winner != ""';
  var results = await leaguepediaQuery(where, "Team1, Team2, Winner, DateTime_UTC", 100);

  console.log("Resultados obtenidos: " + results.length);
  if (results.length > 0) {
    results.slice(0, 3).forEach(function(r) {
      var winnerName = r.Winner === "1" ? r.Team1 : r.Winner === "2" ? r.Team2 : "?";
      console.log("  " + r.Team1 + " vs " + r.Team2 + " -> " + winnerName + " (Winner=" + r.Winner + ")");
    });
  }

  return results;
}

async function sync() {
  var splitId = process.env.SPLIT_ID || "spring_2026";
  console.log("\nIniciando sync - Split: " + splitId + "\n");

  var db = initFirebase();

  var docName = getDocName("matches", splitId);
  var docRef  = db.collection("admin_data").doc(docName);
  var snap    = await docRef.get();

  if (!snap.exists) {
    console.log("Documento de partidos no encontrado.");
    return;
  }

  var allMatches = snap.data().allMatches || [];
  var pending    = allMatches.filter(function(m) { return !m.isCompleted; });

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
    var appTime  = new Date(appMatch.startTime).getTime();
    var teamA    = appMatch.teamA || {};
    var teamB    = appMatch.teamB || {};

    var found = null;
    for (var j = 0; j < lecResults.length; j++) {
      var r      = lecResults[j];
      var t1id   = resolveTeamIdByName(r.Team1);
      var t2id   = resolveTeamIdByName(r.Team2);

      var t1matchesA = t1id === teamA.id || (r.Team1 || "").toUpperCase() === (teamA.shortName || "").toUpperCase();
      var t1matchesB = t1id === teamB.id || (r.Team1 || "").toUpperCase() === (teamB.shortName || "").toUpperCase();
      var t2matchesA = t2id === teamA.id || (r.Team2 || "").toUpperCase() === (teamA.shortName || "").toUpperCase();
      var t2matchesB = t2id === teamB.id || (r.Team2 || "").toUpperCase() === (teamB.shortName || "").toUpperCase();

      var teamsMatch = (t1matchesA && t2matchesB) || (t1matchesB && t2matchesA);
      if (!teamsMatch) continue;

      if (r.DateTime_UTC) {
        var apiTime = new Date(r.DateTime_UTC + " UTC").getTime();
        if (Math.abs(apiTime - appTime) > 6 * 60 * 60 * 1000) continue;
      }

      found = r;
      break;
    }

    if (!found) continue;

    var winnerName = null;
    if (found.Winner === "1" || found.Winner === 1) {
      winnerName = found.Team1;
    } else if (found.Winner === "2" || found.Winner === 2) {
      winnerName = found.Team2;
    } else {
      console.log("Winner inesperado: " + found.Winner);
      continue;
    }

    var winnerId = resolveTeamIdByName(winnerName);
    if (!winnerId) {
      console.log("ID no encontrado para: '" + winnerName + "' - anadelo a TEAM_NAME_MAP");
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
