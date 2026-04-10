/**
 * sync.js - Sincronizador automatico de resultados LEC a Firestore
 * Fuente: Leaguepedia (lol.fandom.com)
 *
 * Esta version descubre automaticamente el nombre exacto del torneo
 * en Leaguepedia buscando por equipos conocidos de la LEC.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Equipos LEC conocidos para buscar el torneo correcto
const LEC_TEAMS = ["Fnatic", "G2 Esports", "Team Vitality", "KOI", "SK Gaming", "Team Heretics", "Natus Vincere", "Karmine Corp"];

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
  "GIANTX": "gx",
  "Movistar KOI": "mkoi",
  "Shifters": "shf",
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
  "GX": "gx",
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

function resolveTeamId(teamName) {
  if (!teamName) return null;
  if (TEAM_NAME_MAP[teamName]) return TEAM_NAME_MAP[teamName];
  const upper = teamName.toUpperCase();
  if (TEAM_SHORT_MAP[upper]) return TEAM_SHORT_MAP[upper];
  // Intentar con las primeras 3 letras
  const short3 = upper.substring(0, 3);
  if (TEAM_SHORT_MAP[short3]) return TEAM_SHORT_MAP[short3];
  return null;
}

/**
 * Descubre automaticamente el OverviewPage correcto en Leaguepedia
 * buscando partidos recientes con equipos LEC conocidos.
 */
async function discoverOverviewPage() {
  const teamList = LEC_TEAMS.map(function(t) { return '"' + t + '"'; }).join(",");
  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "MatchSchedule",
    fields: "OverviewPage",
    where: "Team1 IN (" + teamList + ") AND Winner IS NOT NULL",
    group_by: "OverviewPage",
    order_by: "DateTime_UTC DESC",
    limit: "10",
    format: "json",
  });

  const url = "https://lol.fandom.com/api.php?" + params.toString();
  const res = await fetch(url, {
    headers: { "User-Agent": "PickemSync/1.0 (github-actions)" },
  });
  if (!res.ok) throw new Error("Leaguepedia discovery HTTP " + res.status);
  const json = await res.json();
  const rows = (json.cargoquery || []).map(function(r) { return r.title.OverviewPage; });
  console.log("OverviewPages encontrados en Leaguepedia: " + JSON.stringify(rows));
  return rows;
}

async function getResultsForPage(overviewPage) {
  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "MatchSchedule",
    fields: "Team1, Team2, Winner, DateTime_UTC, OverviewPage",
    where: 'OverviewPage="' + overviewPage + '" AND Winner IS NOT NULL',
    order_by: "DateTime_UTC DESC",
    limit: "100",
    format: "json",
  });

  const url = "https://lol.fandom.com/api.php?" + params.toString();
  const res = await fetch(url, {
    headers: { "User-Agent": "PickemSync/1.0 (github-actions)" },
  });
  if (!res.ok) throw new Error("Leaguepedia results HTTP " + res.status);
  const json = await res.json();
  return (json.cargoquery || []).map(function(r) { return r.title; });
}

