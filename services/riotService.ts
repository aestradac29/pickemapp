import { Option } from '../components/ui/SearchableSelect';

const DDRAGON_BASE_URL = 'https://ddragon.leagueoflegends.com';

// Interfaces for Riot API response structures
interface RiotChampion {
  id: string;
  key: string;
  name: string;
  title: string;
  image: {
    full: string;
    sprite: string;
    group: string;
  };
  tags: string[];
}

interface RiotChampionResponse {
  type: string;
  format: string;
  version: string;
  data: Record<string, RiotChampion>;
}

/**
 * Fetches the latest patch version of League of Legends
 */
export const getLatestVersion = async (): Promise<string> => {
  try {
    const response = await fetch(`${DDRAGON_BASE_URL}/api/versions.json`);
    if (!response.ok) throw new Error('Failed to fetch versions');
    const versions = await response.json();
    return versions[0]; // The first item is always the latest version
  } catch (error) {
    console.error('Error fetching LoL version:', error);
    return '14.1.1'; // Fallback safe version
  }
};

/**
 * Fetches all champions from the Data Dragon CDN
 * Returns them formatted as Options for our select component
 */
export const getChampions = async (): Promise<Option[]> => {
  try {
    const version = await getLatestVersion();
    const response = await fetch(`${DDRAGON_BASE_URL}/cdn/${version}/data/es_ES/champion.json`);
    
    if (!response.ok) throw new Error('Failed to fetch champions');
    
    const data: RiotChampionResponse = await response.json();
    const champions = Object.values(data.data);

    return champions.map((champ) => ({
      id: champ.id, // ID used for internal logic (e.g., "MonkeyKing")
      label: champ.name, // Display name (e.g., "Wukong")
      subLabel: champ.title.charAt(0).toUpperCase() + champ.title.slice(1),
      // Official Square Asset URL
      image: `${DDRAGON_BASE_URL}/cdn/${version}/img/champion/${champ.image.full}`,
      color: '#c8aa6e' // Hextech Gold as default accent
    }));

  } catch (error) {
    console.error('Error fetching champions:', error);
    return [];
  }
};