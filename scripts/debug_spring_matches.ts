import { dataService } from '../services/dataService';

// Monkey-patch to force Spring 2026
dataService._getCurrentSplitId = () => 'spring_2026';

async function run() {
    console.log("Checking Spring 2026 Matches...");
    
    // Create a dummy match with real teams if none exist or to test
    const testMatch = {
        id: 'test-match-1',
        teamA: { id: 'g2', name: 'G2 Esports', shortName: 'G2' },
        teamB: { id: 'fnc', name: 'Fnatic', shortName: 'FNC' },
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        day: 1,
        stage: 'groups',
        isCompleted: false
    };

    console.log("Test Match:", testMatch);
    
    const now = new Date();
    const isTbd = testMatch.teamA.id === 'tbd' || testMatch.teamB.id === 'tbd';
    const isTimeLocked = now >= new Date(testMatch.startTime);
    const isLocked = isTimeLocked || isTbd;
    
    console.log(`Test Match Locked Status:`);
    console.log(`  isTbd: ${isTbd}`);
    console.log(`  isTimeLocked: ${isTimeLocked}`);
    console.log(`  isLocked: ${isLocked}`);

    process.exit(0);
}

run();
