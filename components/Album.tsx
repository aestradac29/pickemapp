import React, { useState, useEffect, useMemo } from 'react';
import { Card, UserCard, CardType, Role } from '../types';
import { dataService } from '../services/dataService';
import { Search, Filter, Loader2, PackageOpen, X, ArrowRightLeft, Check, Clock } from 'lucide-react';
import { TradeOffer } from '../types';

interface AlbumProps {
  currentUserId: string | null;
  isAdmin?: boolean;
}

export const Album: React.FC<AlbumProps> = ({ currentUserId, isAdmin }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [inventory, setInventory] = useState<UserCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<CardType | 'ALL'>('ALL');
  const [filterTeam, setFilterTeam] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // We will need to fetch teams and players to display card details
  const [activeTab, setActiveTab] = useState<'COLLECTION' | 'INVENTORY' | 'MARKET' | 'OFFERS' | 'ADMIN'>('COLLECTION');
  const [marketListings, setMarketListings] = useState<{userId: string, username: string, cardId: string, quantity: number}[]>([]);
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [isCreatingTrade, setIsCreatingTrade] = useState<{targetUserId: string, targetUsername: string, targetCardId: string} | null>(null);
  const [selectedOfferCard, setSelectedOfferCard] = useState<string | null>(null); // Card I want to offer from my duplicates
  const [teamsMap, setTeamsMap] = useState<Record<string, any>>({});
  const [playersMap, setPlayersMap] = useState<Record<string, any>>({});
  const [splits, setSplits] = useState<{id: string, name: string, status: string}[]>([]);
  const [selectedSplit, setSelectedSplit] = useState<string>('winter_2026');
  const [allPossibleCards, setAllPossibleCards] = useState<Card[]>([]);
  const [tempAdminCards, setTempAdminCards] = useState<Card[]>([]);
  const [nextPackTime, setNextPackTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Pack Animation State
  const [showPackAnimation, setShowPackAnimation] = useState(false);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([]);

  useEffect(() => {
    const loadAlbumData = async () => {
      if (!currentUserId) return;
      setIsLoading(true);
      try {
        const availableSplits = await dataService.getSplits();
        setSplits(availableSplits);
        
        // Fetch all base cards for the current split
        const allCards = await dataService.getCardsForSplit(selectedSplit);
        setCards(allCards);

        // Fetch user's collection
        const collection = await dataService.getUserCollection(currentUserId, selectedSplit);
        setUserCards(collection);

        // Fetch user's inventory
        const inv = await dataService.getUserInventory(currentUserId, selectedSplit);
        setInventory(inv);

        // Fetch pack state
        const packState = await dataService.getUserPackState(currentUserId, selectedSplit);
        if (packState && packState.lastOpenedAt) {
          const lastOpened = new Date(packState.lastOpenedAt);
          const nextTime = new Date(lastOpened.getTime() + 24 * 60 * 60 * 1000);
          // INFINITE PACKS: Ignore time check for UI
          /*
          if (nextTime > new Date()) {
            setNextPackTime(nextTime);
          } else {
            setNextPackTime(null);
          }
          */
          setNextPackTime(null); // Always enable button
        } else {
          setNextPackTime(null);
        }

        // Fetch reference data
        const teams = await dataService.getTeams();
        setTeamsMap(teams);
        
        const players = await dataService.getPlayers();
        const pMap: Record<string, any> = {};
        players.forEach(p => pMap[p.id] = p);
        setPlayersMap(pMap);

        if (isAdmin) {
          const possible: Card[] = [];
          Object.values(teams).forEach((t: any) => {
            if (t.id === 'tbd') return; // Skip TBD team
            possible.push({
              id: `team_${t.id}`,
              splitId: selectedSplit,
              type: CardType.TEAM,
              rarity: 'COMMON',
              referenceId: t.id
            });
          });
          players.forEach((p: any) => {
            possible.push({
              id: `player_${p.id}`,
              splitId: selectedSplit,
              type: CardType.PLAYER,
              rarity: 'COMMON',
              referenceId: p.id
            });
          });
          setAllPossibleCards(possible);
          setTempAdminCards(allCards);
        }

      } catch (error) {
        console.error("Error loading album data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbumData();
  }, [currentUserId, selectedSplit, isAdmin]);

  useEffect(() => {
    if (!nextPackTime) {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextPackTime.getTime() - now.getTime();

      if (diff <= 0) {
        setNextPackTime(null);
        setTimeLeft('');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextPackTime]);

  const [openedCards, setOpenedCards] = useState<Card[] | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenPack = async () => {
    if (!currentUserId) return;
    setIsOpening(true);
    setPackError(null);
    try {
      const newCards = await dataService.openDailyPack(currentUserId, selectedSplit);
      setOpenedCards(newCards);
      setRevealedCards(new Array(newCards.length).fill(false));
      setShowPackAnimation(true);
      
      // Update next pack time (visual only, since we allowed infinite)
      const now = new Date();
      // setNextPackTime(new Date(now.getTime() + 24 * 60 * 60 * 1000));
      
      // Refresh inventory
      const inv = await dataService.getUserInventory(currentUserId, selectedSplit);
      setInventory(inv);
    } catch (error: any) {
      setPackError(error.message || "Error al abrir el sobre");
    } finally {
      setIsOpening(false);
    }
  };

  const handleCardReveal = (index: number) => {
    setRevealedCards(prev => {
      const newRevealed = [...prev];
      newRevealed[index] = true;
      return newRevealed;
    });
  };

  const handleMoveToCollection = async (inventoryItem: UserCard) => {
    if (!currentUserId) return;
    
    // Check if already owned to prevent duplicates as requested
    const isAlreadyOwned = userCards.some(uc => uc.cardId === inventoryItem.cardId);
    if (isAlreadyOwned) {
      alert("Ya tienes este cromo en tu álbum.");
      return;
    }

    try {
      await dataService.moveCardToCollection(currentUserId, selectedSplit, inventoryItem.id, inventoryItem.cardId);
      
      // Optimistic Update
      setInventory(prev => prev.filter(item => item.id !== inventoryItem.id));
      
      setUserCards(prev => {
        const existing = prev.find(uc => uc.cardId === inventoryItem.cardId);
        if (existing) {
          // Should not happen with the check above, but for safety:
          return prev;
        } else {
          return [...prev, { id: 'temp', userId: currentUserId, cardId: inventoryItem.cardId, quantity: 1 }];
        }
      });

      // Background refresh to be safe
      const collection = await dataService.getUserCollection(currentUserId, selectedSplit);
      setUserCards(collection);
    } catch (e) {
      console.error("Error moving to collection:", e);
      alert("Error al pegar el cromo.");
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteCollection = async () => {
    if (!currentUserId) {
      console.error("No user ID found");
      return;
    }
    
    console.log("Deleting collection for user:", currentUserId, "split:", selectedSplit);
    try {
      await dataService.deleteUserCollection(currentUserId, selectedSplit);
      setUserCards([]);
      setInventory([]);
      setNextPackTime(null);
      setShowDeleteConfirm(false);
      alert("Colección borrada.");
    } catch (e) {
      console.error("Error deleting collection:", e);
      alert("Error al borrar colección. Revisa la consola.");
    }
  };

  const getCardDetails = (card: Card) => {
    if (card.type === CardType.TEAM) {
      const team = teamsMap[card.referenceId];
      return {
        name: team?.name || 'Unknown Team',
        image: team?.logo || `https://ui-avatars.com/api/?name=${team?.shortName || 'TBD'}&background=random`,
        subtitle: team?.region || 'LEC',
        color: team?.color || '#333'
      };
    } else {
      const player = playersMap[card.referenceId];
      const team = teamsMap[player?.teamId];
      return {
        name: player?.name || 'Unknown Player',
        image: player?.photo || `https://ui-avatars.com/api/?name=${player?.name || 'UNK'}&background=random`,
        subtitle: player?.role || 'Unknown Role',
        teamLogo: team?.logo,
        color: team?.color || '#333'
      };
    }
  };

  const loadMarketData = async () => {
    setIsLoading(true);
    try {
      const duplicates = await dataService.getAllDuplicateCards(selectedSplit);
      setMarketListings(duplicates.filter(d => d.userId !== currentUserId));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTradeOffers = async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      const offers = await dataService.getUserTradeOffers(currentUserId);
      setTradeOffers(offers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MARKET') {
      loadMarketData();
    } else if (activeTab === 'OFFERS') {
      loadTradeOffers();
    }
  }, [activeTab]);

  const handleCreateTrade = async () => {
    if (!currentUserId || !isCreatingTrade || !selectedOfferCard) return;
    try {
      await dataService.createTradeOffer({
        senderId: currentUserId,
        receiverId: isCreatingTrade.targetUserId,
        offeredCardId: selectedOfferCard,
        requestedCardId: isCreatingTrade.targetCardId,
        status: 'PENDING'
      });
      setIsCreatingTrade(null);
      setSelectedOfferCard(null);
      alert("Oferta de intercambio enviada con éxito.");
    } catch (e) {
      console.error(e);
      alert("Error al crear oferta.");
    }
  };

  const handleRespondTrade = async (offerId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await dataService.respondToTradeOffer(offerId, status, selectedSplit);
      await loadTradeOffers();
      // Refresh collection if accepted
      if (status === 'ACCEPTED' && currentUserId) {
        const collection = await dataService.getUserCollection(currentUserId, selectedSplit);
        setUserCards(collection);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error al responder a la oferta.");
      await loadTradeOffers(); // Reload to get updated status
    }
  };

  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const handleToggleCard = (card: Card) => {
    setTempAdminCards(prev => {
      const exists = prev.find(c => c.id === card.id);
      if (exists) {
        return prev.filter(c => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  const handleSaveAdminCards = async () => {
    setIsSavingAdmin(true);
    try {
      await dataService.saveCardsForSplit(selectedSplit, tempAdminCards);
      setCards(tempAdminCards);
      alert("Cartas guardadas correctamente para el split.");
    } catch (e) {
      console.error(e);
      alert("Error al guardar las cartas.");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const [inventorySort, setInventorySort] = useState<'NAME' | 'TEAM' | 'TYPE'>('NAME');
  const [inventoryFilterTeam, setInventoryFilterTeam] = useState<string>('ALL');

  const filteredInventory = useMemo(() => {
    let result = [...inventory];

    // Filter by team
    if (inventoryFilterTeam !== 'ALL') {
      result = result.filter(item => {
        const card = cards.find(c => c.id === item.cardId);
        if (!card) return false;
        if (card.type === CardType.TEAM) return card.referenceId === inventoryFilterTeam;
        if (card.type === CardType.PLAYER) return playersMap[card.referenceId]?.teamId === inventoryFilterTeam;
        return false;
      });
    }

    // Sort
    result.sort((a, b) => {
      const cardA = cards.find(c => c.id === a.cardId);
      const cardB = cards.find(c => c.id === b.cardId);
      if (!cardA || !cardB) return 0;

      const detailsA = getCardDetails(cardA);
      const detailsB = getCardDetails(cardB);

      if (inventorySort === 'NAME') {
        return detailsA.name.localeCompare(detailsB.name);
      } else if (inventorySort === 'TEAM') {
        return detailsA.subtitle.localeCompare(detailsB.subtitle);
      } else if (inventorySort === 'TYPE') {
        return cardA.type.localeCompare(cardB.type);
      }
      return 0;
    });

    return result;
  }, [inventory, inventorySort, inventoryFilterTeam, cards, playersMap]);

  const uniqueCards = useMemo(() => {
    const map = new Map<string, Card>();
    cards.forEach(c => {
      if (!map.has(c.referenceId)) {
        map.set(c.referenceId, c);
      }
    });
    return Array.from(map.values());
  }, [cards]);

  const uniqueCollectedCount = useMemo(() => {
    const collectedRefIds = new Set<string>();
    userCards.forEach(uc => {
      const card = cards.find(c => c.id === uc.cardId);
      if (card && uc.quantity > 0) {
        collectedRefIds.add(card.referenceId);
      }
    });
    return collectedRefIds.size;
  }, [userCards, cards]);

  const filteredCards = uniqueCards.filter(card => {
    if (filterType !== 'ALL' && card.type !== filterType) return false;
    
    const details = getCardDetails(card);
    
    if (searchQuery && !details.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    if (card.type === CardType.PLAYER) {
      const player = playersMap[card.referenceId];
      if (filterTeam !== 'ALL' && player?.teamId !== filterTeam) return false;
      if (filterRole !== 'ALL' && player?.role !== filterRole) return false;
    } else if (card.type === CardType.TEAM) {
      if (filterTeam !== 'ALL' && card.referenceId !== filterTeam) return false;
      if (filterRole !== 'ALL') return false; // Teams don't have roles
    }

    return true;
  });

  const uniqueTeams = Object.values(teamsMap).filter((t: any) => t.id !== 'tbd');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8aa6e]" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#c8aa6e] uppercase tracking-widest">Álbum de Cartas</h2>
          <p className="text-gray-400 text-sm mt-1">Colecciona cartas de jugadores y equipos</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[#091428] border border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('COLLECTION')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'COLLECTION' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Mi Colección
            </button>
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors relative ${activeTab === 'INVENTORY' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Inventario
              {inventory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] flex items-center justify-center rounded-full shadow-lg">
                  {inventory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('MARKET')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'MARKET' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Mercado
            </button>
            <button
              onClick={() => setActiveTab('OFFERS')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors relative ${activeTab === 'OFFERS' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Ofertas
              {tradeOffers.filter(o => o.toUserId === currentUserId && o.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('ADMIN')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'ADMIN' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Admin
              </button>
            )}
          </div>

          <div className="relative">
            {showDeleteConfirm && (
              <div className="absolute top-full right-0 mt-2 p-4 bg-red-900/90 backdrop-blur border border-red-500 rounded-xl shadow-xl z-50 w-64 text-center">
                <p className="text-white text-sm mb-3 font-bold">¿Borrar TODA la colección? Esta acción es irreversible.</p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDeleteCollection}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg font-bold"
                  >
                    Sí, Borrar
                  </button>
                </div>
              </div>
            )}
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3 rounded-xl bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 transition-colors"
              title="Borrar Colección (Debug)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={handleOpenPack}
            disabled={!!nextPackTime || isOpening}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wider shadow-lg transition-all ${
              nextPackTime 
                ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700' 
                : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-500/20 hover:scale-105'
            }`}
          >
            {nextPackTime ? (
              <>
                <Clock className="w-5 h-5" />
                <span>{timeLeft}</span>
              </>
            ) : (
              <>
                <PackageOpen className="w-5 h-5" />
                <span>Abrir Sobre</span>
              </>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'COLLECTION' && (
        <>
          {/* Collection Progress */}
          <div className="bg-[#091428]/80 backdrop-blur border border-gray-800 rounded-xl p-6 mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Progreso de la Colección</h3>
              <p className="text-gray-400 text-sm">
                Has coleccionado <span className="text-[#c8aa6e] font-bold">{uniqueCollectedCount}</span> de <span className="text-white font-bold">{uniqueCards.length}</span> cromos
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-[#c8aa6e]">
                {uniqueCards.length > 0 ? Math.round((uniqueCollectedCount / uniqueCards.length) * 100) : 0}%
              </div>
              <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#c8aa6e] to-[#f0e6d2]" 
                  style={{ width: `${uniqueCards.length > 0 ? (uniqueCollectedCount / uniqueCards.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[#091428]/80 backdrop-blur border border-gray-800 rounded-xl p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">Filtros:</span>
        </div>

        <select
          value={selectedSplit}
          onChange={(e) => setSelectedSplit(e.target.value)}
          className="bg-[#0a1428] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#c8aa6e]"
        >
          {splits.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-[#0a1428] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#c8aa6e]"
        >
          <option value="ALL">Todos los Tipos</option>
          <option value={CardType.PLAYER}>Jugadores</option>
          <option value={CardType.TEAM}>Equipos</option>
        </select>

        <select 
          value={filterTeam} 
          onChange={(e) => setFilterTeam(e.target.value)}
          className="bg-[#0a1428] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#c8aa6e]"
        >
          <option value="ALL">Todos los Equipos</option>
          {uniqueTeams.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select 
          value={filterRole} 
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="bg-[#0a1428] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#c8aa6e]"
          disabled={filterType === CardType.TEAM}
        >
          <option value="ALL">Todas las Posiciones</option>
          {Object.values(Role).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a1428] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 outline-none focus:border-[#c8aa6e]"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-12">
        {Object.entries(
          filteredCards.reduce((acc, card) => {
            let teamId = 'unknown';
            if (card.type === CardType.TEAM) {
              teamId = card.referenceId;
            } else if (card.type === CardType.PLAYER) {
              teamId = playersMap[card.referenceId]?.teamId || 'unknown';
            }
            if (!acc[teamId]) acc[teamId] = [];
            acc[teamId].push(card);
            return acc;
          }, {} as Record<string, Card[]>)
        ).map(([teamId, teamCards]) => {
          const team = teamsMap[teamId];
          const typedTeamCards = teamCards as Card[];
          return (
            <div key={teamId} className="relative">
              <div className="flex items-center gap-4 mb-6 pl-4">
                {team?.logo && <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain drop-shadow-lg" referrerPolicy="no-referrer" />}
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{team?.name || 'Otros'}</h2>
              </div>
              
              <div className="bg-[#091428]/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
                {/* Album binding effect */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 to-transparent z-0 pointer-events-none border-r border-white/5" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/80 to-transparent z-0 pointer-events-none border-l border-white/5" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 relative z-10">
                  {typedTeamCards.map((card, index) => {
                    const ownedCardsForRef = userCards.filter(uc => {
                      const c = cards.find(c => c.id === uc.cardId);
                      return c && c.referenceId === card.referenceId && uc.quantity > 0;
                    });
                    const isOwned = ownedCardsForRef.length > 0;
                    
                    const displayCard = isOwned ? (cards.find(c => c.id === ownedCardsForRef[0].cardId) || card) : card;
                    
                    const inventoryItemsForRef = inventory.filter(inv => {
                      const c = cards.find(c => c.id === inv.cardId);
                      return c && c.referenceId === card.referenceId;
                    });
                    const canPaste = !isOwned && inventoryItemsForRef.length > 0;
                    const inventoryItemToPaste = canPaste ? inventoryItemsForRef[0] : null;

                    const details = getCardDetails(displayCard);
                    // Find global index for card number
                    const globalIndex = uniqueCards.findIndex(c => c.referenceId === card.referenceId);

                    return (
                      <div key={card.id} className="flex flex-col items-center">
                        <div 
                          className={`
                            relative w-full aspect-[2.5/3.5] rounded-xl border-2 overflow-hidden transition-all duration-300
                            ${isOwned ? 'border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:scale-105 hover:-translate-y-2 cursor-pointer hover:shadow-[0_15px_30px_rgba(200,170,110,0.3)] hover:border-[#c8aa6e]' : ''}
                            ${canPaste ? 'border-[#c8aa6e] shadow-[0_0_15px_rgba(200,170,110,0.5)] scale-105 cursor-pointer animate-pulse' : ''}
                            ${!isOwned && !canPaste ? 'border-gray-800/50 opacity-40 grayscale shadow-inner' : ''}
                          `}
                          style={{ backgroundColor: (isOwned || canPaste) ? details.color : '#050a14' }}
                          onClick={() => canPaste && inventoryItemToPaste && handleMoveToCollection(inventoryItemToPaste)}
                        >
                          {/* Card Background Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                          
                          {/* Image */}
                          {isOwned || canPaste ? (
                            <img 
                              src={details.image} 
                              alt={details.name}
                              className={`absolute inset-0 w-full h-full opacity-90 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover object-top mix-blend-luminosity'}`}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20">
                              <div className="text-gray-600 font-bold text-5xl opacity-20 mb-2">
                                {globalIndex + 1}
                              </div>
                              <div className="text-gray-400 font-bold text-xs uppercase tracking-widest opacity-60">
                                {details.name}
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div className="absolute inset-0 z-20 flex flex-col justify-end p-3">
                            {card.type === CardType.PLAYER && details.teamLogo && (isOwned || canPaste) && (
                              <div className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center border border-white/10">
                                <img src={details.teamLogo} alt="Team" className="w-full h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            
                            {(isOwned || canPaste) && (
                              <div className="text-center">
                                <h3 className="font-bold text-white text-sm leading-tight drop-shadow-md uppercase tracking-wider">{details.name}</h3>
                                <p className="text-[10px] text-gray-300 font-medium uppercase tracking-widest">{details.subtitle}</p>
                              </div>
                            )}
                          </div>

                          {/* Paste Badge */}
                          {canPaste && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                              <button className="bg-[#c8aa6e] text-black font-bold px-4 py-2 rounded-full shadow-lg transform hover:scale-110 transition-transform flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                PEGAR
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Card Number below */}
                        <div className="mt-3 text-xs font-mono text-gray-500 bg-black/40 px-3 py-1 rounded-full border border-gray-800/50">
                          Nº {String(globalIndex + 1).padStart(3, '0')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {filteredCards.length === 0 && (
          <div className="text-center py-20 text-gray-500 relative z-10">
            <PackageOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No se encontraron cartas con estos filtros.</p>
          </div>
        )}
      </div>
        </>
      )}

        {activeTab === 'INVENTORY' && (
        <div className="space-y-6">
          <div className="bg-[#091428]/80 backdrop-blur border border-gray-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-[#c8aa6e]" />
                Inventario de Cromos Nuevos
              </h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select 
                    value={inventoryFilterTeam} 
                    onChange={(e) => setInventoryFilterTeam(e.target.value)}
                    className="bg-[#0a1428] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-[#c8aa6e]"
                  >
                    <option value="ALL">Todos los Equipos</option>
                    {uniqueTeams.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-gray-500 rotate-90" />
                  <select 
                    value={inventorySort} 
                    onChange={(e) => setInventorySort(e.target.value as any)}
                    className="bg-[#0a1428] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-[#c8aa6e]"
                  >
                    <option value="NAME">Nombre</option>
                    <option value="TEAM">Equipo</option>
                    <option value="TYPE">Tipo</option>
                  </select>
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              Aquí están los cromos que has abierto. Pégalos en tu álbum para completar tu colección.
            </p>

            {filteredInventory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {inventory.length === 0 ? "No tienes cromos nuevos en el inventario. ¡Abre más sobres!" : "No hay cromos que coincidan con los filtros."}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {filteredInventory.map((item) => {
                  const card = cards.find(c => c.id === item.cardId);
                  if (!card) return null;
                  const details = getCardDetails(card);

                  return (
                    <div key={item.id} className="flex flex-col gap-3">
                      <div 
                        className="relative aspect-[2.5/3.5] rounded-xl border-2 border-gray-700 overflow-hidden shadow-lg transition-transform hover:scale-105"
                        style={{ backgroundColor: details.color }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                        <img 
                          src={details.image} 
                          alt={details.name}
                          className={`absolute inset-0 w-full h-full opacity-90 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover object-top mix-blend-luminosity'}`}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 z-20 flex flex-col justify-end p-3 text-center">
                          <h3 className="font-bold text-white text-xs leading-tight drop-shadow-md uppercase tracking-wider">{details.name}</h3>
                        </div>
                        {item.quantity > 1 && (
                          <div className="absolute top-2 right-2 z-30 bg-[#c8aa6e] text-[#091428] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-black/20">
                            x{item.quantity}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'MARKET' && (
        <div className="space-y-6">
          <div className="bg-[#091428]/80 backdrop-blur border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#c8aa6e]" />
              Mercado de Intercambios
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Aquí puedes ver las cartas duplicadas de otros usuarios y proponer intercambios.
            </p>

            {marketListings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay cartas disponibles en el mercado en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketListings.map((listing, idx) => {
                  const card = cards.find(c => c.id === listing.cardId);
                  if (!card) return null;
                  const details = getCardDetails(card);
                  const globalIndex = cards.findIndex(c => c.id === card.id);

                  return (
                    <div key={`${listing.userId}-${listing.cardId}-${idx}`} className="bg-[#0a1428] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                      <div 
                        className="w-16 aspect-[2.5/3.5] rounded-md border border-gray-700 overflow-hidden relative"
                        style={{ backgroundColor: details.color }}
                      >
                        <img src={details.image} alt={details.name} className={`absolute inset-0 w-full h-full opacity-80 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover mix-blend-luminosity'}`} referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">
                          <span className="text-gray-500 mr-1">#{globalIndex + 1}</span>
                          {details.name}
                        </h4>
                        <p className="text-xs text-gray-400 mb-2">Ofrecido por: <span className="text-[#c8aa6e]">{listing.username}</span></p>
                        <button 
                          onClick={() => setIsCreatingTrade({ targetUserId: listing.userId, targetUsername: listing.username, targetCardId: listing.cardId })}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors"
                        >
                          Proponer Intercambio
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'OFFERS' && (
        <div className="space-y-6">
          <div className="bg-[#091428]/80 backdrop-blur border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Mis Ofertas</h3>
            
            {tradeOffers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No tienes ofertas de intercambio activas.
              </div>
            ) : (
              <div className="space-y-4">
                {tradeOffers.map(offer => {
                  const isIncoming = offer.receiverId === currentUserId;
                  const offeredCard = cards.find(c => c.id === offer.offeredCardId);
                  const requestedCard = cards.find(c => c.id === offer.requestedCardId);
                  
                  if (!offeredCard || !requestedCard) return null;

                  const offeredDetails = getCardDetails(offeredCard);
                  const requestedDetails = getCardDetails(requestedCard);

                  return (
                    <div key={offer.id} className="bg-[#0a1428] border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500 mb-1">{isIncoming ? 'Te ofrecen' : 'Ofreces'}</span>
                          <div className="w-12 aspect-[2.5/3.5] rounded border border-gray-700 overflow-hidden relative" style={{ backgroundColor: offeredDetails.color }}>
                             <img src={offeredDetails.image} className={`absolute inset-0 w-full h-full opacity-80 ${offeredCard.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover mix-blend-luminosity'}`} referrerPolicy="no-referrer" />
                          </div>
                        </div>
                        
                        <ArrowRightLeft className="w-5 h-5 text-gray-600" />
                        
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500 mb-1">{isIncoming ? 'A cambio de' : 'Pides'}</span>
                          <div className="w-12 aspect-[2.5/3.5] rounded border border-gray-700 overflow-hidden relative" style={{ backgroundColor: requestedDetails.color }}>
                             <img src={requestedDetails.image} className={`absolute inset-0 w-full h-full opacity-80 ${requestedCard.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover mix-blend-luminosity'}`} referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center md:items-end gap-2">
                        <div className="flex items-center gap-2">
                          {offer.status === 'PENDING' && <Clock className="w-4 h-4 text-yellow-500" />}
                          {offer.status === 'ACCEPTED' && <Check className="w-4 h-4 text-green-500" />}
                          {offer.status === 'REJECTED' && <X className="w-4 h-4 text-red-500" />}
                          {offer.status === 'CANCELLED' && <X className="w-4 h-4 text-gray-500" />}
                          <span className={`text-sm font-bold ${
                            offer.status === 'PENDING' ? 'text-yellow-500' :
                            offer.status === 'ACCEPTED' ? 'text-green-500' :
                            offer.status === 'REJECTED' ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            {offer.status}
                          </span>
                        </div>

                        {isIncoming && offer.status === 'PENDING' && (
                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={() => handleRespondTrade(offer.id, 'ACCEPTED')}
                              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                            >
                              Aceptar
                            </button>
                            <button 
                              onClick={() => handleRespondTrade(offer.id, 'REJECTED')}
                              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ADMIN' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-[#091428]/80 backdrop-blur border border-gray-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Administración de Cartas</h3>
                <p className="text-gray-400 text-sm">
                  Gestiona las cartas disponibles para el split seleccionado ({splits.find(s => s.id === selectedSplit)?.name}).
                  Seleccionadas: {cards.length} / {allPossibleCards.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTempAdminCards([...allPossibleCards])}
                  className="bg-blue-600/20 text-blue-400 border border-blue-500/50 hover:bg-blue-600/40 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  Añadir Todas
                </button>
                <button
                  onClick={() => setTempAdminCards([])}
                  className="bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600/40 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  Quitar Todas
                </button>
                <button
                  onClick={handleSaveAdminCards}
                  disabled={isSavingAdmin}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ml-2"
                >
                  {isSavingAdmin ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Guardar Cartas
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allPossibleCards.map(card => {
                const details = getCardDetails(card);
                const isSelected = tempAdminCards.some(c => c.id === card.id);
                return (
                  <div 
                    key={card.id}
                    onClick={() => handleToggleCard(card)}
                    className={`relative aspect-[2.5/3.5] rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 ${isSelected ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-gray-800 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
                    style={{ backgroundColor: details.color }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                    <img 
                      src={details.image} 
                      alt={details.name}
                      className={`absolute inset-0 w-full h-full opacity-80 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover object-top mix-blend-luminosity'}`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-3">
                      {card.type === CardType.PLAYER && details.teamLogo && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center border border-white/10">
                          <img src={details.teamLogo} alt="Team" className="w-full h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="text-center">
                        <h3 className="font-bold text-white text-sm leading-tight drop-shadow-md uppercase tracking-wider">{details.name}</h3>
                        <p className="text-[10px] text-gray-300 font-medium uppercase tracking-widest">{details.subtitle}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 left-2 z-30 bg-green-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pack Opening Animation Modal */}
      {showPackAnimation && openedCards && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-6xl p-8 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-[#c8aa6e] mb-12 uppercase tracking-[0.2em] animate-pulse">¡Sobre Abierto!</h2>
            
            <div className="flex flex-wrap justify-center gap-8 mb-12 perspective-1000">
              {openedCards.map((card, index) => {
                const isRevealed = revealedCards[index];
                const details = getCardDetails(card);
                
                return (
                  <div 
                    key={index}
                    onClick={() => handleCardReveal(index)}
                    className={`
                      relative w-48 aspect-[2.5/3.5] cursor-pointer transition-all duration-700 transform-style-3d
                      ${isRevealed ? 'rotate-y-0' : 'rotate-y-180 hover:scale-105'}
                    `}
                    style={{ transform: isRevealed ? 'rotateY(0deg)' : 'rotateY(180deg)', transformStyle: 'preserve-3d' }}
                  >
                    {/* Front (Card Details) */}
                    <div 
                      className="absolute inset-0 backface-hidden rounded-xl border-2 border-[#c8aa6e] overflow-hidden shadow-[0_0_30px_rgba(200,170,110,0.3)]"
                      style={{ backgroundColor: details.color, backfaceVisibility: 'hidden' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                      <img 
                        src={details.image} 
                        alt={details.name}
                        className={`absolute inset-0 w-full h-full opacity-90 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover object-top mix-blend-luminosity'}`}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 text-center">
                        <h3 className="font-bold text-white text-lg leading-tight drop-shadow-md uppercase tracking-wider">{details.name}</h3>
                        <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mt-1">{details.subtitle}</p>
                      </div>
                      {/* New Badge */}
                      <div className="absolute top-2 right-2 z-30 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg animate-bounce">
                        NUEVO
                      </div>
                    </div>

                    {/* Back (Card Back) */}
                    <div 
                      className="absolute inset-0 backface-hidden rounded-xl border-2 border-gray-700 bg-[#0a1428] flex items-center justify-center shadow-2xl"
                      style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                    >
                      <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-50 absolute inset-0" />
                      <div className="relative z-10 w-20 h-20 rounded-full border-2 border-[#c8aa6e]/30 flex items-center justify-center">
                        <PackageOpen className="w-10 h-10 text-[#c8aa6e]" />
                      </div>
                      <div className="absolute bottom-4 text-[#c8aa6e] text-xs font-bold uppercase tracking-widest">
                        Click para revelar
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {revealedCards.every(r => r) && (
              <button
                onClick={() => {
                  setShowPackAnimation(false);
                  setOpenedCards(null);
                  setActiveTab('INVENTORY');
                }}
                className="bg-[#c8aa6e] hover:bg-[#b0955c] text-[#091428] font-bold px-8 py-3 rounded-xl uppercase tracking-wider shadow-lg transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-4"
              >
                Ir al Inventario
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Trade Modal */}
      {isCreatingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0a1428] border border-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative">
            <button 
              onClick={() => { setIsCreatingTrade(null); setSelectedOfferCard(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">Proponer Intercambio a {isCreatingTrade.targetUsername}</h3>
            
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">Selecciona una de tus cartas del inventario para ofrecer:</p>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {inventory.map(invItem => {
                  const card = cards.find(c => c.id === invItem.cardId);
                  if (!card) return null;
                  const details = getCardDetails(card);
                  const isSelected = selectedOfferCard === card.id;
                  const globalIndex = cards.findIndex(c => c.id === card.id);

                  return (
                    <div 
                      key={invItem.id}
                      onClick={() => setSelectedOfferCard(card.id)}
                      className={`flex-shrink-0 w-24 aspect-[2.5/3.5] rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-[#c8aa6e] scale-105 shadow-[0_0_15px_rgba(200,170,110,0.3)]' : 'border-gray-700 hover:border-gray-500'}`}
                      style={{ backgroundColor: details.color }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                      <img src={details.image} className={`absolute inset-0 w-full h-full opacity-80 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover mix-blend-luminosity'}`} referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 z-20 flex flex-col justify-end p-2 text-center">
                        <h3 className="font-bold text-white text-[10px] leading-tight drop-shadow-md uppercase">
                          <span className="text-gray-400 mr-1">#{globalIndex + 1}</span>
                          {details.name}
                        </h3>
                      </div>
                      <div className="absolute top-1 left-1 z-30 bg-gray-900/80 text-white text-[10px] px-1.5 rounded">
                        Disp: {invItem.quantity}
                      </div>
                    </div>
                  );
                })}
                {inventory.length === 0 && (
                  <div className="text-sm text-gray-500 py-4">No tienes cartas en el inventario para ofrecer.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setIsCreatingTrade(null); setSelectedOfferCard(null); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateTrade}
                disabled={!selectedOfferCard}
                className="px-6 py-2 bg-[#c8aa6e] hover:bg-[#d4b87e] text-[#0a1428] font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Oferta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pack Opening Modal */}
      {(isOpening || openedCards || packError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0a1428] border border-gray-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative flex flex-col items-center">
            
            {!isOpening && (
              <button 
                onClick={() => { setOpenedCards(null); setPackError(null); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            {isOpening && (
              <div className="flex flex-col items-center py-20">
                <PackageOpen className="w-20 h-20 text-pink-500 animate-bounce mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Abriendo Sobre...</h3>
                <p className="text-gray-400">Descubriendo tus cartas diarias</p>
              </div>
            )}

            {packError && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No puedes abrir un sobre aún</h3>
                <p className="text-red-400">{packError}</p>
                <button 
                  onClick={() => setPackError(null)}
                  className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Volver al Álbum
                </button>
              </div>
            )}

            {openedCards && (
              <div className="w-full flex flex-col items-center py-8">
                <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-8 uppercase tracking-widest animate-pulse">
                  ¡Nuevas Cartas!
                </h3>
                
                <div className="flex flex-wrap justify-center gap-6">
                  {openedCards.map((card, idx) => {
                    const details = getCardDetails(card);
                    const globalIndex = cards.findIndex(c => c.id === card.id);
                    return (
                      <div 
                        key={`${card.id}-${idx}`}
                        className="w-40 aspect-[2.5/3.5] rounded-xl border-2 border-[#c8aa6e] overflow-hidden relative shadow-[0_0_30px_rgba(200,170,110,0.3)] animate-in zoom-in slide-in-from-bottom-8"
                        style={{ 
                          backgroundColor: details.color,
                          animationDelay: `${idx * 150}ms`,
                          animationFillMode: 'both'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
                        <img 
                          src={details.image} 
                          alt={details.name}
                          className={`absolute inset-0 w-full h-full opacity-90 ${card.type === CardType.TEAM ? 'object-contain p-6' : 'object-cover object-top mix-blend-luminosity'}`}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 z-20 flex flex-col justify-end p-3 text-center">
                          {card.type === CardType.PLAYER && details.teamLogo && (
                            <div className="absolute top-3 right-3 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full p-2 flex items-center justify-center border border-white/10">
                              <img src={details.teamLogo} alt="Team" className="w-full h-full object-contain drop-shadow-lg" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <h3 className="font-bold text-white text-sm leading-tight drop-shadow-md uppercase tracking-wider">
                            <span className="text-gray-400 mr-1 text-xs">#{globalIndex + 1}</span>
                            {details.name}
                          </h3>
                          <p className="text-[10px] text-gray-300 font-medium uppercase tracking-widest">{details.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setOpenedCards(null)}
                  className="mt-12 px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105"
                >
                  Añadir a mi Colección
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