function isLecSplit(overviewPage, splitId) {
  if (!overviewPage) return false;
  const p = overviewPage.toLowerCase();
  if (!p.includes("lec")) return false;
  if (!p.includes("2026")) return false;
  const s = (splitId || "").toLowerCase();
  if (s.includes("spring") && p.includes("spring")) return true;
  if (s.includes("summer") && p.includes("summer")) return true;
  if (s.includes("winter") && (p.includes("winter") || p.includes("versus"))) return true;
  return false;
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

  // Descubrir el OverviewPage correcto automaticamente
  var overviewPages;
  try {
    overviewPages = await discoverOverviewPage();
  } catch (err) {
    console.error("Error al descubrir torneos en Leaguepedia: " + err.message);
    process.exit(1);
  }

  // Filtrar los que corresponden al split actual
  var lecPages = overviewPages.filter(function(p) { return isLecSplit(p, splitId); });
  console.log("Paginas LEC para este split: " + JSON.stringify(lecPages));

  if (lecPages.length === 0) {
    // Si no hay coincidencia de split, usar todos los LEC 2026
    lecPages = overviewPages.filter(function(p) {
      return p.toLowerCase().includes("lec") && p.toLowerCase().includes("2026");
    });
    console.log("Usando todas las paginas LEC 2026: " + JSON.stringify(lecPages));
  }

  if (lecPages.length === 0) {
    console.log("No se encontraron paginas LEC en Leaguepedia. Todos los OverviewPages: " + JSON.stringify(overviewPages));
    process.exit(1);
  }

  // Obtener resultados de todas las paginas encontradas
  var lecResults = [];
  for (var i = 0; i < lecPages.length; i++) {
    try {
      var results = await getResultsForPage(lecPages[i]);
      console.log("Resultados en " + lecPages[i] + ": " + results.length);
      lecResults = lecResults.concat(results);
    } catch (err) {
      console.error("Error obteniendo resultados de " + lecPages[i] + ": " + err.message);
    }
  }

  console.log("Total resultados LEC: " + lecResults.length);

  if (lecResults.length === 0) {
    console.log("Sin resultados nuevos para sincronizar.");
    return;
  }

  if (lecResults.length > 0) {
    console.log("Ejemplo: " + JSON.stringify(lecResults[0]));
  }

  var updated = 0;

  for (var i = 0; i < pending.length; i++) {
    var appMatch = pending[i];
    var appTime = new Date(appMatch.startTime).getTime();
    var teamAShort = appMatch.teamA && appMatch.teamA.shortName ? appMatch.teamA.shortName.toUpperCase() : null;
    var teamBShort = appMatch.teamB && appMatch.teamB.shortName ? appMatch.teamB.shortName.toUpperCase() : null;
    var teamAName = appMatch.teamA && appMatch.teamA.name ? appMatch.teamA.name : null;
    var teamBName = appMatch.teamB && appMatch.teamB.name ? appMatch.teamB.name : null;

    if (!teamAShort || !teamBShort) continue;

    var found = null;
    for (var j = 0; j < lecResults.length; j++) {
      var r = lecResults[j];
      var t1 = r.Team1 || "";
      var t2 = r.Team2 || "";

      // Comprobar si los equipos coinciden por nombre completo o shortname
      var t1matchesA = t1 === teamAName || t1.toUpperCase() === teamAShort || resolveTeamId(t1) === appMatch.teamA.id;
      var t1matchesB = t1 === teamBName || t1.toUpperCase() === teamBShort || resolveTeamId(t1) === appMatch.teamB.id;
      var t2matchesA = t2 === teamAName || t2.toUpperCase() === teamAShort || resolveTeamId(t2) === appMatch.teamA.id;
      var t2matchesB = t2 === teamBName || t2.toUpperCase() === teamBShort || resolveTeamId(t2) === appMatch.teamB.id;

      var teamsMatch = (t1matchesA && t2matchesB) || (t1matchesB && t2matchesA);
      if (!teamsMatch) continue;

      // Comprobar fecha si esta disponible (margen de 4h)
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
      // Ultimo recurso: comparar con los equipos del partido directamente
      if (found.Winner === teamAName || found.Winner.toUpperCase() === teamAShort) {
        winnerId = appMatch.teamA.id;
      } else if (found.Winner === teamBName || found.Winner.toUpperCase() === teamBShort) {
        winnerId = appMatch.teamB.id;
      }
    }

    if (!winnerId) {
      console.log("Ganador no mapeado: " + found.Winner + " (anadelo a TEAM_NAME_MAP)");
      continue;
    }

    var idx = allMatches.findIndex(function(m) { return m.id === appMatch.id; });
    allMatches[idx] = Object.assign({}, allMatches[idx], { isCompleted: true, winnerId: winnerId });
    console.log("OK: " + teamAShort + " vs " + teamBShort + " -> " + found.Winner + " (id: " + winnerId + ")");
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
