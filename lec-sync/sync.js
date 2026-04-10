/**
 * sync.js - Sincronizador automatico de resultados LEC a Firestore
 * Fuente: Leaguepedia (lol.fandom.com/api.php)
 *
 * Sincroniza:
 *  - Ganador de la serie (winnerId, isCompleted)
 *  - Resultado por game: games[] -> la app muestra 2-1, 3-0, etc.
 *
 * Variables de entorno:
 *  FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *  SPLIT_ID  (spring_2026 | winter_2026 | summer_2026)
 *  RESET_MATCH_ID  (opcional) si se indica, resetea ese partido a pendiente antes de sincronizar
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

// ─── Firebase ─────────────────────────────────────────────────────────────────

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

function resolveTeamId(teamName) {
  if (!teamName) return null;
  return TEAM_NAME_MAP[teamName] || null;
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ─── Leaguepedia API ──────────────────────────────────────────────────────────

async function leaguepediaQuery(tables, fields, where, orderBy, limit) {
  var params = new URLSearchParams({
    action:   "cargoquery",
    tables:   tables,
    fields:   fields,
    where:    where,
    order_by: orderBy || "DateTime_UTC DESC",
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

  throw new Error("Rate limit persistente tras 3 intentos.");
}

async function getSeriesResults(splitId) {
  var normalized   = normalizeSplit(splitId);
  var overviewPage = OVERVIEW_PAGES[normalized];
  var where = 'OverviewPage="' + overviewPage + '" AND Winner IS NOT NULL AND Winner != ""';
  return leaguepediaQuery(
    "MatchSchedule",
    "Team1, Team2, Winner, DateTime_UTC, UniqueMatch",
    where,
    "DateTime_UTC DESC",
    200
  );
}

async function getGamesForMatch(uniqueMatch) {
  var escapedId = uniqueMatch.replace(/"/g, '\\"');
  var where = 'MatchScheduleGame.MatchId="' + escapedId + '"';

  var results = await leaguepediaQuery(
    "MatchScheduleGame",
    "MatchScheduleGame.Blue=Blue, MatchScheduleGame.Red=Red, MatchScheduleGame.Winner=Winner, MatchScheduleGame.N_GameInMatch=N_GameInMatch",
    where,
    "MatchScheduleGame.N_GameInMatch ASC",
    10
  );

  // Log de diagnostico para ver los valores exactos que devuelve Leaguepedia
  for (var g = 0; g < results.length; g++) {
    var gr = results[g];
    console.log("  Game " + gr.N_GameInMatch + ": Blue='" + gr.Blue + "' Red='" + gr.Red + "' Winner=" + gr.Winner);
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  // Soporte para resetear un partido concreto (util para reprocessar)
  // Uso: añadir variable RESET_MATCH_ID en el workflow antes de ejecutar
  var resetId = process.env.RESET_MATCH_ID;
  if (resetId) {
    var resetIdx = allMatches.findIndex(function(m) { return m.id === resetId; });
    if (resetIdx !== -1) {
      allMatches[resetIdx] = Object.assign({}, allMatches[resetIdx], {
        isCompleted: false,
        winnerId:    null,
        games:       [],
      });
      await docRef.set({ allMatches: allMatches }, { merge: true });
      console.log("Partido " + resetId + " reseteado a pendiente.");
    } else {
      console.log("RESET_MATCH_ID '" + resetId + "' no encontrado en Firestore.");
    }
    // Recargar tras el reset
    snap = await docRef.get();
    allMatches = snap.data().allMatches || [];
  }

  var pending = allMatches.filter(function(m) { return !m.isCompleted; });

  if (pending.length === 0) {
    console.log("No hay partidos pendientes.");
    return;
  }
  console.log("Partidos pendientes en la app: " + pending.length);

  var seriesResults;
  try {
    seriesResults = await getSeriesResults(splitId);
  } catch (err) {
    console.error("Error Leaguepedia (series): " + err.message);
    process.exit(1);
  }
  console.log("Series completadas en Leaguepedia: " + seriesResults.length);

  var updated = 0;

  for (var i = 0; i < pending.length; i++) {
    var appMatch = pending[i];
    var appTime  = new Date(appMatch.startTime).getTime();
    var teamA    = appMatch.teamA || {};
    var teamB    = appMatch.teamB || {};

    var found = null;
    for (var j = 0; j < seriesResults.length; j++) {
      var r    = seriesResults[j];
      var t1id = resolveTeamId(r.Team1);
      var t2id = resolveTeamId(r.Team2);

      var t1matchesA = t1id === teamA.id || (r.Team1 || "").toUpperCase() === (teamA.shortName || "").toUpperCase();
      var t1matchesB = t1id === teamB.id || (r.Team1 || "").toUpperCase() === (teamB.shortName || "").toUpperCase();
      var t2matchesA = t2id === teamA.id || (r.Team2 || "").toUpperCase() === (teamA.shortName || "").toUpperCase();
      var t2matchesB = t2id === teamB.id || (r.Team2 || "").toUpperCase() === (teamB.shortName || "").toUpperCase();

      if (!((t1matchesA && t2matchesB) || (t1matchesB && t2matchesA))) continue;

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

    var winnerId = resolveTeamId(winnerName);
    if (!winnerId) {
      console.log("ID no encontrado para: '" + winnerName + "' - anadelo a TEAM_NAME_MAP");
      continue;
    }

    // Obtener resultado por game
    var games = [];
    if (found.UniqueMatch) {
      try {
        await sleep(300);
        var gameResults = await getGamesForMatch(found.UniqueMatch);

        for (var g = 0; g < gameResults.length; g++) {
          var gr         = gameResults[g];
          var gameNum    = parseInt(gr.N_GameInMatch || (g + 1));
          var blueTeamId = resolveTeamId(gr.Blue);
          var redTeamId  = resolveTeamId(gr.Red);

          var gameWinnerId = null;
          if (gr.Winner === "1" || gr.Winner === 1) {
            gameWinnerId = blueTeamId;
          } else if (gr.Winner === "2" || gr.Winner === 2) {
            gameWinnerId = redTeamId;
          }

          if (!blueTeamId) console.log("  AVISO: Blue='" + gr.Blue + "' no mapeado");
          if (!redTeamId)  console.log("  AVISO: Red='"  + gr.Red  + "' no mapeado");

          games.push({
            id:       gameNum,
            winnerId: gameWinnerId,
            stats:    {},
          });
        }
      } catch (err) {
        console.log("  Sin games detallados: " + err.message);
      }
    }

    var winsA = games.filter(function(g) { return g.winnerId === teamA.id; }).length;
    var winsB = games.filter(function(g) { return g.winnerId === teamB.id; }).length;
    var score = games.length > 0 ? " (" + winsA + "-" + winsB + ")" : " (sin marcador)";
    console.log("OK: " + (teamA.shortName || "") + " vs " + (teamB.shortName || "") +
      " -> " + winnerName + score + " (id: " + winnerId + ")");

    var idx = allMatches.findIndex(function(m) { return m.id === appMatch.id; });
    var updatedMatch = Object.assign({}, allMatches[idx], {
      isCompleted: true,
      winnerId:    winnerId,
    });
    if (games.length > 0) {
      updatedMatch.games = games;
    }
    allMatches[idx] = updatedMatch;
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
