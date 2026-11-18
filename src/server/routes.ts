import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import QRCode from 'qrcode';
import {
  askEdunexaAiTutor,
  generateCurriculumAlignedQuestions,
  getAiConfigStatus,
  suggestSubjectiveGrading,
} from './ai.ts';
import {
  ADMIN_ROLES,
  attachAuth,
  createSession,
  isMinorDob,
  isSubjectAccessibleToDepartment,
  logAudit,
  requireAdmin,
  requireAuth,
} from './auth.ts';
import { db } from './db.ts';

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');

const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `edunexa_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimes.has(file.mimetype.toLowerCase())) {
      cb(new Error('Only JPG, JPEG, PNG, and WEBP images are permitted.'));
      return;
    }
    cb(null, true);
  },
});

const allowedMaterialExts = new Set(['.pdf', '.txt', '.md', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp']);
const materialStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = allowedMaterialExts.has(ext) ? ext : '.pdf';
    cb(null, `edunexa_mat_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const materialUpload = multer({
  storage: materialStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMaterialExts.has(ext)) {
      cb(new Error('Allowed document types: PDF, TXT, MD, DOC, DOCX, JPG, PNG, WEBP (max 10 MB).'));
      return;
    }
    cb(null, true);
  },
});

function isHttpsRequest(req: express.Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || '').toLowerCase();
  return req.secure || proto.includes('https');
}

