import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { DESTINATIONS, Destination } from '../data/destinations';
import { db, isFirebaseConfigured } from './firebaseConfig';

const DESTINATIONS_COLLECTION = 'destinations';

function isValidDestination(data: unknown): data is Destination {
  if (!data || typeof data !== 'object') return false;
  const item = data as Record<string, unknown>;

  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.locality === 'string' &&
    typeof item.category === 'string' &&
    typeof item.latitude === 'number' &&
    typeof item.longitude === 'number' &&
    typeof item.description === 'string' &&
    typeof item.sustainabilityNote === 'string'
  );
}

export async function fetchDestinations(): Promise<Destination[]> {
  if (!isFirebaseConfigured || !db) {
    return DESTINATIONS;
  }

  try {
    const snapshot = await getDocs(collection(db, DESTINATIONS_COLLECTION));

    if (snapshot.empty) {
      return DESTINATIONS;
    }

    const remoteDestinations: Destination[] = [];
    snapshot.forEach((docSnap) => {
      const candidate = { id: docSnap.id, ...docSnap.data() };
      if (isValidDestination(candidate)) {
        remoteDestinations.push(candidate);
      }
    });

    return remoteDestinations.length > 0 ? remoteDestinations : DESTINATIONS;
  } catch (error) {
    console.warn(
      'No se pudo cargar desde Firestore; usando datos locales de respaldo:',
      error
    );
    return DESTINATIONS;
  }
}

export async function saveDestinationToCloud(
  destination: Destination
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    return false;
  }

  try {
    await setDoc(doc(db, DESTINATIONS_COLLECTION, destination.id), destination);
    return true;
  } catch (error) {
    console.warn('No se pudo guardar el destino en Firestore:', error);
    return false;
  }
}
export async function seedDestinationsToCloud(): Promise<{
  saved: number;
  failed: number;
}> {
  let saved = 0;
  let failed = 0;

  for (const item of DESTINATIONS) {
    const ok = await saveDestinationToCloud(item);
    if (ok) {
      saved += 1;
    } else {
      failed += 1;
    }
  }

  return { saved, failed };
}