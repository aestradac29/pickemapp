import { dataService } from '../services/dataService';
async function run() {
    const allMatches = await dataService.getMatches();
    const match = allMatches.find(m => m.id === 'custom-1771676684096');
    console.log(match);
    process.exit(0);
}
run();
