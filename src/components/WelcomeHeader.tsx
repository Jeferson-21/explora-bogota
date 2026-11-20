import { Pressable, StyleSheet, Text, View } from 'react-native';

interface WelcomeHeaderProps {
  isAuthenticated?: boolean;
  userEmail?: string | null;
  showLoginButton?: boolean;
  onPressLogin?: () => void;
}

export default function WelcomeHeader({
  isAuthenticated = false,
  userEmail = null,
  showLoginButton = true,
  onPressLogin,
}: WelcomeHeaderProps) {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.badge}>ODS 11 • BOGOTÁ</Text>
      <Text style={styles.title}>Turismo Sostenible Bogotá</Text>
      <Text style={styles.subtitle}>
        Explora rutas, humedales y espacios culturales responsables en la
        ciudad.
      </Text>

      {isAuthenticated ? (
        <View style={styles.actionRow}>
          <Text style={styles.sessionText} numberOfLines={1}>
            Sesión activa: {userEmail ?? 'Usuario'}
          </Text>
        </View>
      ) : showLoginButton ? (
        <View style={styles.actionRow}>
          <Pressable onPress={onPressLogin} style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#1b4332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    color: '#d8f3dc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#e9f5ee',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  loginButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  loginButtonText: {
    color: '#1b4332',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sessionText: {
    color: '#d8f3dc',
    fontSize: 13,
    fontWeight: '600',
  },
});