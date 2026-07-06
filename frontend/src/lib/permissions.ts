import { StoredUser } from '@/lib/storage';

/** Guest = browse only, no writes or orders. */
export function canWrite(user: StoredUser | null, isGuest: boolean): boolean {
  return !isGuest && !!user;
}

export function isAdmin(user: StoredUser | null): boolean {
  return user?.role === 'admin';
}

export function isCooperative(user: StoredUser | null): boolean {
  return user?.role === 'cooperative';
}

export function isBuyer(user: StoredUser | null): boolean {
  return user?.role === 'buyer';
}

export function canManageListings(user: StoredUser | null, isGuest: boolean): boolean {
  return canWrite(user, isGuest) && isCooperative(user);
}

export function canOrderOrChat(user: StoredUser | null, isGuest: boolean): boolean {
  return canWrite(user, isGuest) && isBuyer(user);
}

export function canUseAiTools(user: StoredUser | null, isGuest: boolean): boolean {
  return canWrite(user, isGuest);
}
