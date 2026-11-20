import { Ionicons } from '@expo/vector-icons';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  changeUserPassword,
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
  const [showPassword, setShowPassword] = useState(false);

  // Estados para cambiar contraseña estando logueado
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser: User | null) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsChangePasswordOpen(false);
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
      }
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
      setShowPassword(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    const result = await changeUserPassword(
      currentPasswordInput,
      newPasswordInput
    );

    setSubmitting(false);
    setStatusMessage(result.message);

    if (result.ok) {
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setIsChangePasswordOpen(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setShowPassword(false);
    setIsChangePasswordOpen(false);
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
        <View style={styles.loggedInBlock}>
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

          <Pressable
            onPress={() => {
              setIsChangePasswordOpen((prev) => !prev);
              setStatusMessage(null);
            }}
            style={styles.changePasswordToggleBtn}
          >
            <Ionicons
              name={isChangePasswordOpen ? 'chevron-up' : 'key-outline'}
              size={16}
              color="#1b4332"
            />
            <Text style={styles.changePasswordToggleText}>
              {isChangePasswordOpen
                ? 'Ocultar cambio de contraseña'
                : 'Cambiar contraseña'}
            </Text>
          </Pressable>

          {isChangePasswordOpen && (
            <View style={styles.changePasswordBox}>
              <Text style={styles.changePasswordTitle}>
                Actualizar contraseña
              </Text>

              <TextInput
                value={user.email ?? ''}
                editable={false}
                selectTextOnFocus={false}
                style={[styles.input, styles.disabledEmailInput]}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  value={currentPasswordInput}
                  onChangeText={setCurrentPasswordInput}
                  placeholder="Contraseña actual"
                  placeholderTextColor="#6c757d"
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowCurrentPassword((prev) => !prev)}
                  hitSlop={8}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#1b4332"
                  />
                </Pressable>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  value={newPasswordInput}
                  onChangeText={setNewPasswordInput}
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  placeholderTextColor="#6c757d"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  hitSlop={8}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#1b4332"
                  />
                </Pressable>
              </View>

              <Pressable
                onPress={handlePasswordUpdate}
                disabled={submitting}
                style={styles.submitButton}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Guardando...' : 'Guardar nueva contraseña'}
                </Text>
              </Pressable>
            </View>
          )}
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
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña (mín. 6 caracteres)"
                placeholderTextColor="#6c757d"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#1b4332"
                />
              </Pressable>
            </View>
          )}

          {!isRegisterMode && (
            <Pressable
              onPress={() => {
                setIsResetMode((prev) => !prev);
                setPassword('');
                setShowPassword(false);
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
  loggedInBlock: {
    gap: 10,
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
  changePasswordToggleBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#edf6f0',
    borderWidth: 1,
    borderColor: '#b7d7c2',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4332',
  },
  changePasswordBox: {
    backgroundColor: '#f8fbf9',
    borderWidth: 1,
    borderColor: '#dcebe2',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  changePasswordTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1b4332',
  },
  disabledEmailInput: {
    backgroundColor: '#e9ecef',
    color: '#495057',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#212529',
  },
  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
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