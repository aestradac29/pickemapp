import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.error("No service account json, env keys:", Object.keys(process.env));
        process.exit(1);
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    const db = admin.firestore();
    
    // Fetch winter players (default)
    const winterPlayersRef = db.collection("admin_data").doc("players");
    const winterPlayersSnap = await winterPlayersRef.get();
    
    if (!winterPlayersSnap.exists) {
        console.error("Winter players not found");
        process.exit(1);
    }
    
    const winterPlayers = winterPlayersSnap.data()?.list || [];
    
    // Filter out rat and kcb
    const springPlayers = winterPlayers.filter((p: any) => p.teamId !== 'rat' && p.teamId !== 'kcb');
    
    // Save to spring players
    const springPlayersRef = db.collection("admin_data").doc("players_spring_2026");
    await springPlayersRef.set({ list: springPlayers });
    
    console.log(`Updated spring players. Winter: ${winterPlayers.length}, Spring: ${springPlayers.length}`);
    process.exit(0);
}
run();
