import { useCallback } from 'react'
import {
  collection, doc, addDoc, onSnapshot, runTransaction,
  query, where, deleteDoc, getDocs,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { TradeOffer, PartyPokemon } from '../types/game'

export function useTrades() {
  const subscribeToIncomingOffers = useCallback(
    (profileId: string, onChange: (offers: TradeOffer[]) => void) => {
      const q = query(
        collection(db, 'trades'),
        where('targetProfileId', '==', profileId),
        where('status', '==', 'pending'),
      )
      return onSnapshot(q, snap => {
        onChange(snap.docs.map(d => ({ id: d.id, ...d.data() } as TradeOffer)))
      })
    },
    [],
  )

  const subscribeToOutgoingOffer = useCallback(
    (profileId: string, onChange: (offer: TradeOffer | null) => void) => {
      const q = query(
        collection(db, 'trades'),
        where('offererProfileId', '==', profileId),
        where('status', '==', 'pending'),
      )
      return onSnapshot(q, snap => {
        onChange(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as TradeOffer))
      })
    },
    [],
  )

  const createOffer = useCallback(
    async (offer: Omit<TradeOffer, 'id'>): Promise<string> => {
      const ref = await addDoc(collection(db, 'trades'), offer)
      return ref.id
    },
    [],
  )

  const cancelOffer = useCallback(
    async (tradeId: string): Promise<void> => {
      await deleteDoc(doc(db, 'trades', tradeId))
    },
    [],
  )

  const acceptOffer = useCallback(
    async (
      tradeId: string,
      offererProfileId: string,
      offeredPartyIdx: number,
      offeredPokemon: PartyPokemon,
      recipientProfileId: string,
      recipientParty: PartyPokemon[],
      recipientPartyIdx: number,
    ): Promise<void> => {
      await runTransaction(db, async txn => {
        const offererRef = doc(db, 'profiles', offererProfileId)
        const recipientRef = doc(db, 'profiles', recipientProfileId)
        const tradeRef = doc(db, 'trades', tradeId)

        const offererSnap = await txn.get(offererRef)
        const offererParty: PartyPokemon[] = offererSnap.data()?.party ?? []

        const recipientPokemon = recipientParty[recipientPartyIdx]
        const newOffererParty = offererParty.map((p, i) =>
          i === offeredPartyIdx ? { ...recipientPokemon, friendship: 70 } : p
        )
        const newRecipientParty = recipientParty.map((p, i) =>
          i === recipientPartyIdx ? { ...offeredPokemon, friendship: 70 } : p
        )

        txn.update(offererRef, { party: newOffererParty })
        txn.update(recipientRef, { party: newRecipientParty })
        txn.update(tradeRef, { status: 'completed' })
      })
    },
    [],
  )

  const cleanupStaleOffers = useCallback(
    async (profileId: string): Promise<void> => {
      const staleTime = Date.now() - 86_400_000
      const q = query(
        collection(db, 'trades'),
        where('offererProfileId', '==', profileId),
        where('status', '==', 'pending'),
      )
      const snap = await getDocs(q)
      for (const d of snap.docs) {
        if ((d.data().createdAt as number) < staleTime) {
          await deleteDoc(d.ref)
        }
      }
    },
    [],
  )

  return {
    subscribeToIncomingOffers,
    subscribeToOutgoingOffer,
    createOffer,
    cancelOffer,
    acceptOffer,
    cleanupStaleOffers,
  }
}
