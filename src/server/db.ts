import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const db = new Database(path.join(dataDir, 'edunexa.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      department TEXT NOT NULL DEFAULT 'Science',
      country TEXT NOT NULL DEFAULT 'United Kingdom',
      date_of_birth TEXT,
      is_minor INTEGER NOT NULL DEFAULT 0,
      bio TEXT DEFAULT '',
      academic_interests TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      profile_visibility TEXT NOT NULL DEFAULT 'community',
      public_display_name TEXT DEFAULT '',
      leaderboard_consent INTEGER NOT NULL DEFAULT 1,
      leaderboard_hidden INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      notification_prefs_json TEXT NOT NULL DEFAULT '{"emailExams":true,"emailResults":true,"inAppCommunity":true}',
      dashboard_prefs_json TEXT NOT NULL DEFAULT '{"theme":"light","accent":"#008F9F","density":"spacious","textSize":"normal","highContrast":false,"reducedMotion":false,"widgets":["overview","programmes","exams","results","certificates"]}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      group_name TEXT NOT NULL,
      access_classification TEXT NOT NULL DEFAULT 'Common / All Students',
      eligible_departments_json TEXT NOT NULL DEFAULT '["Science","Arts and Humanities","Commercial"]',
      description TEXT NOT NULL DEFAULT '',
      image_slot_key TEXT DEFAULT 'subject_default',
      is_published INTEGER NOT NULL DEFAULT 1,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      curriculum TEXT NOT NULL DEFAULT 'International Standard',
      country TEXT NOT NULL DEFAULT 'International',
      academic_level TEXT NOT NULL DEFAULT 'Senior Secondary',
      syllabus_ref TEXT DEFAULT '',
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      topic_name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'International',
      curriculum TEXT NOT NULL DEFAULT 'International Standard',
      exam_framework TEXT NOT NULL DEFAULT 'General Practice',
      academic_level TEXT NOT NULL DEFAULT 'Intermediate',
      difficulty TEXT NOT NULL DEFAULT 'Intermediate',
      format TEXT NOT NULL DEFAULT 'mcq',
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT '',
      marking_scheme TEXT DEFAULT '',
      marks INTEGER NOT NULL DEFAULT 1,
      learning_objective TEXT DEFAULT '',
      scope_type TEXT NOT NULL DEFAULT 'international',
      source_references_json TEXT NOT NULL DEFAULT '[]',
      source_gap_flagged INTEGER NOT NULL DEFAULT 0,
      ai_generated INTEGER NOT NULL DEFAULT 0,
      ai_model TEXT DEFAULT '',
      approval_status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      reviewed_by INTEGER,
      created_by INTEGER,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS programmes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      department TEXT NOT NULL DEFAULT 'Common / All Students',
      description TEXT NOT NULL,
      min_days INTEGER NOT NULL DEFAULT 60,
      required_lessons INTEGER NOT NULL DEFAULT 4,
      required_practice_exams INTEGER NOT NULL DEFAULT 1,
      pass_mark INTEGER NOT NULL DEFAULT 70,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS programme_enrolments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programme_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      lessons_completed_json TEXT NOT NULL DEFAULT '[]',
      practice_exams_completed INTEGER NOT NULL DEFAULT 0,
      assignments_completed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      UNIQUE(programme_id, user_id),
      FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS examinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      subject_id INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'Practice Test',
      exam_framework TEXT NOT NULL DEFAULT 'General Practice',
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      total_marks INTEGER NOT NULL DEFAULT 10,
      pass_mark INTEGER NOT NULL DEFAULT 60,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      randomize_questions INTEGER NOT NULL DEFAULT 1,
      randomize_options INTEGER NOT NULL DEFAULT 0,
      release_answers INTEGER NOT NULL DEFAULT 1,
      eligibility_rule TEXT NOT NULL DEFAULT 'subject_department',
      availability_start TEXT,
      availability_end TEXT,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      is_published INTEGER NOT NULL DEFAULT 1,
      is_60day_final INTEGER NOT NULL DEFAULT 0,
      programme_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      exam_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (exam_id, question_id),
      FOREIGN KEY (exam_id) REFERENCES examinations(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      question_order_json TEXT NOT NULL DEFAULT '[]',
      answers_json TEXT NOT NULL DEFAULT '{}',
      flagged_json TEXT NOT NULL DEFAULT '[]',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      submitted_at TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      auto_score INTEGER NOT NULL DEFAULT 0,
      manual_score INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      max_score INTEGER NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      grade TEXT DEFAULT '',
      passed INTEGER NOT NULL DEFAULT 0,
      feedback TEXT DEFAULT '',
      graded_by INTEGER,
      graded_at TEXT,
      FOREIGN KEY (exam_id) REFERENCES examinations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS grade_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      editor_id INTEGER NOT NULL,
      previous_score INTEGER NOT NULL,
      new_score INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      programme_id INTEGER,
      title TEXT NOT NULL,
      scheduled_start TEXT NOT NULL,
      scheduled_end TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      instructions TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled',
      announced_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES examinations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cert_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      programme_id INTEGER NOT NULL,
      exam_attempt_id INTEGER,
      student_display_name TEXT NOT NULL,
      programme_title TEXT NOT NULL,
      grade TEXT NOT NULL,
      score_percentage REAL NOT NULL,
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      issued_by TEXT NOT NULL DEFAULT 'EDUNEXA Academic Board',
      status TEXT NOT NULL DEFAULT 'valid',
      revocation_reason TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      youtube_url TEXT NOT NULL,
      youtube_id TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      programme_id INTEGER,
      thumbnail_url TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_progress (
      user_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      saved_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, video_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      topic_name TEXT NOT NULL DEFAULT '',
      material_type TEXT NOT NULL DEFAULT 'Reading Guide',
      summary TEXT NOT NULL DEFAULT '',
      content_body TEXT NOT NULL DEFAULT '',
      document_url TEXT DEFAULT '',
      document_name TEXT DEFAULT '',
      programme_id INTEGER,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_progress (
      user_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      saved_favorite INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, material_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES learning_materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Subject'
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      attachment_url TEXT DEFAULT '',
      attachment_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES community_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS moderation_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reporter_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      action_taken TEXT DEFAULT '',
      resolved_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      display_name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT '',
      avatar_url TEXT DEFAULT '',
      programme_title TEXT NOT NULL DEFAULT '',
      achievement TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL,
      certificate_number TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      is_featured INTEGER NOT NULL DEFAULT 0,
      consent_confirmed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'system',
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      width INTEGER DEFAULT 1200,
      height INTEGER DEFAULT 800,
      category TEXT NOT NULL DEFAULT 'Website',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      alt_text TEXT NOT NULL,
      url TEXT NOT NULL,
      uploaded_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_slots (
      slot_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      page_section TEXT NOT NULL,
      active_asset_id INTEGER,
      draft_asset_id INTEGER,
      previous_asset_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (active_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
      FOREIGN KEY (draft_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
      FOREIGN KEY (previous_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cms_blocks (
      block_key TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      draft_content_json TEXT,
      updated_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      setting_key TEXT PRIMARY KEY,
      active_value_json TEXT NOT NULL,
      draft_value_json TEXT,
      updated_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      banner_text TEXT DEFAULT '',
      audience TEXT NOT NULL DEFAULT 'all',
      is_banner INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_schedule_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject_id INTEGER,
      subject_name TEXT NOT NULL DEFAULT '',
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      task_title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );
  `);

  // Safe migrations on existing databases
  ensureColumn('users', 'public_display_name', "TEXT DEFAULT ''");
  ensureColumn('users', 'leaderboard_consent', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'leaderboard_hidden', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'verification_token', "TEXT DEFAULT ''");
  ensureColumn('users', 'reset_token', "TEXT DEFAULT ''");
  ensureColumn('users', 'reset_expires_at', 'TEXT');
  ensureColumn('questions', 'marking_scheme', "TEXT DEFAULT ''");
  ensureColumn('questions', 'published_at', 'TEXT');
  ensureColumn('cms_blocks', 'draft_content_json', 'TEXT');

  // Ensure legacy 'approved' seeded questions are marked 'published' so existing exams keep working
  db.prepare("UPDATE questions SET approval_status = 'published', published_at = COALESCE(published_at, created_at) WHERE approval_status = 'approved' AND ai_generated = 0").run();

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    seedDatabase();
  } else {
    ensureUpgradedDefaults();
  }
  ensureDefaultLearningMaterials();
}

function ensureDefaultLearningMaterials() {
  const matCount = (db.prepare('SELECT COUNT(*) as c FROM learning_materials').get() as { c: number }).c;
  if (matCount > 0) return;

  const subjects = db.prepare('SELECT id, code, name FROM subjects').all() as Array<{ id: number; code: string; name: string }>;
  const byCode = new Map(subjects.map((s) => [s.code, s.id]));
  const mathProg = (db.prepare('SELECT id FROM programmes WHERE subject_id = ? LIMIT 1').get(byCode.get('MTH-101') ?? 1) as any)?.id ?? null;
  const phyProg = (db.prepare('SELECT id FROM programmes WHERE subject_id = ? LIMIT 1').get(byCode.get('PHY-201') ?? 5) as any)?.id ?? null;

  const insertMat = db.prepare(`
    INSERT INTO learning_materials (title, subject_id, topic_name, material_type, summary, content_body, programme_id, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  if (byCode.has('MTH-101')) {
    insertMat.run(
      'Linear Equations, Slopes & Algebraic Proofs',
      byCode.get('MTH-101'),
      'Linear & Quadratic Equations',
      'Study Guide',
      'Core methods for isolating variables, finding linear intercepts from coordinate pairs, and structuring algebraic divisibility proofs for SAT and WAEC.',
      `1. Multi-Step Linear Equations\nExpand brackets carefully on both sides before collecting like terms. For example, in 3x - 7 = 2(x + 4), distribute 2 across (x + 4) to obtain 2x + 8, then isolate x = 15.\n\n2. Slope and y-Intercept from Two Points\nGiven f(x₁) = y₁ and f(x₂) = y₂, calculate slope m = (y₂ - y₁) / (x₂ - x₁). Substitute one point into y = mx + b to determine the y-intercept b.\n\n3. Algebraic Parity & Divisibility Proofs\nRepresent any integer as n. Even integers take the form 2n, and odd integers take the form 2n + 1. Two consecutive odd integers are 2n + 1 and 2n + 3, whose sum 4n + 4 factors cleanly as 4(n + 1).`,
      mathProg
    );
    insertMat.run(
      'Laws of Indices & Logarithms (Non-Calculator)',
      byCode.get('MTH-101'),
      'Indices & Logarithms',
      'Topic Notes',
      'Essential product, quotient, and power rules for simplifying base-10 and general logarithms without a calculator.',
      `Key Identities (Base a > 0, a ≠ 1):\n• Product Law: logₐ(MN) = logₐ(M) + logₐ(N)\n• Quotient Law: logₐ(M / N) = logₐ(M) - logₐ(N)\n• Power Law: logₐ(Mᵏ) = k · logₐ(M)\n• Base Identity: log₁₀(10ⁿ) = n\n\nWorked Example:\nSimplify log₁₀(40) + log₁₀(25) - log₁₀(10).\nCombine using product and quotient laws: log₁₀((40 × 25) / 10) = log₁₀(100) = 2.`,
      mathProg
    );
  }

  if (byCode.has('ENG-101')) {
    insertMat.run(
      'Academic Writing Cohesion & Discourse Markers',
      byCode.get('ENG-101'),
      'Academic Reading & Coherence',
      'Reading Resource',
      'How to use concessive, causal, and contrastive transitions accurately in IELTS, TOEFL, and WAEC essay writing.',
      `Effective academic prose signals logical relationships explicitly:\n• Concession / Contrast: Notwithstanding, Nevertheless, Albeit, Whereas\n• Cause & Effect: Consequently, Therefore, Accordingly\n• Illustration: Specifically, Namely, In particular\n\nExam Strategy:\nBefore selecting a transition word, test the logical direction between Sentence A and Sentence B. If Sentence B acknowledges an opposing constraint while maintaining the thesis, choose a concessive marker such as "Notwithstanding".`,
      null
    );
  }

  if (byCode.has('CSC-101')) {
    insertMat.run(
      'Algorithms, Binary Representation & Complexity Basics',
      byCode.get('CSC-101'),
      'Computational Thinking',
      'Study Guide',
      'Foundational computer science concepts: binary arithmetic, sorting logic, and step-by-step algorithm tracing open to all departments.',
      `1. Data Representation\nComputers store integers and characters in binary (base 2). Each bit doubles in place value from right to left (1, 2, 4, 8, 16, 32, 64, 128).\n\n2. Algorithm Tracing\nTrace loop invariants step by step using a variable state table before predicting final output or time complexity.`,
      null
    );
  }

  if (byCode.has('GNK-101')) {
    insertMat.run(
      'Deductive Logic & Sequence Pattern Analysis',
      byCode.get('GNK-101'),
      'Logical & Pattern Reasoning',
      'Reasoning Brief',
      'Techniques for spotting recursive sequences and applying contrapositive inference on GMAT and cognitive reasoning tests.',
      `1. Contrapositive Equivalence\nA conditional statement "If P, then Q" is logically identical to its contrapositive "If not Q, then not P". Never assume the converse ("If Q, then P").\n\n2. Second-Order Differences & Recursive Sequences\nWhen first differences grow by a constant ratio (e.g. +4, +8, +16, +32), check whether the sequence follows aₙ = 2·aₙ₋₁ + c.`,
      null
    );
  }

  if (byCode.has('PHY-201')) {
    insertMat.run(
      'Uniform Acceleration Kinematics & Parallel Circuits',
      byCode.get('PHY-201'),
      'Kinematics & Mechanics',
      'Topic Explanation',
      'Equations of uniformly accelerated motion and equivalent resistance calculations for Science stream examinations.',
      `Kinematics (Constant Acceleration a):\n• v = u + at\n• s = ut + ½at²\n• v² = u² + 2as\n\nParallel Resistor Networks:\nThe reciprocal of equivalent resistance equals the sum of branch reciprocals: 1/Req = 1/R₁ + 1/R₂ + 1/R₃. As a quick sanity check, Req is always strictly smaller than the smallest branch resistor.`,
      phyProg
    );
  }

  if (byCode.has('LIT-201')) {
    insertMat.run(
      'Dramatic Conventions & Literary Analysis',
      byCode.get('LIT-201'),
      'Literary Devices & Poetics',
      'Reading Resource',
      'Distinguishing soliloquy, aside, dramatic irony, and structural motifs in GCSE and A-Level literature.',
      `Dramatic Terms:\n• Soliloquy: A character alone on stage speaks inner reasoning aloud to the audience.\n• Aside: A brief remark directed to the audience (or one character) unheard by others present on stage.\n• Dramatic Irony: The audience possesses crucial knowledge unknown to the characters.`,
      null
    );
  }

  if (byCode.has('ACC-201')) {
    insertMat.run(
      'Accrual Matching & Core IFRS Principles',
      byCode.get('ACC-201'),
      'Double-Entry & Financial Statements',
      'Study Guide',
      'Core accounting concepts tested in WAEC Financial Accounting and international financial reporting.',
      `Matching (Accrual) Concept:\nExpenses must be recognised in the same accounting period as the revenues they helped generate, regardless of when cash is physically paid or received.\n\nPrudence Concept:\nDo not overstate assets or income, and do not understate liabilities or expenses.`,
      null
    );
  }
}

function ensureUpgradedDefaults() {
  // Ensure new media slots exist on already-seeded databases
  const assets = db.prepare('SELECT id, url FROM media_assets').all() as Array<{ id: number; url: string }>;
  const firstHero = assets.find((a) => a.url.includes('hero_edunexa'))?.id ?? assets[0]?.id ?? null;
  const examAsset = assets.find((a) => a.url.includes('feature_exam'))?.id ?? firstHero;
  const aiAsset = assets.find((a) => a.url.includes('feature_ai'))?.id ?? firstHero;
  const commAsset = assets.find((a) => a.url.includes('feature_global'))?.id ?? firstHero;

  const insertSlot = db.prepare(`
    INSERT OR IGNORE INTO media_slots (slot_key, label, page_section, active_asset_id, draft_asset_id, previous_asset_id)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);
  insertSlot.run('website_logo', 'Website Custom Logo (Optional Override)', 'Header & Footer', null, null);
  insertSlot.run('about_image', 'About Page Feature Image', 'About Page', commAsset, commAsset);
  insertSlot.run('subject_default', 'Subject Catalogue Image', 'Subjects Page', aiAsset, aiAsset);
  insertSlot.run('exam_banner', 'Examination Page Banner', 'Examinations Page', examAsset, examAsset);
  insertSlot.run('learning_centre_image', 'Learning Centre Header Visual', 'Learning Centre', aiAsset, aiAsset);

  ensureWebsiteSettingsDefaults();
}

function ensureWebsiteSettingsDefaults() {
  const defaultAppearance = {
    primaryColor: '#008F9F',
    accentCyan: '#90DFEC',
    navyColor: '#10243D',
    bannerText: 'Initial Release: Free registration, practice examinations, AI Tutor, and verifiable 60-day certificates.',
    showBanner: true,
    showStatsSection: true,
    showFrameworksSection: true,
    showSubjectsSection: true,
    showAiSection: true,
    showLeaderboardSection: true,
    showTestimonialsSection: true,
    showCommunitySection: true,
    featuredSubjectIds: [1, 2, 3, 4, 5, 8],
    examPageIntro: 'Explore timed mock examinations, cognitive reasoning assessments, and 60-day qualifying finals aligned with WAEC, NECO, JAMB, SAT, GMAT, IELTS, TOEFL, GCSE, and A-Level standards.',
  };

  db.prepare(`
    INSERT OR IGNORE INTO website_settings (setting_key, active_value_json, draft_value_json)
    VALUES ('site_appearance', ?, ?)
  `).run(JSON.stringify(defaultAppearance), JSON.stringify(defaultAppearance));

  const annCount = (db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number }).c;
  if (annCount === 0) {
    db.prepare(`
      INSERT INTO announcements (title, body, banner_text, audience, is_banner, is_active)
      VALUES (?, ?, ?, 'all', 1, 1)
    `).run(
      'Welcome to EDUNEXA',
      'Explore common and department-specific subjects, practise with our examination engine, and track your 60-day qualifying progress.',
      'Free initial access: all core subjects, practice examinations, and verifiable certificates are open to students worldwide.'
    );
  }
}

function seedDatabase() {
  const adminHash = bcrypt.hashSync('EdunexaAdmin!2026', 10);
  const academicHash = bcrypt.hashSync('EdunexaAcademic!2026', 10);
  const contentHash = bcrypt.hashSync('EdunexaContent!2026', 10);
  const modHash = bcrypt.hashSync('EdunexaMod!2026', 10);
  const studentHash = bcrypt.hashSync('StudentPass!2026', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (full_name, username, email, password_hash, role, department, country, date_of_birth, is_minor, bio, academic_interests, public_display_name, leaderboard_consent, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const superAdminId = insertUser.run('Dr. Elena Vance', 'elena_superadmin', 'admin@edunexa.org', adminHash, 'super_admin', 'General', 'United Kingdom', '1985-04-12', 0, 'Platform Director & Super Administrator at EDUNEXA.', 'Assessment Standards, Global EdTech', 'Dr. Elena Vance', 0).lastInsertRowid;
  insertUser.run('Prof. Samuel Okafor', 'samuel_academic', 'academic@edunexa.org', academicHash, 'academic_admin', 'Science', 'Nigeria', '1979-09-20', 0, 'Curriculum & Examination Board Chair.', 'WAEC, JAMB, SAT, STEM Curricula', 'Prof. Samuel Okafor', 0).lastInsertRowid;
  insertUser.run('Clara Lindqvist', 'clara_content', 'content@edunexa.org', contentHash, 'content_admin', 'General', 'Sweden', '1991-02-08', 0, 'Editorial Lead & Media Systems Manager.', 'Visual Design, Educational Publishing', 'Clara Lindqvist', 0).lastInsertRowid;
  insertUser.run('Tariq Al-Mansoor', 'tariq_moderator', 'mod@edunexa.org', modHash, 'community_moderator', 'General', 'UAE', '1988-11-15', 0, 'International Student Community Moderator.', 'Student Safety, Peer Collaboration', 'Tariq Al-Mansoor', 0).lastInsertRowid;

  const amaraId = insertUser.run('Amara Nwosu', 'amara_science', 'amara@student.edunexa.org', studentHash, 'student', 'Science', 'Nigeria', '2004-06-18', 0, 'Preparing for JAMB, WAEC, and SAT Quantitative Reasoning.', 'Mathematics, Physics, Computer Science', 'Amara Nwosu', 1).lastInsertRowid;
  const liamId = insertUser.run('Liam Gallagher-Reid', 'liam_arts', 'liam@student.edunexa.org', studentHash, 'student', 'Arts and Humanities', 'United Kingdom', '2005-03-11', 0, 'A-Level History and Literature student exploring global perspectives.', 'History, Literature, Philosophy', 'Liam Reid', 1).lastInsertRowid;
  const sofiaId = insertUser.run('Sofia Martinez', 'sofia_commercial', 'sofia@student.edunexa.org', studentHash, 'student', 'Commercial', 'Spain', '2003-12-04', 0, 'Business Studies & GMAT Quantitative preparation.', 'Economics, Accounting, Business Strategy', 'Sofia Martinez', 1).lastInsertRowid;

  const insertAsset = db.prepare(`
    INSERT INTO media_assets (filename, original_name, mime_type, file_size, width, height, category, title, description, alt_text, url, uploaded_by)
    VALUES (?, ?, 'image/jpeg', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const heroAssetId = insertAsset.run(
    'hero_edunexa_learning_1795025220174.jpg',
    'hero_edunexa_learning.jpg',
    420000, 1408, 768,
    'Hero & Banners',
    'EDUNEXA Global Learning Commons',
    'Diverse international students studying collaboratively in a sunlit modern academic library.',
    'International students studying together with laptops and notebooks at a sunlit oak library table',
    '/src/assets/images/hero_edunexa_learning_1795025220174.jpg',
    superAdminId
  ).lastInsertRowid;

  const examAssetId = insertAsset.run(
    'feature_exam_prep_1795025220878.jpg',
    'feature_exam_prep.jpg',
    380000, 1200, 900,
    'Examinations',
    'Online Assessment Environment',
    'Student taking a timed digital examination with structured review tools.',
    'Student completing an online assessment on a laptop at a clean oak desk',
    '/src/assets/images/feature_exam_prep_1795025220878.jpg',
    superAdminId
  ).lastInsertRowid;

  const aiAssetId = insertAsset.run(
    'feature_ai_tutor_1795025221069.jpg',
    'feature_ai_tutor.jpg',
    350000, 1200, 900,
    'AI & Curriculum',
    'Structured Mathematics & AI Guidance',
    'Geometric diagrams, trigonometric curves, and interactive learning analytics.',
    'Flat-lay of mathematics geometry notes, trigonometric graphs, and digital study tablet',
    '/src/assets/images/feature_ai_tutor_1795025221069.jpg',
    superAdminId
  ).lastInsertRowid;

  const communityAssetId = insertAsset.run(
    'feature_global_community_1795025220919.jpg',
    'feature_global_community.jpg',
    410000, 1200, 900,
    'Community',
    'International Study Cohort',
    'Students discussing solutions and preparing together across borders.',
    'International students collaborating around textbooks and tablets in a sunlit academic hall',
    '/src/assets/images/feature_global_community_1795025220919.jpg',
    superAdminId
  ).lastInsertRowid;

  const insertSlot = db.prepare(`
    INSERT INTO media_slots (slot_key, label, page_section, active_asset_id, draft_asset_id, previous_asset_id)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);
  insertSlot.run('website_logo', 'Website Custom Logo (Optional Override)', 'Header & Footer', null, null);
  insertSlot.run('homepage_hero', 'Homepage Hero Image', 'Homepage Hero', heroAssetId, heroAssetId);
  insertSlot.run('about_image', 'About Page Feature Image', 'About Page', communityAssetId, communityAssetId);
  insertSlot.run('subject_default', 'Subject Catalogue Image', 'Subjects Page', aiAssetId, aiAssetId);
  insertSlot.run('exam_banner', 'Examination Page Banner', 'Examinations Page', examAssetId, examAssetId);
  insertSlot.run('learning_centre_image', 'Learning Centre Header Visual', 'Learning Centre', aiAssetId, aiAssetId);
  insertSlot.run('feature_exam_engine', 'Examination Engine Showcase', 'Homepage & Examinations', examAssetId, examAssetId);
  insertSlot.run('feature_ai_learning', 'AI Learning & Analytics Visual', 'Homepage & AI Tutor', aiAssetId, aiAssetId);
  insertSlot.run('feature_community', 'Global Student Community Image', 'Homepage & Community', communityAssetId, communityAssetId);

  const insertBlock = db.prepare(`INSERT INTO cms_blocks (block_key, section, title, content_json, draft_content_json, updated_by) VALUES (?, ?, ?, ?, ?, ?)`);
  const heroContent = {
    headline: 'Your Knowledge. Your Future. Your World.',
    tagline: 'The Next Generation of Learning.',
    subheadline: 'Discover a smarter way to learn, practise, compete and excel through an international examination and educational platform powered by intelligent technology.',
    primaryCta: 'Register Free Account',
    secondaryCta: 'Explore Examinations',
    announcement: 'Initial Release: Full free access to all learning centres, practice tests, and 60-day qualifying programmes.'
  };
  insertBlock.run('hero', 'Homepage', 'Hero Section', JSON.stringify(heroContent), JSON.stringify(heroContent), superAdminId);

  const aboutContent = {
    mission: 'To remove barriers to rigorous international exam preparation, curriculum-aligned assessment, and verifiable digital credentials for learners worldwide.',
    vision: 'A unified academic ecosystem where Science, Arts, and Commercial students collaborate across borders with transparent standards and trustworthy recognition.',
    values: 'Academic Integrity · Universal Access to Core Knowledge · Curriculum Accuracy · Student Safety'
  };
  insertBlock.run('about', 'About Page', 'Mission & Vision', JSON.stringify(aboutContent), JSON.stringify(aboutContent), superAdminId);

  const contactContent = {
    email: 'admissions@edunexa.org',
    supportHours: 'Monday – Friday, 08:00 – 18:00 UTC',
    address: 'EDUNEXA Academic Operations, Global Digital Campus',
    footerNote: 'Independent educational platform. Not affiliated with or endorsed by third-party examination owners unless explicitly stated.'
  };
  insertBlock.run('contact', 'Contact & Footer', 'Official Contact Information', JSON.stringify(contactContent), JSON.stringify(contactContent), superAdminId);

  ensureWebsiteSettingsDefaults();

  const insertSubject = db.prepare(`
    INSERT INTO subjects (code, name, group_name, access_classification, eligible_departments_json, description, image_slot_key, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const mathId = insertSubject.run('MTH-101', 'Mathematics', 'Sciences & Core', 'Common / All Students', JSON.stringify(['Science', 'Arts and Humanities', 'Commercial']), 'Foundational and advanced algebra, geometry, calculus, and quantitative reasoning accessible to every student.', 'feature_ai_learning').lastInsertRowid;
  const engId = insertSubject.run('ENG-101', 'English Language', 'Languages & Core', 'Common / All Students', JSON.stringify(['Science', 'Arts and Humanities', 'Commercial']), 'Academic reading comprehension, essay structure, grammar, and IELTS/TOEFL/WAEC communication mastery.', 'feature_exam_engine').lastInsertRowid;
  const csId = insertSubject.run('CSC-101', 'Computer Studies & Digital Technology', 'Technology & Core', 'Common / All Students', JSON.stringify(['Science', 'Arts and Humanities', 'Commercial']), 'Algorithms, digital literacy, data representation, and software engineering principles open to all streams.', 'feature_ai_learning').lastInsertRowid;
  const gkId = insertSubject.run('GNK-101', 'General Knowledge & Reasoning', 'Reasoning & General', 'Common / All Students', JSON.stringify(['Science', 'Arts and Humanities', 'Commercial']), 'World history, geography, numerical/verbal/abstract reasoning, and cognitive problem-solving challenges.', 'feature_community').lastInsertRowid;

  const phyId = insertSubject.run('PHY-201', 'Physics', 'Sciences', 'Science', JSON.stringify(['Science']), 'Mechanics, waves, electricity, thermodynamics, and modern physics aligned with WAEC, JAMB, GCSE, and A-Level.', 'feature_ai_learning').lastInsertRowid;
  insertSubject.run('CHM-201', 'Chemistry', 'Sciences', 'Science', JSON.stringify(['Science']), 'Atomic structure, stoichiometry, chemical kinetics, organic chemistry, and analytical methods.', 'feature_exam_engine');
  insertSubject.run('BIO-201', 'Biology', 'Sciences', 'Science', JSON.stringify(['Science']), 'Cellular biology, genetics, ecology, and human physiology for senior secondary and pre-med tracks.', 'feature_community');

  const litId = insertSubject.run('LIT-201', 'Literature in English', 'Arts and Humanities', 'Arts and Humanities', JSON.stringify(['Arts and Humanities']), 'Prose, drama, poetry analysis, and literary criticism across world and regional canons.', 'feature_community').lastInsertRowid;
  insertSubject.run('GOV-201', 'Government & Civic Studies', 'Arts and Humanities', 'Arts and Humanities', JSON.stringify(['Arts and Humanities']), 'Political systems, constitutional governance, public administration, and international institutions.', 'feature_exam_engine');

  const accId = insertSubject.run('ACC-201', 'Financial Accounting', 'Commercial', 'Commercial', JSON.stringify(['Commercial']), 'Double-entry bookkeeping, financial statements, cost accounting, and corporate reporting standards.', 'feature_exam_engine').lastInsertRowid;
  insertSubject.run('ECO-201', 'Economics', 'Commercial', 'Commercial', JSON.stringify(['Commercial']), 'Microeconomics, macroeconomics, international trade, and quantitative market analysis.', 'feature_ai_learning');

  const insertQuestion = db.prepare(`
    INSERT INTO questions (subject_id, topic_name, country, curriculum, exam_framework, academic_level, difficulty, format, question_text, options_json, correct_answer, explanation, marking_scheme, marks, learning_objective, scope_type, source_references_json, source_gap_flagged, ai_generated, approval_status, published_at, reviewed_by, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'published', datetime('now'), ?, ?)
  `);

  const addQ = (...args: any[]) => Number(insertQuestion.run(...args, superAdminId, superAdminId).lastInsertRowid);

  const qM1 = addQ(mathId, 'Linear & Quadratic Equations', 'International', 'SAT Digital Math Framework', 'SAT', 'High School / Grade 11-12', 'Intermediate', 'mcq',
    'If 3x - 7 = 2(x + 4), what is the value of 5x - 3?',
    JSON.stringify(['72', '75', '15', '58']), '72',
    'Expanding the right side gives 3x - 7 = 2x + 8, so x = 15. Substituting x = 15 into 5x - 3 gives 5(15) - 3 = 72.', '',
    2, 'Solve multi-step linear equations and evaluate linear expressions.', 'exam_specific',
    JSON.stringify([{ title: 'College Board Digital SAT Math Assessment Framework', organization: 'College Board', url: 'https://satsuite.collegeboard.org/sat', section: 'Algebra: Linear equations' }])
  );
  const qM2 = addQ(mathId, 'Functions & Graphs', 'International', 'SAT Digital Math Framework', 'SAT', 'High School / Grade 11-12', 'Intermediate', 'mcq',
    'A linear function f satisfies f(2) = 9 and f(6) = 21. What is the y-intercept of the graph of y = f(x) in the xy-plane?',
    JSON.stringify(['3', '0', '6', '2']), '3',
    'The slope m = (21 - 9) / (6 - 2) = 3. Using f(2) = 3(2) + b = 9 gives b = 3.', '',
    2, 'Determine linear function parameters from two ordered pairs.', 'exam_specific',
    JSON.stringify([{ title: 'College Board Digital SAT Math Assessment Framework', organization: 'College Board', url: 'https://satsuite.collegeboard.org/sat', section: 'Algebra: Linear functions' }])
  );
  const qM3 = addQ(mathId, 'Indices & Logarithms', 'Nigeria', 'WAEC WASSCE Syllabus', 'WAEC', 'Senior Secondary 3', 'Intermediate', 'mcq',
    'Simplify: log₁₀(40) + log₁₀(25) - log₁₀(10).',
    JSON.stringify(['2', '1', '3', '10']), '2',
    'Using logarithm laws: log₁₀((40 × 25) / 10) = log₁₀(1000 / 10) = log₁₀(100) = 2.', '',
    2, 'Apply laws of logarithms to simplify numerical expressions.', 'local_curriculum',
    JSON.stringify([{ title: 'WAEC Mathematics Syllabus for WASSCE', organization: 'West African Examinations Council', url: 'https://www.waeconline.org.ng', section: 'Number and Numeration' }])
  );
  const qM4 = addQ(mathId, 'Problem Solving & Proofs', 'International', 'International Standard', 'General Practice', 'Senior Secondary', 'Advanced', 'short_answer',
    'Explain clearly why the sum of any two consecutive odd integers is always divisible by 4.',
    JSON.stringify([]), 'Let two consecutive odd integers be 2n+1 and 2n+3. Their sum is 4n+4 = 4(n+1), which is a multiple of 4.',
    'Represent consecutive odd integers algebraically as 2n + 1 and 2n + 3, then factor 4 out of 4n + 4 = 4(n + 1).',
    '1 mark for defining 2n+1 and 2n+3; 1 mark for summing to 4n+4; 2 marks for factoring 4(n+1) and concluding divisibility.',
    4, 'Construct algebraic proofs for integer divisibility.', 'international',
    JSON.stringify([{ title: 'EDUNEXA International Mathematics Core', organization: 'EDUNEXA Academic Board', url: '', section: 'Algebraic Reasoning' }])
  );

  addQ(engId, 'Academic Reading & Coherence', 'International', 'IELTS Academic Reading Band Descriptors', 'IELTS', 'Pre-University', 'Intermediate', 'mcq',
    'In academic writing, which transition best signals a concession before presenting a counter-argument?',
    JSON.stringify(['Notwithstanding', 'Consequently', 'Specifically', 'Furthermore']), 'Notwithstanding',
    '"Notwithstanding" introduces a contrasting or concessive point, whereas the other options signal cause, exemplification, or addition.', '',
    2, 'Select cohesive discourse markers appropriate for academic prose.', 'exam_specific',
    JSON.stringify([{ title: 'IELTS Academic Assessment Criteria', organization: 'British Council / IDP / Cambridge', url: 'https://ielts.org', section: 'Coherence and Cohesion' }])
  );

  const qR1 = addQ(gkId, 'Logical & Pattern Reasoning', 'International', 'EDUNEXA Cognitive Skills Framework', 'General Practice', 'All Levels', 'Intermediate', 'mcq',
    'Consider the sequence: 3, 7, 15, 31, 63, __. Which number logically completes the sequence?',
    JSON.stringify(['127', '125', '95', '128']), '127',
    'Each term equals twice the previous term plus 1 (3×2+1=7, 7×2+1=15, ..., 63×2+1=127).', '',
    2, 'Identify recursive numerical growth rules in sequences.', 'international',
    JSON.stringify([{ title: 'EDUNEXA Cognitive & Reasoning Standards', organization: 'EDUNEXA Academic Board', url: '', section: 'Numerical Pattern Recognition' }])
  );
  const qR2 = addQ(gkId, 'Deductive Logic', 'International', 'GMAT Data Insights & Critical Reasoning', 'GMAT', 'Postgraduate / Pre-MBA', 'Advanced', 'mcq',
    'All accredited laboratories in Region A submit quarterly calibration logs. Facility X is located in Region A and did not submit a quarterly calibration log. Which statement must be true?',
    JSON.stringify([
      'Facility X is not an accredited laboratory in Region A.',
      'Facility X is undergoing maintenance.',
      'No laboratories in Region A are accredited.',
      'Facility X submitted an annual log instead.'
    ]),
    'Facility X is not an accredited laboratory in Region A.',
    'By contrapositive: Accredited in Region A => submits quarterly log. Not submitting => not an accredited laboratory in Region A.', '',
    3, 'Apply contrapositive deductive inference without unwarranted assumptions.', 'exam_specific',
    JSON.stringify([{ title: 'GMAT Focus Critical Reasoning Overview', organization: 'GMAC', url: 'https://www.mba.com/exams/gmat-exam', section: 'Logical Deduction' }])
  );

  const qP1 = addQ(phyId, 'Kinematics & Mechanics', 'International', 'Cambridge International A-Level / WAEC', 'WAEC', 'Senior Secondary / Sixth Form', 'Intermediate', 'mcq',
    'An object starts from rest and accelerates uniformly at 4.0 m/s² for 5.0 seconds. What distance does it travel during this interval?',
    JSON.stringify(['50 m', '20 m', '100 m', '40 m']), '50 m',
    'Using s = ut + ½at² with u = 0, a = 4.0 m/s², t = 5.0 s: s = 0 + 0.5 × 4.0 × 25 = 50 m.', '',
    2, 'Calculate displacement under constant linear acceleration.', 'international',
    JSON.stringify([{ title: 'Cambridge International AS & A Level Physics 9702', organization: 'Cambridge Assessment', url: 'https://www.cambridgeinternational.org', section: 'Kinematics' }])
  );
  const qP2 = addQ(phyId, 'Electricity & Circuits', 'Nigeria', 'JAMB UTME Physics Syllabus', 'JAMB', 'Senior Secondary 3', 'Intermediate', 'mcq',
    'Three resistors of 6 Ω, 6 Ω, and 3 Ω are connected in parallel. What is their equivalent resistance?',
    JSON.stringify(['1.5 Ω', '15 Ω', '2.0 Ω', '0.67 Ω']), '1.5 Ω',
    '1/Req = 1/6 + 1/6 + 1/3 = 4/6 = 2/3, hence Req = 1.5 Ω.', '',
    2, 'Compute equivalent resistance in parallel resistor networks.', 'local_curriculum',
    JSON.stringify([{ title: 'JAMB UTME Physics Syllabus', organization: 'Joint Admissions and Matriculation Board', url: 'https://www.jamb.gov.ng', section: 'Current Electricity' }])
  );

  const qL1 = addQ(litId, 'Literary Devices & Poetics', 'United Kingdom', 'GCSE English Literature', 'GCSE', 'Key Stage 4 / Senior', 'Intermediate', 'mcq',
    'When a dramatic character speaks their inner thoughts aloud while alone on stage, this device is known as a:',
    JSON.stringify(['Soliloquy', 'Aside', 'Dramatic irony', 'Catharsis']), 'Soliloquy',
    'A soliloquy is delivered by a character alone on stage to reveal inner reasoning to the audience.', '',
    2, 'Distinguish dramatic conventions in classical and modern plays.', 'international',
    JSON.stringify([{ title: 'AQA GCSE English Literature Specification', organization: 'AQA', url: 'https://www.aqa.org.uk', section: 'Drama Conventions' }])
  );

  const qA1 = addQ(accId, 'Double-Entry & Financial Statements', 'International', 'IFRS / WAEC Financial Accounting', 'WAEC', 'Senior Secondary', 'Intermediate', 'mcq',
    'Which accounting principle requires that expenses be recognised in the same accounting period as the revenues they helped generate?',
    JSON.stringify(['Matching (Accrual) Concept', 'Prudence Concept', 'Historical Cost Concept', 'Entity Concept']),
    'Matching (Accrual) Concept',
    'The matching/accrual principle aligns incurred expenses with the revenue earned during the same reporting period.', '',
    2, 'Apply core international financial reporting concepts.', 'international',
    JSON.stringify([{ title: 'IFRS Conceptual Framework Summary', organization: 'IFRS Foundation', url: 'https://www.ifrs.org', section: 'Accrual Basis' }])
  );

  const insertProg = db.prepare(`
    INSERT INTO programmes (title, subject_id, department, description, min_days, required_lessons, required_practice_exams, pass_mark, is_published)
    VALUES (?, ?, ?, ?, 60, ?, ?, ?, 1)
  `);
  const progMathId = insertProg.run(
    '60-Day Global Quantitative Mastery Certificate',
    mathId,
    'Common / All Students',
    'A structured 60-day preparatory programme covering algebra, functions, logarithms, and mathematical proof across SAT and WASSCE standards.',
    2, 1, 70
  ).lastInsertRowid;

  const progPhyId = insertProg.run(
    '60-Day Applied Physics Foundations Programme',
    phyId,
    'Science',
    'Comprehensive 60-day Science track covering kinematics, circuits, and experimental analysis.',
    2, 1, 70
  ).lastInsertRowid;

  const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const insertVideo = db.prepare(`
    INSERT INTO videos (title, description, youtube_url, youtube_id, subject_id, topic, programme_id, thumbnail_url, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const v1 = insertVideo.run('Essence of Linear Algebra & Solving Systems', 'Visual intuition for linear equations, transformations, and problem solving.', 'https://www.youtube.com/watch?v=fNk_zzaMoSs', 'fNk_zzaMoSs', mathId, 'Linear & Quadratic Equations', progMathId, 'https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg').lastInsertRowid;
  const v2 = insertVideo.run('Logarithms & Exponential Scales Explained', 'Step-by-step mastery of logarithmic identities for WAEC and SAT examinations.', 'https://www.youtube.com/watch?v=zzu2POfYv0Y', 'zzu2POfYv0Y', mathId, 'Indices & Logarithms', progMathId, 'https://img.youtube.com/vi/zzu2POfYv0Y/hqdefault.jpg').lastInsertRowid;
  const v3 = insertVideo.run('Kinematics: Motion Graphs & Uniform Acceleration', 'Understanding displacement, velocity, and constant acceleration equations.', 'https://www.youtube.com/watch?v=ZM8ECpBuQYE', 'ZM8ECpBuQYE', phyId, 'Kinematics & Mechanics', progPhyId, 'https://img.youtube.com/vi/ZM8ECpBuQYE/hqdefault.jpg').lastInsertRowid;
  insertVideo.run('Academic Essay Structure & Thesis Development', 'Practical guide to coherent arguments for IELTS, TOEFL, and university admissions.', 'https://www.youtube.com/watch?v=GgkRoYPLhts', 'GgkRoYPLhts', engId, 'Academic Reading & Coherence', null, 'https://img.youtube.com/vi/GgkRoYPLhts/hqdefault.jpg');

  db.prepare(`INSERT INTO programme_enrolments (programme_id, user_id, enrolled_at, lessons_completed_json, practice_exams_completed, assignments_completed, status) VALUES (?, ?, ?, ?, 1, 1, 'eligible_for_final')`).run(progMathId, amaraId, sixtyTwoDaysAgo, JSON.stringify([v1, v2]));
  db.prepare(`INSERT INTO programme_enrolments (programme_id, user_id, enrolled_at, lessons_completed_json, practice_exams_completed, assignments_completed, status) VALUES (?, ?, ?, ?, 0, 0, 'active')`).run(progPhyId, amaraId, tenDaysAgo, JSON.stringify([v3]));
  db.prepare(`INSERT INTO programme_enrolments (programme_id, user_id, enrolled_at, lessons_completed_json, practice_exams_completed, assignments_completed, status) VALUES (?, ?, ?, ?, 0, 0, 'active')`).run(progMathId, sofiaId, tenDaysAgo, JSON.stringify([v1]));

  const insertExam = db.prepare(`
    INSERT INTO examinations (title, instructions, subject_id, category, exam_framework, duration_minutes, total_marks, pass_mark, max_attempts, randomize_questions, randomize_options, release_answers, eligibility_rule, timezone, is_published, is_60day_final, programme_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1, ?, 'UTC', 1, ?, ?)
  `);

  const examSatMathId = insertExam.run('International Mathematics Practice Assessment (SAT / WAEC)', 'Complete all multiple-choice questions and the algebraic proof. Answers autosave automatically.', mathId, 'Exam Preparation', 'SAT / WAEC', 25, 10, 60, 5, 'subject_department', 0, null).lastInsertRowid;
  const examFinal60Id = insertExam.run('60-Day Qualifying Final Examination: Quantitative Mastery', 'Official qualifying assessment for students who have completed 60+ days and programme requirements. Passing score: 70%.', mathId, 'Qualifying Final Exam', 'EDUNEXA 60-Day Final', 30, 10, 70, 2, '60day_programme', 1, progMathId).lastInsertRowid;
  const examReasoningId = insertExam.run('Numerical & Logical Cognitive Skills Assessment', 'A reasoning and cognitive skills assessment measuring pattern recognition and deductive inference. This is a developmental skills assessment, not a clinical IQ score.', gkId, 'Reasoning & Cognitive Skills', 'General Practice', 15, 5, 60, 5, 'subject_department', 0, null).lastInsertRowid;
  const examPhysicsId = insertExam.run('Science Track Mock: Physics Mechanics & Circuits', 'Department-specific Science assessment aligned with WAEC and JAMB standards.', phyId, 'Subject Mock', 'WAEC / JAMB', 20, 4, 50, 5, 'subject_department', 0, null).lastInsertRowid;
  const examLitId = insertExam.run('Arts & Humanities Mock: Literary Conventions', 'Department-specific Arts assessment covering dramatic conventions and poetic analysis.', litId, 'Subject Mock', 'GCSE', 15, 2, 50, 5, 'subject_department', 0, null).lastInsertRowid;
  const examAccId = insertExam.run('Commercial Track Mock: Financial Accounting Principles', 'Department-specific Commercial assessment covering accrual matching and IFRS fundamentals.', accId, 'Subject Mock', 'WAEC / IFRS', 15, 2, 50, 5, 'subject_department', 0, null).lastInsertRowid;

  const linkQ = db.prepare(`INSERT INTO exam_questions (exam_id, question_id, sort_order) VALUES (?, ?, ?)`);
  [qM1, qM2, qM3, qM4].forEach((qid, idx) => linkQ.run(examSatMathId, qid, idx + 1));
  [qM1, qM2, qM3, qM4].forEach((qid, idx) => linkQ.run(examFinal60Id, qid, idx + 1));
  [qR1, qR2].forEach((qid, idx) => linkQ.run(examReasoningId, qid, idx + 1));
  [qP1, qP2].forEach((qid, idx) => linkQ.run(examPhysicsId, qid, idx + 1));
  linkQ.run(examLitId, qL1, 1);
  linkQ.run(examAccId, qA1, 1);

  const insertAttempt = db.prepare(`
    INSERT INTO exam_attempts (exam_id, user_id, question_order_json, answers_json, started_at, expires_at, submitted_at, status, auto_score, manual_score, total_score, max_score, percentage, grade, passed, feedback, graded_by, graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'graded', ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);

  const nowIso = new Date().toISOString();
  const amaraAttemptId = insertAttempt.run(
    examSatMathId, amaraId,
    JSON.stringify([qM1, qM2, qM3, qM4]),
    JSON.stringify({ [qM1]: '72', [qM2]: '3', [qM3]: '2', [qM4]: 'Let consecutive odd integers be 2n+1 and 2n+3; sum is 4n+4 = 4(n+1), divisible by 4.' }),
    tenDaysAgo, tenDaysAgo, tenDaysAgo,
    6, 4, 10, 10, 100, 'A+',
    'Excellent algebraic reasoning and clean modular proof.',
    superAdminId, nowIso
  ).lastInsertRowid;

  insertAttempt.run(
    examReasoningId, liamId,
    JSON.stringify([qR1, qR2]),
    JSON.stringify({ [qR1]: '127', [qR2]: 'Facility X is not an accredited laboratory in Region A.' }),
    tenDaysAgo, tenDaysAgo, tenDaysAgo,
    5, 0, 5, 5, 100, 'A+',
    'Strong deductive accuracy.',
    superAdminId, nowIso
  );

  insertAttempt.run(
    examAccId, sofiaId,
    JSON.stringify([qA1]),
    JSON.stringify({ [qA1]: 'Matching (Accrual) Concept' }),
    tenDaysAgo, tenDaysAgo, tenDaysAgo,
    2, 0, 2, 2, 100, 'A+',
    'Accurate application of accrual accounting.',
    superAdminId, nowIso
  );

  db.prepare(`
    INSERT INTO certificates (cert_number, user_id, programme_id, exam_attempt_id, student_display_name, programme_title, grade, score_percentage, issued_at, issued_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid')
  `).run('EDX-2026-0001', amaraId, progMathId, amaraAttemptId, 'Amara Nwosu', '60-Day Global Quantitative Mastery Certificate', 'Distinction (A+)', 96.5, nowIso, 'EDUNEXA Academic Assessment Board');

  const nextWeekStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const nextWeekEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO exam_schedules (exam_id, programme_id, title, scheduled_start, scheduled_end, timezone, instructions, status, announced_by)
    VALUES (?, ?, ?, ?, ?, 'UTC', ?, 'scheduled', ?)
  `).run(examFinal60Id, progMathId, 'November 2026 Cohort: 60-Day Quantitative Mastery Final', nextWeekStart, nextWeekEnd, 'Open to students who have reached 60+ days of enrolment and completed all required lessons and practice exams.', superAdminId);

  const insertGroup = db.prepare(`INSERT INTO community_groups (name, slug, description, category) VALUES (?, ?, ?, ?)`);
  const gMath = insertGroup.run('Mathematics', 'mathematics', 'Problem solving, proofs, calculus, and quantitative discussions.', 'Subject').lastInsertRowid;
  insertGroup.run('English Language', 'english-language', 'Academic writing, grammar, and reading comprehension.', 'Subject');
  const gSci = insertGroup.run('Sciences', 'sciences', 'Physics, Chemistry, and Biology peer study circles.', 'Department');
  insertGroup.run('Arts and Humanities', 'arts-humanities', 'Literature, History, Philosophy, and Government discussions.', 'Department');
  insertGroup.run('Commercial Studies', 'commercial-studies', 'Accounting, Economics, and Business Strategy discussions.', 'Department');
  insertGroup.run('SAT & GMAT Preparation', 'sat-gmat-prep', 'International standardised admissions test strategies.', 'Exam Prep');
  insertGroup.run('JAMB and WAEC Preparation', 'jamb-waec-prep', 'West African syllabus review and mock walkthroughs.', 'Exam Prep');
  insertGroup.run('International Student Lounge', 'international-lounge', 'Cross-cultural study partners and academic goal sharing.', 'Community');

  const insertPost = db.prepare(`INSERT INTO community_posts (group_id, user_id, title, body, status) VALUES (?, ?, ?, ?, 'published')`);
  const p1 = insertPost.run(gMath, amaraId, 'How I approach logarithmic equations without a calculator', 'Breaking numbers into prime factors or powers of 10 makes WASSCE and SAT non-calculator logarithm questions much faster. Happy to share worked examples below!').lastInsertRowid;
  insertPost.run(gSci, amaraId, 'Parallel resistor shortcut for quick verification', 'Remember that the equivalent resistance of parallel branches is always strictly smaller than the smallest individual branch resistor—great sanity check during timed exams.');

  db.prepare(`INSERT INTO community_comments (post_id, user_id, body) VALUES (?, ?, ?)`).run(
    p1, sofiaId, 'This sanity-check approach also helps on GMAT quantitative data sufficiency questions. Thanks for sharing!'
  );

  const insertFaq = db.prepare(`INSERT INTO faqs (question, answer, category, sort_order, is_published) VALUES (?, ?, ?, ?, 1)`);
  insertFaq.run('Is EDUNEXA free to use for students?', 'Yes. Creating an account, accessing published subjects, watching Learning Centre lessons, using the AI Tutor, joining community groups, taking practice and qualifying exams, and earning verifiable certificates are completely free with no payment details required.', 'Access & Pricing', 1);
  insertFaq.run('How does department-based subject access work?', 'Common subjects—such as Mathematics, English Language, Computer Studies, and General Knowledge—are open to every student regardless of department. Department-specific subjects follow the department eligibility set by the Academic Administrator.', 'Curriculum & Subjects', 2);
  insertFaq.run('How do I qualify for a 60-day certificate?', 'You must enrol in a designated qualifying programme, complete at least 60 days from your programme enrolment date, finish the required lessons and practice assessments, and pass the scheduled final examination.', '60-Day Programmes', 3);
  insertFaq.run('How can an employer or university verify an EDUNEXA certificate?', 'Every certificate includes a unique certificate serial number and QR verification URL on our public Certificate Verification page.', 'Certificates', 4);

  db.prepare(`INSERT INTO notifications (user_id, title, body, category, link) VALUES (?, ?, ?, 'schedule', '/student/exams')`).run(
    amaraId,
    '60-Day Qualifying Final Examination Open',
    'You have exceeded 60 days in the Global Quantitative Mastery programme and completed all prerequisites. Your final exam window is now scheduled.'
  );

  db.prepare(`INSERT INTO audit_logs (actor_id, actor_role, action, target, details) VALUES (?, 'super_admin', 'SYSTEM_INITIALIZED', 'database', 'Initialized EDUNEXA platform schema and baseline data.')`).run(superAdminId);
}
