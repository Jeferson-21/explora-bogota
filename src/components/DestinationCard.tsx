import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Destination } from '../data/destinations';

interface DestinationCardProps {
  destination: Destination;
  isSelected?: boolean;
  isFavorite?: boolean;
  isVisited?: boolean;
  onToggleFavorite?: () => void;
  onToggleVisited?: () => void;
  onPress?: () => void;
}

export default function DestinationCard({
  destination,
  isSelected = false,
  isFavorite = false,
  isVisited = false,
  onToggleFavorite,
  onToggleVisited,
  onPress,
}: DestinationCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name}>{destination.name}</Text>

        <View style={styles.actionsGroup}>
          {onToggleVisited && (
            <Pressable
              onPress={onToggleVisited}
              hitSlop={8}
              style={[
                styles.visitedButton,
                isVisited && styles.visitedButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.visitedText,
                  isVisited && styles.visitedTextActive,
                ]}
              >
                {isVisited ? '✓ Visitado' : 'Visitado'}
              </Text>
            </Pressable>
          )}

          {onToggleFavorite && (
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={8}
              style={[
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.favoriteText,
                  isFavorite && styles.favoriteTextActive,
                ]}
              >
                {isFavorite ? '★ Favorito' : '☆ Guardar'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.meta}>
        {destination.locality} • {destination.category}
      </Text>
      <Text style={styles.description}>{destination.description}</Text>
      <Text style={styles.sustainability}>
        Sostenibilidad: {destination.sustainabilityNote}
      </Text>
      {isSelected && (
        <Text style={styles.selectedHint}>Centrado en el mapa</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#1b4332',
    backgroundColor: '#f8fbf9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  visitedButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  visitedButtonActive: {
    backgroundColor: '#d8f3dc',
    borderColor: '#2d6a4f',
  },
  visitedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  visitedTextActive: {
    color: '#1b4332',
    fontWeight: '700',
  },
  favoriteButton: {
    backgroundColor: '#f1f3f5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  favoriteButtonActive: {
    backgroundColor: '#1b4332',
    borderColor: '#1b4332',
  },
  favoriteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  favoriteTextActive: {
    color: '#ffffff',
  },
  meta: {
    fontSize: 13,
    color: '#2d6a4f',
  },
  description: {
    fontSize: 14,
    color: '#343a40',
    marginTop: 8,
    lineHeight: 20,
  },
  sustainability: {
    fontSize: 12,
    color: '#1b4332',
    backgroundColor: '#edf6f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    lineHeight: 18,
  },
  selectedHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1b4332',
    marginTop: 8,
  },
});