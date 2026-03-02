import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.error("No service account json");
        process.exit(1);
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    const db = admin.firestore();
    const docRef = db.collection("admin_data").doc("matches");
    const docSnap = await docRef.get();
    if (!docSnap.exists) return;

    let allMatches = docSnap.data()?.allMatches || [];
    let updated = 0;

    const updates: Record<string, number> = {
        'custom-1771355205951': 1,
        'custom-1771616605726': 1,
        'custom-1771616694618': 4,
        'custom-1771675245729': 4,
        'custom-1771676684096': 5
    };

    allMatches = allMatches.map((m: any) => {
        if (updates[m.id]) {
            console.log(`Updating ${m.id} from day ${m.day} to ${updates[m.id]}`);
            updated++;
            return { ...m, day: updates[m.id] };
        }
        return m;
    });

    if (updated > 0) {
        await docRef.set({ allMatches }, { merge: true });
        console.log(`Updated ${updated} matches.`);
    } else {
        console.log("No matches needed updating.");
    }
    process.exit(0);
}
run();
