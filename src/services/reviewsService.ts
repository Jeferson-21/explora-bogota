import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Destination } from '../data/destinations';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';

export interface DestinationReview {
  id: string;
  userId: string;
  userEmail: string;
  rating: number; // 1 a 5
  comment: string;
  updatedAt?: unknown;
}

export async function fetchUserReviewForDestination(
  uid: string,
  destinationId: string
): Promise<DestinationReview | null> {
  if (!isFirebaseConfigured || !db || !uid || !destinationId) {
    return null;
  }

  try {
    const reviewDocRef = doc(db, 'users', uid, 'reviews', destinationId);
    const snap = await getDoc(reviewDocRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      userId: uid,
      userEmail: String(data.userEmail ?? 'Viajero'),
      rating: Number(data.rating ?? 0),
      comment: String(data.comment ?? ''),
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.warn('No se pudo cargar la reseña del usuario:', error);
    return null;
  }
}

export async function fetchDestinationReviews(
  destinationId: string
): Promise<DestinationReview[]> {
  if (!isFirebaseConfigured || !db || !destinationId) {
    return [];
  }

  try {
    const publicReviewsCol = collection(
      db,
      'destinations',
      destinationId,
      'reviews'
    );
    const snapshot = await getDocs(publicReviewsCol);
    const list: DestinationReview[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        userId: String(data.userId ?? docSnap.id),
        userEmail: String(data.userEmail ?? 'Viajero'),
        rating: Number(data.rating ?? 0),
        comment: String(data.comment ?? ''),
        updatedAt: data.updatedAt,
      });
    });

    return list.filter((item) => item.rating >= 1 && item.rating <= 5);
  } catch (error) {
    console.warn('No se pudieron cargar las reseñas del destino:', error);
    return [];
  }
}

export async function saveDestinationReview(
  destination: Destination,
  rating: number,
  comment: string
): Promise<{ ok: boolean; message: string }> {
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    return {
      ok: false,
      message: 'Inicia sesión para calificar y dejar comentarios en los sitios.',
    };
  }

  if (!isFirebaseConfigured || !db) {
    return {
      ok: false,
      message: 'Firebase no está configurado.',
    };
  }

  if (rating < 1 || rating > 5) {
    return {
      ok: false,
      message: 'Selecciona una calificación del 1 al 5.',
    };
  }

  const cleanComment = comment.trim();
  const payload = {
    destinationId: destination.id,
    destinationName: destination.name,
    userId: currentUser.uid,
    userEmail: currentUser.email ?? 'Usuario',
    rating,
    comment: cleanComment,
    updatedAt: serverTimestamp(),
  };

  try {
    await Promise.all([
      setDoc(
        doc(db, 'users', currentUser.uid, 'reviews', destination.id),
        payload
      ),
      setDoc(
        doc(db, 'destinations', destination.id, 'reviews', currentUser.uid),
        payload
      ),
    ]);

    return {
      ok: true,
      message: '¡Gracias! Tu calificación y comentario se guardaron.',
    };
  } catch (error) {
    console.warn('Error al guardar calificación:', error);
    return {
      ok: false,
      message: 'No fue posible guardar tu calificación en este momento.',
    };
  }
}