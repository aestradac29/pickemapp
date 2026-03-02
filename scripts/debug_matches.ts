import { dataService } from '../services/dataService';
async function run() {
    const allMatches = await dataService.getMatches();
    const playoffMatches = allMatches.filter(m => (m.stage === 'Playoffs' || m.stage === 'Gran Final'));
    console.log("Total Playoff Matches:", playoffMatches.length);
    playoffMatches.forEach(m => {
        console.log(`Match ${m.id} (Day ${m.day}): Start=${m.startTime} | Winner=${m.winnerId}`);
    });
    process.exit(0);
}
run();
