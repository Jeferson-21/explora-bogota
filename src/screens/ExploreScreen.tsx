import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AuthPanel from '../components/AuthPanel';
import DestinationCard from '../components/DestinationCard';
import DestinationsMap, { type UserCoords } from '../components/DestinationsMap';
import WelcomeHeader from '../components/WelcomeHeader';
import { DESTINATIONS, Destination } from '../data/destinations';
import { fetchDestinations } from '../services/destinationsService';
import {
  fetchUserFavoriteIds,
  toggleDestinationFavorite,
} from '../services/favoritesService';
import {
  fetchUserVisitedIds,
  toggleDestinationVisited,
} from '../services/visitedService';
import {
  type DestinationReview,
  fetchDestinationReviews,
  fetchUserReviewForDestination,
  saveDestinationReview,
} from '../services/reviewsService';
import { auth } from '../services/firebaseConfig';

type QuickListMode = 'all' | 'favorites' | 'visited';
type OpenFilterMenu = 'locality' | 'category' | null;

const LOCALITY_FILTERS: Destination['locality'][] = [
  'Suba',
  'Engativá',
  'Bosa',
  'San Cristóbal',
  'La Candelaria',
];

const RATING_OPTIONS: {
  value: number;
  emoji: string;
  label: string;
}[] = [
  { value: 1, emoji: '😞', label: '1 - Muy mal' },
  { value: 2, emoji: '🙁', label: '2 - Mal' },
  { value: 3, emoji: '😐', label: '3 - Regular' },
  { value: 4, emoji: '🙂', label: '4 - Bien' },
  { value: 5, emoji: '🤩', label: '5 - Muy bien' },
];

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function openInGoogleMaps(latitude: number, longitude: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir Google Maps en este dispositivo.');
  }
}

async function openInWaze(latitude: number, longitude: number) {
  const url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir Waze en este dispositivo.');
  }
}

