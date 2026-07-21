import { getSupabase } from './supabase-client.js';

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

export function validatePassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function originPath(path) {
    return window.location.origin + path;
}

export async function signUp({ email, password, redirectPath = '/konto' }) {
    const sb = await getSupabase();
    if (!sb) return { error: { message: 'Auth not configured' } };
    return sb.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: originPath(redirectPath) },
    });
}

export async function signIn({ email, password }) {
    const sb = await getSupabase();
    if (!sb) return { error: { message: 'Auth not configured' } };
    return sb.auth.signInWithPassword({
        email: email.trim(),
        password,
    });
}

export async function requestPasswordReset({ email, redirectPath = '/reset-hasla' }) {
    const sb = await getSupabase();
    if (!sb) return { error: { message: 'Auth not configured' } };
    return sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: originPath(redirectPath),
    });
}

export async function setNewPassword({ password }) {
    const sb = await getSupabase();
    if (!sb) return { error: { message: 'Auth not configured' } };
    return sb.auth.updateUser({ password });
}

export async function signOut() {
    const sb = await getSupabase();
    if (!sb) return { error: { message: 'Auth not configured' } };
    return sb.auth.signOut();
}
