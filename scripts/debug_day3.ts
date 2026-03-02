import { dataService } from '../services/dataService';
async function run() {
    const allMatches = await dataService.getMatches();
    const matches = allMatches.filter(m => m.day === 3 && m.stage === 'Playoffs');
    matches.forEach(m => console.log(m.id, m.bracketStage, m.teamA.shortName, m.teamB.shortName));
    process.exit(0);
}
run();
