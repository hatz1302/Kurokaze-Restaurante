import type { Usuario } from '../types/kurokaze';

const TOKEN_KEY = 'krk_session_token';
const USER_KEY = 'krk_session_user';

export function guardarSesion(token: string, usuario: Usuario): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function obtenerToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function obtenerUsuario(): Usuario | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function limpiarSesion(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function rutaPorDefectoRol(rol: Usuario['rol']): string {
  switch (rol) {
    case 'Mozo':
      return '/mesas';
    case 'Cocinero':
      return '/cocina';
    case 'Cajero':
      return '/caja';
    case 'Admin':
      return '/admin';
    default:
      return '/mesas';
  }
}