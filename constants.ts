import { Team, Region, Match, Stage, User, Role, Player } from './types';

// Role Icons (Official LoL Assets - SVG versions from CommunityDragon for best quality)
export const ROLE_ICONS: Record<Role, string> = {
  [Role.TOP]: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-top.svg",
  [Role.JUNGLE]: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-jungle.svg",
  [Role.MID]: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-middle.svg",
  [Role.ADC]: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-bottom.svg",
  [Role.SUPPORT]: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-utility.svg"
};

// Teams that need their logo inverted to white for visibility on dark backgrounds
export const WHITE_LOGO_TEAMS = ['rat', 'sk', 'gx'];

// Mock Teams - LEC Winter 2026 Context (12 Teams including guests)
// Using 'Special:FilePath' ensures we get the latest correct image from the wiki directly
export const TEAMS: Record<string, Team> = {
  fnc: { 
    id: 'fnc', 
    name: 'Fnatic', 
    shortName: 'FNC', 
    region: Region.LEC, 
    color: '#ff5900',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Fnaticlogo_square.png'
  },
  g2: { 
    id: 'g2', 
    name: 'G2 Esports', 
    shortName: 'G2', 
    region: Region.LEC, 
    color: '#000000',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/G2_Esportslogo_square.png'
  },
  gx: { 
    id: 'gx', 
    name: 'GIANTX', 
    shortName: 'GX', 
    region: Region.LEC, 
    color: '#e4002b',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/GIANTXlogo_square.png'
  },
  kc: { 
    id: 'kc', 
    name: 'Karmine Corp', 
    shortName: 'KC', 
    region: Region.LEC, 
    color: '#10274e',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Karmine_Corplogo_square.png'
  },
  kcb: { 
    id: 'kcb', 
    name: 'Karmine Corp Blue', 
    shortName: 'KCB', 
    region: Region.LEC, 
    color: '#3498db',
    // KC Blue usually uses the main KC logo or the Academy specific one if available.
    // Falling back to main KC logo for safety, but checking for specific file.
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Karmine_Corplogo_square.png' 
  },
  rat: { 
    id: 'rat', 
    name: 'Los Ratones', 
    shortName: 'RAT', 
    region: Region.LEC, 
    color: '#5d5d5d',
    // Specific logo for Los Ratones from the Versus Season wiki context
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Los_Ratoneslogo_square.png'
  },
  mkoi: { 
    id: 'mkoi', 
    name: 'Movistar KOI', 
    shortName: 'KOI', 
    region: Region.LEC, 
    color: '#7606e4',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Movistar_KOIlogo_square.png'
  },
  nvi: { 
    id: 'nvi', 
    name: 'Natus Vincere', 
    shortName: 'NAVI', 
    region: Region.LEC, 
    color: '#fff200',
    // NaVi logo
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Natus_Vincerelogo_square.png'
  },
  sk: { 
    id: 'sk', 
    name: 'SK Gaming', 
    shortName: 'SK', 
    region: Region.LEC, 
    color: '#000000',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/SK_Gaminglogo_square.png'
  },
  bds: { 
    id: 'bds', 
    name: 'Team BDS', 
    shortName: 'BDS', 
    region: Region.LEC, 
    color: '#ff0055',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Team_BDSlogo_square.png'
  },
  th: { 
    id: 'th', 
    name: 'Team Heretics', 
    shortName: 'TH', 
    region: Region.LEC, 
    color: '#c4a673',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Team_Hereticslogo_square.png'
  },
  vit: { 
    id: 'vit', 
    name: 'Team Vitality', 
    shortName: 'VIT', 
    region: Region.LEC, 
    color: '#f0e500',
    logo: 'https://lol.fandom.com/wiki/Special:FilePath/Team_Vitalitylogo_square.png'
  },
};

