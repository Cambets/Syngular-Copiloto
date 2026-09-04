import type { User } from '../contexts/AppContext';
import { logger } from './logger';

/**
 * Salva a lista de usuários e solicitações pendentes na nuvem
 */
export async function pushSharedUsersToCloud(users: User[]): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });
    return res.ok;
  } catch (error) {
    logger.warn('Sync push aviso:', error);
    return false;
  }
}

/**
 * Envia uma solicitação individual de acesso para a nuvem
 */
export async function pushSingleUserRequest(user: User): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    return res.ok;
  } catch (error) {
    logger.warn('Sync single user push aviso:', error);
    return false;
  }
}

/**
 * Busca a lista de usuários e solicitações na nuvem
 */
export async function pullSharedUsersFromCloud(): Promise<User[] | null> {
  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.users)) {
        return data.users;
      }
    }
    return null;
  } catch {
    return null;
  }
}
