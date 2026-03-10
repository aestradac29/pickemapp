import { dataService } from '../services/dataService';

// Mock localStorage for the service (since it uses it)
// We need to override _getCurrentSplitId or mock localStorage.
// Since we can't easily mock localStorage in this node script without a library,
// we will monkey-patch _getCurrentSplitId for this test.

const originalGetSplit = dataService._getCurrentSplitId;

async function run() {
    // Check Winter
    dataService._getCurrentSplitId = () => 'winter_2026';
    console.log("Testing Winter 2026 Data...");
    try {
        const players = await dataService.getPlayers();
        console.log(`Winter Players found: ${players.length}`);
    } catch (error) {
        console.error("Error Winter:", error);
    }

    // Check Spring
    dataService._getCurrentSplitId = () => 'spring_2026';
    console.log("Testing Spring 2026 Data...");
    try {
        const players = await dataService.getPlayers();
        console.log(`Spring Players found: ${players.length}`);
        if (players.length > 0) {
             console.log("First Spring player:", players[0].name);
        }
    } catch (error) {
        console.error("Error Spring:", error);
    }
    
    process.exit(0);
}

run();
