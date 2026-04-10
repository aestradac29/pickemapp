/**
 * sync.js - Sincronizador automatico de resultados LEC a Firestore
 *
 * Fuente: Leaguepedia (lol.fandom.com/api.php)
 * Estrategia: busca resultados equipo por equipo (evita operador IN que puede fallar)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const LEAGUEPEDIA_API = "https://lol.fandom.com/api.php";

// Nombre del torneo en Leaguepedia segun el split
const OVERVIEW_PAGES = {
  spring_2026: "LEC/2026 Season/Spring Season",
  winter_2026: "LEC/2026 Season/Versus Season",
  summer_2026: "LEC/2026 Season/Summer Season",
};

// Mapa nombre Leaguepedia -> ID interno de la app
const TEAM_NAME_MAP = {
  "Fnatic": "fnc",
  "G2 Esports": "gx",
  "GIANTX": "gx",
  "Karmine Corp": "kc",
  "Team Vitality": "vit",
  "KOI": "mkoi",
  "Movistar KOI": "mkoi",
  "Natus Vincere": "nvi",
  "SK Gaming": "sk",
  "Team Heretics": "th",
  "Shifters": "shf",
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

function resolveTeamId(teamName, appTeamA, appTeamB) {
  if (!teamName) return null;
  if (TEAM_NAME_MAP[teamName]) return TEAM_NAME_MAP[teamName];
  // Comparar contra los equipos del partido directamente
  if (appTeamA && (teamName === appTeamA.name || teamName.toUpperCase() === (appTeamA.shortName || "").toUpperCase())) return appTeamA.id;
  if (appTeamB && (teamName === appTeamB.name || teamName.toUpperCase() === (appTeamB.shortName || "").toUpperCase())) return appTeamB.id;
  return null;
}

async function leaguepediaQuery(where, fields, limit) {
  const params = new URLSearchParams({
    action: "cargoquery",
    tables: "MatchSchedule",
    fields: fields || "Team1, Team2, Winner, DateTime_UTC",
    where: where,
    order_by: "DateTime_UTC DESC",
    limit: String(limit || 50),
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
  if (json.error) throw new Error("Leaguepedia API error: " + JSON.stringify(json.error));
  return (json.cargoquery || []).map(function(r) { return r.title; });
}

async function getLecResults(splitId) {
  const normalized = normalizeSplit(splitId);
  const overviewPage = OVERVIEW_PAGES[normalized];
  console.log("Buscando resultados para: " + overviewPage);

  // Query directa por OverviewPage
  const where = 'OverviewPage="' + overviewPage + '" AND Winner IS NOT NULL AND Winner != ""';
  const results = await leaguepediaQuery(where, "Team1, Team2, Winner, DateTime_UTC", 100);

  console.log("Resultados obtenidos: " + results.length);
  if (results.length > 0) {
    console.log("Primeros resultados:");
    results.slice(0, 3).forEach(function(r) {
      console.log("  " + r.Team1 + " vs " + r.Team2 + " -> " + r.Winner + " (" + r.DateTime_UTC + ")");
    });
  }

  // Si no hay resultados, intentar sin el filtro de OverviewPage para diagnosticar
  if (results.length === 0) {
    console.log("Sin resultados con OverviewPage exacto. Intentando busqueda amplia...");
    const broadWhere = 'Winner IS NOT NULL AND Winner != "" AND DateTime_UTC > "2026-01-01"';
    const broadResults = await leaguepediaQuery(broadWhere, "OverviewPage, Team1, Team2, Winner, DateTime_UTC", 5);
    console.log("Resultados en busqueda amplia (muestra):");
    broadResults.forEach(function(r) {
      console.log("  OverviewPage: " + r.OverviewPage + " | " + r.Team1 + " vs " + r.Team2);
    });

    // Si hay resultados en la busqueda amplia, filtrar los LEC
    const lecBroad = broadResults.filter(function(r) {
      return r.OverviewPage && r.OverviewPage.toLowerCase().includes("lec");
    });
    if (lecBroad.length > 0) {
      const correctPage = lecBroad[0].OverviewPage;
      console.log("Nombre correcto detectado: " + correctPage);
      console.log("ACCION: actualiza OVERVIEW_PAGES en sync.js con este nombre");
    }

    return [];
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
    lecResults = await getLecResults(splitId);
  } catch (err) {
    console.error("Error al consultar Leaguepedia: " + err.message);
    process.exit(1);
  }

  if (lecResults.length === 0) {
    console.log("Sin resultados de Leaguepedia. Revisa el log para ver el nombre correcto del OverviewPage.");
    return;
  }

  var updated = 0;

  for (var i = 0; i < pending.length; i++) {
    var appMatch = pending[i];
    var appTime = new Date(appMatch.startTime).getTime();
    var teamA = appMatch.teamA || {};
    var teamB = appMatch.teamB || {};
    var teamAShort = (teamA.shortName || "").toUpperCase();
    var teamBShort = (teamB.shortName || "").toUpperCase();

    if (!teamAShort || !teamBShort) continue;

    var found = null;
    for (var j = 0; j < lecResults.length; j++) {
      var r = lecResults[j];
      var t1id = TEAM_NAME_MAP[r.Team1];
      var t2id = TEAM_NAME_MAP[r.Team2];

      var teamsMatch =
        (t1id === teamA.id && t2id === teamB.id) ||
        (t1id === teamB.id && t2id === teamA.id) ||
        (r.Team1 && r.Team1.toUpperCase() === teamAShort && r.Team2 && r.Team2.toUpperCase() === teamBShort) ||
        (r.Team1 && r.Team1.toUpperCase() === teamBShort && r.Team2 && r.Team2.toUpperCase() === teamAShort);

      if (!teamsMatch) continue;

      if (r.DateTime_UTC) {
        var apiTime = new Date(r.DateTime_UTC + " UTC").getTime();
        if (Math.abs(apiTime - appTime) > 6 * 60 * 60 * 1000) continue;
      }

      found = r;
      break;
    }

    if (!found || !found.Winner) continue;

    var winnerId = resolveTeamId(found.Winner, teamA, teamB);

    if (!winnerId) {
      console.log("Ganador no mapeado: '" + found.Winner + "' - anadelo a TEAM_NAME_MAP");
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
