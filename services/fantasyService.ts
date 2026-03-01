
import { Role, PlayerGameStats, Stage } from '../types';

/*
    === SERVICIO FANTASY ===
    Lógica de cálculo de puntos local.
    Sistema "High Stakes": Premia agresividad y castiga muertes.
*/

const POINTS_SYSTEM = {
    // Base Stats
    KILL: 1.5,
    DEATH: -1,
    ASSIST: 1,
    CS: 0.01,
    WIN_BONUS: 1,
    
    // Global Bonuses
    MVP_BONUS: 3,
    FIRST_BLOOD: 1,
    HIGH_KILL_BONUS: 3,    // +10 Kills
    PERFECT_KDA_BONUS: 3,  // 0 Deaths & KDA >= 5

    // Multikills
    DOUBLE_KILL: 1,
    TRIPLE_KILL: 2,
    QUADRA_KILL: 3,
    PENTA_KILL: 4,

    // Role Specifics
    TOP_DMG_PERCENT: 3,    // Top > 25% Dmg
    MID_DMG_PERCENT: 3,    // Mid > 30% Dmg
    ADC_DPM_1000: 3,       // ADC DPM >= 1000
    SUPP_ASSIST_10: 2,     // Supp >= 10 Assists
    SUPP_FIRST_DRAGON: 1,  // Supp Team gets 1st Dragon
    SUPP_VISION_MULT: 0.03, // Vision Score Multiplier
    
    JGL_DRAGON_SOUL: 1.5,  // Team >= 4 Dragons
    JGL_BARON_KILL: 2      // Per Baron
};

export const fantasyService = {
    calculatePoints(
        stats: PlayerGameStats, 
        role: Role, 
        isCaptain: boolean = false,
        bracketStage: string = 'winners',
        stage: string = Stage.GROUPS
    ) {
        let score = 0;

        // 1. BASE STATS
        score += stats.kills * POINTS_SYSTEM.KILL;
        score += stats.deaths * POINTS_SYSTEM.DEATH;
        score += stats.assists * POINTS_SYSTEM.ASSIST;
        score += stats.cs * POINTS_SYSTEM.CS;
        
        // 2. GLOBAL BONUSES
        if ((stats as any).win) score += POINTS_SYSTEM.WIN_BONUS; // 'win' passed dynamically from the specific game result
        if (stats.isMvp) score += POINTS_SYSTEM.MVP_BONUS;
        if (stats.firstBlood) score += POINTS_SYSTEM.FIRST_BLOOD;
        
        // High Kill (+10 kills)
        if (stats.kills >= 10) {
            score += POINTS_SYSTEM.HIGH_KILL_BONUS;
        }

        // Perfect KDA (0 Deaths, KDA >= 5)
        const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
        if (stats.deaths === 0 && kda >= 5) {
            score += POINTS_SYSTEM.PERFECT_KDA_BONUS;
        }

        // 3. MULTIKILLS
        score += (stats.doubleKills || 0) * POINTS_SYSTEM.DOUBLE_KILL;
        score += (stats.tripleKills || 0) * POINTS_SYSTEM.TRIPLE_KILL;
        score += (stats.quadraKills || 0) * POINTS_SYSTEM.QUADRA_KILL;
        score += (stats.pentaKills || 0) * POINTS_SYSTEM.PENTA_KILL;

        // 4. ROLE SPECIFIC BONUSES
        switch (role) {
            case Role.TOP:
                // Si hace 25% o mas del daño de equipo
                if (stats.teamDamagePercentage >= 25) score += POINTS_SYSTEM.TOP_DMG_PERCENT;
                break;
            
            case Role.JUNGLE:
                // Si el equipo hace 4 dragones o mas
                if (stats.dragonsKilled >= 4) score += POINTS_SYSTEM.JGL_DRAGON_SOUL;
                // 2 puntos por cada baron derrotado
                score += (stats.baronsKilled || 0) * POINTS_SYSTEM.JGL_BARON_KILL;
                break;

            case Role.MID:
                // Si hace 30% o mas del daño de equipo
                if (stats.teamDamagePercentage >= 30) score += POINTS_SYSTEM.MID_DMG_PERCENT;
                break;

            case Role.ADC:
                // Si el daño/minuto >= 1000
                if (stats.damagePerMinute >= 1000) score += POINTS_SYSTEM.ADC_DPM_1000;
                break;

            case Role.SUPPORT:
                // +10 asistencias
                if (stats.assists >= 10) score += POINTS_SYSTEM.SUPP_ASSIST_10;
                // Si el primer dragon es para su equipo
                if (stats.firstDragon) score += POINTS_SYSTEM.SUPP_FIRST_DRAGON;
                // Vision score
                score += (stats.visionScore || 0) * POINTS_SYSTEM.SUPP_VISION_MULT;
                break;
        }

        // --- BRACKET STAKES (Reward Upper Bracket / Finals) ---
        let bracketMultiplier = 1.0;
        
        if (stage === Stage.FINALS || bracketStage === 'finals') {
            bracketMultiplier = 1.25; // Grand Final Bonus
        } else if (stage === Stage.PLAYOFFS) {
            if (bracketStage === 'winners') bracketMultiplier = 1.15; // Winners Bracket Bonus
            if (bracketStage === 'losers') bracketMultiplier = 1.0;   // Losers Bracket Standard
        }

        score = score * bracketMultiplier;

        // 5. CAPTAIN MULTIPLIER
        if (isCaptain) {
            score = score * 1.5;
        }

        // Devuelve 2 decimales siempre
        return parseFloat(score.toFixed(2));
    }
};