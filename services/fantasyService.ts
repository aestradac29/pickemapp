
/*
    === SERVICIO FANTASY ===
    Lógica de cálculo de puntos local.
*/

const POINTS_SYSTEM = {
    KILL: 3,
    DEATH: -1,
    ASSIST: 1.5,
    CS: 0.02,
    WIN_BONUS: 5
};

export const fantasyService = {
    calculatePoints(stats: any) {
        let score = 0;
        score += stats.kills * POINTS_SYSTEM.KILL;
        score += stats.deaths * POINTS_SYSTEM.DEATH;
        score += stats.assists * POINTS_SYSTEM.ASSIST;
        score += stats.cs * POINTS_SYSTEM.CS;
        if (stats.win) score += POINTS_SYSTEM.WIN_BONUS;
        return parseFloat(score.toFixed(2));
    }
};