// Mock Players with Roles and Costs/Stats
// Updated for Winter 2026 Fantasy Context
export const PLAYERS: Player[] = [
  // --- G2 Esports (Premium Team) ---
  { id: 'g2-top', name: "BrokenBlade", role: Role.TOP, teamId: "g2", cost: 330, averagePoints: 18.5, kda: 4.2, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868205763_BrokenBlade_G2_23.png" },
  { id: 'g2-jng', name: "Yike", role: Role.JUNGLE, teamId: "g2", cost: 350, averagePoints: 21.2, kda: 5.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868352613_Yike_G2_23.png" },
  { id: 'g2-mid', name: "Caps", role: Role.MID, teamId: "g2", cost: 390, averagePoints: 25.5, kda: 6.1, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868233777_Caps_G2_23.png" },
  { id: 'g2-adc', name: "Hans Sama", role: Role.ADC, teamId: "g2", cost: 360, averagePoints: 22.0, kda: 5.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868285526_HansSama_G2_23.png" },
  { id: 'g2-sup', name: "Mikyx", role: Role.SUPPORT, teamId: "g2", cost: 310, averagePoints: 17.8, kda: 4.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868323206_Mikyx_G2_23.png" },
  
  // --- Fnatic (High Tier) ---
  { id: 'fnc-top', name: "Oscarinin", role: Role.TOP, teamId: "fnc", cost: 290, averagePoints: 15.5, kda: 3.1, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675953931604_FNC_Oscarinin.png" },
  { id: 'fnc-jng', name: "Razork", role: Role.JUNGLE, teamId: "fnc", cost: 340, averagePoints: 20.8, kda: 4.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675867946955_Razork_FNC_23.png" },
  { id: 'fnc-mid', name: "Humanoid", role: Role.MID, teamId: "fnc", cost: 330, averagePoints: 19.5, kda: 3.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675867909376_Humanoid_FNC_23.png" },
  { id: 'fnc-adc', name: "Noah", role: Role.ADC, teamId: "fnc", cost: 320, averagePoints: 19.2, kda: 4.9, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1685626920364_FNC_Noah.png" },
  { id: 'fnc-sup', name: "Jun", role: Role.SUPPORT, teamId: "fnc", cost: 280, averagePoints: 15.0, kda: 3.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1685626937222_FNC_Jun.png" },
  
  // --- Movistar KOI (Fan Favorites) ---
  { id: 'koi-top', name: "Myrwn", role: Role.TOP, teamId: "mkoi", cost: 260, averagePoints: 14.5, kda: 2.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663673082_MKOI_Myrwn.png" },
  { id: 'koi-jng', name: "Elyoya", role: Role.JUNGLE, teamId: "mkoi", cost: 340, averagePoints: 20.5, kda: 4.2, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663659430_MKOI_Elyoya.png" },
  { id: 'koi-mid', name: "Jojo", role: Role.MID, teamId: "mkoi", cost: 250, averagePoints: 13.8, kda: 2.9 },
  { id: 'koi-adc', name: "Supa", role: Role.ADC, teamId: "mkoi", cost: 310, averagePoints: 18.0, kda: 4.1, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663711913_MKOI_Supa.png" },
  { id: 'koi-sup', name: "Alvaro", role: Role.SUPPORT, teamId: "mkoi", cost: 270, averagePoints: 15.2, kda: 3.4, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663595697_MKOI_Alvaro.png" },
  
  // --- Team Heretics (Veteran Squad) ---
  { id: 'th-top', name: "Wunder", role: Role.TOP, teamId: "th", cost: 270, averagePoints: 14.8, kda: 2.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705423853198_TH_Wunder.png" },
  { id: 'th-jng', name: "Jankos", role: Role.JUNGLE, teamId: "th", cost: 290, averagePoints: 16.0, kda: 3.0, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705423689255_TH_Jankos.png" },
  { id: 'th-mid', name: "Zwyroo", role: Role.MID, teamId: "th", cost: 240, averagePoints: 13.5, kda: 2.7 },
  { id: 'th-adc', name: "Flakked", role: Role.ADC, teamId: "th", cost: 300, averagePoints: 17.5, kda: 4.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705423661555_TH_Flakked.png" },
  { id: 'th-sup', name: "Trymbi", role: Role.SUPPORT, teamId: "th", cost: 280, averagePoints: 15.8, kda: 3.2, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675869408075_Trymbi_KOI_23.png" },
  
  // --- Karmine Corp (Rising Stars) ---
  { id: 'kc-top', name: "Canna", role: Role.TOP, teamId: "kc", cost: 295, averagePoints: 16.5, kda: 2.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716474641662_KC_Canna.png" },
  { id: 'kc-jng', name: "Closer", role: Role.JUNGLE, teamId: "kc", cost: 270, averagePoints: 14.0, kda: 2.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1711640161474_KC_Closer.png" },
  { id: 'kc-mid', name: "Vladi", role: Role.MID, teamId: "kc", cost: 230, averagePoints: 12.5, kda: 2.2 },
  { id: 'kc-adc', name: "Caliste", role: Role.ADC, teamId: "kc", cost: 330, averagePoints: 21.0, kda: 4.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716551820695_SK_Rahel.png" }, // Using placeholder or generic
  { id: 'kc-sup', name: "Targamas", role: Role.SUPPORT, teamId: "kc", cost: 260, averagePoints: 13.5, kda: 2.6, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663456345_KC_Targamas.png" },

  // --- Team BDS (Consistent Performers) ---
  { id: 'bds-top', name: "Adam", role: Role.TOP, teamId: "bds", cost: 310, averagePoints: 17.5, kda: 3.1, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675867625121_Adam_BDS_23.png" },
  { id: 'bds-jng', name: "Sheo", role: Role.JUNGLE, teamId: "bds", cost: 280, averagePoints: 15.5, kda: 3.5, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675867674681_Sheo_BDS_23.png" },
  { id: 'bds-mid', name: "nuc", role: Role.MID, teamId: "bds", cost: 290, averagePoints: 16.2, kda: 3.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675867653556_Nuc_BDS_23.png" },
  { id: 'bds-adc', name: "Ice", role: Role.ADC, teamId: "bds", cost: 300, averagePoints: 17.8, kda: 4.2, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705662709214_BDS_Ice.png" },
  { id: 'bds-sup', name: "Labrov", role: Role.SUPPORT, teamId: "bds", cost: 295, averagePoints: 16.5, kda: 3.6, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675867639572_Labrov_BDS_23.png" },

  // --- SK Gaming (Budget Warriors) ---
  { id: 'sk-top', name: "Irrelevant", role: Role.TOP, teamId: "sk", cost: 300, averagePoints: 17.0, kda: 3.3, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675869038222_Irrelevant_SK_23.png" },
  { id: 'sk-jng', name: "Isma", role: Role.JUNGLE, teamId: "sk", cost: 250, averagePoints: 13.5, kda: 2.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705664188358_SK_Isma.png" },
  { id: 'sk-mid', name: "Nisqy", role: Role.MID, teamId: "sk", cost: 285, averagePoints: 15.8, kda: 3.4, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705664197931_SK_Nisqy.png" },
  { id: 'sk-adc', name: "Rahel", role: Role.ADC, teamId: "sk", cost: 260, averagePoints: 14.5, kda: 3.2, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716551820695_SK_Rahel.png" },
  { id: 'sk-sup', name: "Luon", role: Role.SUPPORT, teamId: "sk", cost: 240, averagePoints: 12.5, kda: 2.9, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716551842831_SK_Luon.png" },

  // --- Team Vitality (Volatile) ---
  { id: 'vit-top', name: "Photon", role: Role.TOP, teamId: "vit", cost: 305, averagePoints: 17.2, kda: 3.0, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675869680327_Photon_VIT_23.png" },
  { id: 'vit-jng', name: "Lyncas", role: Role.JUNGLE, teamId: "vit", cost: 285, averagePoints: 15.8, kda: 3.2, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716552174805_VIT_Lyncas.png" },
  { id: 'vit-mid', name: "Czajek", role: Role.MID, teamId: "vit", cost: 250, averagePoints: 13.2, kda: 2.5 },
  { id: 'vit-adc', name: "Carzzy", role: Role.ADC, teamId: "vit", cost: 310, averagePoints: 18.0, kda: 3.9, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868843232_Carzzy_MAD_23.png" },
  { id: 'vit-sup', name: "Hylissang", role: Role.SUPPORT, teamId: "vit", cost: 270, averagePoints: 14.5, kda: 2.1, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1675868884947_Hylissang_MAD_23.png" },

  // --- GIANTX (Underdogs) ---
  { id: 'gx-top', name: "Th3Antonio", role: Role.TOP, teamId: "gx", cost: 230, averagePoints: 11.5, kda: 2.0, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716550756303_GX_Th3Antonio.png" },
  { id: 'gx-jng', name: "Juhan", role: Role.JUNGLE, teamId: "gx", cost: 250, averagePoints: 13.0, kda: 2.4, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1716550742183_GX_Juhan.png" },
  { id: 'gx-mid', name: "Jackies", role: Role.MID, teamId: "gx", cost: 270, averagePoints: 14.8, kda: 2.8, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663158025_GX_Jackies.png" },
  { id: 'gx-adc', name: "Patrik", role: Role.ADC, teamId: "gx", cost: 280, averagePoints: 15.5, kda: 3.1, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663188356_GX_Patrik.png" },
  { id: 'gx-sup', name: "Ignar", role: Role.SUPPORT, teamId: "gx", cost: 260, averagePoints: 13.5, kda: 2.7, photo: "https://am-a.akamaihd.net/image?resize=375:&f=http%3A%2F%2Fstatic.lolesports.com%2Fplayers%2F1705663140505_GX_Ignar.png" },

  // --- SPECIAL TEAMS (Guest Teams - Variable Pricing) ---
  
  // Los Ratones (Hype Team - High Variance)
  { id: 'rat-top', name: "Alois", role: Role.TOP, teamId: "rat", cost: 280, averagePoints: 15.0, kda: 3.2 },
  { id: 'rat-jng', name: "Caudillas", role: Role.JUNGLE, teamId: "rat", cost: 240, averagePoints: 12.0, kda: 2.5 },
  { id: 'rat-mid', name: "Nemesis", role: Role.MID, teamId: "rat", cost: 350, averagePoints: 21.5, kda: 5.2 },
  { id: 'rat-adc', name: "Crownie", role: Role.ADC, teamId: "rat", cost: 310, averagePoints: 18.5, kda: 4.5 },
  { id: 'rat-sup', name: "Sanchez", role: Role.SUPPORT, teamId: "rat", cost: 210, averagePoints: 10.0, kda: 2.0 },

  // Natus Vincere (The "Super Team" Guest)
  { id: 'nvi-top', name: "Odoamne", role: Role.TOP, teamId: "nvi", cost: 285, averagePoints: 15.2, kda: 3.1 },
  { id: 'nvi-jng', name: "Selfmade", role: Role.JUNGLE, teamId: "nvi", cost: 310, averagePoints: 17.5, kda: 3.8 },
  { id: 'nvi-mid', name: "Perkz", role: Role.MID, teamId: "nvi", cost: 330, averagePoints: 19.5, kda: 3.6 },
  { id: 'nvi-adc', name: "Upset", role: Role.ADC, teamId: "nvi", cost: 340, averagePoints: 20.2, kda: 4.8 },
  { id: 'nvi-sup', name: "Kaiser", role: Role.SUPPORT, teamId: "nvi", cost: 290, averagePoints: 16.0, kda: 3.5 },

  // Karmine Corp Blue (Academy Talent - Budget Options)
  { id: 'kcb-top', name: "Maynter", role: Role.TOP, teamId: "kcb", cost: 220, averagePoints: 11.5, kda: 2.2 },
  { id: 'kcb-jng', name: "113", role: Role.JUNGLE, teamId: "kcb", cost: 230, averagePoints: 12.0, kda: 2.3 },
  { id: 'kcb-mid', name: "Abbedagge", role: Role.MID, teamId: "kcb", cost: 275, averagePoints: 15.0, kda: 3.1 },
  { id: 'kcb-adc', name: "Keduii", role: Role.ADC, teamId: "kcb", cost: 240, averagePoints: 13.0, kda: 2.9 },
  { id: 'kcb-sup', name: "Hantera", role: Role.SUPPORT, teamId: "kcb", cost: 210, averagePoints: 10.5, kda: 2.4 },
];

// Mock Matches
export const MATCHES: Match[] = [
  {
    id: 'playoff-1', 
    teamA: TEAMS.g2,
    teamB: TEAMS.kc,
    startTime: new Date(Date.now() + 86400000).toISOString(),
    stage: Stage.PLAYOFFS,
    isCompleted: false,
    day: 1
  },
  {
    id: 'playoff-2',
    teamA: TEAMS.fnc,
    teamB: TEAMS.mkoi,
    startTime: new Date(Date.now() + 90000000).toISOString(),
    stage: Stage.PLAYOFFS,
    isCompleted: false,
    day: 1
  },
  {
    id: 'playoff-3',
    teamA: TEAMS.rat, // Los Ratones
    teamB: TEAMS.kcb, // KC Blue
    startTime: new Date(Date.now() + 95000000).toISOString(),
    stage: Stage.PLAYOFFS,
    isCompleted: false,
    day: 1
  },
  {
    id: 'playoff-4',
    teamA: TEAMS.nvi, // NAVI
    teamB: TEAMS.sk,
    startTime: new Date(Date.now() + 100000000).toISOString(),
    stage: Stage.PLAYOFFS,
    isCompleted: false,
    day: 1
  },
];

// Helper to generate a predictable 11-day Round Robin schedule for 12 teams
export const getMatchesForDay = (day: number): Match[] => {
  const teamsArray = Object.values(TEAMS); // 12 teams
  const numTeams = teamsArray.length;
  
  if (numTeams % 2 !== 0) return []; // Should be even for round robin
  
  const matches: Match[] = [];
  const matchesPerDay = numTeams / 2;

  // Simple rotation algorithm for round robin
  const indices = Array.from({ length: numTeams }, (_, i) => i);
  
  const rotationOffset = day - 1;
  const rotatedIndices = [
    indices[0],
    ...indices.slice(1).map((val, i, arr) => {
       const newPos = (i + rotationOffset) % arr.length;
       return arr[newPos];
    })
  ];
  
  const topRow = rotatedIndices.slice(0, numTeams / 2);
  const bottomRow = rotatedIndices.slice(numTeams / 2).reverse();
  
  for (let i = 0; i < matchesPerDay; i++) {
     const teamAIndex = topRow[i];
     const teamBIndex = bottomRow[i];
     
     const baseDate = new Date();
     baseDate.setDate(baseDate.getDate() + day);
     baseDate.setHours(17 + i, 0, 0, 0);

     // Revert to simple ID format
     const matchId = `d${day}-m${i}`;

     matches.push({
        id: matchId, 
        teamA: teamsArray[teamAIndex],
        teamB: teamsArray[teamBIndex],
        startTime: baseDate.toISOString(),
        stage: Stage.GROUPS,
        isCompleted: false,
        day: day // ADDED: Explicitly set the day
     });
  }

  return matches;
};

// Mock Leaderboard
export const USERS: User[] = [
  { 
    id: 'u1', 
    name: 'FakerFan23', 
    avatar: 'https://picsum.photos/40/40?random=1', 
    score: 225, // Updated: Matchday (45) + Ranking (80) + Playoffs (100) = 225
    scoreBreakdown: {
        matchday: 45,
        ranking: 80,
        playoffs: 100,
        crystalBall: 50,
        fantasy: 70
    },
    rank: 1,
    pointsHistory: [
        { day: 'Day 1', points: 40 },
        { day: 'Day 2', points: 90 },
        { day: 'Day 3', points: 150 },
        { day: 'Day 4', points: 225 }, // Match score
    ],
    fantasyHistory: [
        { day: 'J1', points: 50 },
        { day: 'J2', points: 60 },
        { day: 'J3', points: 70 },
    ],
    // Mock Fantasy Team (High Value)
    fantasyTeam: {
        [Role.TOP]: 'g2-top',
        [Role.JUNGLE]: 'fnc-jng',
        [Role.MID]: 'rat-mid',
        [Role.ADC]: 'kc-adc',
        [Role.SUPPORT]: 'th-sup',
    }
  },
  { 
    id: 'u2', 
    name: 'JungleDiff', 
    avatar: 'https://picsum.photos/40/40?random=2', 
    score: 195, // Updated: Matchday (55) + Ranking (60) + Playoffs (80) = 195
    scoreBreakdown: {
        matchday: 55,
        ranking: 60,
        playoffs: 80,
        crystalBall: 30,
        fantasy: 85
    },
    rank: 2,
    pointsHistory: [
        { day: 'Day 1', points: 50 },
        { day: 'Day 2', points: 90 },
        { day: 'Day 3', points: 140 },
        { day: 'Day 4', points: 195 }, // Match score
    ],
    fantasyHistory: [
        { day: 'J1', points: 60 },
        { day: 'J2', points: 75 },
        { day: 'J3', points: 85 },
    ],
    // Mock Fantasy Team (Budget / Meta)
    fantasyTeam: {
        [Role.TOP]: 'sk-top',
        [Role.JUNGLE]: 'mkoi-jng',
        [Role.MID]: 'nvi-mid',
        [Role.ADC]: 'th-adc',
        [Role.SUPPORT]: 'gx-sup',
    }
  },
];