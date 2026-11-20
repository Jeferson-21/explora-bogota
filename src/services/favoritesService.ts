import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Destination } from '../data/destinations';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';

function getFavoritesCollection(uid: string) {
  if (!db) return null;
  return collection(db, 'users', uid, 'favorites');
}

export async function fetchUserFavoriteIds(uid: string): Promise<string[]> {
  if (!isFirebaseConfigured || !db || !uid) {
    return [];
  }

  try {
    const favoritesCol = getFavoritesCollection(uid);
    if (!favoritesCol) return [];

    const snapshot = await getDocs(favoritesCol);
    const ids: string[] = [];

    snapshot.forEach((docSnap) => {
      ids.push(docSnap.id);
    });

    return ids;
  } catch (error) {
    console.warn('No se pudieron cargar los favoritos del usuario:', error);
    return [];
  }
}

export async function toggleDestinationFavorite(
  destination: Destination
): Promise<{ ok: boolean; isFavorite: boolean; message?: string }> {
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    return {
      ok: false,
      isFavorite: false,
      message: 'Inicia sesión para guardar destinos favoritos.',
    };
  }

  if (!isFirebaseConfigured || !db) {
    return {
      ok: false,
      isFavorite: false,
      message: 'Firebase no está configurado.',
    };
  }

  const favDocRef = doc(
    db,
    'users',
    currentUser.uid,
    'favorites',
    destination.id
  );

  try {
    const existingSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'favorites')
    );
    const alreadySaved = existingSnapshot.docs.some(
      (item) => item.id === destination.id
    );

    if (alreadySaved) {
      await deleteDoc(favDocRef);
      return { ok: true, isFavorite: false };
    }

    await setDoc(favDocRef, {
      destinationId: destination.id,
      name: destination.name,
      locality: destination.locality,
      savedAt: serverTimestamp(),
    });

    return { ok: true, isFavorite: true };
  } catch (error) {
    console.warn('Error al actualizar favorito en Firestore:', error);
    return {
      ok: false,
      isFavorite: false,
      message: 'No se pudo actualizar el favorito.',
    };
  }
}