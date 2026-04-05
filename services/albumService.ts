// ──────────────────────────────────────────────────────────────────────────────
// albumService.ts
// Gestión de cartas, sobres, colecciones e intercambios (sistema de álbum).
// Extraído de dataService.ts para mantener los dominios separados.
// ──────────────────────────────────────────────────────────────────────────────

import { Card, UserCard, TradeOffer, UserPackState, CardType } from '../types';
import { db } from '../lib/firebase';
import {
    doc, getDoc, setDoc, deleteDoc, collection, getDocs,
    addDoc, updateDoc, where, query
} from 'firebase/firestore';
import { dataService } from './dataService';

// Helper: elimina campos undefined para no romper Firestore
const cleanPayload = (data: any): any => JSON.parse(JSON.stringify(data));

export const albumService = {

    // ── Cartas del split ──────────────────────────────────────────────────────

    async getCardsForSplit(splitId: string): Promise<Card[]> {
        try {
            const docRef = doc(db, 'admin_data', `cards_${splitId}`);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const existingCards = docSnap.data().cards || [];
                const isWinter = splitId === 'winter_2026';
                const isSpring = splitId === 'spring_2026';
                // Re-seed si el conteo no cuadra
                if (isWinter && existingCards.length >= 70) return existingCards;
                if (isSpring && existingCards.length <= 65) return existingCards;
                if (!isWinter && !isSpring) return existingCards;
            }

            // Seed inicial de cartas
            const isWinter = splitId === 'winter_2026';
            const [players, teams] = await Promise.all([
                dataService.getPlayers(isWinter, splitId),
                dataService.getTeams(isWinter, splitId),
            ]);

            const cards: Card[] = [];

            Object.values(teams).forEach((team: any) => {
                if (team.id !== 'tbd') {
                    cards.push({
                        id: `card_team_${team.id}`,
                        splitId,
                        type: CardType.TEAM,
                        referenceId: team.id,
                    });
                }
            });

            players.forEach(player => {
                cards.push({
                    id: `card_player_${player.id}`,
                    splitId,
                    type: CardType.PLAYER,
                    referenceId: player.id,
                });
            });

            await setDoc(doc(db, 'admin_data', `cards_${splitId}`), { cards: cleanPayload(cards) });
            return cards;
        } catch (e) {
            console.error('Error getting cards:', e);
            return [];
        }
    },

    async saveCardsForSplit(splitId: string, cards: Card[]): Promise<void> {
        try {
            await setDoc(doc(db, 'admin_data', `cards_${splitId}`), { cards: cleanPayload(cards) });
        } catch (e) {
            console.error('Error saving cards:', e);
            throw e;
        }
    },

    // ── Colección e inventario del usuario ────────────────────────────────────

    async getUserCollection(userId: string, splitId: string): Promise<UserCard[]> {
        try {
            const snap = await getDocs(collection(db, 'users', userId, `collection_${splitId}`));
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserCard));
        } catch (e) {
            console.error('Error getting user collection:', e);
            return [];
        }
    },

    async getUserInventory(userId: string, splitId: string): Promise<UserCard[]> {
        try {
            const snap = await getDocs(collection(db, 'users', userId, `inventory_${splitId}`));
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserCard));
        } catch (e) {
            console.error('Error getting user inventory:', e);
            return [];
        }
    },

    async getUserPackState(userId: string, splitId: string): Promise<UserPackState | null> {
        try {
            const docSnap = await getDoc(doc(db, 'users', userId, 'pack_states', splitId));
            return docSnap.exists() ? (docSnap.data() as UserPackState) : null;
        } catch (e) {
            console.error('Error getting pack state:', e);
            return null;
        }
    },

    async moveCardToCollection(userId: string, splitId: string, inventoryItemId: string, cardId: string) {
        try {
            const currentCollection = await this.getUserCollection(userId, splitId);
            const alreadyOwned = currentCollection.find(uc => uc.cardId === cardId);

            if (!alreadyOwned) {
                await addDoc(collection(db, 'users', userId, `collection_${splitId}`), {
                    userId, cardId, quantity: 1,
                });
            }

            // Actualizar inventario
            const invDocRef = doc(db, 'users', userId, `inventory_${splitId}`, inventoryItemId);
            const invDoc = await getDoc(invDocRef);
            if (invDoc.exists()) {
                const currentQty = invDoc.data().quantity || 1;
                if (currentQty > 1) {
                    await updateDoc(invDocRef, { quantity: currentQty - 1 });
                } else {
                    await deleteDoc(invDocRef);
                }
            }
        } catch (e) {
            console.error('Error moving card to collection:', e);
            throw e;
        }
    },

    async deleteUserCollection(userId: string, splitId: string) {
        try {
            const [colSnap, invSnap] = await Promise.all([
                getDocs(collection(db, 'users', userId, `collection_${splitId}`)),
                getDocs(collection(db, 'users', userId, `inventory_${splitId}`)),
            ]);
            await Promise.all([
                ...colSnap.docs.map(d => deleteDoc(d.ref)),
                ...invSnap.docs.map(d => deleteDoc(d.ref)),
                deleteDoc(doc(db, 'users', userId, 'pack_states', splitId)),
            ]);
        } catch (e) {
            console.error('Error deleting user collection:', e);
            throw e;
        }
    },

    // ── Apertura de sobres ────────────────────────────────────────────────────

    async openDailyPack(userId: string, splitId: string): Promise<Card[]> {
        try {
            const now = new Date();
            const allCards = await this.getCardsForSplit(splitId);
            if (allCards.length === 0) throw new Error('No hay cartas disponibles en este split.');

            // 3 cartas aleatorias
            const drawnCards: Card[] = Array.from({ length: 3 }, () =>
                allCards[Math.floor(Math.random() * allCards.length)]
            );

            const currentInventory = await this.getUserInventory(userId, splitId);
            const invRef = collection(db, 'users', userId, `inventory_${splitId}`);

            await Promise.all(drawnCards.map(async card => {
                const existing = currentInventory.find(inv => inv.cardId === card.id);
                if (existing) {
                    await updateDoc(
                        doc(db, 'users', userId, `inventory_${splitId}`, existing.id),
                        { quantity: existing.quantity + 1 }
                    );
                } else {
                    await addDoc(invRef, {
                        userId, cardId: card.id, quantity: 1,
                        obtainedAt: now.toISOString(),
                    });
                }
            }));

            // Actualizar estado del sobre
            await setDoc(
                doc(db, 'users', userId, 'pack_states', splitId),
                { userId, splitId, lastOpenedAt: now.toISOString() },
                { merge: true }
            );

            return drawnCards;
        } catch (e) {
            console.error('Error opening pack:', e);
            throw e;
        }
    },

    // ── Sistema de intercambios ───────────────────────────────────────────────

    async getAllDuplicateCards(splitId: string): Promise<{ userId: string; username: string; cardId: string; quantity: number }[]> {
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const results: { userId: string; username: string; cardId: string; quantity: number }[] = [];

            await Promise.all(usersSnap.docs.map(async userDoc => {
                const userId = userDoc.id;
                const username = userDoc.data().username || 'Invocador';
                const invSnap = await getDocs(collection(db, 'users', userId, `inventory_${splitId}`));
                invSnap.docs.forEach(d => {
                    const cardData = d.data() as UserCard;
                    results.push({ userId, username, cardId: cardData.cardId, quantity: cardData.quantity });
                });
            }));

            return results;
        } catch (e) {
            console.error('Error getting duplicate cards:', e);
            return [];
        }
    },

    async createTradeOffer(offer: Omit<TradeOffer, 'id' | 'createdAt'>): Promise<void> {
        try {
            await addDoc(collection(db, 'trade_offers'), {
                ...offer,
                createdAt: new Date().toISOString(),
            });
        } catch (e) {
            console.error('Error creating trade offer:', e);
            throw e;
        }
    },

    async getUserTradeOffers(userId: string): Promise<TradeOffer[]> {
        const offersRef = collection(db, 'trade_offers');
        const offersMap = new Map<string, TradeOffer>();

        await Promise.allSettled([
            getDocs(query(offersRef, where('senderId', '==', userId))).then(snap =>
                snap.docs.forEach(d => offersMap.set(d.id, { id: d.id, ...d.data() } as TradeOffer))
            ),
            getDocs(query(offersRef, where('receiverId', '==', userId))).then(snap =>
                snap.docs.forEach(d => offersMap.set(d.id, { id: d.id, ...d.data() } as TradeOffer))
            ),
        ]);

        return Array.from(offersMap.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async respondToTradeOffer(offerId: string, status: 'ACCEPTED' | 'REJECTED', splitId: string): Promise<void> {
        try {
            const offerRef = doc(db, 'trade_offers', offerId);
            const offerSnap = await getDoc(offerRef);
            if (!offerSnap.exists()) throw new Error('Offer not found');

            const offer = offerSnap.data() as TradeOffer;
            if (offer.status !== 'PENDING') throw new Error('Offer is no longer pending');

            if (status === 'ACCEPTED') {
                const [fromInv, toInv] = await Promise.all([
                    this.getUserInventory(offer.senderId, splitId),
                    this.getUserInventory(offer.receiverId!, splitId),
                ]);

                const hasOffered = fromInv.find(uc => uc.cardId === offer.offeredCardId && uc.quantity > 0);
                const hasRequested = toInv.find(uc => uc.cardId === offer.requestedCardId && uc.quantity > 0);

                if (!hasOffered || !hasRequested) {
                    await updateDoc(offerRef, { status: 'CANCELLED' });
                    throw new Error('One of the users no longer has the required cards.');
                }

                await Promise.all([
                    this.transferCard(offer.senderId, offer.receiverId!, offer.offeredCardId, splitId),
                    this.transferCard(offer.receiverId!, offer.senderId, offer.requestedCardId, splitId),
                ]);
            }

            await updateDoc(offerRef, { status });
        } catch (e) {
            console.error('Error responding to trade:', e);
            throw e;
        }
    },

    async transferCard(fromUserId: string, toUserId: string, cardId: string, splitId: string) {
        const fromInvRef = collection(db, 'users', fromUserId, `inventory_${splitId}`);
        const fromSnap = await getDocs(fromInvRef);
        const fromDoc = fromSnap.docs.find(d => d.data().cardId === cardId);

        if (fromDoc) {
            const qty = fromDoc.data().quantity || 1;
            if (qty <= 1) {
                await deleteDoc(doc(db, 'users', fromUserId, `inventory_${splitId}`, fromDoc.id));
            } else {
                await updateDoc(doc(db, 'users', fromUserId, `inventory_${splitId}`, fromDoc.id), { quantity: qty - 1 });
            }
        }

        const toInvRef = collection(db, 'users', toUserId, `inventory_${splitId}`);
        const toSnap = await getDocs(toInvRef);
        const toDoc = toSnap.docs.find(d => d.data().cardId === cardId);

        if (toDoc) {
            await updateDoc(doc(db, 'users', toUserId, `inventory_${splitId}`, toDoc.id), {
                quantity: (toDoc.data().quantity || 1) + 1,
            });
        } else {
            await addDoc(toInvRef, {
                userId: toUserId, cardId, quantity: 1,
                obtainedAt: new Date().toISOString(),
            });
        }
    },
};