function setSessionCookie(req: express.Request, res: express.Response, token: string) {
  const https = isHttpsRequest(req);
  res.cookie('edunexa_session', token, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(req: express.Request, res: express.Response) {
  const https = isHttpsRequest(req);
  res.clearCookie('edunexa_session', {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    path: '/',
  });
}

function sanitizeUser(u: any) {
  if (!u) return null;
  const { password_hash: _pw, ...safe } = u;
  return {
    ...safe,
    notification_prefs: safeParseJson(safe.notification_prefs_json, {}),
    dashboard_prefs: safeParseJson(safe.dashboard_prefs_json, {}),
  };
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function computeGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

function getResolvedMediaSlots(includeDraft = false) {
  const slots = db.prepare(`
    SELECT s.*,
      a.url as active_url, a.alt_text as active_alt, a.title as active_title,
      d.url as draft_url, d.alt_text as draft_alt, d.title as draft_title,
      p.url as previous_url, p.alt_text as previous_alt, p.title as previous_title
    FROM media_slots s
    LEFT JOIN media_assets a ON a.id = s.active_asset_id
    LEFT JOIN media_assets d ON d.id = s.draft_asset_id
    LEFT JOIN media_assets p ON p.id = s.previous_asset_id
  `).all() as any[];

  const map: Record<string, any> = {};
  for (const s of slots) {
    map[s.slot_key] = {
      ...s,
      url: includeDraft && s.draft_url ? s.draft_url : s.active_url,
      alt: includeDraft && s.draft_alt ? s.draft_alt : s.active_alt,
    };
  }
  return { list: slots, map };
}

function queryLeaders(params: {
  category?: string;
  subjectId?: number | null;
  examType?: string;
  includeHidden?: boolean;
}) {
  const { category = 'overall', subjectId = null, examType = '', includeHidden = false } = params;

  const whereClauses = [
    "u.role = 'student'",
    "u.status = 'active'",
    "a.status = 'graded'",
  ];
  const args: any[] = [];

  if (!includeHidden) {
    whereClauses.push('u.leaderboard_consent = 1', 'u.leaderboard_hidden = 0');
  }

  if (category === 'mathematics') {
    whereClauses.push("LOWER(s.name) LIKE '%math%'");
  } else if (category === 'english') {
    whereClauses.push("LOWER(s.name) LIKE '%english%'");
  } else if (category === 'science') {
    whereClauses.push("(s.access_classification = 'Science' OR LOWER(s.group_name) LIKE '%science%') AND LOWER(s.name) NOT LIKE '%math%'");
  } else if (category === 'other') {
    whereClauses.push("LOWER(s.name) NOT LIKE '%math%' AND LOWER(s.name) NOT LIKE '%english%' AND s.access_classification != 'Science'");
  }

  if (subjectId) {
    whereClauses.push('s.id = ?');
    args.push(subjectId);
  }
  if (examType && examType !== 'All') {
    whereClauses.push('(e.exam_framework LIKE ? OR e.category = ?)');
    args.push(`%${examType}%`, examType);
  }

  const sql = `
    SELECT
      u.id as user_id,
      u.full_name,
      u.username,
      u.public_display_name,
      u.department,
      u.country,
      u.is_minor,
      u.profile_visibility,
      u.leaderboard_consent,
      u.leaderboard_hidden,
      s.id as subject_id,
      s.name as subject_name,
      e.category as exam_category,
      e.exam_framework,
      COUNT(a.id) as exams_completed,
      ROUND(AVG(a.percentage), 1) as score_percentage,
      MAX(a.percentage) as best_score,
      SUM(a.total_score) as total_points
    FROM exam_attempts a
    JOIN users u ON u.id = a.user_id
    JOIN examinations e ON e.id = a.exam_id
    JOIN subjects s ON s.id = e.subject_id
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY u.id, s.id
    ORDER BY score_percentage DESC, exams_completed DESC, total_points DESC
    LIMIT 50
  `;

  const rows = db.prepare(sql).all(...args) as any[];
  return rows.map((row, idx) => ({
    position: idx + 1,
    rank: idx + 1,
    user_id: row.user_id,
    display_name: row.is_minor || row.profile_visibility === 'private'
      ? `@${row.username}`
      : (row.public_display_name?.trim() || row.full_name),
    username: row.username,
    department: row.department,
    country: row.is_minor ? 'Protected' : row.country,
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    exam_category: row.exam_category,
    exam_framework: row.exam_framework,
    exams_completed: row.exams_completed,
    score_percentage: row.score_percentage,
    avg_score: row.score_percentage,
    total_points: row.total_points,
    leaderboard_consent: row.leaderboard_consent,
    leaderboard_hidden: row.leaderboard_hidden,
  }));
}

export function createApiRouter() {
  const router = express.Router();
  router.use(attachAuth);

  // ==========================================
  // PUBLIC BOOTSTRAP, LEADERS, CMS & VERIFICATION
  // ==========================================
  router.get('/public/bootstrap', (req, res) => {
    const previewDrafts = req.query.preview === 'draft' && req.user && ADMIN_ROLES.includes(req.user.role as any);
    const { map: mediaSlots } = getResolvedMediaSlots(Boolean(previewDrafts));

    const blocksRows = db.prepare('SELECT block_key, title, content_json, draft_content_json, updated_at FROM cms_blocks').all() as any[];
    const cmsBlocks: Record<string, any> = {};
    for (const b of blocksRows) {
      const raw = previewDrafts && b.draft_content_json ? b.draft_content_json : b.content_json;
      cmsBlocks[b.block_key] = safeParseJson(raw, {});
    }

    const appearanceRow = db.prepare("SELECT active_value_json, draft_value_json FROM website_settings WHERE setting_key = 'site_appearance'").get() as any;
    const siteAppearance = appearanceRow
      ? safeParseJson(previewDrafts && appearanceRow.draft_value_json ? appearanceRow.draft_value_json : appearanceRow.active_value_json, {})
      : {};

    const learningMaterials = db.prepare(`
      SELECT m.*, s.name as subject_name, s.code as subject_code, s.access_classification
      FROM learning_materials m
      JOIN subjects s ON s.id = m.subject_id
      WHERE m.is_published = 1 AND s.is_archived = 0
      ORDER BY m.id ASC
    `).all();

    const stats = {
      studentsCount: (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND status = 'active'").get() as any).c,
      subjectsCount: (db.prepare('SELECT COUNT(*) as c FROM subjects WHERE is_published = 1 AND is_archived = 0').get() as any).c,
      examinationsCount: (db.prepare('SELECT COUNT(*) as c FROM examinations WHERE is_published = 1').get() as any).c,
      certificatesCount: (db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'valid'").get() as any).c,
      questionsCount: (db.prepare("SELECT COUNT(*) as c FROM questions WHERE approval_status IN ('published', 'approved')").get() as any).c,
      videosCount: (db.prepare('SELECT COUNT(*) as c FROM videos WHERE is_published = 1').get() as any).c,
      materialsCount: learningMaterials.length,
    };

    const subjects = db.prepare(`
      SELECT id, code, name, group_name, access_classification, eligible_departments_json, description, image_slot_key
      FROM subjects WHERE is_published = 1 AND is_archived = 0
      ORDER BY CASE WHEN access_classification = 'Common / All Students' THEN 0 ELSE 1 END, name ASC
    `).all().map((s: any) => ({
      ...s,
      eligible_departments: safeParseJson(s.eligible_departments_json, []),
    }));

    const examinations = db.prepare(`
      SELECT e.*, s.name as subject_name, s.access_classification, s.eligible_departments_json,
        (SELECT COUNT(*) FROM exam_questions eq JOIN questions q ON q.id = eq.question_id WHERE eq.exam_id = e.id AND q.approval_status IN ('published', 'approved')) as question_count
      FROM examinations e
      JOIN subjects s ON s.id = e.subject_id
      WHERE e.is_published = 1 AND s.is_archived = 0
      ORDER BY e.created_at DESC
    `).all().map((e: any) => ({
      ...e,
      eligible_departments: safeParseJson(e.eligible_departments_json, []),
    }));

    const testimonials = db.prepare(`
      SELECT id, display_name, country, avatar_url, programme_title, achievement, quote, certificate_number, is_featured, created_at
      FROM testimonials WHERE status = 'approved'
      ORDER BY is_featured DESC, created_at DESC
    `).all();

    const faqs = db.prepare('SELECT * FROM faqs WHERE is_published = 1 ORDER BY sort_order ASC, id ASC').all();

    const videos = db.prepare(`
      SELECT v.*, s.name as subject_name
      FROM videos v
      JOIN subjects s ON s.id = v.subject_id
      WHERE v.is_published = 1
      ORDER BY v.id ASC
    `).all();

    const leaderboard = queryLeaders({ category: 'overall' }).slice(0, 10);

    const programmes = db.prepare(`
      SELECT p.*, s.name as subject_name, s.access_classification
      FROM programmes p
      JOIN subjects s ON s.id = p.subject_id
      WHERE p.is_published = 1
    `).all();

    const announcements = db.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC').all();

    res.json({
      mediaSlots,
      cmsBlocks,
      siteAppearance,
      announcements,
      stats,
      subjects,
      examinations,
      testimonials,
      faqs,
      videos,
      learningMaterials,
      leaderboard,
      programmes,
    });
  });

  router.get('/public/leaders', (req, res) => {
    const category = String(req.query.category || 'overall');
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
    const examType = req.query.examType ? String(req.query.examType) : '';

    const leaders = queryLeaders({ category, subjectId, examType });
    res.json({ leaders });
  });

  // Public OR Student Testimonial Submission (Always saved as PENDING until Admin approves)
  router.post('/public/testimonials', upload.single('photo'), (req, res) => {
    const { display_name, quote, programme_title, achievement, country, certificate_number } = req.body || {};
    if (!display_name || !quote || !String(display_name).trim() || !String(quote).trim()) {
      return res.status(400).json({ error: 'Display name and testimonial message are required.' });
    }
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : (req.user?.avatar_url || '');
    const safeDisplay = req.user?.is_minor ? `@${req.user.username}` : String(display_name).trim();

    const tRes = db.prepare(`
      INSERT INTO testimonials (user_id, display_name, country, avatar_url, programme_title, achievement, quote, certificate_number, status, consent_confirmed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)
    `).run(
      req.user?.id ?? null,
      safeDisplay,
      String(country || req.user?.country || ''),
      avatarUrl,
      String(programme_title || 'General EDUNEXA Learning'),
      String(achievement || 'Verified Learner Feedback'),
      String(quote).trim(),
      String(certificate_number || '').trim()
    );

    res.status(201).json({
      ok: true,
      id: Number(tRes.lastInsertRowid),
      message: 'Thank you! Your testimonial has been submitted for administrator review before public display.',
    });
  });

  router.get('/public/verify/:certNumber', async (req, res) => {
    const certNumber = String(req.params.certNumber || '').trim().toUpperCase();
    const cert = db.prepare(`
      SELECT c.*, p.min_days, p.title as prog_name
      FROM certificates c
      LEFT JOIN programmes p ON p.id = c.programme_id
      WHERE UPPER(c.cert_number) = ?
    `).get(certNumber) as any;

    if (!cert) {
      return res.status(404).json({ error: `No certificate record found matching serial "${certNumber}".` });
    }

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/verify?code=${encodeURIComponent(cert.cert_number)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 220,
      color: { dark: '#10243D', light: '#FFFFFF' },
    });

    res.json({
      certificate: {
        cert_number: cert.cert_number,
        student_display_name: cert.student_display_name,
        programme_title: cert.programme_title,
        grade: cert.grade,
        score_percentage: cert.score_percentage,
        issued_at: cert.issued_at,
        issued_by: cert.issued_by,
        status: cert.status,
        revocation_reason: cert.revocation_reason,
        verify_url: verifyUrl,
        qr_data_url: qrDataUrl,
      },
    });
  });

  router.post('/public/contact', (req, res) => {
    const { name, email, subject, message, honeypot } = req.body || {};
    if (honeypot) {
      return res.json({ ok: true, message: 'Enquiry received.' });
    }
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All contact fields are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    db.prepare(`
      INSERT INTO contact_enquiries (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `).run(String(name).trim(), String(email).trim(), String(subject).trim(), String(message).trim());

    res.status(201).json({ ok: true, message: 'Your enquiry has been logged for the EDUNEXA Admissions & Support team.' });
  });

  // ==========================================
  // AUTHENTICATION & ACCOUNT MANAGEMENT
  // ==========================================
  router.get('/auth/me', (req, res) => {
    if (!req.user) {
      return res.json({ user: null });
    }
    res.json({ user: sanitizeUser(req.user) });
  });

  router.post('/auth/register', (req, res) => {
    const { full_name, username, email, password, confirm_password, department, country, date_of_birth } = req.body || {};
    if (!full_name || !username || !email || !password || !department || !country) {
      return res.status(400).json({ error: 'Please complete all required registration fields.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!/^[a-z0-9_.-]{3,32}$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.' });
    }
    if (confirm_password !== undefined && String(password) !== String(confirm_password)) {
      return res.status(400).json({ error: 'Password and password confirmation do not match.' });
    }
    if (String(password).length < 8 || !/[A-Za-z]/.test(String(password)) || !/[0-9]/.test(String(password))) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one letter and one number.' });
    }
    const allowedDepts = ['Science', 'Arts and Humanities', 'Commercial'];
    if (!allowedDepts.includes(department)) {
      return res.status(400).json({ error: 'Please select a valid academic department (Science, Arts and Humanities, or Commercial).' });
    }

    const dupEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    if (dupEmail) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }
    const dupUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (dupUsername) {
      return res.status(409).json({ error: 'This username is already taken. Please choose a different username.' });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);
    const minorFlag = isMinorDob(date_of_birth) ? 1 : 0;
    const visibility = minorFlag ? 'private' : 'community';
    const verificationToken = String(crypto.randomInt(100000, 999999));

    const result = db.prepare(`
      INSERT INTO users (full_name, username, email, password_hash, role, department, country, date_of_birth, is_minor, profile_visibility, public_display_name, leaderboard_consent, email_verified, verification_token)
      VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      String(full_name).trim(),
      cleanUsername,
      cleanEmail,
      passwordHash,
      department,
      String(country).trim(),
      date_of_birth || null,
      minorFlag,
      visibility,
      minorFlag ? `@${cleanUsername}` : String(full_name).trim(),
      minorFlag ? 0 : 1,
      verificationToken
    );

    const userId = Number(result.lastInsertRowid);
    db.prepare(`
      INSERT INTO notifications (user_id, title, body, category, link)
      VALUES (?, ?, ?, 'welcome', '/student/dashboard')
    `).run(
      userId,
      'Welcome to EDUNEXA',
      `Your free student account in the ${department} stream is active. Common subjects (Mathematics, English, Computer Studies, General Knowledge) and ${department} subjects are unlocked.`
    );

    const token = createSession(userId);
    setSessionCookie(req, res, token);

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.status(201).json({
      user: sanitizeUser(createdUser),
      sessionToken: token,
      verificationRequired: true,
      emailConfigured: false,
      devVerificationCode: verificationToken,
    });
  });

  router.post('/auth/verify-email', (req, res) => {
    const code = String(req.body?.code || '').trim();
    const emailInput = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }
    const targetUser = req.user
      ? (db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any)
      : emailInput
      ? (db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(emailInput) as any)
      : null;

    if (!targetUser) {
      return res.status(401).json({ error: 'Please sign in or provide your registered email to verify.' });
    }
    if (targetUser.email_verified === 1) {
      return res.json({ ok: true, user: sanitizeUser(targetUser), message: 'Email is already verified.' });
    }
    if (!targetUser.verification_token || targetUser.verification_token !== code) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your code and try again.' });
    }

    db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(targetUser.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUser.id);
    res.json({ ok: true, user: sanitizeUser(updated), message: 'Email address verified successfully.' });
  });

  router.post('/auth/resend-verification', requireAuth, (req, res) => {
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    if (userRow.email_verified === 1) {
      return res.json({ ok: true, message: 'Your email address is already verified.' });
    }
    const verificationToken = String(crypto.randomInt(100000, 999999));
    db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, req.user!.id);
    res.json({
      ok: true,
      emailConfigured: false,
      devVerificationCode: verificationToken,
      message: 'SMTP email delivery is not configured in this environment. Use the verification code shown in your portal banner to verify your email.',
    });
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)').get(String(email).trim(), String(email).trim()) as any;
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account is inactive.' });
    }
    if (ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Administrator accounts must sign in via the protected Administrator Portal (/admin/login).' });
    }

    const token = createSession(user.id);
    setSessionCookie(req, res, token);
    res.json({ user: sanitizeUser(user), sessionToken: token });
  });

  router.post('/auth/admin-login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Administrator email and password are required.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(String(email).trim()) as any;
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. This portal is restricted to authorised EDUNEXA administrators.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This administrator account is inactive.' });
    }

    const token = createSession(user.id);
    setSessionCookie(req, res, token);
    logAudit(user.id, user.role, 'ADMIN_LOGIN', 'auth', `Administrator ${user.email} signed in.`);
    res.json({ user: sanitizeUser(user), sessionToken: token });
  });

  router.post('/auth/logout', (req, res) => {
    const token =
      req.cookies?.edunexa_session ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  router.post('/auth/request-reset', (req, res) => {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: 'Email is required.' });
    const user = db.prepare('SELECT id, role FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail) as any;
    let devResetCode: string | undefined;
    if (user && user.role === 'student') {
      devResetCode = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?').run(devResetCode, expiresAt, user.id);
    }
    res.json({
      ok: true,
      emailConfigured: false,
      devResetCode,
      message: devResetCode
        ? 'SMTP email service is not configured. Use the temporary reset code displayed below to set a new password.'
        : 'If a matching student account exists, reset instructions have been prepared.',
    });
  });

  router.post('/auth/reset-password', (req, res) => {
    const { email, code, newPassword, confirmPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();
    if (!cleanEmail || !cleanCode || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }
    if (confirmPassword !== undefined && String(newPassword) !== String(confirmPassword)) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }
    if (String(newPassword).length < 8 || !/[A-Za-z]/.test(String(newPassword)) || !/[0-9]/.test(String(newPassword))) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include a letter and a number.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND role = \'student\'').get(cleanEmail) as any;
    if (!user || !user.reset_token || user.reset_token !== cleanCode || !user.reset_expires_at || user.reset_expires_at <= new Date().toISOString()) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }
    const hash = bcrypt.hashSync(String(newPassword), 10);
    db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE id = ?').run(hash, user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    res.json({ ok: true, message: 'Your password has been reset. You may now sign in with your new password.' });
  });

  router.patch('/auth/profile', requireAuth, (req, res) => {
    const { full_name, country, bio, academic_interests, profile_visibility, department, public_display_name, leaderboard_consent } = req.body || {};
    const allowedVisibility = req.user!.is_minor ? 'private' : (['public', 'community', 'private'].includes(profile_visibility) ? profile_visibility : req.user!.profile_visibility);
    const allowedDepts = ['Science', 'Arts and Humanities', 'Commercial'];
    const nextDept = department && allowedDepts.includes(department) ? department : req.user!.department;
    const nextDisplay = req.user!.is_minor ? `@${req.user!.username}` : (public_display_name !== undefined ? String(public_display_name).trim() : (req.user as any).public_display_name);
    const nextConsent = leaderboard_consent !== undefined ? (leaderboard_consent ? 1 : 0) : (req.user as any).leaderboard_consent;

    db.prepare(`
      UPDATE users SET full_name = ?, country = ?, bio = ?, academic_interests = ?, profile_visibility = ?, department = ?, public_display_name = ?, leaderboard_consent = ?
      WHERE id = ?
    `).run(
      full_name ? String(full_name).trim() : req.user!.full_name,
      country ? String(country).trim() : req.user!.country,
      bio !== undefined ? String(bio) : req.user!.bio,
      academic_interests !== undefined ? String(academic_interests) : req.user!.academic_interests,
      allowedVisibility,
      nextDept,
      nextDisplay,
      nextConsent,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    res.json({ user: sanitizeUser(updated) });
  });

  router.post('/auth/profile/photo', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a JPG, PNG, or WEBP image (max 5 MB).' });
    }
    const kind = req.body?.kind === 'cover' ? 'cover_url' : 'avatar_url';
    const url = `/uploads/${req.file.filename}`;
    db.prepare(`UPDATE users SET ${kind} = ? WHERE id = ?`).run(url, req.user!.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    res.json({ user: sanitizeUser(updated), url });
  });

  router.patch('/auth/preferences', requireAuth, (req, res) => {
    const { dashboard_prefs, notification_prefs } = req.body || {};
    if (dashboard_prefs) {
      const current = safeParseJson(req.user!.dashboard_prefs_json, {});
      const merged = { ...current, ...dashboard_prefs };
      db.prepare('UPDATE users SET dashboard_prefs_json = ? WHERE id = ?').run(JSON.stringify(merged), req.user!.id);
    }
    if (notification_prefs) {
      const current = safeParseJson(req.user!.notification_prefs_json, {});
      const merged = { ...current, ...notification_prefs };
      db.prepare('UPDATE users SET notification_prefs_json = ? WHERE id = ?').run(JSON.stringify(merged), req.user!.id);
    }
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    res.json({ user: sanitizeUser(updated) });
  });

  router.post('/auth/password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), userRow.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(newPassword), 10), req.user!.id);
    res.json({ ok: true, message: 'Password updated successfully.' });
  });

  router.post('/auth/delete-account', requireAuth, (req, res) => {
    if (ADMIN_ROLES.includes(req.user!.role as any)) {
      return res.status(400).json({ error: 'Administrator accounts cannot be self-deleted.' });
    }
    db.prepare("UPDATE users SET status = 'deletion_requested' WHERE id = ?").run(req.user!.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user!.id);
    res.clearCookie('edunexa_session');
    res.json({ ok: true, message: 'Account deletion request recorded and session closed.' });
  });

  // ==========================================
  // STUDENT PORTAL ROUTES
  // ==========================================
  router.get('/student/dashboard', requireAuth, (req, res) => {
    const uid = req.user!.id;
    const dept = req.user!.department;

    const allSubjects = db.prepare('SELECT * FROM subjects WHERE is_published = 1 AND is_archived = 0 ORDER BY name ASC').all() as any[];
    const subjects = allSubjects.map((s) => ({
      ...s,
      eligible_departments: safeParseJson(s.eligible_departments_json, []),
      is_eligible: isSubjectAccessibleToDepartment(s, dept),
    }));

    const attempts = db.prepare(`
      SELECT a.*, e.title as exam_title, e.category, e.exam_framework, s.name as subject_name
      FROM exam_attempts a
      JOIN examinations e ON e.id = a.exam_id
      JOIN subjects s ON s.id = e.subject_id
      WHERE a.user_id = ?
      ORDER BY a.started_at DESC
    `).all(uid) as any[];

    const gradedAttempts = attempts.filter((a) => a.status === 'graded');
    const avgScore = gradedAttempts.length > 0
      ? Math.round((gradedAttempts.reduce((acc, a) => acc + Number(a.percentage), 0) / gradedAttempts.length) * 10) / 10
      : 0;

    // Subject performance breakdown
    const subjectPerfMap = new Map<string, { subject: string; totalPct: number; count: number }>();
    for (const a of gradedAttempts) {
      const cur = subjectPerfMap.get(a.subject_name) || { subject: a.subject_name, totalPct: 0, count: 0 };
      cur.totalPct += Number(a.percentage);
      cur.count += 1;
      subjectPerfMap.set(a.subject_name, cur);
    }
    const subjectPerformance = Array.from(subjectPerfMap.values()).map((v) => ({
      subject: v.subject,
      avgScore: Math.round((v.totalPct / v.count) * 10) / 10,
      attempts: v.count,
    }));

    // Real leaderboard position for this student
    const allLeaders = queryLeaders({ category: 'overall', includeHidden: true });
    const leaderboardPositions = allLeaders.filter((l) => l.user_id === uid);

    const enrolments = db.prepare(`
      SELECT pe.*, p.title, p.description, p.min_days, p.required_lessons, p.required_practice_exams, p.pass_mark, p.department as prog_department,
        s.name as subject_name, s.access_classification, s.eligible_departments_json
      FROM programme_enrolments pe
      JOIN programmes p ON p.id = pe.programme_id
      JOIN subjects s ON s.id = p.subject_id
      WHERE pe.user_id = ?
    `).all(uid).map((row: any) => {
      const enrolledMs = new Date(row.enrolled_at).getTime();
      const elapsedDays = Math.floor((Date.now() - enrolledMs) / (1000 * 60 * 60 * 24));
      const lessonsCompleted = safeParseJson<number[]>(row.lessons_completed_json, []);
      const eligibleForFinal =
        elapsedDays >= row.min_days &&
        lessonsCompleted.length >= row.required_lessons &&
        row.practice_exams_completed >= row.required_practice_exams;

      return {
        ...row,
        elapsed_days: elapsedDays,
        days_remaining: Math.max(0, row.min_days - elapsedDays),
        lessons_completed: lessonsCompleted,
        eligible_for_final: eligibleForFinal,
      };
    });

    const certificates = db.prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC').all(uid);
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(uid);
    const announcements = db.prepare("SELECT * FROM announcements WHERE is_active = 1 AND audience IN ('all', 'students') ORDER BY created_at DESC LIMIT 5").all();

    const schedules = db.prepare(`
      SELECT es.*, e.title as exam_title, e.duration_minutes, p.title as programme_title
      FROM exam_schedules es
      JOIN examinations e ON e.id = es.exam_id
      LEFT JOIN programmes p ON p.id = es.programme_id
      WHERE es.status = 'scheduled'
      ORDER BY es.scheduled_start ASC
    `).all();

    const exams = db.prepare(`
      SELECT e.*, s.name as subject_name, s.access_classification, s.eligible_departments_json,
        (SELECT COUNT(*) FROM exam_questions eq JOIN questions q ON q.id = eq.question_id WHERE eq.exam_id = e.id AND q.approval_status IN ('published', 'approved')) as question_count
      FROM examinations e
      JOIN subjects s ON s.id = e.subject_id
      WHERE e.is_published = 1 AND s.is_archived = 0
      ORDER BY e.is_60day_final DESC, e.id ASC
    `).all().map((ex: any) => {
      const subjectOk = isSubjectAccessibleToDepartment(ex, dept);
      let programmeOk = true;
      let eligibilityReason = '';

      if (!subjectOk) {
        const allowed = safeParseJson<string[]>(ex.eligible_departments_json, []).join(', ');
        eligibilityReason = `Restricted to ${allowed} students (${ex.subject_name} is a department-specific subject).`;
      } else if (ex.is_60day_final && ex.programme_id) {
        const enr = enrolments.find((e: any) => e.programme_id === ex.programme_id);
        if (!enr) {
          programmeOk = false;
          eligibilityReason = 'Requires enrolment in the linked 60-day qualifying programme.';
        } else if (!enr.eligible_for_final) {
          programmeOk = false;
          eligibilityReason = `Requires ${enr.min_days} days (${enr.elapsed_days}/${enr.min_days} elapsed), ${enr.required_lessons} lessons (${enr.lessons_completed.length}/${enr.required_lessons}), and ${enr.required_practice_exams} practice exam (${enr.practice_exams_completed}/${enr.required_practice_exams}).`;
        }
      }

      return {
        ...ex,
        is_eligible: subjectOk && programmeOk,
        eligibility_reason: eligibilityReason,
      };
    });

    // Only PUBLISHED questions are accessible to students for practice
    const publishedPracticeQuestions = db.prepare(`
      SELECT q.id, q.subject_id, q.topic_name, q.exam_framework, q.academic_level, q.difficulty, q.format, q.question_text, q.options_json, q.correct_answer, q.explanation, q.marking_scheme, q.marks,
        s.name as subject_name, s.access_classification, s.eligible_departments_json
      FROM questions q
      JOIN subjects s ON s.id = q.subject_id
      WHERE q.approval_status = 'published' AND s.is_published = 1 AND s.is_archived = 0
      ORDER BY q.id DESC
    `).all().filter((q: any) => isSubjectAccessibleToDepartment(q, dept)).map((q: any) => ({
      ...q,
      options: safeParseJson(q.options_json, []),
    }));

    const videos = db.prepare(`
      SELECT v.*, s.name as subject_name, s.access_classification, s.eligible_departments_json,
        COALESCE(vp.completed, 0) as completed,
        COALESCE(vp.saved_favorite, 0) as saved_favorite
      FROM videos v
      JOIN subjects s ON s.id = v.subject_id
      LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = ?
      WHERE v.is_published = 1 AND s.is_archived = 0
      ORDER BY v.id ASC
    `).all(uid).map((v: any) => ({
      ...v,
      is_eligible: isSubjectAccessibleToDepartment(v, dept),
    }));

    const learningMaterials = db.prepare(`
      SELECT m.*, s.name as subject_name, s.code as subject_code, s.access_classification, s.eligible_departments_json,
        COALESCE(mp.completed, 0) as completed,
        COALESCE(mp.saved_favorite, 0) as saved_favorite
      FROM learning_materials m
      JOIN subjects s ON s.id = m.subject_id
      LEFT JOIN material_progress mp ON mp.material_id = m.id AND mp.user_id = ?
      WHERE m.is_published = 1 AND s.is_archived = 0
      ORDER BY m.id ASC
    `).all(uid).map((m: any) => ({
      ...m,
      is_eligible: isSubjectAccessibleToDepartment(m, dept),
    }));

    const topics = db.prepare(`
      SELECT DISTINCT subject_id, topic_name
      FROM (
        SELECT subject_id, topic_name FROM questions WHERE approval_status = 'published'
        UNION
        SELECT subject_id, topic_name FROM learning_materials WHERE is_published = 1
        UNION
        SELECT subject_id, name as topic_name FROM topics
      )
      WHERE TRIM(topic_name) != ''
      ORDER BY topic_name ASC
    `).all();

    const allProgrammes = db.prepare(`
      SELECT p.*, s.name as subject_name, s.access_classification, s.eligible_departments_json
      FROM programmes p
      JOIN subjects s ON s.id = p.subject_id
      WHERE p.is_published = 1
    `).all().map((p: any) => ({
      ...p,
      is_eligible: isSubjectAccessibleToDepartment(p, dept),
      is_enrolled: enrolments.some((e: any) => e.programme_id === p.id),
    }));

    const studySchedule = db.prepare(`
      SELECT sb.*, COALESCE(s.name, sb.subject_name) as resolved_subject_name
      FROM study_schedule_blocks sb
      LEFT JOIN subjects s ON s.id = sb.subject_id
      WHERE sb.user_id = ?
      ORDER BY CASE sb.day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
        ELSE 8 END ASC, sb.start_time ASC, sb.id ASC
    `).all(uid);

    res.json({
      stats: {
        examsAttempted: attempts.length,
        avgScore,
        avgGrade: gradedAttempts.length > 0 ? computeGrade(avgScore) : '—',
        certificatesEarned: certificates.filter((c: any) => c.status === 'valid').length,
        activeProgrammes: enrolments.length,
        unreadNotifications: notifications.filter((n: any) => !n.is_read).length,
      },
      subjects,
      topics,
      subjectPerformance,
      leaderboardPositions,
      publishedPracticeQuestions,
      exams,
      attempts,
      enrolments,
      allProgrammes,
      schedules,
      certificates,
      notifications,
      announcements,
      videos,
      learningMaterials,
      studySchedule,
    });
  });

  // 60-day Programme Enrolment
  router.post('/student/programmes/:id/enrol', requireAuth, (req, res) => {
    const progId = Number(req.params.id);
    const prog = db.prepare(`
      SELECT p.*, s.access_classification, s.eligible_departments_json, s.name as subject_name
      FROM programmes p JOIN subjects s ON s.id = p.subject_id
      WHERE p.id = ? AND p.is_published = 1
    `).get(progId) as any;

    if (!prog) return res.status(404).json({ error: 'Programme not found.' });
    if (!isSubjectAccessibleToDepartment(prog, req.user!.department)) {
      return res.status(403).json({
        error: `${prog.subject_name} is restricted to ${safeParseJson<string[]>(prog.eligible_departments_json, []).join(', ')} students.`,
      });
    }

    const existing = db.prepare('SELECT id FROM programme_enrolments WHERE programme_id = ? AND user_id = ?').get(progId, req.user!.id);
    if (existing) return res.status(409).json({ error: 'You are already enrolled in this programme.' });

    db.prepare('INSERT INTO programme_enrolments (programme_id, user_id) VALUES (?, ?)').run(progId, req.user!.id);
    res.status(201).json({ ok: true, message: `Enrolled in ${prog.title}. Your 60-day preparation clock has started today.` });
  });

  router.post('/student/videos/:id/progress', requireAuth, (req, res) => {
    const videoId = Number(req.params.id);
    const { completed, saved_favorite } = req.body || {};
    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId) as any;
    if (!video) return res.status(404).json({ error: 'Video not found.' });

    const existing = db.prepare('SELECT * FROM video_progress WHERE user_id = ? AND video_id = ?').get(req.user!.id, videoId) as any;
    const nextCompleted = completed !== undefined ? (completed ? 1 : 0) : (existing?.completed ?? 0);
    const nextFav = saved_favorite !== undefined ? (saved_favorite ? 1 : 0) : (existing?.saved_favorite ?? 0);

    db.prepare(`
      INSERT INTO video_progress (user_id, video_id, completed, saved_favorite, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, video_id) DO UPDATE SET completed = excluded.completed, saved_favorite = excluded.saved_favorite, updated_at = datetime('now')
    `).run(req.user!.id, videoId, nextCompleted, nextFav);

    if (nextCompleted && video.programme_id) {
      const enr = db.prepare('SELECT * FROM programme_enrolments WHERE programme_id = ? AND user_id = ?').get(video.programme_id, req.user!.id) as any;
      if (enr) {
        const list = safeParseJson<Array<number | string>>(enr.lessons_completed_json, []);
        if (!list.includes(videoId)) {
          list.push(videoId);
          db.prepare('UPDATE programme_enrolments SET lessons_completed_json = ? WHERE id = ?').run(JSON.stringify(list), enr.id);
        }
      }
    }

    res.json({ ok: true, completed: nextCompleted, saved_favorite: nextFav });
  });

  router.post('/student/materials/:id/progress', requireAuth, (req, res) => {
    const materialId = Number(req.params.id);
    const { completed, saved_favorite } = req.body || {};
    const mat = db.prepare('SELECT * FROM learning_materials WHERE id = ?').get(materialId) as any;
    if (!mat) return res.status(404).json({ error: 'Learning material not found.' });

    const existing = db.prepare('SELECT * FROM material_progress WHERE user_id = ? AND material_id = ?').get(req.user!.id, materialId) as any;
    const nextCompleted = completed !== undefined ? (completed ? 1 : 0) : (existing?.completed ?? 0);
    const nextFav = saved_favorite !== undefined ? (saved_favorite ? 1 : 0) : (existing?.saved_favorite ?? 0);

    db.prepare(`
      INSERT INTO material_progress (user_id, material_id, completed, saved_favorite, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, material_id) DO UPDATE SET completed = excluded.completed, saved_favorite = excluded.saved_favorite, updated_at = datetime('now')
    `).run(req.user!.id, materialId, nextCompleted, nextFav);

    if (nextCompleted && mat.programme_id) {
      const enr = db.prepare('SELECT * FROM programme_enrolments WHERE programme_id = ? AND user_id = ?').get(mat.programme_id, req.user!.id) as any;
      if (enr) {
        const list = safeParseJson<Array<number | string>>(enr.lessons_completed_json, []);
        const key = `mat_${materialId}`;
        if (!list.includes(key)) {
          list.push(key);
          db.prepare('UPDATE programme_enrolments SET lessons_completed_json = ? WHERE id = ?').run(JSON.stringify(list), enr.id);
        }
      }
    }

    res.json({ ok: true, completed: nextCompleted, saved_favorite: nextFav });
  });

  // Instant Subject Practice Test launcher using published questions
  router.post('/student/practice/start', requireAuth, (req, res) => {
    const subjectId = Number(req.body?.subject_id);
    if (!subjectId) return res.status(400).json({ error: 'Subject ID is required.' });

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ? AND is_published = 1 AND is_archived = 0').get(subjectId) as any;
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });
    if (!isSubjectAccessibleToDepartment(subject, req.user!.department)) {
      return res.status(403).json({
        error: `Access restricted: "${subject.name}" is assigned to ${(safeParseJson<string[]>(subject.eligible_departments_json, [])).join(', ')} students.`,
      });
    }

    const qRows = db.prepare(`
      SELECT * FROM questions
      WHERE subject_id = ? AND approval_status = 'published'
      ORDER BY id ASC
    `).all(subjectId) as any[];

    if (qRows.length === 0) {
      return res.status(400).json({ error: `No published questions are available yet for ${subject.name}.` });
    }

    // Reuse an existing non-final Practice Test exam for this subject, or create one automatically
    let practiceExam = db.prepare(`
      SELECT * FROM examinations
      WHERE subject_id = ? AND is_60day_final = 0 AND category = 'Practice Test' AND is_published = 1
      ORDER BY id DESC LIMIT 1
    `).get(subjectId) as any;

    const totalMarks = qRows.reduce((s, q) => s + Number(q.marks || 1), 0);
    if (!practiceExam) {
      const insertEx = db.prepare(`
        INSERT INTO examinations (title, instructions, subject_id, category, exam_framework, duration_minutes, total_marks, pass_mark, max_attempts, randomize_questions, randomize_options, release_answers, is_published, is_60day_final)
        VALUES (?, ?, ?, 'Practice Test', 'General Practice', ?, ?, 60, 999, 1, 0, 1, 1, 0)
      `).run(
        `${subject.name} Interactive Practice Test`,
        `Practice test built from published ${subject.name} questions. Review explanations and topic performance immediately after submission.`,
        subjectId,
        Math.max(10, qRows.length * 4),
        totalMarks
      );
      practiceExam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(insertEx.lastInsertRowid);
    } else {
      db.prepare('UPDATE examinations SET total_marks = ?, max_attempts = 999 WHERE id = ?').run(totalMarks, practiceExam.id);
      db.prepare('DELETE FROM exam_questions WHERE exam_id = ?').run(practiceExam.id);
    }

    const linkStmt = db.prepare('INSERT OR IGNORE INTO exam_questions (exam_id, question_id, sort_order) VALUES (?, ?, ?)');
    qRows.forEach((q, idx) => linkStmt.run(practiceExam.id, q.id, idx + 1));

    res.json({ ok: true, examId: practiceExam.id });
  });

  router.post('/student/exams/:id/start', requireAuth, (req, res) => {
    const examId = Number(req.params.id);
    const exam = db.prepare(`
      SELECT e.*, s.name as subject_name, s.access_classification, s.eligible_departments_json
      FROM examinations e JOIN subjects s ON s.id = e.subject_id
      WHERE e.id = ? AND e.is_published = 1
    `).get(examId) as any;

    if (!exam) return res.status(404).json({ error: 'Examination not found.' });

    if (!isSubjectAccessibleToDepartment(exam, req.user!.department)) {
      return res.status(403).json({
        error: `Access restricted: "${exam.subject_name}" is a department-specific subject not assigned to ${req.user!.department}. Common subjects are available to all students.`,
      });
    }

    if (exam.is_60day_final && exam.programme_id) {
      const enr = db.prepare(`
        SELECT pe.*, p.min_days, p.required_lessons, p.required_practice_exams
        FROM programme_enrolments pe JOIN programmes p ON p.id = pe.programme_id
        WHERE pe.programme_id = ? AND pe.user_id = ?
      `).get(exam.programme_id, req.user!.id) as any;

      if (!enr) {
        return res.status(403).json({ error: 'You must enrol in the 60-day qualifying programme before taking its final examination.' });
      }
      const elapsedDays = Math.floor((Date.now() - new Date(enr.enrolled_at).getTime()) / (1000 * 60 * 60 * 24));
      const lessonsCount = safeParseJson<number[]>(enr.lessons_completed_json, []).length;
      if (elapsedDays < enr.min_days || lessonsCount < enr.required_lessons || enr.practice_exams_completed < enr.required_practice_exams) {
        return res.status(403).json({
          error: `Not yet eligible for the 60-day final exam. Progress: ${elapsedDays}/${enr.min_days} days, ${lessonsCount}/${enr.required_lessons} lessons, ${enr.practice_exams_completed}/${enr.required_practice_exams} practice exams.`,
        });
      }
    }

    const activeAttempt = db.prepare(`
      SELECT * FROM exam_attempts
      WHERE exam_id = ? AND user_id = ? AND status = 'in_progress' AND expires_at > datetime('now')
      ORDER BY id DESC LIMIT 1
    `).get(examId, req.user!.id) as any;

    let attempt = activeAttempt;
    if (!attempt) {
      const priorCount = (db.prepare('SELECT COUNT(*) as c FROM exam_attempts WHERE exam_id = ? AND user_id = ?').get(examId, req.user!.id) as any).c;
      if (priorCount >= exam.max_attempts) {
        return res.status(403).json({ error: `Maximum attempts (${exam.max_attempts}) reached for this examination.` });
      }

      const eqRows = db.prepare(`
        SELECT q.* FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ? AND q.approval_status IN ('published', 'approved')
        ORDER BY eq.sort_order ASC
      `).all(examId) as any[];

      if (eqRows.length === 0) {
        return res.status(400).json({ error: 'This examination does not have published questions assigned yet.' });
      }

      const orderedIds = exam.randomize_questions
        ? [...eqRows.map((q) => q.id)].sort(() => Math.random() - 0.5)
        : eqRows.map((q) => q.id);

      const maxScore = eqRows.reduce((sum, q) => sum + Number(q.marks || 1), 0);
      const expiresAt = new Date(Date.now() + exam.duration_minutes * 60 * 1000).toISOString();

      const insertRes = db.prepare(`
        INSERT INTO exam_attempts (exam_id, user_id, question_order_json, answers_json, flagged_json, expires_at, max_score)
        VALUES (?, ?, ?, '{}', '[]', ?, ?)
      `).run(examId, req.user!.id, JSON.stringify(orderedIds), expiresAt, maxScore);

      attempt = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(insertRes.lastInsertRowid);
    }

    const qIds = safeParseJson<number[]>(attempt.question_order_json, []);
    const questions = qIds.map((qid) => {
      const q = db.prepare('SELECT id, topic_name, format, question_text, options_json, marks, difficulty, scope_type, curriculum, exam_framework FROM questions WHERE id = ?').get(qid) as any;
      if (!q) return null;
      let options = safeParseJson<string[]>(q.options_json, []);
      if (exam.randomize_options && options.length > 1) {
        options = [...options].sort(() => Math.random() - 0.5);
      }
      return { ...q, options };
    }).filter(Boolean);

    res.json({
      exam,
      attempt: {
        ...attempt,
        answers: safeParseJson(attempt.answers_json, {}),
        flagged: safeParseJson(attempt.flagged_json, []),
      },
      questions,
    });
  });

  router.post('/student/attempts/:id/autosave', requireAuth, (req, res) => {
    const attemptId = Number(req.params.id);
    const attempt = db.prepare('SELECT * FROM exam_attempts WHERE id = ? AND user_id = ?').get(attemptId, req.user!.id) as any;
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (attempt.status !== 'in_progress') {
      return res.status(409).json({ error: 'This attempt has already been submitted and locked.' });
    }
    const { answers, flagged } = req.body || {};
    db.prepare('UPDATE exam_attempts SET answers_json = ?, flagged_json = ? WHERE id = ?').run(
      JSON.stringify(answers || {}),
      JSON.stringify(flagged || []),
      attemptId
    );
    res.json({ ok: true, savedAt: new Date().toISOString() });
  });

  router.post('/student/attempts/:id/submit', requireAuth, (req, res) => {
    const attemptId = Number(req.params.id);
    const attempt = db.prepare('SELECT * FROM exam_attempts WHERE id = ? AND user_id = ?').get(attemptId, req.user!.id) as any;
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (attempt.status !== 'in_progress') {
      return res.status(409).json({ error: 'Attempt already submitted.' });
    }

    const exam = db.prepare('SELECT * FROM examinations WHERE id = ?').get(attempt.exam_id) as any;
    const finalAnswers = req.body?.answers ?? safeParseJson(attempt.answers_json, {});
    const qIds = safeParseJson<number[]>(attempt.question_order_json, []);

    let autoScore = 0;
    let maxScore = 0;
    let hasSubjective = false;

    for (const qid of qIds) {
      const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid) as any;
      if (!q) continue;
      maxScore += Number(q.marks || 1);
      const userAns = String(finalAnswers[qid] ?? '').trim();
      if (q.format === 'mcq' || q.format === 'true_false') {
        if (userAns.toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
          autoScore += Number(q.marks || 1);
        }
      } else {
        hasSubjective = true;
      }
    }

    const percentage = maxScore > 0 ? Math.round((autoScore / maxScore) * 1000) / 10 : 0;
    const status = hasSubjective ? 'submitted' : 'graded';
    const passed = !hasSubjective && percentage >= exam.pass_mark ? 1 : 0;
    const grade = !hasSubjective ? computeGrade(percentage) : 'Pending Review';
    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE exam_attempts
      SET answers_json = ?, submitted_at = ?, status = ?, auto_score = ?, total_score = ?, max_score = ?, percentage = ?, grade = ?, passed = ?, graded_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(finalAnswers),
      nowIso,
      status,
      autoScore,
      autoScore,
      maxScore,
      percentage,
      grade,
      passed,
      hasSubjective ? null : nowIso,
      attemptId
    );

    if (!exam.is_60day_final) {
      db.prepare(`
        UPDATE programme_enrolments
        SET practice_exams_completed = practice_exams_completed + 1
        WHERE user_id = ? AND programme_id IN (SELECT id FROM programmes WHERE subject_id = ?)
      `).run(req.user!.id, exam.subject_id);
    }

    db.prepare(`
      INSERT INTO notifications (user_id, title, body, category, link)
      VALUES (?, ?, ?, 'result', ?)
    `).run(
      req.user!.id,
      hasSubjective ? `Exam Submitted: ${exam.title}` : `Result Published: ${exam.title}`,
      hasSubjective
        ? `Your objective sections scored ${autoScore}/${maxScore}. Written answers are queued for Academic Administrator review.`
        : `You scored ${autoScore}/${maxScore} (${percentage}% · Grade ${grade}).`,
      `/student/results/${attemptId}`
    );

    res.json({ ok: true, attemptId, status });
  });

  router.get('/student/attempts/:id', requireAuth, (req, res) => {
    const attemptId = Number(req.params.id);
    const attempt = db.prepare(`
      SELECT a.*, e.title as exam_title, e.pass_mark, e.release_answers, e.exam_framework, s.name as subject_name
      FROM exam_attempts a
      JOIN examinations e ON e.id = a.exam_id
      JOIN subjects s ON s.id = e.subject_id
      WHERE a.id = ?
    `).get(attemptId) as any;

    if (!attempt) return res.status(404).json({ error: 'Result not found.' });
    if (attempt.user_id !== req.user!.id && !ADMIN_ROLES.includes(req.user!.role as any)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const qIds = safeParseJson<number[]>(attempt.question_order_json, []);
    const answers = safeParseJson<Record<string, string>>(attempt.answers_json, {});

    const breakdown = qIds.map((qid) => {
      const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid) as any;
      if (!q) return null;
      const studentAnswer = answers[qid] || '';
      const isObjective = q.format === 'mcq' || q.format === 'true_false';
      const isCorrect = isObjective && studentAnswer.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      return {
        id: q.id,
        topic_name: q.topic_name,
        format: q.format,
        question_text: q.question_text,
        options: safeParseJson(q.options_json, []),
        student_answer: studentAnswer,
        correct_answer: attempt.release_answers ? q.correct_answer : null,
        explanation: attempt.release_answers ? q.explanation : null,
        marking_scheme: attempt.release_answers ? q.marking_scheme : null,
        marks: q.marks,
        is_objective: isObjective,
        is_correct: isCorrect,
      };
    }).filter(Boolean);

    res.json({ attempt, breakdown });
  });

  router.post('/student/notifications/read', requireAuth, (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  // Weekly Study Schedule & Daily Tasks
  router.post('/student/schedule', requireAuth, (req, res) => {
    const { subject_id, day_of_week, start_time, end_time, task_title, notes } = req.body || {};
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!day_of_week || !validDays.includes(String(day_of_week))) {
      return res.status(400).json({ error: 'Please select a valid day of the week (Monday–Sunday).' });
    }
    if (!start_time || !end_time || String(start_time) >= String(end_time)) {
      return res.status(400).json({ error: 'Please select a valid time range where end time is after start time.' });
    }
    if (!task_title || !String(task_title).trim()) {
      return res.status(400).json({ error: 'Please enter a study task or topic goal.' });
    }

    let resolvedSubjId: number | null = null;
    let resolvedSubjName = 'General Study';
    if (subject_id) {
      const subj = db.prepare('SELECT * FROM subjects WHERE id = ? AND is_published = 1 AND is_archived = 0').get(Number(subject_id)) as any;
      if (!subj) {
        return res.status(404).json({ error: 'Selected subject was not found.' });
      }
      if (!isSubjectAccessibleToDepartment(subj, req.user!.department)) {
        return res.status(403).json({ error: `Subject "${subj.name}" is outside your ${req.user!.department} stream.` });
      }
      resolvedSubjId = subj.id;
      resolvedSubjName = subj.name;
    }

    const r = db.prepare(`
      INSERT INTO study_schedule_blocks (user_id, subject_id, subject_name, day_of_week, start_time, end_time, task_title, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user!.id,
      resolvedSubjId,
      resolvedSubjName,
      String(day_of_week),
      String(start_time),
      String(end_time),
      String(task_title).trim(),
      String(notes || '').trim()
    );

    const created = db.prepare('SELECT * FROM study_schedule_blocks WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json({ ok: true, id: Number(r.lastInsertRowid), block: created });
  });

  router.patch('/student/schedule/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM study_schedule_blocks WHERE id = ? AND user_id = ?').get(id, req.user!.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Study schedule entry not found.' });
    }
    const { is_completed, task_title, start_time, end_time, day_of_week, notes } = req.body || {};
    const nextCompleted = is_completed !== undefined ? (is_completed ? 1 : 0) : existing.is_completed;
    db.prepare(`
      UPDATE study_schedule_blocks
      SET is_completed = ?, task_title = ?, start_time = ?, end_time = ?, day_of_week = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `).run(
      nextCompleted,
      task_title !== undefined ? String(task_title).trim() : existing.task_title,
      start_time ?? existing.start_time,
      end_time ?? existing.end_time,
      day_of_week ?? existing.day_of_week,
      notes !== undefined ? String(notes).trim() : existing.notes,
      id,
      req.user!.id
    );
    const updated = db.prepare('SELECT * FROM study_schedule_blocks WHERE id = ?').get(id);
    res.json({ ok: true, block: updated });
  });

  router.delete('/student/schedule/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM study_schedule_blocks WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Study schedule entry not found.' });
    }
    res.json({ ok: true });
  });

  router.get('/student/community', requireAuth, (req, res) => {
    const groups = db.prepare('SELECT * FROM community_groups ORDER BY id ASC').all();
    const groupId = req.query.groupId ? Number(req.query.groupId) : null;
    const postsQuery = groupId
      ? `SELECT p.*, g.name as group_name, u.full_name, u.username, u.department, u.is_minor, u.profile_visibility
         FROM community_posts p
         JOIN community_groups g ON g.id = p.group_id
         JOIN users u ON u.id = p.user_id
         WHERE p.status = 'published' AND p.group_id = ?
         ORDER BY p.created_at DESC`
      : `SELECT p.*, g.name as group_name, u.full_name, u.username, u.department, u.is_minor, u.profile_visibility
         FROM community_posts p
         JOIN community_groups g ON g.id = p.group_id
         JOIN users u ON u.id = p.user_id
         WHERE p.status = 'published'
         ORDER BY p.created_at DESC LIMIT 40`;

    const posts = (groupId ? db.prepare(postsQuery).all(groupId) : db.prepare(postsQuery).all()).map((p: any) => {
      const comments = db.prepare(`
        SELECT c.*, u.full_name, u.username, u.is_minor
        FROM community_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = ? AND c.status = 'published'
        ORDER BY c.created_at ASC
      `).all(p.id).map((c: any) => ({
        ...c,
        author_display: c.is_minor ? `@${c.username}` : c.full_name,
      }));
      return {
        ...p,
        author_display: p.is_minor || p.profile_visibility === 'private' ? `@${p.username}` : p.full_name,
        comments,
      };
    });

    res.json({ groups, posts, isMinorSafeguard: Boolean(req.user!.is_minor) });
  });

  router.post('/student/community/posts', requireAuth, (req, res) => {
    const { group_id, title, body } = req.body || {};
    if (!group_id || !title || !body) {
      return res.status(400).json({ error: 'Group, title, and message body are required.' });
    }
    const result = db.prepare(`
      INSERT INTO community_posts (group_id, user_id, title, body, status)
      VALUES (?, ?, ?, ?, 'published')
    `).run(Number(group_id), req.user!.id, String(title).trim(), String(body).trim());
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  });

  router.post('/student/community/posts/:id/comments', requireAuth, (req, res) => {
    const postId = Number(req.params.id);
    const { body } = req.body || {};
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    db.prepare('INSERT INTO community_comments (post_id, user_id, body) VALUES (?, ?, ?)').run(postId, req.user!.id, String(body).trim());
    res.status(201).json({ ok: true });
  });

  router.post('/student/community/report', requireAuth, (req, res) => {
    const { target_type, target_id, reason } = req.body || {};
    if (!target_type || !target_id || !reason) return res.status(400).json({ error: 'Report details required.' });
    db.prepare(`
      INSERT INTO moderation_reports (target_type, target_id, reporter_id, reason)
      VALUES (?, ?, ?, ?)
    `).run(String(target_type), Number(target_id), req.user!.id, String(reason).trim());
    res.status(201).json({ ok: true, message: 'Report submitted to Community Moderators for review.' });
  });

  router.post('/student/testimonials', requireAuth, (req, res) => {
    const { programme_title, achievement, quote, certificate_number, consent_confirmed } = req.body || {};
    if (!quote || !consent_confirmed) {
      return res.status(400).json({ error: 'Testimonial message and consent confirmation are required.' });
    }
    const displayName = req.user!.is_minor ? `@${req.user!.username}` : ((req.user as any).public_display_name || req.user!.full_name);
    db.prepare(`
      INSERT INTO testimonials (user_id, display_name, country, avatar_url, programme_title, achievement, quote, certificate_number, status, consent_confirmed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)
    `).run(
      req.user!.id,
      displayName,
      req.user!.is_minor ? 'Protected' : req.user!.country,
      req.user!.avatar_url || '',
      String(programme_title || 'General EDUNEXA Learning').trim(),
      String(achievement || 'EDUNEXA Learner').trim(),
      String(quote).trim(),
      certificate_number ? String(certificate_number).trim() : ''
    );
    res.status(201).json({ ok: true, message: 'Testimonial submitted for administrator review and approval.' });
  });

  router.post('/ai/tutor', requireAuth, async (req, res) => {
    const { message, subject, history } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Please enter a question or topic for EDUNEXA AI TUTOR.' });
    }
    if (!getAiConfigStatus().configured) {
      return res.status(503).json({ error: getAiConfigStatus().message });
    }
    try {
      const subjects = (db.prepare('SELECT name, access_classification, eligible_departments_json FROM subjects WHERE is_published = 1 AND is_archived = 0').all() as any[])
        .filter((s) => isSubjectAccessibleToDepartment(s, req.user!.department))
        .map((s) => s.name);

      const reply = await askEdunexaAiTutor({
        studentName: req.user!.full_name,
        department: req.user!.department,
        isMinor: Boolean(req.user!.is_minor),
        subject: subject ? String(subject) : undefined,
        message: String(message),
        history: Array.isArray(history) ? history : [],
        availableSubjects: subjects,
      });

      res.json({ reply });
    } catch (err: any) {
      console.error('AI Tutor error:', err);
      res.status(502).json({ error: err?.message || 'EDUNEXA AI TUTOR is temporarily unavailable.' });
    }
  });

  // ==========================================
  // ADMINISTRATOR PORTAL ROUTES (Server RBAC Enforced)
  // ==========================================
  router.get('/admin/overview', requireAdmin(), (_req, res) => {
    const stats = {
      students: (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get() as any).c,
      admins: (db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'student'").get() as any).c,
      subjects: (db.prepare('SELECT COUNT(*) as c FROM subjects WHERE is_archived = 0').get() as any).c,
      publishedQuestions: (db.prepare("SELECT COUNT(*) as c FROM questions WHERE approval_status = 'published'").get() as any).c,
      approvedQuestions: (db.prepare("SELECT COUNT(*) as c FROM questions WHERE approval_status IN ('approved', 'published')").get() as any).c,
      draftQuestions: (db.prepare("SELECT COUNT(*) as c FROM questions WHERE approval_status = 'draft'").get() as any).c,
      pendingGrading: (db.prepare("SELECT COUNT(*) as c FROM exam_attempts WHERE status = 'submitted'").get() as any).c,
      openReports: (db.prepare("SELECT COUNT(*) as c FROM moderation_reports WHERE status = 'open'").get() as any).c,
      pendingTestimonials: (db.prepare("SELECT COUNT(*) as c FROM testimonials WHERE status = 'pending'").get() as any).c,
      certificatesIssued: (db.prepare("SELECT COUNT(*) as c FROM certificates WHERE status = 'valid'").get() as any).c,
      newEnquiries: (db.prepare("SELECT COUNT(*) as c FROM contact_enquiries WHERE status = 'new'").get() as any).c,
      activeAnnouncements: (db.prepare('SELECT COUNT(*) as c FROM announcements WHERE is_active = 1').get() as any).c,
    };

    // Real SQLite aggregations for Overview Recharts visualizations
    const studentDays = db.prepare(`
      SELECT substr(created_at, 1, 10) as day, COUNT(*) as count
      FROM users
      WHERE role = 'student'
      GROUP BY day
    `).all() as Array<{ day: string; count: number }>;

    const enrolmentDays = db.prepare(`
      SELECT substr(enrolled_at, 1, 10) as day, COUNT(*) as count
      FROM programme_enrolments
      GROUP BY day
    `).all() as Array<{ day: string; count: number }>;

    const attemptDays = db.prepare(`
      SELECT substr(COALESCE(submitted_at, started_at), 1, 10) as day,
        COUNT(*) as completed,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed,
        ROUND(AVG(CASE WHEN status = 'graded' THEN percentage END), 1) as avg_score
      FROM exam_attempts
      WHERE status IN ('submitted', 'graded')
      GROUP BY day
    `).all() as Array<{ day: string; completed: number; passed: number; avg_score: number | null }>;

    const studentMap = new Map(studentDays.map((r) => [r.day, Number(r.count || 0)]));
    const enrolmentMap = new Map(enrolmentDays.map((r) => [r.day, Number(r.count || 0)]));
    const attemptMap = new Map(
      attemptDays.map((r) => [
        r.day,
        {
          completed: Number(r.completed || 0),
          passed: Number(r.passed || 0),
          avgScore: r.avg_score != null ? Number(r.avg_score) : null,
        },
      ]),
    );

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const windowDays = 90;
    const windowStart = new Date(todayUtc);
    windowStart.setUTCDate(windowStart.getUTCDate() - (windowDays - 1));
    const windowStartIso = windowStart.toISOString().slice(0, 10);

    let cumStudents = studentDays
      .filter((r) => r.day < windowStartIso)
      .reduce((acc, r) => acc + Number(r.count || 0), 0);
    let cumEnrolments = enrolmentDays
      .filter((r) => r.day < windowStartIso)
      .reduce((acc, r) => acc + Number(r.count || 0), 0);
    let cumCompletions = attemptDays
      .filter((r) => r.day < windowStartIso)
      .reduce((acc, r) => acc + Number(r.completed || 0), 0);

    const dailySeries: Array<{
      date: string;
      label: string;
      studentEnrollments: number;
      programmeEnrolments: number;
      examCompletions: number;
      passedExams: number;
      avgScore: number | null;
      cumulativeStudents: number;
      cumulativeEnrolments: number;
      cumulativeCompletions: number;
    }> = [];

    for (let i = 0; i < windowDays; i++) {
      const d = new Date(windowStart);
      d.setUTCDate(windowStart.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const sCount = studentMap.get(iso) || 0;
      const eCount = enrolmentMap.get(iso) || 0;
      const att = attemptMap.get(iso);
      const cCount = att?.completed || 0;
      cumStudents += sCount;
      cumEnrolments += eCount;
      cumCompletions += cCount;

      dailySeries.push({
        date: iso,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        studentEnrollments: sCount,
        programmeEnrolments: eCount,
        examCompletions: cCount,
        passedExams: att?.passed || 0,
        avgScore: att?.avgScore ?? null,
        cumulativeStudents: cumStudents,
        cumulativeEnrolments: cumEnrolments,
        cumulativeCompletions: cumCompletions,
      });
    }

    // Monthly All-Time Timeline from earliest recorded activity to current month
    const allDates = [
      ...studentDays.map((r) => r.day),
      ...enrolmentDays.map((r) => r.day),
      ...attemptDays.map((r) => r.day),
    ].filter(Boolean).sort();
    const earliestMonth = allDates.length > 0 ? allDates[0].slice(0, 7) : todayUtc.toISOString().slice(0, 7);
    const currentMonth = todayUtc.toISOString().slice(0, 7);

    const monthlyMap = new Map<string, { studentEnrollments: number; programmeEnrolments: number; examCompletions: number; passedExams: number }>();
    for (const r of studentDays) {
      const m = r.day.slice(0, 7);
      const cur = monthlyMap.get(m) || { studentEnrollments: 0, programmeEnrolments: 0, examCompletions: 0, passedExams: 0 };
      cur.studentEnrollments += Number(r.count || 0);
      monthlyMap.set(m, cur);
    }
    for (const r of enrolmentDays) {
      const m = r.day.slice(0, 7);
      const cur = monthlyMap.get(m) || { studentEnrollments: 0, programmeEnrolments: 0, examCompletions: 0, passedExams: 0 };
      cur.programmeEnrolments += Number(r.count || 0);
      monthlyMap.set(m, cur);
    }
    for (const r of attemptDays) {
      const m = r.day.slice(0, 7);
      const cur = monthlyMap.get(m) || { studentEnrollments: 0, programmeEnrolments: 0, examCompletions: 0, passedExams: 0 };
      cur.examCompletions += Number(r.completed || 0);
      cur.passedExams += Number(r.passed || 0);
      monthlyMap.set(m, cur);
    }

    const monthlySeries: Array<{
      date: string;
      label: string;
      studentEnrollments: number;
      programmeEnrolments: number;
      examCompletions: number;
      passedExams: number;
      cumulativeStudents: number;
      cumulativeEnrolments: number;
      cumulativeCompletions: number;
    }> = [];

    let [yr, mo] = earliestMonth.split('-').map(Number);
    const [endYr, endMo] = currentMonth.split('-').map(Number);
    let mCumStudents = 0;
    let mCumEnrolments = 0;
    let mCumCompletions = 0;
    while (yr < endYr || (yr === endYr && mo <= endMo)) {
      const key = `${yr}-${String(mo).padStart(2, '0')}`;
      const bucket = monthlyMap.get(key) || { studentEnrollments: 0, programmeEnrolments: 0, examCompletions: 0, passedExams: 0 };
      mCumStudents += bucket.studentEnrollments;
      mCumEnrolments += bucket.programmeEnrolments;
      mCumCompletions += bucket.examCompletions;
      const monthDate = new Date(Date.UTC(yr, mo - 1, 1));
      monthlySeries.push({
        date: key,
        label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        studentEnrollments: bucket.studentEnrollments,
        programmeEnrolments: bucket.programmeEnrolments,
        examCompletions: bucket.examCompletions,
        passedExams: bucket.passedExams,
        cumulativeStudents: mCumStudents,
        cumulativeEnrolments: mCumEnrolments,
        cumulativeCompletions: mCumCompletions,
      });
      mo += 1;
      if (mo > 12) {
        mo = 1;
        yr += 1;
      }
    }

    const departmentBreakdown = db.prepare(`
      SELECT u.department as department,
        COUNT(DISTINCT u.id) as students,
        COUNT(DISTINCT pe.id) as enrolments,
        COUNT(DISTINCT CASE WHEN ea.status IN ('submitted', 'graded') THEN ea.id END) as examCompletions,
        ROUND(AVG(CASE WHEN ea.status = 'graded' THEN ea.percentage END), 1) as avgScore
      FROM users u
      LEFT JOIN programme_enrolments pe ON pe.user_id = u.id
      LEFT JOIN exam_attempts ea ON ea.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.department
      ORDER BY students DESC, department ASC
    `).all().map((row: any) => ({
      department: row.department,
      shortName: row.department === 'Arts and Humanities' ? 'Arts & Hum.' : row.department,
      students: Number(row.students || 0),
      enrolments: Number(row.enrolments || 0),
      examCompletions: Number(row.examCompletions || 0),
      avgScore: row.avgScore != null ? Number(row.avgScore) : 0,
    }));

    const subjectAnalytics = db.prepare(`
      SELECT s.id, s.code, s.name, s.group_name as groupName,
        (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id AND q.approval_status = 'published') as publishedQuestions,
        (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id AND q.approval_status = 'draft') as draftQuestions,
        (SELECT COUNT(*) FROM exam_attempts ea JOIN examinations e ON e.id = ea.exam_id WHERE e.subject_id = s.id AND ea.status IN ('submitted', 'graded')) as examCompletions,
        (SELECT ROUND(AVG(ea.percentage), 1) FROM exam_attempts ea JOIN examinations e ON e.id = ea.exam_id WHERE e.subject_id = s.id AND ea.status = 'graded') as avgScore
      FROM subjects s
      WHERE s.is_archived = 0
      ORDER BY examCompletions DESC, publishedQuestions DESC, s.id ASC
    `).all().map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      shortName: row.name.length > 16 ? `${row.name.slice(0, 14)}…` : row.name,
      groupName: row.groupName,
      publishedQuestions: Number(row.publishedQuestions || 0),
      draftQuestions: Number(row.draftQuestions || 0),
      examCompletions: Number(row.examCompletions || 0),
      avgScore: row.avgScore != null ? Number(row.avgScore) : null,
    }));

    const attemptSummary = db.prepare(`
      SELECT
        COUNT(*) as totalCompletions,
        COUNT(CASE WHEN status = 'graded' THEN 1 END) as gradedCount,
        SUM(CASE WHEN status = 'graded' AND passed = 1 THEN 1 ELSE 0 END) as passedCount,
        ROUND(AVG(CASE WHEN status = 'graded' THEN percentage END), 1) as avgScore
      FROM exam_attempts
      WHERE status IN ('submitted', 'graded')
    `).get() as any;

    const totalEnrolments = (db.prepare('SELECT COUNT(*) as c FROM programme_enrolments').get() as any).c;

    const recentCompletions = db.prepare(`
      SELECT ea.id, ea.status, ea.percentage, ea.grade, ea.passed,
        COALESCE(ea.submitted_at, ea.started_at) as completedAt,
        u.full_name as studentName, u.department,
        e.title as examTitle, e.exam_framework as examFramework,
        s.name as subjectName
      FROM exam_attempts ea
      JOIN users u ON u.id = ea.user_id
      JOIN examinations e ON e.id = ea.exam_id
      JOIN subjects s ON s.id = e.subject_id
      WHERE ea.status IN ('submitted', 'graded')
      ORDER BY COALESCE(ea.submitted_at, ea.started_at) DESC, ea.id DESC
      LIMIT 6
    `).all();

    const recentAudit = db.prepare(`
      SELECT a.*, u.full_name as actor_name
      FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.id DESC LIMIT 25
    `).all();

    res.json({
      stats,
      analytics: {
        totals: {
          totalStudents: stats.students,
          totalEnrolments: Number(totalEnrolments || 0),
          totalExamCompletions: Number(attemptSummary?.totalCompletions || 0),
          gradedCompletions: Number(attemptSummary?.gradedCount || 0),
          passRate:
            attemptSummary?.gradedCount > 0
              ? Math.round((Number(attemptSummary.passedCount || 0) / Number(attemptSummary.gradedCount)) * 100)
              : null,
          averageScore: attemptSummary?.avgScore != null ? Number(attemptSummary.avgScore) : null,
        },
        dailySeries,
        monthlySeries,
        departmentBreakdown,
        subjectAnalytics,
        recentCompletions,
      },
      recentAudit,
      aiStatus: getAiConfigStatus(),
    });
  });

  // Student & Role Management
  router.get('/admin/users', requireAdmin(['super_admin', 'academic_admin', 'community_moderator']), (_req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.full_name, u.username, u.email, u.role, u.department, u.country, u.is_minor,
        u.public_display_name, u.leaderboard_consent, u.leaderboard_hidden, u.status, u.created_at,
        (SELECT COUNT(*) FROM exam_attempts a WHERE a.user_id = u.id) as attempts_count,
        (SELECT ROUND(AVG(a.percentage), 1) FROM exam_attempts a WHERE a.user_id = u.id AND a.status = 'graded') as avg_score
      FROM users u
      ORDER BY u.id ASC
    `).all();
    res.json({ users });
  });

  router.post('/admin/administrators', requireAdmin(['super_admin']), (req, res) => {
    const { full_name, username, email, password, role } = req.body || {};
    if (!full_name || !username || !email || !password || !role) {
      return res.status(400).json({ error: 'Full name, username, email, password, and administrator role are required.' });
    }
    if (!ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid administrator role specified.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Administrator password must be at least 8 characters.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase();
    const dup = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)').get(cleanEmail, cleanUsername);
    if (dup) {
      return res.status(409).json({ error: 'An account with this email or username already exists.' });
    }

    const hash = bcrypt.hashSync(String(password), 10);
    const result = db.prepare(`
      INSERT INTO users (full_name, username, email, password_hash, role, department, country, is_minor, profile_visibility, public_display_name, leaderboard_consent, email_verified)
      VALUES (?, ?, ?, ?, ?, 'General', 'International', 0, 'private', ?, 0, 1)
    `).run(String(full_name).trim(), cleanUsername, cleanEmail, hash, role, String(full_name).trim());

    logAudit(req.user!.id, req.user!.role, 'CREATE_ADMIN', `user:${result.lastInsertRowid}`, `${cleanEmail} (${role})`);
    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });
  });

  router.patch('/admin/users/:id/role', requireAdmin(['super_admin']), (req, res) => {
    const targetId = Number(req.params.id);
    const { role, status } = req.body || {};
    const allowed = ['student', ...ADMIN_ROLES];
    if (role && !allowed.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }
    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
    }
    if (status && ['active', 'suspended'].includes(status)) {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, targetId);
    }
    logAudit(req.user!.id, req.user!.role, 'UPDATE_USER_ROLE', `user:${targetId}`, `role=${role || 'unchanged'} status=${status || 'unchanged'}`);
    res.json({ ok: true });
  });

  router.patch('/admin/users/:id/leaderboard', requireAdmin(['super_admin', 'academic_admin', 'community_moderator']), (req, res) => {
    const targetId = Number(req.params.id);
    const { leaderboard_hidden, public_display_name, status } = req.body || {};
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!existing) return res.status(404).json({ error: 'Student not found.' });

    db.prepare(`
      UPDATE users SET
        leaderboard_hidden = ?,
        public_display_name = ?,
        status = ?
      WHERE id = ?
    `).run(
      leaderboard_hidden !== undefined ? (leaderboard_hidden ? 1 : 0) : existing.leaderboard_hidden,
      public_display_name !== undefined ? String(public_display_name).trim() : existing.public_display_name,
      status && ['active', 'suspended'].includes(status) ? status : existing.status,
      targetId
    );

    logAudit(req.user!.id, req.user!.role, 'MODERATE_STUDENT_LEADERSHIP', `user:${targetId}`, `hidden=${leaderboard_hidden}`);
    res.json({ ok: true });
  });

  // Leadership Management View
  router.get('/admin/leadership', requireAdmin(['super_admin', 'academic_admin', 'community_moderator']), (_req, res) => {
    const leaders = queryLeaders({ category: 'overall', includeHidden: true });
    res.json({ leaders });
  });

  // Subjects Management
  router.get('/admin/subjects', requireAdmin(['academic_admin', 'content_admin']), (_req, res) => {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY id ASC').all().map((s: any) => ({
      ...s,
      eligible_departments: safeParseJson(s.eligible_departments_json, []),
    }));
    res.json({ subjects });
  });

  router.post('/admin/subjects', requireAdmin(['academic_admin']), (req, res) => {
    const { code, name, group_name, access_classification, eligible_departments, description } = req.body || {};
    if (!code || !name || !group_name || !access_classification) {
      return res.status(400).json({ error: 'Code, name, group, and access classification are required.' });
    }
    let depts: string[] = [];
    if (access_classification === 'Common / All Students') {
      depts = ['Science', 'Arts and Humanities', 'Commercial'];
    } else if (access_classification === 'Custom') {
      depts = Array.isArray(eligible_departments) && eligible_departments.length > 0 ? eligible_departments : ['Science'];
    } else {
      depts = [access_classification];
    }

    const result = db.prepare(`
      INSERT INTO subjects (code, name, group_name, access_classification, eligible_departments_json, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(String(code).trim().toUpperCase(), String(name).trim(), String(group_name).trim(), access_classification, JSON.stringify(depts), String(description || ''));

    logAudit(req.user!.id, req.user!.role, 'CREATE_SUBJECT', `subject:${result.lastInsertRowid}`, `${name} (${access_classification})`);
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  });

  router.patch('/admin/subjects/:id', requireAdmin(['academic_admin']), (req, res) => {
    const id = Number(req.params.id);
    const { name, group_name, access_classification, eligible_departments, description, is_published, is_archived } = req.body || {};
    const existing = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Subject not found.' });

    const nextClass = access_classification || existing.access_classification;
    let depts = safeParseJson<string[]>(existing.eligible_departments_json, []);
    if (nextClass === 'Common / All Students') {
      depts = ['Science', 'Arts and Humanities', 'Commercial'];
    } else if (nextClass === 'Custom' && Array.isArray(eligible_departments)) {
      depts = eligible_departments;
    } else if (access_classification) {
      depts = [nextClass];
    }

    db.prepare(`
      UPDATE subjects SET name = ?, group_name = ?, access_classification = ?, eligible_departments_json = ?, description = ?, is_published = ?, is_archived = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      group_name ?? existing.group_name,
      nextClass,
      JSON.stringify(depts),
      description ?? existing.description,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      is_archived !== undefined ? (is_archived ? 1 : 0) : existing.is_archived,
      id
    );

    logAudit(req.user!.id, req.user!.role, 'UPDATE_SUBJECT', `subject:${id}`, `Updated classification=${nextClass}`);
    res.json({ ok: true });
  });

  // AI Status + Question Bank + AI Generator (Draft -> Approved -> Published)
  router.get('/admin/ai/status', requireAdmin(['academic_admin', 'super_admin']), (_req, res) => {
    res.json(getAiConfigStatus());
  });

  router.get('/admin/questions', requireAdmin(['academic_admin']), (req, res) => {
    const status = req.query.status ? String(req.query.status) : null;
    const rows = (status
      ? db.prepare('SELECT q.*, s.name as subject_name FROM questions q JOIN subjects s ON s.id = q.subject_id WHERE q.approval_status = ? ORDER BY q.id DESC').all(status)
      : db.prepare('SELECT q.*, s.name as subject_name FROM questions q JOIN subjects s ON s.id = q.subject_id ORDER BY q.id DESC').all()
    ).map((q: any) => ({
      ...q,
      options: safeParseJson(q.options_json, []),
      source_references: safeParseJson(q.source_references_json, []),
    }));
    res.json({ questions: rows });
  });

  router.post('/admin/questions', requireAdmin(['academic_admin']), (req, res) => {
    const b = req.body || {};
    if (!b.subject_id || !b.question_text || !b.topic_name) {
      return res.status(400).json({ error: 'Subject, topic, and question text are required.' });
    }
    const status = ['draft', 'approved', 'published'].includes(b.approval_status) ? b.approval_status : 'draft';
    const result = db.prepare(`
      INSERT INTO questions (subject_id, topic_name, country, curriculum, exam_framework, academic_level, difficulty, format, question_text, options_json, correct_answer, explanation, marking_scheme, marks, learning_objective, scope_type, approval_status, published_at, reviewed_by, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(b.subject_id),
      String(b.topic_name),
      String(b.country || 'International'),
      String(b.curriculum || 'International Standard'),
      String(b.exam_framework || 'General Practice'),
      String(b.academic_level || 'Intermediate'),
      String(b.difficulty || 'Intermediate'),
      String(b.format || 'mcq'),
      String(b.question_text),
      JSON.stringify(Array.isArray(b.options) ? b.options : []),
      String(b.correct_answer || ''),
      String(b.explanation || ''),
      String(b.marking_scheme || ''),
      Number(b.marks || 1),
      String(b.learning_objective || ''),
      String(b.scope_type || 'international'),
      status,
      status === 'published' ? new Date().toISOString() : null,
      status !== 'draft' ? req.user!.id : null,
      req.user!.id
    );
    logAudit(req.user!.id, req.user!.role, 'CREATE_QUESTION', `question:${result.lastInsertRowid}`, `${b.topic_name} (${status})`);
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  });

  router.patch('/admin/questions/:id', requireAdmin(['academic_admin']), (req, res) => {
    const id = Number(req.params.id);
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as any;
    if (!q) return res.status(404).json({ error: 'Question not found.' });
    const b = req.body || {};
    const nextStatus = b.approval_status ?? q.approval_status;
    const publishedAt = nextStatus === 'published' ? (q.published_at || new Date().toISOString()) : q.published_at;

    db.prepare(`
      UPDATE questions SET
        topic_name = ?, exam_framework = ?, academic_level = ?, format = ?,
        question_text = ?, options_json = ?, correct_answer = ?, explanation = ?, marking_scheme = ?,
        difficulty = ?, marks = ?, approval_status = ?, published_at = ?, reviewed_by = ?, version = version + 1
      WHERE id = ?
    `).run(
      b.topic_name ?? q.topic_name,
      b.exam_framework ?? q.exam_framework,
      b.academic_level ?? q.academic_level,
      b.format ?? q.format,
      b.question_text ?? q.question_text,
      b.options ? JSON.stringify(b.options) : q.options_json,
      b.correct_answer ?? q.correct_answer,
      b.explanation ?? q.explanation,
      b.marking_scheme ?? q.marking_scheme,
      b.difficulty ?? q.difficulty,
      b.marks ?? q.marks,
      nextStatus,
      publishedAt,
      nextStatus !== 'draft' ? req.user!.id : q.reviewed_by,
      id
    );
    logAudit(req.user!.id, req.user!.role, 'UPDATE_QUESTION', `question:${id}`, `status=${nextStatus}`);
    res.json({ ok: true });
  });

  router.delete('/admin/questions/:id', requireAdmin(['academic_admin']), (req, res) => {
    const id = Number(req.params.id);
    const inExam = db.prepare('SELECT exam_id FROM exam_questions WHERE question_id = ?').get(id) as any;
    if (inExam) {
      db.prepare('DELETE FROM exam_questions WHERE question_id = ?').run(id);
    }
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    logAudit(req.user!.id, req.user!.role, 'DELETE_QUESTION', `question:${id}`, 'Deleted question from bank');
    res.json({ ok: true });
  });

  router.post('/admin/ai/generate-questions', requireAdmin(['academic_admin']), async (req, res) => {
    const status = getAiConfigStatus();
    if (!status.configured) {
      return res.status(503).json({ error: status.message, configRequired: true });
    }

    const b = req.body || {};
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(Number(b.subject_id)) as any;
    if (!subject) return res.status(400).json({ error: 'Please select a valid subject.' });

    try {
      const count = Math.max(1, Math.min(10, Number(b.questionCount || 4)));
      const result = await generateCurriculumAlignedQuestions({
        country: String(b.country || 'International'),
        curriculum: String(b.curriculum || 'International Standard'),
        examFramework: String(b.examFramework || 'WAEC'),
        department: subject.access_classification,
        subjectName: subject.name,
        topicName: String(b.topicName || 'Core Concepts'),
        academicLevel: String(b.academicLevel || 'Senior Secondary 3'),
        difficulty: String(b.difficulty || 'Intermediate'),
        questionCount: count,
        format: b.format || 'mcq',
        marksPerQuestion: Number(b.marksPerQuestion || 2),
        suggestedDurationMinutes: Number(b.suggestedDurationMinutes || 15),
        language: String(b.language || 'English'),
        scopeType: b.scopeType || 'exam_specific',
        adminNotes: b.adminNotes ? String(b.adminNotes) : undefined,
      });

      const insertQ = db.prepare(`
        INSERT INTO questions (subject_id, topic_name, country, curriculum, exam_framework, academic_level, difficulty, format, question_text, options_json, correct_answer, explanation, marking_scheme, marks, learning_objective, scope_type, source_references_json, source_gap_flagged, ai_generated, ai_model, approval_status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'draft', ?)
      `);

      const savedQuestions: any[] = [];
      for (const q of result.questions) {
        const r = insertQ.run(
          subject.id,
          q.topic_mapping || String(b.topicName || 'Core Concepts'),
          String(b.country || 'International'),
          String(b.curriculum || 'International Standard'),
          String(b.examFramework || 'WAEC'),
          String(b.academicLevel || 'Senior Secondary 3'),
          q.difficulty,
          q.format,
          q.question_text,
          JSON.stringify(q.options || []),
          q.correct_answer,
          q.explanation,
          q.marking_scheme || '',
          q.marks,
          q.learning_objective,
          b.scopeType || 'exam_specific',
          JSON.stringify(result.sourceReferences),
          result.sourceGapFlagged ? 1 : 0,
          result.modelUsed,
          req.user!.id
        );
        const row = db.prepare('SELECT q.*, s.name as subject_name FROM questions q JOIN subjects s ON s.id = q.subject_id WHERE q.id = ?').get(r.lastInsertRowid) as any;
        savedQuestions.push({
          ...row,
          options: safeParseJson(row.options_json, []),
          source_references: safeParseJson(row.source_references_json, []),
        });
      }

      logAudit(
        req.user!.id,
        req.user!.role,
        'AI_GENERATE_DRAFT_QUESTIONS',
        `subject:${subject.id}`,
        `Generated ${savedQuestions.length} DRAFT (${b.format}) questions for ${b.examFramework}. Source gap: ${result.sourceGapFlagged}`
      );

      res.json({
        ok: true,
        savedIds: savedQuestions.map((q) => q.id),
        questions: savedQuestions,
        curriculumSummary: result.curriculumSummary,
        sourceReferences: result.sourceReferences,
        sourceGapFlagged: result.sourceGapFlagged,
        proposedTopics: result.proposedTopics,
      });
    } catch (err: any) {
      console.error('AI question generation error:', err);
      res.status(502).json({ error: err?.message || 'Curriculum AI generation failed.' });
    }
  });

  // Academic Admin: Examinations, Scheduling, 60-Day Monitoring & Grading
  router.get('/admin/exams-and-grading', requireAdmin(['academic_admin']), (_req, res) => {
    const exams = db.prepare(`
      SELECT e.*, s.name as subject_name,
        (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id) as question_count
      FROM examinations e JOIN subjects s ON s.id = e.subject_id
      ORDER BY e.id DESC
    `).all();

    const schedules = db.prepare(`
      SELECT es.*, e.title as exam_title, p.title as programme_title
      FROM exam_schedules es
      JOIN examinations e ON e.id = es.exam_id
      LEFT JOIN programmes p ON p.id = es.programme_id
      ORDER BY es.scheduled_start DESC
    `).all();

    const attempts = db.prepare(`
      SELECT a.*, u.full_name as student_name, u.email as student_email, u.department, e.title as exam_title, e.pass_mark, e.is_60day_final, e.programme_id
      FROM exam_attempts a
      JOIN users u ON u.id = a.user_id
      JOIN examinations e ON e.id = a.exam_id
      WHERE a.status IN ('submitted', 'graded')
      ORDER BY CASE WHEN a.status = 'submitted' THEN 0 ELSE 1 END, a.submitted_at DESC
    `).all();

    const enrolments = db.prepare(`
      SELECT pe.*, u.full_name as student_name, u.email as student_email, u.department, p.title as programme_title, p.min_days, p.required_lessons, p.required_practice_exams
      FROM programme_enrolments pe
      JOIN users u ON u.id = pe.user_id
      JOIN programmes p ON p.id = pe.programme_id
      ORDER BY pe.enrolled_at ASC
    `).all().map((row: any) => {
      const elapsedDays = Math.floor((Date.now() - new Date(row.enrolled_at).getTime()) / (1000 * 60 * 60 * 24));
      const lessonsCount = safeParseJson<number[]>(row.lessons_completed_json, []).length;
      return {
        ...row,
        elapsed_days: elapsedDays,
        lessons_count: lessonsCount,
        is_eligible: elapsedDays >= row.min_days && lessonsCount >= row.required_lessons && row.practice_exams_completed >= row.required_practice_exams,
      };
    });

    const certificates = db.prepare('SELECT * FROM certificates ORDER BY issued_at DESC').all();
    const programmes = db.prepare('SELECT p.*, s.name as subject_name FROM programmes p JOIN subjects s ON s.id = p.subject_id').all();

    res.json({ exams, schedules, attempts, enrolments, certificates, programmes });
  });

  router.post('/admin/examinations', requireAdmin(['academic_admin']), (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.subject_id || !Array.isArray(b.question_ids) || b.question_ids.length === 0) {
      return res.status(400).json({ error: 'Title, subject, and at least one published question are required.' });
    }
    const qIds: number[] = b.question_ids.map(Number);
    const totalMarks = qIds.reduce((sum, qid) => {
      const q = db.prepare("SELECT marks FROM questions WHERE id = ? AND approval_status IN ('published', 'approved')").get(qid) as any;
      return sum + (q ? Number(q.marks) : 0);
    }, 0);

    if (totalMarks === 0) {
      return res.status(400).json({ error: 'Selected questions must be approved and published before adding to an examination.' });
    }

    const result = db.prepare(`
      INSERT INTO examinations (title, instructions, subject_id, category, exam_framework, duration_minutes, total_marks, pass_mark, max_attempts, randomize_questions, randomize_options, release_answers, is_published, is_60day_final, programme_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      String(b.title).trim(),
      String(b.instructions || ''),
      Number(b.subject_id),
      String(b.category || 'Practice Test'),
      String(b.exam_framework || 'General Practice'),
      Number(b.duration_minutes || 30),
      totalMarks,
      Number(b.pass_mark || 60),
      Number(b.max_attempts || 3),
      b.randomize_questions ? 1 : 0,
      b.randomize_options ? 1 : 0,
      b.release_answers !== false ? 1 : 0,
      b.is_60day_final ? 1 : 0,
      b.programme_id ? Number(b.programme_id) : null
    );

    const examId = Number(result.lastInsertRowid);
    const link = db.prepare('INSERT INTO exam_questions (exam_id, question_id, sort_order) VALUES (?, ?, ?)');
    qIds.forEach((qid, idx) => link.run(examId, qid, idx + 1));

    logAudit(req.user!.id, req.user!.role, 'CREATE_EXAMINATION', `exam:${examId}`, b.title);
    res.status(201).json({ ok: true, id: examId });
  });

  router.post('/admin/schedules', requireAdmin(['academic_admin']), (req, res) => {
    const { exam_id, programme_id, title, scheduled_start, scheduled_end, timezone, instructions } = req.body || {};
    if (!exam_id || !title || !scheduled_start || !scheduled_end) {
      return res.status(400).json({ error: 'Examination, title, start, and end timestamps are required.' });
    }
    const result = db.prepare(`
      INSERT INTO exam_schedules (exam_id, programme_id, title, scheduled_start, scheduled_end, timezone, instructions, announced_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(exam_id),
      programme_id ? Number(programme_id) : null,
      String(title).trim(),
      String(scheduled_start),
      String(scheduled_end),
      String(timezone || 'UTC'),
      String(instructions || ''),
      req.user!.id
    );

    const students = db.prepare("SELECT id FROM users WHERE role = 'student' AND status = 'active'").all() as any[];
    const insertNotif = db.prepare("INSERT INTO notifications (user_id, title, body, category, link) VALUES (?, ?, ?, 'schedule', '/student/exams')");
    for (const st of students) {
      insertNotif.run(st.id, `Scheduled Exam: ${title}`, `Window: ${scheduled_start} – ${scheduled_end} (${timezone || 'UTC'}). Check your eligibility in the Examination Centre.`);
    }

    logAudit(req.user!.id, req.user!.role, 'SCHEDULE_EXAM', `schedule:${result.lastInsertRowid}`, title);
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  });

  router.post('/admin/attempts/:id/ai-rubric', requireAdmin(['academic_admin']), async (req, res) => {
    if (!getAiConfigStatus().configured) {
      return res.status(503).json({ error: getAiConfigStatus().message });
    }
    const attemptId = Number(req.params.id);
    const attempt = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as any;
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    const qIds = safeParseJson<number[]>(attempt.question_order_json, []);
    const answers = safeParseJson<Record<string, string>>(attempt.answers_json, {});
    const suggestions: any[] = [];

    try {
      for (const qid of qIds) {
        const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid) as any;
        if (q && q.format !== 'mcq' && q.format !== 'true_false') {
          const suggestion = await suggestSubjectiveGrading({
            questionText: q.question_text,
            modelAnswer: q.correct_answer,
            markingScheme: q.marking_scheme,
            studentAnswer: answers[qid] || '(No response)',
            maxMarks: q.marks,
          });
          suggestions.push({ questionId: q.id, questionText: q.question_text, maxMarks: q.marks, ...suggestion });
        }
      }
      res.json({ suggestions });
    } catch (err: any) {
      res.status(502).json({ error: err?.message || 'AI rubric suggestion failed.' });
    }
  });

  router.post('/admin/attempts/:id/grade', requireAdmin(['academic_admin']), (req, res) => {
    const attemptId = Number(req.params.id);
    const { manual_score, feedback, reason, issue_certificate } = req.body || {};
    const attempt = db.prepare(`
      SELECT a.*, e.pass_mark, e.title as exam_title, e.is_60day_final, e.programme_id
      FROM exam_attempts a JOIN examinations e ON e.id = a.exam_id
      WHERE a.id = ?
    `).get(attemptId) as any;
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    const prevTotal = attempt.total_score;
    const manual = Math.max(0, Number(manual_score ?? attempt.manual_score));
    const total = Math.min(attempt.max_score, attempt.auto_score + manual);
    const pct = attempt.max_score > 0 ? Math.round((total / attempt.max_score) * 1000) / 10 : 0;
    const grade = computeGrade(pct);
    const passed = pct >= attempt.pass_mark ? 1 : 0;
    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE exam_attempts
      SET manual_score = ?, total_score = ?, percentage = ?, grade = ?, passed = ?, feedback = ?, status = 'graded', graded_by = ?, graded_at = ?
      WHERE id = ?
    `).run(manual, total, pct, grade, passed, String(feedback || ''), req.user!.id, nowIso, attemptId);

    db.prepare('INSERT INTO grade_audit_log (attempt_id, editor_id, previous_score, new_score, reason) VALUES (?, ?, ?, ?, ?)').run(
      attemptId, req.user!.id, prevTotal, total, String(reason || 'Academic administrator grading review')
    );

    let certIssued: string | null = null;
    if (issue_certificate && passed && attempt.programme_id) {
      const student = db.prepare('SELECT full_name FROM users WHERE id = ?').get(attempt.user_id) as any;
      const prog = db.prepare('SELECT * FROM programmes WHERE id = ?').get(attempt.programme_id) as any;
      const enr = db.prepare('SELECT * FROM programme_enrolments WHERE programme_id = ? AND user_id = ?').get(attempt.programme_id, attempt.user_id) as any;

      if (student && prog && enr) {
        const elapsedDays = Math.floor((Date.now() - new Date(enr.enrolled_at).getTime()) / (1000 * 60 * 60 * 24));
        if (elapsedDays >= prog.min_days) {
          const serial = `EDX-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
          db.prepare(`
            INSERT INTO certificates (cert_number, user_id, programme_id, exam_attempt_id, student_display_name, programme_title, grade, score_percentage, issued_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EDUNEXA Academic Assessment Board', 'valid')
          `).run(serial, attempt.user_id, prog.id, attemptId, student.full_name, prog.title, grade, pct);
          certIssued = serial;

          db.prepare("INSERT INTO notifications (user_id, title, body, category, link) VALUES (?, ?, ?, 'certificate', '/student/certificates')").run(
            attempt.user_id,
            `Certificate Issued: ${serial}`,
            `Congratulations! Your verified certificate for "${prog.title}" has been issued.`
          );
        }
      }
    }

    db.prepare("INSERT INTO notifications (user_id, title, body, category, link) VALUES (?, ?, ?, 'result', ?)").run(
      attempt.user_id,
      `Grade Published: ${attempt.exam_title}`,
      `Final verified score: ${total}/${attempt.max_score} (${pct}% · Grade ${grade}).`,
      `/student/results/${attemptId}`
    );

    logAudit(req.user!.id, req.user!.role, 'GRADE_ATTEMPT', `attempt:${attemptId}`, `total=${total}/${attempt.max_score}${certIssued ? ` issued=${certIssued}` : ''}`);
    res.json({ ok: true, total, pct, grade, passed, certIssued });
  });

  router.patch('/admin/certificates/:id/status', requireAdmin(['academic_admin']), (req, res) => {
    const id = Number(req.params.id);
    const { status, revocation_reason } = req.body || {};
    if (!['valid', 'revoked'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    db.prepare('UPDATE certificates SET status = ?, revocation_reason = ? WHERE id = ?').run(status, String(revocation_reason || ''), id);
    logAudit(req.user!.id, req.user!.role, 'CERTIFICATE_STATUS', `cert:${id}`, `status=${status}`);
    res.json({ ok: true });
  });

  router.post('/admin/programmes', requireAdmin(['academic_admin']), (req, res) => {
    const { title, subject_id, department, description, min_days, required_lessons, required_practice_exams, pass_mark } = req.body || {};
    if (!title || !subject_id || !description) {
      return res.status(400).json({ error: 'Programme title, subject, and description are required.' });
    }
    const r = db.prepare(`
      INSERT INTO programmes (title, subject_id, department, description, min_days, required_lessons, required_practice_exams, pass_mark, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      String(title).trim(),
      Number(subject_id),
      String(department || 'Common / All Students'),
      String(description).trim(),
      Number(min_days || 60),
      Number(required_lessons || 2),
      Number(required_practice_exams || 1),
      Number(pass_mark || 70)
    );
    logAudit(req.user!.id, req.user!.role, 'CREATE_PROGRAMME', `programme:${r.lastInsertRowid}`, String(title).trim());
    res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
  });

  // Learning Materials (YouTube Videos + Written Study Guides / Uploaded Documents)
  router.get('/admin/videos', requireAdmin(['academic_admin', 'content_admin']), (_req, res) => {
    const videos = db.prepare(`
      SELECT v.*, s.name as subject_name
      FROM videos v JOIN subjects s ON s.id = v.subject_id
      ORDER BY v.id DESC
    `).all();
    res.json({ videos });
  });

  router.post('/admin/videos', requireAdmin(['academic_admin', 'content_admin']), (req, res) => {
    const { title, description, youtube_url, subject_id, topic, programme_id } = req.body || {};
    if (!title || !youtube_url || !subject_id) {
      return res.status(400).json({ error: 'Title, YouTube URL, and subject are required.' });
    }
    const match = String(youtube_url).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    const youtubeId = match ? match[1] : '';
    if (!youtubeId) {
      return res.status(400).json({ error: 'Please provide a valid YouTube video URL.' });
    }
    const result = db.prepare(`
      INSERT INTO videos (title, description, youtube_url, youtube_id, subject_id, topic, programme_id, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(title).trim(),
      String(description || ''),
      String(youtube_url).trim(),
      youtubeId,
      Number(subject_id),
      String(topic || ''),
      programme_id ? Number(programme_id) : null,
      `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    );
    logAudit(req.user!.id, req.user!.role, 'ADD_VIDEO', `video:${result.lastInsertRowid}`, title);
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  });

  router.patch('/admin/videos/:id', requireAdmin(['academic_admin', 'content_admin']), (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Lesson not found.' });
    const { title, description, topic, is_published } = req.body || {};
    db.prepare('UPDATE videos SET title = ?, description = ?, topic = ?, is_published = ? WHERE id = ?').run(
      title ?? existing.title,
      description ?? existing.description,
      topic ?? existing.topic,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      id
    );
    res.json({ ok: true });
  });

  router.delete('/admin/videos/:id', requireAdmin(['academic_admin', 'content_admin']), (req, res) => {
    db.prepare('DELETE FROM videos WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  router.get('/admin/materials', requireAdmin(['academic_admin', 'content_admin']), (_req, res) => {
    const materials = db.prepare(`
      SELECT m.*, s.name as subject_name
      FROM learning_materials m
      JOIN subjects s ON s.id = m.subject_id
      ORDER BY m.id DESC
    `).all();
    res.json({ materials });
  });

  router.post('/admin/materials', requireAdmin(['academic_admin', 'content_admin']), materialUpload.single('document'), (req, res) => {
    const { title, subject_id, topic_name, material_type, summary, content_body, programme_id, is_published } = req.body || {};
    if (!title || !subject_id || (!content_body && !req.file)) {
      return res.status(400).json({ error: 'Title, subject, and study content or an uploaded document are required.' });
    }
    const docUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const docName = req.file ? req.file.originalname : '';
    const publishedFlag = is_published === 'false' || is_published === false || is_published === '0' ? 0 : 1;

    const r = db.prepare(`
      INSERT INTO learning_materials (title, subject_id, topic_name, material_type, summary, content_body, document_url, document_name, programme_id, is_published, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(title).trim(),
      Number(subject_id),
      String(topic_name || 'Core Topic'),
      String(material_type || 'Study Guide'),
      String(summary || ''),
      String(content_body || ''),
      docUrl,
      docName,
      programme_id ? Number(programme_id) : null,
      publishedFlag,
      req.user!.id
    );
    logAudit(req.user!.id, req.user!.role, 'CREATE_LEARNING_MATERIAL', `material:${r.lastInsertRowid}`, String(title).trim());
    res.status(201).json({ ok: true, id: Number(r.lastInsertRowid), document_url: docUrl });
  });

  router.patch('/admin/materials/:id', requireAdmin(['academic_admin', 'content_admin']), (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM learning_materials WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Learning material not found.' });
    const { title, topic_name, material_type, summary, content_body, is_published } = req.body || {};
    db.prepare(`
      UPDATE learning_materials
      SET title = ?, topic_name = ?, material_type = ?, summary = ?, content_body = ?, is_published = ?
      WHERE id = ?
    `).run(
      title ?? existing.title,
      topic_name ?? existing.topic_name,
      material_type ?? existing.material_type,
      summary ?? existing.summary,
      content_body ?? existing.content_body,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      id
    );
    res.json({ ok: true });
  });

  router.delete('/admin/materials/:id', requireAdmin(['academic_admin', 'content_admin']), (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM learning_materials WHERE id = ?').get(id) as any;
    if (existing?.document_url?.startsWith('/uploads/')) {
      const fp = path.join(uploadsDir, path.basename(existing.document_url));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    db.prepare('DELETE FROM learning_materials WHERE id = ?').run(id);
    logAudit(req.user!.id, req.user!.role, 'DELETE_LEARNING_MATERIAL', `material:${id}`, existing?.title || '');
    res.json({ ok: true });
  });

  // Announcements
  router.get('/admin/announcements', requireAdmin(['content_admin', 'academic_admin', 'super_admin']), (_req, res) => {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json({ announcements });
  });

  router.post('/admin/announcements', requireAdmin(['content_admin', 'academic_admin', 'super_admin']), (req, res) => {
    const { title, body, banner_text, audience, is_banner } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'Title and announcement body are required.' });
    const r = db.prepare(`
      INSERT INTO announcements (title, body, banner_text, audience, is_banner, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(String(title).trim(), String(body).trim(), String(banner_text || title).trim(), String(audience || 'all'), is_banner ? 1 : 0, req.user!.id);
    logAudit(req.user!.id, req.user!.role, 'CREATE_ANNOUNCEMENT', `announcement:${r.lastInsertRowid}`, title);
    res.status(201).json({ ok: true, id: r.lastInsertRowid });
  });

  router.patch('/admin/announcements/:id', requireAdmin(['content_admin', 'academic_admin', 'super_admin']), (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Announcement not found.' });
    const { is_active, is_banner, title, body, banner_text } = req.body || {};
    db.prepare('UPDATE announcements SET title = ?, body = ?, banner_text = ?, is_banner = ?, is_active = ? WHERE id = ?').run(
      title ?? existing.title,
      body ?? existing.body,
      banner_text ?? existing.banner_text,
      is_banner !== undefined ? (is_banner ? 1 : 0) : existing.is_banner,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      id
    );
    res.json({ ok: true });
  });

  router.delete('/admin/announcements/:id', requireAdmin(['content_admin', 'academic_admin', 'super_admin']), (req, res) => {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  // Community Moderator & Testimonials Management
  router.get('/admin/moderation', requireAdmin(['community_moderator', 'content_admin']), (_req, res) => {
    const reports = db.prepare(`
      SELECT r.*, u.username as reporter_username
      FROM moderation_reports r LEFT JOIN users u ON u.id = r.reporter_id
      ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC
    `).all();
    const posts = db.prepare(`
      SELECT p.*, u.username, g.name as group_name
      FROM community_posts p JOIN users u ON u.id = p.user_id JOIN community_groups g ON g.id = p.group_id
      ORDER BY p.created_at DESC LIMIT 50
    `).all();
    const testimonials = db.prepare('SELECT * FROM testimonials ORDER BY CASE WHEN status = \'pending\' THEN 0 ELSE 1 END, created_at DESC').all();
    res.json({ reports, posts, testimonials });
  });

  router.patch('/admin/moderation/reports/:id', requireAdmin(['community_moderator']), (req, res) => {
    const id = Number(req.params.id);
    const { status, action_taken, remove_target } = req.body || {};
    const report = db.prepare('SELECT * FROM moderation_reports WHERE id = ?').get(id) as any;
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    db.prepare('UPDATE moderation_reports SET status = ?, action_taken = ?, resolved_by = ? WHERE id = ?').run(
      status || 'resolved', String(action_taken || 'Reviewed'), req.user!.id, id
    );
    if (remove_target && report.target_type === 'post') {
      db.prepare("UPDATE community_posts SET status = 'removed' WHERE id = ?").run(report.target_id);
    }
    logAudit(req.user!.id, req.user!.role, 'RESOLVE_REPORT', `report:${id}`, `remove=${Boolean(remove_target)}`);
    res.json({ ok: true });
  });

  router.patch('/admin/moderation/posts/:id', requireAdmin(['community_moderator']), (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!['published', 'removed'].includes(status)) return res.status(400).json({ error: 'Invalid post status.' });
    db.prepare('UPDATE community_posts SET status = ? WHERE id = ?').run(status, id);
    logAudit(req.user!.id, req.user!.role, 'MODERATE_POST', `post:${id}`, `status=${status}`);
    res.json({ ok: true });
  });

  router.patch('/admin/testimonials/:id', requireAdmin(['community_moderator', 'content_admin']), (req, res) => {
    const id = Number(req.params.id);
    const { status, is_featured, quote, display_name, programme_title, achievement } = req.body || {};
    const existing = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Testimonial not found.' });
    db.prepare('UPDATE testimonials SET status = ?, is_featured = ?, quote = ?, display_name = ?, programme_title = ?, achievement = ? WHERE id = ?').run(
      status ?? existing.status,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      quote ?? existing.quote,
      display_name ?? existing.display_name,
      programme_title ?? existing.programme_title,
      achievement ?? existing.achievement,
      id
    );
    logAudit(req.user!.id, req.user!.role, 'MODERATE_TESTIMONIAL', `testimonial:${id}`, `status=${status ?? existing.status}`);
    res.json({ ok: true });
  });

  router.delete('/admin/testimonials/:id', requireAdmin(['community_moderator', 'content_admin']), (req, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
    logAudit(req.user!.id, req.user!.role, 'DELETE_TESTIMONIAL', `testimonial:${id}`, 'Removed testimonial');
    res.json({ ok: true });
  });

  // ==========================================
  // WEBSITE CUSTOMISATION, MEDIA MANAGER & CMS
  // ==========================================
  router.get('/admin/cms', requireAdmin(['content_admin', 'super_admin']), (_req, res) => {
    const assets = db.prepare('SELECT * FROM media_assets ORDER BY id DESC').all();
    const { list: slots } = getResolvedMediaSlots(false);
    const blocks = db.prepare('SELECT * FROM cms_blocks').all().map((b: any) => ({
      ...b,
      content: safeParseJson(b.content_json, {}),
      draft_content: safeParseJson(b.draft_content_json || b.content_json, {}),
    }));
    const appearanceRow = db.prepare("SELECT active_value_json, draft_value_json FROM website_settings WHERE setting_key = 'site_appearance'").get() as any;
    const appearance = {
      active: safeParseJson(appearanceRow?.active_value_json, {}),
      draft: safeParseJson(appearanceRow?.draft_value_json || appearanceRow?.active_value_json, {}),
    };
    const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC').all();
    const enquiries = db.prepare('SELECT * FROM contact_enquiries ORDER BY created_at DESC').all();

    res.json({ assets, slots, blocks, appearance, faqs, enquiries });
  });

  router.post('/admin/cms/save-draft', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const { hero, about, contact, appearance } = req.body || {};
    if (hero) {
      db.prepare("UPDATE cms_blocks SET draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = 'hero'").run(JSON.stringify(hero), req.user!.id);
    }
    if (about) {
      db.prepare("UPDATE cms_blocks SET draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = 'about'").run(JSON.stringify(about), req.user!.id);
    }
    if (contact) {
      db.prepare("UPDATE cms_blocks SET draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = 'contact'").run(JSON.stringify(contact), req.user!.id);
    }
    if (appearance) {
      db.prepare("UPDATE website_settings SET draft_value_json = ?, updated_by = ?, updated_at = datetime('now') WHERE setting_key = 'site_appearance'").run(JSON.stringify(appearance), req.user!.id);
    }
    logAudit(req.user!.id, req.user!.role, 'SAVE_WEBSITE_DRAFT', 'cms', 'Saved website customisation draft');
    res.json({ ok: true });
  });

  router.post('/admin/cms/publish', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const { hero, about, contact, appearance } = req.body || {};
    if (hero) {
      const json = JSON.stringify(hero);
      db.prepare("UPDATE cms_blocks SET content_json = ?, draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = 'hero'").run(json, json, req.user!.id);
    }
    if (about) {
      const json = JSON.stringify(about);
      db.prepare("UPDATE cms_blocks SET content_json = ?, draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = 'about'").run(json, json, req.user!.id);
    }
    if (contact) {
      const json = JSON.stringify(contact);
      db.prepare("UPDATE cms_blocks SET content_json = ?, draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = 'contact'").run(json, json, req.user!.id);
    }
    if (appearance) {
      const json = JSON.stringify(appearance);
      db.prepare("UPDATE website_settings SET active_value_json = ?, draft_value_json = ?, updated_by = ?, updated_at = datetime('now') WHERE setting_key = 'site_appearance'").run(json, json, req.user!.id);
    }
    logAudit(req.user!.id, req.user!.role, 'PUBLISH_WEBSITE_CUSTOMISATION', 'cms', 'Published website customisation changes live');
    res.json({ ok: true });
  });

  router.post('/admin/media/upload', requireAdmin(['content_admin', 'super_admin']), upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a valid JPG, JPEG, PNG, or WEBP file (max 5 MB).' });
    }
    const { title, description, alt_text, category, assign_draft_slot } = req.body || {};
    const url = `/uploads/${req.file.filename}`;
    const result = db.prepare(`
      INSERT INTO media_assets (filename, original_name, mime_type, file_size, category, title, description, alt_text, url, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      String(category || 'Website'),
      String(title || req.file.originalname),
      String(description || ''),
      String(alt_text || title || req.file.originalname),
      url,
      req.user!.id
    );

    const assetId = Number(result.lastInsertRowid);
    if (assign_draft_slot) {
      db.prepare("UPDATE media_slots SET draft_asset_id = ?, updated_at = datetime('now') WHERE slot_key = ?").run(assetId, String(assign_draft_slot));
    }

    logAudit(req.user!.id, req.user!.role, 'UPLOAD_MEDIA', `asset:${assetId}`, req.file.originalname);
    res.status(201).json({ ok: true, id: assetId, url });
  });

  router.patch('/admin/media/:id', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const id = Number(req.params.id);
    const { title, description, alt_text, category } = req.body || {};
    const existing = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Media asset not found.' });
    db.prepare('UPDATE media_assets SET title = ?, description = ?, alt_text = ?, category = ? WHERE id = ?').run(
      title ?? existing.title,
      description ?? existing.description,
      alt_text ?? existing.alt_text,
      category ?? existing.category,
      id
    );
    res.json({ ok: true });
  });

  router.delete('/admin/media/:id', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Media asset not found.' });
    const inUse = db.prepare('SELECT slot_key FROM media_slots WHERE active_asset_id = ?').get(id) as any;
    if (inUse) {
      return res.status(400).json({ error: `Asset is currently published in slot "${inUse.slot_key}". Assign a replacement before deleting.` });
    }
    if (existing.url.startsWith('/uploads/')) {
      const fp = path.join(uploadsDir, existing.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    db.prepare('DELETE FROM media_assets WHERE id = ?').run(id);
    logAudit(req.user!.id, req.user!.role, 'DELETE_MEDIA', `asset:${id}`, existing.title);
    res.json({ ok: true });
  });

  router.patch('/admin/media-slots/:slotKey', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const slotKey = String(req.params.slotKey);
    const { draft_asset_id } = req.body || {};
    db.prepare("UPDATE media_slots SET draft_asset_id = ?, updated_at = datetime('now') WHERE slot_key = ?").run(
      draft_asset_id === null ? null : Number(draft_asset_id),
      slotKey
    );
    logAudit(req.user!.id, req.user!.role, 'SAVE_MEDIA_SLOT_DRAFT', `slot:${slotKey}`, `draft_asset_id=${draft_asset_id}`);
    res.json({ ok: true });
  });

  router.post('/admin/media-slots/:slotKey/publish', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const slotKey = String(req.params.slotKey);
    const slot = db.prepare('SELECT * FROM media_slots WHERE slot_key = ?').get(slotKey) as any;
    if (!slot) return res.status(404).json({ error: 'Media slot not found.' });

    db.prepare(`
      UPDATE media_slots
      SET previous_asset_id = active_asset_id, active_asset_id = draft_asset_id, updated_at = datetime('now')
      WHERE slot_key = ?
    `).run(slotKey);
    logAudit(req.user!.id, req.user!.role, 'PUBLISH_MEDIA_SLOT', `slot:${slotKey}`, `Published asset ${slot.draft_asset_id}`);
    res.json({ ok: true });
  });

  router.post('/admin/media-slots/:slotKey/rollback', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const slotKey = String(req.params.slotKey);
    const slot = db.prepare('SELECT * FROM media_slots WHERE slot_key = ?').get(slotKey) as any;
    if (!slot || !slot.previous_asset_id) return res.status(400).json({ error: 'No previous published image is available for rollback.' });

    db.prepare(`
      UPDATE media_slots
      SET active_asset_id = previous_asset_id, draft_asset_id = previous_asset_id, previous_asset_id = active_asset_id, updated_at = datetime('now')
      WHERE slot_key = ?
    `).run(slotKey);
    logAudit(req.user!.id, req.user!.role, 'ROLLBACK_MEDIA_SLOT', `slot:${slotKey}`, `Rolled back to asset ${slot.previous_asset_id}`);
    res.json({ ok: true });
  });

  router.put('/admin/cms-blocks/:blockKey', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const blockKey = String(req.params.blockKey);
    const { content } = req.body || {};
    if (!content || typeof content !== 'object') return res.status(400).json({ error: 'Content object required.' });
    const json = JSON.stringify(content);
    db.prepare("UPDATE cms_blocks SET content_json = ?, draft_content_json = ?, updated_by = ?, updated_at = datetime('now') WHERE block_key = ?").run(
      json, json, req.user!.id, blockKey
    );
    logAudit(req.user!.id, req.user!.role, 'UPDATE_CMS_BLOCK', `block:${blockKey}`, 'Published text update');
    res.json({ ok: true });
  });

  router.post('/admin/faqs', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    const { question, answer, category } = req.body || {};
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required.' });
    const r = db.prepare('INSERT INTO faqs (question, answer, category) VALUES (?, ?, ?)').run(String(question), String(answer), String(category || 'General'));
    res.status(201).json({ ok: true, id: r.lastInsertRowid });
  });

  router.delete('/admin/faqs/:id', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    db.prepare('DELETE FROM faqs WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  router.patch('/admin/enquiries/:id', requireAdmin(['content_admin', 'super_admin']), (req, res) => {
    db.prepare('UPDATE contact_enquiries SET status = ? WHERE id = ?').run(String(req.body?.status || 'resolved'), Number(req.params.id));
    res.json({ ok: true });
  });

  return router;
}
