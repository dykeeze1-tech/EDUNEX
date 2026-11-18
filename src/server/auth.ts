import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

export const ADMIN_ROLES = ['super_admin', 'content_admin', 'academic_admin', 'community_moderator'] as const;
export type UserRole = 'student' | (typeof ADMIN_ROLES)[number];

export interface AuthUser {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  country: string;
  date_of_birth: string | null;
  is_minor: number;
  bio: string;
  academic_interests: string;
  avatar_url: string;
  cover_url: string;
  profile_visibility: string;
  email_verified: number;
  status: string;
  notification_prefs_json: string;
  dashboard_prefs_json: string;
  created_at: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function isMinorDob(dob?: string | null): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age < 18;
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

export function getSessionUser(req: Request): AuthUser | undefined {
  const token = req.cookies?.edunexa_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
  if (!token) return undefined;

  const row = db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.status = 'active'
  `).get(token) as AuthUser | undefined;

  return row;
}

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = getSessionUser(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

export function requireAdmin(allowedRoles: UserRole[] = [...ADMIN_ROLES]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Administrator authentication required.' });
    }
    if (!ADMIN_ROLES.includes(req.user.role as any)) {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    if (req.user.role !== 'super_admin' && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied for role ${req.user.role}.` });
    }
    next();
  };
}

export function isSubjectAccessibleToDepartment(subject: { access_classification: string; eligible_departments_json: string }, userDepartment: string): boolean {
  if (subject.access_classification === 'Common / All Students') {
    return true;
  }
  try {
    const depts = JSON.parse(subject.eligible_departments_json) as string[];
    return depts.includes(userDepartment);
  } catch {
    return false;
  }
}

export function logAudit(actorId: number | null, actorRole: string, action: string, target: string, details = '') {
  db.prepare(`
    INSERT INTO audit_logs (actor_id, actor_role, action, target, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(actorId, actorRole, action, target, details);
}
