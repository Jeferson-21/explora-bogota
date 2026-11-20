import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { User } from 'firebase/auth';
import {
  loginWithEmail,
  logoutUser,
  registerWithEmail,
  sendPasswordReset,
  subscribeToAuthState,
} from '../services/authService';
import { isFirebaseConfigured } from '../services/firebaseConfig';

export default function AuthPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser: User | null) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    if (isResetMode) {
      const resetResult = await sendPasswordReset(email);
      setSubmitting(false);
      setStatusMessage(resetResult.message);
      return;
    }

    if (!email.trim() || !password) {
      setSubmitting(false);
      setStatusMessage('Completa correo y contraseña.');
      return;
    }

    const result = isRegisterMode
      ? await registerWithEmail(email, password)
      : await loginWithEmail(email, password);

    setSubmitting(false);
    setStatusMessage(result.message);

    if (result.ok) {
      setPassword('');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setStatusMessage('Sesión cerrada.');
  };

  const formHeading = isResetMode
    ? 'Recuperar contraseña'
    : isRegisterMode
      ? 'Crear cuenta'
      : 'Iniciar sesión';

  return (
    <View style={styles.container}>
      {user ? (
        <View style={styles.loggedInRow}>
          <View style={styles.statusGroup}>
            <Text style={styles.statusLabel}>Cuenta activa: {user.email}</Text>
            {!isFirebaseConfigured && (
              <Text style={styles.hintText}>
                Firebase pendiente de credenciales
              </Text>
            )}
          </View>
          <Pressable onPress={handleLogout} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Salir</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.formBox}>
          <Text style={styles.formTitle}>{formHeading}</Text>
          {!isFirebaseConfigured && (
            <Text style={styles.hintText}>
              Firebase pendiente de credenciales
            </Text>
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor="#6c757d"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          {!isResetMode && (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña (mín. 6 caracteres)"
              placeholderTextColor="#6c757d"
              secureTextEntry
              style={styles.input}
            />
          )}

          {!isRegisterMode && (
            <Pressable
              onPress={() => {
                setIsResetMode((prev) => !prev);
                setPassword('');
                setStatusMessage(null);
              }}
              style={styles.forgotLinkButton}
            >
              <Text style={styles.forgotLinkText}>
                {isResetMode
                  ? 'Volver a iniciar sesión'
                  : '¿Olvidaste tu contraseña?'}
              </Text>
            </Pressable>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.submitButton}
            >
              <Text style={styles.primaryButtonText}>
                {submitting
                  ? 'Procesando...'
                  : isResetMode
                    ? 'Enviar enlace'
                    : isRegisterMode
                      ? 'Crear cuenta'
                      : 'Iniciar sesión'}
              </Text>
            </Pressable>

            {!isResetMode && (
              <Pressable
                onPress={() => {
                  setIsRegisterMode((prev) => !prev);
                  setStatusMessage(null);
                }}
                style={styles.toggleModeButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {isRegisterMode ? 'Ya tengo cuenta' : 'Registrarse'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {statusMessage && <Text style={styles.messageText}>{statusMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  loggedInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  statusGroup: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b4332',
  },
  hintText: {
    fontSize: 11,
    color: '#6c757d',
  },
  forgotLinkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  forgotLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d6a4f',
    textDecorationLine: 'underline',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#1b4332',
    fontSize: 12,
    fontWeight: '600',
  },
  formBox: {
    gap: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#212529',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1b4332',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleModeButton: {
    backgroundColor: '#edf6f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageText: {
    marginTop: 8,
    fontSize: 12,
    color: '#1b4332',
  },
});