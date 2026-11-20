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

function getVisitedCollection(uid: string) {
  if (!db) return null;
  return collection(db, 'users', uid, 'visited');
}

export async function fetchUserVisitedIds(uid: string): Promise<string[]> {
  if (!isFirebaseConfigured || !db || !uid) {
    return [];
  }

  try {
    const visitedCol = getVisitedCollection(uid);
    if (!visitedCol) return [];

    const snapshot = await getDocs(visitedCol);
    const ids: string[] = [];

    snapshot.forEach((docSnap) => {
      ids.push(docSnap.id);
    });

    return ids;
  } catch (error) {
    console.warn('No se pudieron cargar los sitios visitados del usuario:', error);
    return [];
  }
}

export async function toggleDestinationVisited(
  destination: Destination
): Promise<{ ok: boolean; isVisited: boolean; message?: string }> {
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    return {
      ok: false,
      isVisited: false,
      message:
        'Inicia sesión para guardar tu histórico de sitios visitados en tu cuenta.',
    };
  }

  if (!isFirebaseConfigured || !db) {
    return {
      ok: false,
      isVisited: false,
      message: 'Firebase no está configurado.',
    };
  }

  const visitedDocRef = doc(
    db,
    'users',
    currentUser.uid,
    'visited',
    destination.id
  );

  try {
    const existingSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'visited')
    );
    const alreadyVisited = existingSnapshot.docs.some(
      (item) => item.id === destination.id
    );

    if (alreadyVisited) {
      await deleteDoc(visitedDocRef);
      return { ok: true, isVisited: false };
    }

    await setDoc(visitedDocRef, {
      destinationId: destination.id,
      name: destination.name,
      locality: destination.locality,
      visitedAt: serverTimestamp(),
    });

    return { ok: true, isVisited: true };
  } catch (error) {
    console.warn('Error al actualizar sitio visitado en Firestore:', error);
    return {
      ok: false,
      isVisited: false,
      message: 'No se pudo actualizar el histórico de visitados.',
    };
  }
}