export default function ExploreScreen() {
  const [destinations, setDestinations] = useState<Destination[]>(DESTINATIONS);
  const [quickListMode, setQuickListMode] = useState<QuickListMode>('all');
  const [selectedLocality, setSelectedLocality] = useState<
    Destination['locality'] | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<OpenFilterMenu>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<
    string | null
  >(null);
  const [modalDestinationId, setModalDestinationId] = useState<string | null>(
    null
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<{
    text: string;
    tone: 'success' | 'warning';
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  // Estados de calificación y comentarios
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [destinationReviews, setDestinationReviews] = useState<
    DestinationReview[]
  >([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [mapFocusMode, setMapFocusMode] = useState<
    'destination' | 'user' | 'route'
  >('destination');

  const categoryOptions = Array.from(
    new Set(destinations.map((item) => item.category).filter(Boolean))
  );

  const showBubbleNotice = (
    text: string,
    tone: 'success' | 'warning' = 'success',
    durationMs = 3800
  ) => {
    setToastBanner({ text, tone });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastBanner(null);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDestinations() {
      const loaded = await fetchDestinations();
      if (isMounted && loaded.length > 0) {
        setDestinations(loaded);
      }
    }

    loadDestinations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!auth) return;

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      setFavoriteNotice(null);
      setCurrentUserId(user?.uid ?? null);
      setCurrentUserEmail(user?.email ?? null);

      if (user) {
        const isNewSignIn = previousUserIdRef.current !== user.uid;
        previousUserIdRef.current = user.uid;
        setHasEnteredApp(true);

        if (isNewSignIn) {
          const userAlias = user.email ? user.email.split('@')[0] : 'explorador';
          if (welcomeTimeoutRef.current) {
            clearTimeout(welcomeTimeoutRef.current);
          }
          welcomeTimeoutRef.current = setTimeout(() => {
            showBubbleNotice(
              `¡Bienvenido/a, ${userAlias}! Qué bueno tenerte en Turismo Sostenible Bogotá.`,
              'success',
              3800
            );
          }, 150);
        }

        const [favs, visited] = await Promise.all([
          fetchUserFavoriteIds(user.uid),
          fetchUserVisitedIds(user.uid),
        ]);
        if (isMounted) {
          setFavoriteIds(favs);
          setVisitedIds(visited);
        }
      } else {
        previousUserIdRef.current = null;
        setFavoriteIds([]);
        setVisitedIds([]);
        setQuickListMode((prev) =>
          prev === 'favorites' || prev === 'visited' ? 'all' : prev
        );
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!modalDestinationId) {
      setDestinationReviews([]);
      setReviewNotice(null);
      setIsRatingModalVisible(false);
      return;
    }

    let isMounted = true;

    async function loadReviews() {
      setIsLoadingReviews(true);
      setReviewNotice(null);

      const [publicReviews, myReview] = await Promise.all([
        fetchDestinationReviews(modalDestinationId!),
        currentUserId
          ? fetchUserReviewForDestination(currentUserId, modalDestinationId!)
          : Promise.resolve(null),
      ]);

      if (!isMounted) return;

      setDestinationReviews(publicReviews);
      if (myReview) {
        setSelectedRating(myReview.rating);
        setReviewComment(myReview.comment);
      } else {
        setSelectedRating(5);
        setReviewComment('');
      }
      setIsLoadingReviews(false);
    }

    loadReviews();

    return () => {
      isMounted = false;
    };
  }, [modalDestinationId, currentUserId]);

  const handleOpenRatingModal = () => {
    setReviewNotice(null);
    if (!currentUserEmail) {
      setReviewNotice(
        'Debes iniciar sesión para guardar tu calificación (1 a 5) y comentario.'
      );
    }
    setIsRatingModalVisible(true);
  };

  const handleSaveReview = async () => {
    if (!activeDestination) return;

    setIsSavingReview(true);
    setReviewNotice(null);

    const result = await saveDestinationReview(
      activeDestination,
      selectedRating,
      reviewComment
    );

    setIsSavingReview(false);
    setReviewNotice(result.message);

    if (result.ok) {
      showBubbleNotice('Calificación guardada', 'success');
      const updatedList = await fetchDestinationReviews(activeDestination.id);
      setDestinationReviews(updatedList);
      setTimeout(() => {
        setIsRatingModalVisible(false);
      }, 650);
    }
  };

  const handleLocateUser = async (keepSelectedDestination = false) => {
    setLocationNotice(null);
    setIsLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationNotice(
          'Permiso de ubicación denegado. Actívalo en los ajustes del teléfono para ver tu posición.'
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      if (keepSelectedDestination && (modalDestinationId || selectedDestinationId)) {
        setMapFocusMode('route');
      } else {
        setSelectedDestinationId(null);
        setModalDestinationId(null);
        setMapFocusMode('user');
      }
    } catch {
      setLocationNotice(
        'No pudimos obtener tu ubicación GPS en este momento. Verifica que la ubicación esté activa.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleToggleQuickList = (targetMode: 'favorites' | 'visited') => {
    setFavoriteNotice(null);
    setOpenFilterMenu(null);

    const nextMode: QuickListMode =
      quickListMode === targetMode ? 'all' : targetMode;

    if (nextMode === 'favorites' && !currentUserEmail) {
      const msg =
        'Debes iniciar sesión para consultar y guardar tus destinos favoritos.';
      setFavoriteNotice(msg);
      showBubbleNotice(msg, 'warning');
    }

    if (nextMode === 'visited' && !currentUserEmail) {
      const msg =
        'Debes iniciar sesión para consultar y guardar tu histórico de sitios visitados.';
      setFavoriteNotice(msg);
      showBubbleNotice(msg, 'warning');
    }

    setQuickListMode(nextMode);
  };

  const handleToggleFavorite = async (destination: Destination) => {
    setFavoriteNotice(null);

    if (!currentUserEmail) {
      const loginMsg = 'Debes iniciar sesión para guardar en favoritos.';
      setFavoriteNotice(loginMsg);
      showBubbleNotice(loginMsg, 'warning');
      return;
    }

    const result = await toggleDestinationFavorite(destination);

    if (!result.ok) {
      const errMsg =
        result.message ?? 'Debes iniciar sesión para guardar en favoritos.';
      setFavoriteNotice(errMsg);
      showBubbleNotice(errMsg, 'warning');
      return;
    }

    setFavoriteIds((prev) => {
      if (result.isFavorite) {
        return prev.includes(destination.id) ? prev : [...prev, destination.id];
      }
      return prev.filter((id) => id !== destination.id);
    });

    showBubbleNotice(
      result.isFavorite
        ? 'Guardado en favoritos'
        : 'Eliminado de favoritos',
      'success'
    );
  };

  const handleToggleVisited = async (destination: Destination) => {
    setFavoriteNotice(null);

    if (!currentUserEmail) {
      const loginMsg =
        'Debes iniciar sesión para marcar sitios como visitados.';
      setFavoriteNotice(loginMsg);
      showBubbleNotice(loginMsg, 'warning');
      return;
    }

    const result = await toggleDestinationVisited(destination);

    if (!result.ok) {
      const errMsg =
        result.message ??
        'Debes iniciar sesión para marcar sitios como visitados.';
      setFavoriteNotice(errMsg);
      showBubbleNotice(errMsg, 'warning');
      return;
    }

    setVisitedIds((prev) => {
      if (result.isVisited) {
        return prev.includes(destination.id) ? prev : [...prev, destination.id];
      }
      return prev.filter((id) => id !== destination.id);
    });

    showBubbleNotice(
      result.isVisited
        ? 'Marcado como visitado'
        : 'Quitado de sitios visitados',
      'success'
    );
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredDestinations = destinations.filter((item) => {
    let matchesQuickList = true;
    if (quickListMode === 'favorites') {
      matchesQuickList = favoriteIds.includes(item.id);
    } else if (quickListMode === 'visited') {
      matchesQuickList = visitedIds.includes(item.id);
    }

    const matchesLocality =
      !selectedLocality || item.locality === selectedLocality;
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    const matchesSearch =
      normalizedQuery === '' ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery);

    return matchesQuickList && matchesLocality && matchesCategory && matchesSearch;
  });

  const nearestDestinationInfo =
    userLocation && filteredDestinations.length > 0
      ? filteredDestinations.reduce<{
          destination: Destination;
          distanceKm: number;
        } | null>((closest, item) => {
          const dist = getDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            item.latitude,
            item.longitude
          );
          if (!closest || dist < closest.distanceKm) {
            return { destination: item, distanceKm: dist };
          }
          return closest;
        }, null)
      : null;

  const handleGoToNearestDestination = () => {
    if (!nearestDestinationInfo) return;
    setSelectedDestinationId(nearestDestinationInfo.destination.id);
    setMapFocusMode('route');
  };

  const handleMapSelectDestination = (
    destinationId: string,
    options?: { openModal?: boolean }
  ) => {
    setSelectedDestinationId(destinationId);
    setMapFocusMode(userLocation ? 'route' : 'destination');
    if (options?.openModal) {
      setModalDestinationId(destinationId);
    }
  };

  const hasActiveFilters =
    quickListMode !== 'all' ||
    Boolean(selectedLocality) ||
    Boolean(selectedCategory) ||
    searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setQuickListMode('all');
    setSelectedLocality(null);
    setSelectedCategory(null);
    setOpenFilterMenu(null);
    setSearchQuery('');
    setSelectedDestinationId(null);
    setModalDestinationId(null);
  };

  useEffect(() => {
    if (
      selectedDestinationId &&
      !filteredDestinations.some((item) => item.id === selectedDestinationId)
    ) {
      setSelectedDestinationId(null);
    }
    if (
      modalDestinationId &&
      !filteredDestinations.some((item) => item.id === modalDestinationId)
    ) {
      setModalDestinationId(null);
    }
  }, [filteredDestinations, selectedDestinationId, modalDestinationId]);

  const focusedDestination =
    destinations.find((item) => item.id === selectedDestinationId) ?? null;

  const activeDestination =
    destinations.find((item) => item.id === modalDestinationId) ?? null;

  const averageRating =
    destinationReviews.length > 0
      ? (
          destinationReviews.reduce((acc, r) => acc + r.rating, 0) /
          destinationReviews.length
        ).toFixed(1)
      : null;

  const activeRouteTarget: UserCoords | null = focusedDestination
    ? {
        latitude: focusedDestination.latitude,
        longitude: focusedDestination.longitude,
      }
    : mapFocusMode === 'route' && nearestDestinationInfo
      ? {
          latitude: nearestDestinationInfo.destination.latitude,
          longitude: nearestDestinationInfo.destination.longitude,
        }
      : null;

  const countLabel =
    filteredDestinations.length === 1
      ? 'Mostrando 1 destino'
      : `Mostrando ${filteredDestinations.length} destinos`;

  const renderToastBubble = () => {
    if (!toastBanner) return null;
    const isWarning = toastBanner.tone === 'warning';
    return (
      <View
        pointerEvents="none"
        style={[
          styles.toastBubble,
          isWarning ? styles.toastBubbleWarning : styles.toastBubbleSuccess,
        ]}
      >
        <Text
          style={[
            styles.toastText,
            isWarning ? styles.toastTextWarning : styles.toastTextSuccess,
          ]}
        >
          {toastBanner.text}
        </Text>
      </View>
    );
  };

  if (!hasEnteredApp) {
    return (
      <KeyboardAvoidingView
        style={styles.authKeyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.authScreenContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authCard}>
            <View style={styles.loginHeroWrapper}>
              <Image
                source={require('../../assets/login-bogota-green.png')}
                style={styles.loginHeroImage}
                resizeMode="cover"
              />
            </View>

            <View style={styles.authCardBody}>
              <WelcomeHeader
                isAuthenticated={Boolean(currentUserEmail)}
                userEmail={currentUserEmail}
                showLoginButton={false}
              />

              <AuthPanel />

              <Pressable
                onPress={() => setHasEnteredApp(true)}
                style={styles.guestButton}
              >
                <Text style={styles.guestButtonText}>
                  {currentUserEmail
                    ? 'Continuar a destinos'
                    : 'Entrar como invitado'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setHasEnteredApp(false)}
          style={styles.topSessionBar}
        >
          <View style={styles.userAvatarCircle}>
            <Ionicons
              name={currentUserEmail ? 'person' : 'person-outline'}
              size={18}
              color="#1b4332"
            />
          </View>
          <View style={styles.sessionInfoBox}>
            <Text style={styles.sessionLabel} numberOfLines={1}>
              {currentUserEmail ?? 'Modo invitado'}
            </Text>
            <Text style={styles.sessionSubLabel}>
              {currentUserEmail
                ? 'Toca para gestionar cuenta o contraseña'
                : 'Toca para iniciar sesión'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2d6a4f" />
        </Pressable>

        {favoriteNotice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{favoriteNotice}</Text>
          </View>
        ) : null}

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nombre, categoría o actividad..."
          placeholderTextColor="#6c757d"
          style={styles.searchInput}
        />

        {/* Barra de filtros organizada + Submenú desplegable */}
        <View style={styles.filtersSection}>
          <View style={styles.filterTabsRow}>
            <Pressable
              onPress={() =>
                setOpenFilterMenu((prev) =>
                  prev === 'locality' ? null : 'locality'
                )
              }
              style={[
                styles.filterTabBtn,
                (openFilterMenu === 'locality' || Boolean(selectedLocality)) &&
                  styles.filterTabBtnActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterTabText,
                  (openFilterMenu === 'locality' || Boolean(selectedLocality)) &&
                    styles.filterTabTextActive,
                ]}
              >
                {selectedLocality ? `📍 ${selectedLocality}` : 'Localidad'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleToggleQuickList('favorites')}
              style={[
                styles.filterTabBtn,
                quickListMode === 'favorites' && styles.filterTabBtnActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterTabText,
                  quickListMode === 'favorites' && styles.filterTabTextActive,
                ]}
              >
                Favoritos ({favoriteIds.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleToggleQuickList('visited')}
              style={[
                styles.filterTabBtn,
                quickListMode === 'visited' && styles.filterTabBtnActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterTabText,
                  quickListMode === 'visited' && styles.filterTabTextActive,
                ]}
              >
                Visitados ({visitedIds.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setOpenFilterMenu((prev) =>
                  prev === 'category' ? null : 'category'
                )
              }
              style={[
                styles.filterTabBtn,
                (openFilterMenu === 'category' || Boolean(selectedCategory)) &&
                  styles.filterTabBtnActive,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterTabText,
                  (openFilterMenu === 'category' || Boolean(selectedCategory)) &&
                    styles.filterTabTextActive,
                ]}
              >
                {selectedCategory ? `🌿 ${selectedCategory}` : 'Categoría'}
              </Text>
            </Pressable>
          </View>

          {openFilterMenu === 'locality' && (
            <View style={styles.subMenuBox}>
              <Text style={styles.subMenuTitle}>Elige una localidad</Text>
              <View style={styles.subMenuChips}>
                <Pressable
                  onPress={() => {
                    setSelectedLocality(null);
                    setOpenFilterMenu(null);
                  }}
                  style={[
                    styles.subChip,
                    selectedLocality === null && styles.subChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subChipText,
                      selectedLocality === null && styles.subChipTextActive,
                    ]}
                  >
                    Todas
                  </Text>
                </Pressable>

                {LOCALITY_FILTERS.map((locality) => {
                  const isSelected = selectedLocality === locality;
                  return (
                    <Pressable
                      key={locality}
                      onPress={() => {
                        setSelectedLocality(isSelected ? null : locality);
                        setOpenFilterMenu(null);
                      }}
                      style={[
                        styles.subChip,
                        isSelected && styles.subChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subChipText,
                          isSelected && styles.subChipTextActive,
                        ]}
                      >
                        {locality}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {openFilterMenu === 'category' && (
            <View style={styles.subMenuBox}>
              <Text style={styles.subMenuTitle}>Elige una categoría</Text>
              <View style={styles.subMenuChips}>
                <Pressable
                  onPress={() => {
                    setSelectedCategory(null);
                    setOpenFilterMenu(null);
                  }}
                  style={[
                    styles.subChip,
                    selectedCategory === null && styles.subChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subChipText,
                      selectedCategory === null && styles.subChipTextActive,
                    ]}
                  >
                    Todas
                  </Text>
                </Pressable>

                {categoryOptions.map((category) => {
                  const isSelected = selectedCategory === category;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => {
                        setSelectedCategory(isSelected ? null : category);
                        setOpenFilterMenu(null);
                      }}
                      style={[
                        styles.subChip,
                        isSelected && styles.subChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subChipText,
                          isSelected && styles.subChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.countText}>{countLabel}</Text>
          {hasActiveFilters && (
            <Pressable onPress={handleClearFilters} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Limpiar filtros</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.locationRow}>
          <Pressable
            onPress={() => handleLocateUser(false)}
            disabled={isLocating}
            style={styles.locationButton}
          >
            <Text style={styles.locationButtonText}>
              {isLocating ? 'Buscando GPS...' : 'Mi ubicación'}
            </Text>
          </Pressable>

          {nearestDestinationInfo ? (
            <Pressable
              onPress={handleGoToNearestDestination}
              style={styles.nearestButton}
            >
              <Text style={styles.nearestButtonText} numberOfLines={1}>
                Ruta más cercana ({nearestDestinationInfo.distanceKm.toFixed(1)}{' '}
                km)
              </Text>
            </Pressable>
          ) : null}
        </View>

        {nearestDestinationInfo ? (
          <Text style={styles.nearestHint}>
            Más cercano: {nearestDestinationInfo.destination.name} (
            {nearestDestinationInfo.distanceKm.toFixed(1)} km aprox.)
          </Text>
        ) : null}

        {locationNotice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{locationNotice}</Text>
          </View>
        ) : null}

        <DestinationsMap
          destinations={filteredDestinations}
          selectedDestinationId={selectedDestinationId}
          userLocation={userLocation}
          routeTarget={activeRouteTarget}
          focusMode={mapFocusMode}
          onSelectDestination={handleMapSelectDestination}
        />

        {filteredDestinations.length > 0 ? (
          filteredDestinations.map((item) => {
            const isSelected = item.id === selectedDestinationId;
            return (
              <DestinationCard
                key={item.id}
                destination={item}
                isSelected={isSelected}
                isFavorite={favoriteIds.includes(item.id)}
                isVisited={visitedIds.includes(item.id)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onToggleVisited={() => handleToggleVisited(item)}
                onPress={() => {
                  setSelectedDestinationId(item.id);
                  setModalDestinationId(item.id);
                  setMapFocusMode(userLocation ? 'route' : 'destination');
                }}
              />
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {quickListMode === 'visited'
                ? 'Aún no has marcado sitios visitados en tu histórico.'
                : quickListMode === 'favorites'
                  ? 'Aún no tienes destinos guardados en favoritos.'
                  : 'No encontramos destinos con ese filtro o palabra clave.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {renderToastBubble()}

      {/* Modal de detalle del destino */}
      <Modal
        visible={Boolean(activeDestination)}
        animationType="slide"
        onRequestClose={() => setModalDestinationId(null)}
      >
        <View style={styles.modalRoot}>
          {activeDestination ? (
            <ScrollView contentContainerStyle={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalBadge}>
                  {activeDestination.locality} • {activeDestination.category}
                </Text>
                <Pressable
                  onPress={() => setModalDestinationId(null)}
                  style={styles.closeModalButton}
                >
                  <Text style={styles.closeModalText}>Cerrar</Text>
                </Pressable>
              </View>

              <Text style={styles.modalTitle}>{activeDestination.name}</Text>

              <View style={styles.ratingSummaryBanner}>
                <Text style={styles.ratingSummaryText}>
                  {averageRating
                    ? `★ ${averageRating} / 5 (${destinationReviews.length} ${
                        destinationReviews.length === 1
                          ? 'calificación'
                          : 'calificaciones'
                      })`
                    : 'Sin calificaciones aún'}
                </Text>
                <Pressable
                  onPress={handleOpenRatingModal}
                  style={styles.openRatingButton}
                >
                  <Text style={styles.openRatingButtonText}>Calificar (1–5)</Text>
                </Pressable>
              </View>

              <View style={styles.expandedMapWrapper}>
                <DestinationsMap
                  destinations={[activeDestination]}
                  selectedDestinationId={activeDestination.id}
                  userLocation={userLocation}
                  routeTarget={{
                    latitude: activeDestination.latitude,
                    longitude: activeDestination.longitude,
                  }}
                  focusMode={userLocation ? 'route' : 'destination'}
                />
              </View>

              <View style={styles.modalCard}>
                <Text style={styles.modalSectionTitle}>Descripción</Text>
                <Text style={styles.modalDescription}>
                  {activeDestination.description}
                </Text>

                {userLocation ? (
                  <Text style={styles.modalCoords}>
                    Distancia aproximada desde tu GPS:{' '}
                    {getDistanceKm(
                      userLocation.latitude,
                      userLocation.longitude,
                      activeDestination.latitude,
                      activeDestination.longitude
                    ).toFixed(1)}{' '}
                    km
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => handleLocateUser(true)}
                    disabled={isLocating}
                    style={styles.modalLocationButton}
                  >
                    <Text style={styles.modalLocationButtonText}>
                      {isLocating
                        ? 'Activando GPS...'
                        : 'Activar GPS y ver ruta'}
                    </Text>
                  </Pressable>
                )}

                {locationNotice && !userLocation ? (
                  <Text style={styles.modalLocationNotice}>{locationNotice}</Text>
                ) : null}

                <Text style={styles.modalCoords}>
                  Ubicación: {activeDestination.latitude.toFixed(4)},{' '}
                  {activeDestination.longitude.toFixed(4)}
                </Text>

                <View style={styles.externalNavRow}>
                  <Pressable
                    onPress={() =>
                      openInGoogleMaps(
                        activeDestination.latitude,
                        activeDestination.longitude
                      )
                    }
                    style={styles.externalNavButton}
                  >
                    <Text style={styles.externalNavButtonText}>Google Maps</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      openInWaze(
                        activeDestination.latitude,
                        activeDestination.longitude
                      )
                    }
                    style={styles.externalNavButton}
                  >
                    <Text style={styles.externalNavButtonText}>Waze</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => handleToggleVisited(activeDestination)}
                  style={[
                    styles.modalVisitedButton,
                    visitedIds.includes(activeDestination.id) &&
                      styles.modalVisitedButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalVisitedText,
                      visitedIds.includes(activeDestination.id) &&
                        styles.modalVisitedTextActive,
                    ]}
                  >
                    {visitedIds.includes(activeDestination.id)
                      ? '✓ Marcado como visitado (Quitar)'
                      : 'Marcar como ya visitado'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleToggleFavorite(activeDestination)}
                  style={styles.modalFavoriteButton}
                >
                  <Text style={styles.modalFavoriteText}>
                    {favoriteIds.includes(activeDestination.id)
                      ? 'Quitar de favoritos'
                      : 'Guardar en favoritos'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.commentsCard}>
                <View style={styles.commentsHeader}>
                  <Text style={styles.modalSectionTitle}>
                    Comentarios de visitantes
                  </Text>
                  <Pressable onPress={handleOpenRatingModal}>
                    <Text style={styles.addCommentLink}>+ Dejar reseña</Text>
                  </Pressable>
                </View>

                {isLoadingReviews ? (
                  <Text style={styles.emptyCommentsText}>
                    Cargando comentarios...
                  </Text>
                ) : destinationReviews.length > 0 ? (
                  destinationReviews.map((rev) => {
                    const option = RATING_OPTIONS.find(
                      (o) => o.value === rev.rating
                    );
                    return (
                      <View key={rev.id} style={styles.commentItem}>
                        <View style={styles.commentTopRow}>
                          <Text style={styles.commentAuthor}>
                            {rev.userEmail}
                          </Text>
                          <Text style={styles.commentScore}>
                            {option
                              ? `${option.emoji} ${rev.rating}/5`
                              : `${rev.rating}/5`}
                          </Text>
                        </View>
                        {rev.comment ? (
                          <Text style={styles.commentBody}>{rev.comment}</Text>
                        ) : (
                          <Text style={styles.commentNoText}>
                            Calificación sin comentario escrito.
                          </Text>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyCommentsText}>
                    Aún no hay comentarios para este lugar. ¡Sé el primero en
                    calificarlo!
                  </Text>
                )}
              </View>
            </ScrollView>
          ) : null}

          {renderToastBubble()}
        </View>
      </Modal>

      {/* Ventana para calificar de 1 a 5 y comentar */}
      <Modal
        visible={isRatingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRatingModalVisible(false)}
      >
        <View style={styles.ratingBackdrop}>
          <View style={styles.ratingDialog}>
            <View style={styles.ratingDialogHeader}>
              <Text style={styles.ratingDialogTitle}>
                Calificar sitio (1 a 5)
              </Text>
              <Pressable
                onPress={() => setIsRatingModalVisible(false)}
                style={styles.smallCloseBtn}
              >
                <Text style={styles.smallCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            {activeDestination ? (
              <Text style={styles.ratingDestinationName}>
                {activeDestination.name}
              </Text>
            ) : null}

            <Text style={styles.ratingScaleCaption}>
              1 = Muy mal • 5 = Muy bien
            </Text>

            <View style={styles.ratingScaleList}>
              {RATING_OPTIONS.map((opt) => {
                const active = selectedRating === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSelectedRating(opt.value)}
                    style={[
                      styles.ratingOptionRow,
                      active && styles.ratingOptionRowActive,
                    ]}
                  >
                    <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
                    <Text
                      style={[
                        styles.ratingOptionLabel,
                        active && styles.ratingOptionLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.commentLabel}>Comentario (opcional)</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Cuéntanos cómo estuvo el recorrido, limpieza o acceso..."
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={3}
              style={styles.commentInput}
            />

            {reviewNotice ? (
              <Text style={styles.reviewNoticeText}>{reviewNotice}</Text>
            ) : null}

            <View style={styles.ratingModalActions}>
              <Pressable
                onPress={() => setIsRatingModalVisible(false)}
                style={styles.cancelRatingBtn}
              >
                <Text style={styles.cancelRatingBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveReview}
                disabled={isSavingReview}
                style={styles.saveRatingBtn}
              >
                <Text style={styles.saveRatingBtnText}>
                  {isSavingReview ? 'Guardando...' : 'Guardar calificación'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
  },
  toastBubble: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 6,
  },
  toastBubbleSuccess: {
    backgroundColor: '#1b4332',
    borderColor: '#52b788',
  },
  toastBubbleWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffca2c',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  toastTextSuccess: {
    color: '#ffffff',
  },
  toastTextWarning: {
    color: '#664d03',
  },
  authKeyboardRoot: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  authScreenContainer: {
    flexGrow: 1,
    backgroundColor: '#f4f6f5',
    paddingTop: 48,
    paddingHorizontal: 18,
    paddingBottom: 64,
    justifyContent: 'flex-start',
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d8e6dd',
  },
  loginHeroWrapper: {
    width: '100%',
    height: 210,
    overflow: 'hidden',
    backgroundColor: '#e6f4ea',
  },
  loginHeroImage: {
    width: '106%',
    height: '118%',
    marginLeft: '-3%',
    marginTop: '-2%',
  },
  authCardBody: {
    padding: 16,
  },
  guestButton: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1b4332',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#1b4332',
    fontSize: 15,
    fontWeight: '700',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f6f5',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  topSessionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dcebe2',
    gap: 10,
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d8f3dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfoBox: {
    flex: 1,
  },
  sessionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4332',
  },
  sessionSubLabel: {
    fontSize: 11,
    color: '#52796f',
  },
  noticeBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe69c',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 13,
    color: '#664d03',
    fontWeight: '500',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212529',
    marginBottom: 14,
  },
  filtersSection: {
    marginBottom: 12,
    gap: 8,
  },
  filterTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTabBtn: {
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0ddd5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabBtnActive: {
    backgroundColor: '#1b4332',
    borderColor: '#1b4332',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4332',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  subMenuBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8ddd0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  subMenuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d6a4f',
  },
  subMenuChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subChip: {
    backgroundColor: '#eef5f0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  subChipActive: {
    backgroundColor: '#1b4332',
  },
  subChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1b4332',
  },
  subChipTextActive: {
    color: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 28,
  },
  countText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1b4332',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  locationButton: {
    backgroundColor: '#1b4332',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nearestButton: {
    flex: 1,
    backgroundColor: '#d8f3dc',
    borderWidth: 1,
    borderColor: '#1b4332',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  nearestButtonText: {
    color: '#1b4332',
    fontSize: 12,
    fontWeight: '700',
  },
  nearestHint: {
    fontSize: 12,
    color: '#2d6a4f',
    fontWeight: '600',
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
  modalContainer: {
    flexGrow: 1,
    backgroundColor: '#f4f6f5',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  modalBadge: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1b4332',
    backgroundColor: '#d8f3dc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  closeModalButton: {
    backgroundColor: '#1b4332',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  closeModalText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1b4332',
    marginBottom: 10,
  },
  ratingSummaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d8e6dd',
    gap: 10,
  },
  ratingSummaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4332',
  },
  openRatingButton: {
    backgroundColor: '#2d6a4f',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  openRatingButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  expandedMapWrapper: {
    marginBottom: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 14,
    color: '#343a40',
    lineHeight: 21,
    marginBottom: 12,
  },
  modalCoords: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  externalNavRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  externalNavButton: {
    flex: 1,
    backgroundColor: '#d8f3dc',
    borderWidth: 1,
    borderColor: '#1b4332',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  externalNavButtonText: {
    color: '#1b4332',
    fontSize: 13,
    fontWeight: '700',
  },
  modalVisitedButton: {
    backgroundColor: '#edf6f0',
    borderWidth: 1,
    borderColor: '#2d6a4f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalVisitedButtonActive: {
    backgroundColor: '#d8f3dc',
    borderColor: '#1b4332',
  },
  modalVisitedText: {
    color: '#1b4332',
    fontSize: 14,
    fontWeight: '700',
  },
  modalVisitedTextActive: {
    color: '#1b4332',
  },
  modalFavoriteButton: {
    backgroundColor: '#1b4332',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalFavoriteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalLocationButton: {
    backgroundColor: '#edf6f0',
    borderWidth: 1,
    borderColor: '#1b4332',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalLocationButtonText: {
    color: '#1b4332',
    fontSize: 13,
    fontWeight: '700',
  },
  modalLocationNotice: {
    fontSize: 12,
    color: '#664d03',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  commentsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addCommentLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2d6a4f',
  },
  emptyCommentsText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 19,
  },
  commentItem: {
    borderTopWidth: 1,
    borderTopColor: '#edf2ef',
    paddingTop: 10,
    marginTop: 10,
  },
  commentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  commentAuthor: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1b4332',
  },
  commentScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d6a4f',
  },
  commentBody: {
    fontSize: 13,
    color: '#343a40',
    lineHeight: 19,
  },
  commentNoText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6c757d',
  },
  ratingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  ratingDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  ratingDialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingDialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b4332',
  },
  smallCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
  },
  ratingDestinationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d6a4f',
    marginBottom: 6,
  },
  ratingScaleCaption: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 10,
  },
  ratingScaleList: {
    gap: 6,
    marginBottom: 14,
  },
  ratingOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  ratingOptionRowActive: {
    backgroundColor: '#d8f3dc',
    borderColor: '#1b4332',
  },
  ratingEmoji: {
    fontSize: 18,
  },
  ratingOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  ratingOptionLabelActive: {
    color: '#1b4332',
    fontWeight: '700',
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 6,
  },
  commentInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#212529',
    textAlignVertical: 'top',
    minHeight: 74,
    marginBottom: 10,
  },
  reviewNoticeText: {
    fontSize: 12,
    color: '#664d03',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  ratingModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelRatingBtn: {
    flex: 1,
    backgroundColor: '#e9ecef',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelRatingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
  },
  saveRatingBtn: {
    flex: 1.4,
    backgroundColor: '#1b4332',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveRatingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});