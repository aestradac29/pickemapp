import { dataService } from '../services/dataService';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function run() {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const raul = users.find(u => (u.username || '').toLowerCase().includes('raulbarreda7'));
    
    if (!raul) {
        console.log("Raul not found");
        return;
    }
    console.log("Raul ID:", raul.id);

    const picksSnap = await getDoc(doc(db, "users", raul.id, "picks", "winter_2026"));
    const userPredictions = picksSnap.exists() ? picksSnap.data().list || [] : [];
    
    const allMatches = await dataService.getMatches();
    const playoffMatches = allMatches.filter(m => (m.stage === 'Playoffs' || m.stage === 'Gran Final') && m.winnerId);
    
    let playoffsScore = 0;
    const pointsPerRound: Record<number, number> = { 1: 3, 2: 4, 3: 6, 4: 8, 5: 10 };
    
    playoffMatches.forEach(m => {
        let predictedWinnerId = null;
        const pick = userPredictions.find((p: any) => p.matchId === m.id);
        let isRandom = false;

        if (pick && pick.predictedWinnerId) {
            predictedWinnerId = pick.predictedWinnerId;
        } else {
            predictedWinnerId = dataService.getDeterministicWinner(raul.id, m);
            isRandom = true;
        }

        const matchTime = new Date(m.startTime).getTime();
        const cutoff = new Date('2026-02-21T00:00:00Z').getTime();
        let counted = false;

        if (isRandom && matchTime < cutoff) {
            predictedWinnerId = null;
        }

        if (predictedWinnerId === m.winnerId) {
            playoffsScore += (pointsPerRound[m.day || 1] || 3);
            counted = true;
        }

        console.log(`Match ${m.id} (Day ${m.day}): Start=${m.startTime} | Winner=${m.winnerId} | Pick=${pick?.predictedWinnerId || 'None'} | Auto=${dataService.getDeterministicWinner(raul.id, m)} | isRandom=${isRandom} | Counted=${counted} | Points=${counted ? (pointsPerRound[m.day || 1] || 3) : 0}`);
    });

    console.log("Total Playoffs Score:", playoffsScore);
    process.exit(0);
}
run();
