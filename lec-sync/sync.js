/**
 * sync.js - Sincronizador automatico de resultados LEC a Firestore
 * Fuente: Leaguepedia (lol.fandom.com/api.php)
 *
 * Que sincroniza:
 *  - Ganador de la serie (winnerId, isCompleted)
 *  - Resultado por game: games[] con winnerId de cada game individual
 *    -> la app puede mostrar 2-1, 3-0, etc. y calcular fantasy correctamente
 *
 * NOTA Leaguepedia:
 *  MatchSchedule.Winner  = 1 (gana Team1) o 2 (gana Team2)
 *  MatchScheduleGame.Winner = 1 (gana Blue) o 2 (gana Red)
 *  MatchScheduleGame.Blue / .Red = nombre del equipo en ese game
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

async function leaguepediaQuery(tables, fields, where, limit) {
  var params = new URLSearchParams({
    action:   "cargoquery",
    tables:   tables,
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

  throw new Error("Rate limit persistente tras 3 intentos.");
}

// Obtiene los resultados de serie (quien gano)
async function getSeriesResults(splitId) {
  var normalized   = normalizeSplit(splitId);
  var overviewPage = OVERVIEW_PAGES[normalized];

  var where = 'OverviewPage="' + overviewPage + '" AND Winner IS NOT NULL AND Winner != ""';
  return leaguepediaQuery(
    "MatchSchedule",
    "Team1, Team2, Winner, DateTime_UTC, UniqueMatch",
    where,
    200
  );
}

// Obtiene el resultado por game individual de una serie concreta
// UniqueMatch es el identificador unico del partido en Leaguepedia
async function getGamesForMatch(uniqueMatch) {
  var where = 'MatchId="' + uniqueMatch + '"';
  var results = await leaguepediaQuery(
    "MatchScheduleGame",
    "Blue, Red, Winner, N_GameInMatch",
    where,
    10
  );
  // Ordenar por numero de game
  results.sort(function(a, b) {
    return parseInt(a.N_GameInMatch || 0) - parseInt(b.N_GameInMatch || 0);
  });
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
  var pending    = allMatches.filter(function(m) { return !m.isCompleted; });

  if (pending.length === 0) {
    console.log("No hay partidos pendientes.");
    return;
  }
  console.log("Partidos pendientes en la app: " + pending.length);

  // Obtener resultados de series de Leaguepedia
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

    // Buscar la serie correspondiente en Leaguepedia
    var found = null;
    for (var j = 0; j < seriesResults.length; j++) {
      var r    = seriesResults[j];
      var t1id = resolveTeamId(r.Team1);
      var t2id = resolveTeamId(r.Team2);

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

    // Determinar ganador de la serie
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

    // Obtener resultado por game (BO3/BO5)
    var games = [];
    if (found.UniqueMatch) {
      try {
        await sleep(500); // Pequeña pausa para no spamear la API
        var gameResults = await getGamesForMatch(found.UniqueMatch);

        for (var g = 0; g < gameResults.length; g++) {
          var gr         = gameResults[g];
          var gameNum    = parseInt(gr.N_GameInMatch || (g + 1));
          var blueTeamId = resolveTeamId(gr.Blue);
          var redTeamId  = resolveTeamId(gr.Red);

          var gameWinnerId = null;
          if (gr.Winner === "1" || gr.Winner === 1) {
            gameWinnerId = blueTeamId; // Blue gana
          } else if (gr.Winner === "2" || gr.Winner === 2) {
            gameWinnerId = redTeamId;  // Red gana
          }

          games.push({
            id:       gameNum,
            winnerId: gameWinnerId,
            stats:    {}, // Stats detalladas requieren entrada manual
          });
        }

        // Calcular marcador para el log
        var winsA = games.filter(function(g) { return g.winnerId === teamA.id; }).length;
        var winsB = games.filter(function(g) { return g.winnerId === teamB.id; }).length;
        console.log("OK: " + (teamA.shortName || "") + " vs " + (teamB.shortName || "") +
          " -> " + winnerName + " (" + winsA + "-" + winsB + ") (id: " + winnerId + ")");

      } catch (err) {
        console.log("No se pudieron obtener games para " + found.UniqueMatch + ": " + err.message);
        // Continuar sin games detallados
        console.log("OK: " + (teamA.shortName || "") + " vs " + (teamB.shortName || "") +
          " -> " + winnerName + " (sin marcador) (id: " + winnerId + ")");
      }
    }

    // Actualizar el partido en Firestore
    var idx = allMatches.findIndex(function(m) { return m.id === appMatch.id; });
    var updatedMatch = Object.assign({}, allMatches[idx], {
      isCompleted: true,
      winnerId:    winnerId,
    });

    // Solo añadir games si los obtuvimos correctamente
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
