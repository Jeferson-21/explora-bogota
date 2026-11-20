import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebaseConfig';

export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured || !auth) {
    return {
      ok: false,
      message:
        'Configura primero tus credenciales de Firebase en firebaseConfig.ts.',
    };
  }

  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, message: 'Sesión iniciada correctamente.' };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password'
    ) {
      return { ok: false, message: 'Correo o contraseña incorrectos.' };
    }
    if (code === 'auth/invalid-email') {
      return { ok: false, message: 'Ingresa un correo electrónico válido.' };
    }
    return { ok: false, message: 'No fue posible iniciar sesión.' };
  }
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured || !auth) {
    return {
      ok: false,
      message:
        'Configura primero tus credenciales de Firebase en firebaseConfig.ts.',
    };
  }

  try {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, message: 'Cuenta creada e iniciada correctamente.' };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (code === 'auth/email-already-in-use') {
      return { ok: false, message: 'Ese correo ya está registrado.' };
    }
    if (code === 'auth/weak-password') {
      return {
        ok: false,
        message: 'La contraseña debe tener al menos 6 caracteres.',
      };
    }
    if (code === 'auth/invalid-email') {
      return { ok: false, message: 'Ingresa un correo electrónico válido.' };
    }
    return { ok: false, message: 'No fue posible crear la cuenta.' };
  }
}

export async function sendPasswordReset(
  email: string
): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured || !auth) {
    return {
      ok: false,
      message:
        'Configura primero tus credenciales de Firebase en firebaseConfig.ts.',
    };
  }

  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return {
      ok: false,
      message: 'Escribe primero tu correo electrónico para enviarte el enlace.',
    };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      ok: true,
      message:
        'Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja o spam.',
    };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (code === 'auth/invalid-email') {
      return { ok: false, message: 'Ingresa un correo electrónico válido.' };
    }
    if (code === 'auth/user-not-found') {
      return {
        ok: false,
        message: 'No encontramos una cuenta registrada con ese correo.',
      };
    }
    return {
      ok: false,
      message: 'No fue posible enviar el correo de recuperación.',
    };
  }
}

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured || !auth) {
    return {
      ok: false,
      message:
        'Configura primero tus credenciales de Firebase en firebaseConfig.ts.',
    };
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      message: 'Debes iniciar sesión para cambiar tu contraseña.',
    };
  }

  if (!currentPassword) {
    return {
      ok: false,
      message: 'Ingresa tu contraseña actual para confirmar el cambio.',
    };
  }

  if (newPassword.trim().length < 6) {
    return {
      ok: false,
      message: 'La nueva contraseña debe tener al menos 6 caracteres.',
    };
  }

  try {
    await updatePassword(currentUser, newPassword.trim());
    return {
      ok: true,
      message: 'Contraseña actualizada correctamente.',
    };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (code === 'auth/requires-recent-login' && currentUser.email) {
      try {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword.trim());
        return {
          ok: true,
          message: 'Contraseña actualizada correctamente.',
        };
      } catch (reauthError: unknown) {
        const reauthCode =
          typeof reauthError === 'object' &&
          reauthError !== null &&
          'code' in reauthError
            ? String((reauthError as { code?: string }).code)
            : '';

        if (
          reauthCode === 'auth/wrong-password' ||
          reauthCode === 'auth/invalid-credential'
        ) {
          return {
            ok: false,
            message: 'La contraseña actual no es correcta.',
          };
        }

        return {
          ok: false,
          message:
            'No se pudo reautenticar tu cuenta. Vuelve a iniciar sesión e inténtalo de nuevo.',
        };
      }
    }

    if (code === 'auth/weak-password') {
      return {
        ok: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
      };
    }

    return {
      ok: false,
      message: 'No fue posible actualizar la contraseña.',
    };
  }
}

export async function logoutUser(): Promise<void> {
  if (!isFirebaseConfigured || !auth) return;
  await signOut(auth);
}