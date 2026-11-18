# EDUNEXA — Master Project README

**Tagline:** The Next Generation of Learning.  
**Supporting statement:** Your Knowledge. Your Future. Your World.  
**Project:** International learning, examination, assessment and academic community platform.

This README is the primary product, design and implementation specification for building EDUNEXA in Windsurf. Treat the requirements as one connected platform. Do not silently omit features. If a requirement is ambiguous, document it and request a decision before making a consequential assumption.

---

## 1. Vision and objectives

EDUNEXA enables students internationally to learn, practise, take examinations, assess academic progress, connect with other learners and earn verifiable digital certificates. Support examination preparation such as GMAT, SAT, JAMB, WAEC, NECO, IELTS, TOEFL, GCSE and A-Level, alongside subject tests, general knowledge quizzes, puzzles and reasoning assessments.

Build a secure, responsive and accessible product—not disconnected pages. The public website, student portal and administrator portal share a backend, database, media system and consistent design system.

### Initial access and pricing model — mandatory

Launch EDUNEXA as a **free-to-use platform**. Do not implement mandatory subscriptions, paid plans, payment checkout, payment gateways, paywalls or fees to register, access published learning materials, practise, take available tests or use the platform's core student features in the initial release. Students must be able to create accounts and use the platform without entering payment details. Build access around account status, programme rules and examination eligibility—not payment status. Keep the architecture maintainable so a future business decision could introduce optional paid services, but do not activate or display payment features now. Do not invent fees or payment requirements.

## 2. Three connected environments

### Public website
- Homepage, About, Examinations, Subjects, Learning Centre, Community overview, Testimonials, FAQ, Contact, Privacy Policy, Terms and Certificate Verification.
- Visitors can explore the platform, register or log in.

### Student portal
- Authenticated learning, practice, examinations, results, certificates, profile, dashboard customisation and community.

### Administrator portal
- Separate protected administrator login and dashboard. Students must not see administrator navigation or controls.
- Suggested routes: `/`, `/login`, `/register`, `/student/dashboard`, `/admin/login`, `/admin/dashboard`.
- Enforce permissions on the server; hiding links in the UI is not security.

## 3. Official EDUNEXA brand and UI/UX

Use the supplied GyanAstra Technologies reference image only as inspiration for its clean technology aesthetic, colour family, spacing, rounded cards, soft shadows and visual balance. Do not copy its name, logo, contact details, artwork or proprietary identity. Create original EDUNEXA assets.

| Role | Colour | Hex |
|---|---|---|
| Primary | Teal | `#008F9F` |
| Secondary accent | Cyan | `#90DFEC` |
| Dark brand | Deep navy | `#10243D` |
| Main background | White | `#FFFFFF` |
| Light section | Ice blue | `#EAF9FB` |
| Neutral background | Soft grey | `#F4F7FA` |
| Secondary text | Slate | `#64748B` |

Teal is the dominant interactive colour; cyan is for highlights and decorative details; navy for headings; white and soft grey for clean surfaces. Additional colours may be used sparingly for meaningful statuses and charts.

Design language: modern, clean, premium education technology; spacious layouts; readable typography; rounded cards; restrained shadows; teal buttons and active navigation; cyan accents; navy headings; consistent icons and spacing; purposeful, subtle animation.

Create an original EDUNEXA logo communicating education, intelligence, innovation and technology. Provide main, light-background and dark-background logo variations, favicon, social sharing image and certificate logo. Use the name **EDUNEXA** consistently. Brand tagline: **The Next Generation of Learning.** Supporting statement: **Your Knowledge. Your Future. Your World.**

The same identity must appear across the public website, student and admin portals, examination centre, AI Tutor, community, testimonials and certificates. Students may customise their own dashboard, but not official site branding, admin UI, examination interface or certificate design.

## 4. Public website and homepage

Create pages for Home, About, Examinations, Subjects, Learning Centre, Community, Testimonials/Success Stories, FAQ, Contact, Privacy Policy, Terms and Certificate Verification.

Homepage header: EDUNEXA logo; Home; About; Examinations; Subjects; Learning Centre; Community; Contact; Student Login; Register Now.

Hero headline: **Your Knowledge. Your Future. Your World.** Suggested copy: “Discover a smarter way to learn, practise, compete and excel through a global examination and educational platform powered by intelligent technology.” Include clear calls to action and original educational imagery.

Other homepage sections: genuine platform statistics; featured examination categories; popular subjects; AI learning introduction; Learning Centre preview; student achievements and leaderboard highlights; testimonials; community introduction; registration call to action; professional footer. Do not invent user counts, results or achievements. Statistics must come from real database records.

## 5. Student accounts and profiles

Provide secure registration, login, email verification, password reset/change, profile editing, sign-out, notification preferences, privacy settings and account deletion request. Registration may include full name, username, email, country, date of birth where necessary, password and optional photograph. Collect only necessary information. Apply age-appropriate privacy, consent, moderation and communication safeguards for minors.

Students can upload/replace profile photographs and cover images, edit biographies and academic interests, and manage profile visibility. Support JPG, JPEG, PNG and WEBP with file validation, size limits and secure storage.

## 6. Student dashboard

Include welcome message, profile image, examination count, average score and grade, learning programme progress, upcoming examinations, recent results, certificates, leaderboard position, achievements, notifications, learning history, assignments, saved resources, AI Tutor and community access. Use responsive cards, clear charts, a collapsible desktop sidebar and mobile-friendly navigation.

## 7. Subjects and examination categories

Administrators can create, edit, organise, publish and archive subjects and categories.

- **Sciences:** Mathematics, Physics, Chemistry, Biology, Computer Science.
- **Arts and Humanities:** History, Literature, Government, Fine Arts, Philosophy, Geography.
- **Commercial:** Accounting, Commerce, Economics, Business Studies.
- **General Knowledge:** World history, geography, general knowledge and appropriately dated current affairs.
- **Reasoning:** Numerical, verbal, abstract, logical reasoning, pattern recognition, critical thinking, problem-solving and puzzles.
- **Exam preparation:** GMAT, SAT, JAMB, WAEC, NECO, IELTS, TOEFL, GCSE and A-Level.

Support configurable formats. Do not imply affiliation with or endorsement by examination owners unless such a relationship exists.

### 7.1 Subject access by department and shared-subject rules — mandatory

EDUNEXA must organise subjects into **department-specific subjects** and **common subjects available to everyone**. Do not apply one blanket access rule to every subject.

**Common/general subjects:** Every student, regardless of department or academic stream, must be able to access and attempt all published common subjects. These include Mathematics, English Language, Computer Studies/Digital Technology, General Knowledge and any other subject the administrator explicitly classifies as a common subject. For example, Science, Arts/Humanities and Commercial students must all be able to take Mathematics and English assessments.

**Department-specific subjects:** Subjects classified as Science must normally be available to Science students; Arts/Humanities subjects to Arts/Humanities students; and Commercial subjects to Commercial students. Examples include Physics and Chemistry for Science; Literature and Government for Arts/Humanities; and Accounting and Commerce for Commercial. The administrator must be able to assign one or more eligible departments to each subject.

**Administrator configuration:** When creating or editing a subject, provide a clear access classification such as `Common / All Students`, `Science`, `Arts and Humanities`, `Commercial`, or `Custom`. For `Custom`, the administrator can select one or more eligible departments. Common subjects must be accessible to all departments by default. Department-specific subjects must follow the configured department eligibility.

**Learning level is separate from department:** Let students select or be recommended an appropriate level, class, grade, topic and difficulty. Do not confuse a student's department with their learning level. The system should support appropriate foundational and advanced content within the subject's intended audience.

**Practice versus formal examination:** Apply department eligibility to department-specific subject assessments where configured. Administrators may also set transparent, assessment-specific eligibility for official examinations or programmes. These rules must not accidentally restrict common subjects, and students must see the reason for any restriction before attempting to enrol. Administrators must be able to configure subject classification and eligibility without changing application code.

### 7.2 Subject discovery and curriculum mapping

Provide search and filters for subject group, department, country/curriculum, academic level, topic, examination and difficulty. Clearly label common subjects and department-specific subjects in the student catalogue. Show students only the assessments they are eligible to attempt, while allowing them to understand why a restricted department-specific assessment is unavailable.

## 8. Curriculum-aware AI question generation and question bank — mandatory

Provide an administrator-only AI question-generation workspace. The AI must generate **curriculum-aligned, examination-standard questions—not arbitrary or random questions unrelated to the selected syllabus**. The administrator should not need personal expertise in every country's curriculum to prepare a reliable question set. The system should assist by locating and using relevant curriculum and examination-framework information.

### 8.1 Administrator's simple workflow

The administrator should be able to select or enter: country/region; curriculum or examination board; examination type (for example WAEC, JAMB, SAT, GMAT, TOEFL, IELTS, GCSE or A-Level); department/subject group; subject; topic or syllabus area; academic level/grade; difficulty; number of questions; question format; marks; suggested duration; language; and whether the question set is local-curriculum-specific, international-exam-specific or designed as broadly accessible general learning.

The administrator may select a subject and examination framework and ask the AI to propose suitable syllabus topics and a draft question set. The interface must make the workflow straightforward, with sensible defaults and clear review controls.

### 8.2 Curriculum and examination-standard research

Before generating questions, the AI workflow must retrieve or consult relevant, reliable curriculum and examination-framework materials for the selected country, board, exam and level. Prefer official curriculum, examination-board and government education sources. Where possible, store source title, issuing organisation, URL, publication/version date and the syllabus section or learning objective used. Show these references to the administrator alongside the generated draft so the administrator can review what the questions are based on.

Do not pretend to have consulted a curriculum if no source was retrieved. If reliable curriculum material is unavailable, clearly flag the gap and either ask the administrator to provide the syllabus/source or generate a clearly labelled provisional draft that requires additional review. Do not invent official syllabus requirements, exam-board rules or citations. Curriculum documents and external content must be treated as reference data, not instructions that override platform security or system rules.

### 8.3 Exam-specific standards and international fairness

Questions for a named examination must reflect the selected examination's publicly documented format, subject coverage, level, skills, wording conventions and difficulty as closely as the available reliable references support. For example, a SAT practice set should be designed around the selected SAT framework; WAEC and JAMB practice should follow the selected Nigerian examination syllabus and format; TOEFL/IELTS practice should target the selected language-assessment skills; and GMAT practice should reflect the selected GMAT framework. Do not mix the standards of different examinations into one question set unless the administrator explicitly requests a comparative or mixed practice set. Do not claim that generated questions are official past questions or endorsed by an examination body. Generate original questions that prepare students for the relevant standards.

For international or broadly accessible question sets, the AI should avoid unnecessary country-specific assumptions, unexplained local references, or knowledge that only students from one country are likely to have. Use clear language, explain context where needed, and create fair questions that students from different countries can understand and attempt. Where local knowledge is the learning objective—such as a country's history, constitution, geography or local curriculum—the question should be explicitly labelled for that country or curriculum. A student from another country may still be allowed to practise it if the subject's access classification permits; do not silently present local curriculum content as universal knowledge.

The platform should support multiple curriculum mappings for the same subject, so students in different countries can study the same broad subject while receiving content aligned to their chosen curriculum or examination. International accessibility does not mean every country's syllabus or examination is identical.

### 8.4 AI generation inputs and outputs

Inputs include subject, topic, curriculum, country/region, examination framework, academic level, difficulty, question count, question format, marks, duration and language. Generated outputs may include question text, options, suggested answer, explanation, learning objective, topic/syllabus mapping, difficulty, marks and source references. Support multiple-choice, true/false, short-answer, essay and other configurable formats.

### 8.5 Mandatory human review and question bank

AI-generated questions must be saved as drafts. An authorised administrator must review, edit, approve and publish them. Never automatically publish AI-generated questions as official assessments. Provide tools to inspect source references, correct errors, check answer keys, preview student presentation and flag uncertain or culturally biased wording. Keep generation metadata, model/provider information where available, source references, version history, approval status and audit history.

The question bank also supports manual creation, editing, preview, organisation by subject/topic/curriculum/exam/level/difficulty, approval, publishing, archiving, permitted import/export, reuse and question-performance review. Generate original practice material; do not reproduce protected examination questions or proprietary question banks without permission.

## 9. Online examination engine

Students can browse tests, attempt practice tests and mock examinations, take scheduled finals, answer multiple-choice and written questions, navigate questions, mark for review, see remaining time, autosave and submit.

Administrator settings: title/instructions, subject/category, availability window, duration, total marks, pass mark, question selection and randomisation, option randomisation, attempts, answer/explanation release, eligibility and result publication.

Enforce timing and submission on the server. Autosave answers and recover valid attempts after temporary connection loss where possible. Prevent answer changes after final submission. Make controls accessible and keyboard-friendly. Do not claim browser controls provide foolproof proctoring; any proctoring must be separately specified, transparent, privacy-conscious and legally appropriate.

## 10. Marking, grading and result analysis

Automatically mark objective questions against approved answer keys. Support administrator grading of essays and subjective responses. AI may offer rubric-based suggestions, but consequential grading must be reviewable by an authorised human.

Students can see score, percentage, grade, pass/fail or completion status, released correct/incorrect answers, topic performance, areas for improvement and suggested practice. Administrators can review, moderate, correct and publish results. Keep an audit trail for grade changes.

## 11. Sixty-day learning programme and final examination

Support structured programmes with a minimum preparation period of **60 days (two months)** before a qualifying final examination.

Workflow:
1. Student enrols in a designated qualifying programme.
2. System records the programme enrolment date.
3. Student completes lessons, videos, practice tests and required assignments.
4. System tracks elapsed days and completion requirements.
5. After at least 60 days and completion of configured requirements, the student becomes eligible for the final examination.
6. Administrator reviews eligible students and announces the examination.
7. Student receives notification and takes the scheduled assessment.
8. Objective answers are auto-marked; subjective answers are graded and verified.
9. Students meeting the published passing requirements become eligible for the certificate.

Count 60 days from enrolment in the specific qualifying programme, not from general account creation. Eligibility also depends on configured programme completion rules. Make requirements visible to students. Administrators configure duration, activities, eligibility, pass mark, retake policy and certificate conditions.

## 12. Examination scheduling and announcements

Administrators can view students reaching 60 days, check completion, filter by programme/subject/cohort, announce dates, set start/end date and time, duration and time zone, select eligible students/groups, edit/reschedule/cancel, publish instructions, monitor participation and review/publish results.

Notify students through dashboard notifications, in-platform notification centre and configured email. Show examination details and countdown. Store times consistently and clearly identify the official examination time zone; display appropriately for each student's locale.

## 13. Digital certificates

Issue certificates only after programme requirements and the final examination have been completed, graded and verified. Include EDUNEXA logo, student's verified display name, programme, unique certificate number, issue date, grade/achievement where applicable, authorised issuer and QR verification URL.

Students can view/download PDF certificates. Public verification must resolve to a genuine record. Administrators can issue, revoke or correct certificates with an audit trail. Never award a certificate merely because 60 days elapsed.

## 14. Leaderboards and recognition

Provide Student of the Week, Student of the Month, Global Student of the Year, Best Mathematics Student, Best Science Student, Best Arts Student, Most Improved Student, Academic Excellence Award and reasoning/puzzle recognition.

Use transparent, published ranking criteria based on verified performance, with fair tie-breaking. Prevent repeated attempts or artificial activity from unfairly inflating rankings. Support global, country, subject and exam-category views. Provide privacy controls for public names and photographs, especially for minors.

## 15. IQ-style and cognitive skills assessments

Provide numerical, verbal, abstract and logical reasoning, pattern recognition, critical thinking and problem-solving assessments, with feedback and suggested practice. Describe these as **reasoning or cognitive skills assessments** unless a properly validated and appropriately licensed psychometric instrument is used. Do not present an unvalidated quiz as a clinical or scientifically established IQ score.

## 16. Learning Centre and YouTube videos

Administrators can add videos using YouTube links and provide title, description, subject, topic, thumbnail, URL, publication status and programme/course association. Students can browse/search, watch embedded videos, save favourites and track completion. Respect YouTube embedding, availability, age restrictions, copyright and privacy settings. Do not download/rehost videos without permission.

## 17. EDUNEXA AI Tutor

Provide a student-facing assistant branded **EDUNEXA AI TUTOR**. It helps explain topics, work through academic problems step by step, explain maths, improve grammar/writing, practise questions, understand mistakes, suggest study activities and locate EDUNEXA resources. Encourage learning rather than simply supplying answers. Apply age-appropriate safeguards, moderation, privacy protections and usage limits. Integrate AI securely on the server; never expose API keys in frontend code.

## 18. International student community

Students can share assignments, assessments, academic work, documents and images; ask questions; discuss solutions; comment; join subject groups; find study partners; collaborate on projects and share exam preparation experiences.

Suggested groups: Mathematics; English Language; Sciences; Arts and Humanities; Commercial Studies; General Knowledge; SAT Preparation; GMAT Preparation; JAMB and WAEC Preparation; International Student Lounge. Support country-based groups where privacy permits.

Include reporting, blocking, moderation and content-removal tools. Protect students from harassment, spam, scams and inappropriate content. For younger students, favour moderated group interaction and do not enable unrestricted private messaging by default. Apply upload limits, file scanning and privacy controls.

## 19. Student dashboard customisation

Allow personal light/dark mode, approved accent colours, widget arrangement, compact/spacious layout, profile accent, text-size settings, high contrast and reduced motion. Save preferences to the account across devices. Personalisation must not alter official site branding, admin UI, exam presentation or certificates.

## 20. Testimonials and success stories

Create a public Student Testimonials/Success Stories page. Students may submit approved display name, optional country and photograph, programme, learning experience, achievement and testimonial, with optional certificate reference. Require administrator approval before public display. Admins can edit, feature, reject or remove testimonials. Obtain appropriate consent, especially for minors.

## 21. Full administrator control and roles

Create separate secure administrator authentication and role-based permissions:
- **Super Administrator:** Full platform and website authority; manages roles and permissions.
- **Content Administrator:** Pages, text, banners, images and promotional content.
- **Academic Administrator:** Subjects, question bank, examinations, programmes and grading.
- **Community Moderator:** Posts, comments, reports and moderation.

Enforce permissions on the server and log important administrative actions. Require strong authentication for privileged accounts and consider multi-factor authentication.

## 22. Website Media Manager and CMS — mandatory

The Super Administrator must be able to change website pictures and ordinary website content without editing HTML, CSS, JavaScript or backend source code.

Create **Website Media Manager** at `Admin Dashboard → Website Management → Media Library`.

### Media library
- Upload from computer and drag-and-drop.
- Browse, preview, replace, delete, rename, search and filter.
- Organise by category.
- Add title, description and alt text.
- Show upload date, dimensions, format and file size.
- Maintain replacement history and recovery options.

### Editable image slots
- Homepage hero/banner, main illustration, background and decorative images, promotional banners.
- Examination illustrations, AI learning graphics, student learning photographs and service cards.
- Course thumbnails, subject images and video thumbnails.
- Approved student photographs, achievement graphics and testimonial backgrounds.
- Main/alternative/white EDUNEXA logos, favicon, social sharing image, footer logo and graphics.

Each managed image slot must allow the administrator to choose an existing library asset or upload a replacement. Temporary development images are allowed, but every replaceable image must be connected to a CMS-managed asset/slot. Never hardcode replaceable image paths directly into page components. Use a deliberate branded placeholder if no image is assigned.

### Upload and publishing
Support JPG, JPEG, PNG and WEBP. SVG is optional and must be securely sanitised. Provide preview, crop, resize, reposition, compression, optimisation, alt text and file validation.

Provide Save as Draft, desktop/tablet/mobile preview, Publish Changes, Cancel and Restore Previous Image. Publishing updates the assigned website location without a code deployment. Use cache invalidation or versioning so visitors receive the new image. Keep the previous published asset for rollback.

### Content management
Super Administrators can edit homepage headings/descriptions, taglines, About content, mission/vision, service descriptions, examination/subject descriptions, promotional announcements, contact details, footer, FAQs, testimonials, social links and navigation labels. Provide a simple visual or structured editor.

### Media security
Use secure server-side or cloud object storage. Store asset references and metadata in the database. Validate MIME type and actual file content, enforce size limits, scan uploads, generate safe filenames and prevent executable uploads. Protect private student media. Maintain backups and deletion recovery.

**Required outcome:** The Super Administrator can replace the homepage hero with an EDUNEXA-owned photograph, upload a campaign banner, change the logo or update any managed website image from the dashboard—without source-code changes.

## 23. Contact, FAQ and notifications

Contact page: configurable contact details, form with name/email/subject/message, confirmation, spam protection and administrator enquiry management. Do not invent contact details.

FAQ: administrators add, edit, reorder and publish questions/answers.

Notify students about new, upcoming, changed or cancelled exams; reminders; learning progress; assignments; published results; certificate availability; leaderboard achievements and community announcements. Use in-platform notifications and configured email, respecting preferences and consent.

## 24. Suggested technical architecture

Confirm the final stack before implementation. Suggested option:

| Layer | Suggested technology |
|---|---|
| Frontend | Next.js / React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js server functions or NestJS |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Secure session-based authentication |
| AI | Server-side AI provider integration |
| Media | Secure object storage |
| Video | YouTube embed |
| Certificates | Server-side PDF generation |
| Hosting | Reputable cloud hosting |
| Monitoring | Error logging and uptime monitoring |

Choose a coherent architecture; avoid unnecessary duplicate backend systems.

### Suggested data entities
Users; student profiles; administrator roles/permissions; subjects; topics; exam categories; questions/options/versions/approvals; examinations; examination questions; attempts; answers; results/grading; learning programmes; enrolments/progress; examination schedules; certificates/verification; videos/lessons; assignments; community groups/posts/comments; reports/moderation actions; testimonials; notifications; media assets/media slots; website pages/content blocks; leaderboard records; audit logs.

Use appropriate relations, foreign keys, indexes, timestamps, validation and transactions.

## 25. Security, privacy, accessibility and reliability

Implement HTTPS, secure password hashing, secure sessions/cookies, server-side authorisation, input validation, output encoding, CSRF protection where applicable, rate limiting, secure uploads, database backups and restore testing, audit logs, error monitoring, protection against common web vulnerabilities, data minimisation, privacy controls, appropriate retention/deletion and age-appropriate safeguards. Do not expose credentials, secrets or AI API keys in client code or public repositories.

Ensure accessible forms, keyboard navigation, readable contrast and responsive layouts. Test desktop, laptop, tablet and smartphone views, especially examination controls, dashboards, upload flows, tables, community and certificates.

## 26. Development roadmap

1. Discovery, architecture, requirements confirmation, brand tokens and database design.
2. Brand assets, public website and CMS foundation.
3. Authentication, roles, profiles and permissions.
4. Student/admin dashboards, media manager and editable content.
5. Subjects, question bank and learning resources.
6. AI question generation, draft review and approval.
7. Examination engine, timing, autosave, randomisation and submission.
8. Auto-marking, manual grading, results and analytics.
9. 60-day programme, eligibility, schedules, announcements and certificates.
10. Community, moderation, testimonials and leaderboards.
11. AI Tutor and video centre.
12. Security, accessibility, performance, backups, deployment and documentation.

Complete and test each phase before marking it done.

## 27. Acceptance criteria

The platform is not complete merely because its pages look attractive. Verify that:
1. Students can register, verify and securely log in without paying; the initial release has no mandatory payment or subscription flow.
2. Common subjects such as Mathematics, English Language, Computer Studies/Digital Technology and administrator-designated general subjects are accessible to every department.
3. Department-specific Science, Arts/Humanities and Commercial subjects follow the subject's administrator-configured department eligibility.
4. The AI question workflow uses the selected country, curriculum, level and examination framework, shows available source references and flags missing syllabus sources.
5. Questions for SAT, GMAT, WAEC, JAMB, TOEFL, IELTS and other selected exams follow the corresponding selected framework rather than mixing unrelated standards or generating arbitrary questions.
6. Internationally intended questions avoid unnecessary local assumptions, while local-curriculum questions are clearly labelled.
7. Students cannot access administrator-only routes or data.
8. Admin permissions are enforced server-side.
9. Admins can manage subjects and questions.
10. AI-generated questions remain drafts until approved.
11. Students can take configured examinations.
12. Timing, autosave and submission work reliably.
13. Objective marking is correct and subjective grading is reviewable.
14. Results are stored and published correctly.
15. Sixty-day eligibility uses programme enrolment and completion rules.
16. Admins can schedule and announce exams to eligible students.
17. Certificates are issued only after verified completion and passing requirements.
18. QR codes resolve to valid certificate records.
19. Leaderboards use documented fair criteria.
20. Students can access permitted YouTube lessons.
21. Community uploads/interactions are moderated and protected.
22. Dashboard customisation does not change official EDUNEXA branding.
23. Testimonials require approval.
24. Super Admins can upload and replace managed website images without code changes.
25. Media changes can be previewed, published and rolled back.
26. Website content/contact details can be updated through the CMS.
27. The platform is responsive and accessible.
28. Backups, security controls and error monitoring are operational.

## 28. Instructions for Windsurf AI

Use this README as the primary product requirements and implementation reference.

Before substantial coding:
1. Inspect the existing project, framework, dependencies and repository structure.
2. Do not overwrite working code without understanding it.
3. Propose an implementation plan and architecture.
4. Identify missing credentials and external services requiring human setup.
5. Establish EDUNEXA design tokens and reusable components.
6. Design the database schema and authentication/permission model.
7. Build in phases rather than attempting the entire platform in one operation.

During development:
- Follow the official EDUNEXA palette and brand system.
- Use reusable, maintainable components.
- Keep frontend, backend and database responsibilities clear.
- Validate inputs and enforce permissions on the server.
- Keep secrets in environment variables.
- Never show fake success messages for operations that did not succeed.
- Do not present mock data as real platform statistics.
- Do not leave important buttons/forms non-functional.
- Provide loading, empty, success and error states.
- Add migrations, seed data and tests where appropriate.
- Document setup, environment variables, migrations, testing and deployment.

If a feature needs an external API, payment, email, storage provider or credential, build the integration safely and document configuration. Do not invent credentials or claim an integration is live until configured and tested.

Maintain a task list. At the end of each phase, report what works, what has been tested, what remains and which decisions need approval. Do not silently omit requirements.

---

## Final product objective

Build EDUNEXA into a secure, scalable and modern international education platform where students can learn, practise, take examinations, connect, improve and earn verified recognition.

**EDUNEXA — THE NEXT GENERATION OF LEARNING.**  
**YOUR KNOWLEDGE. YOUR FUTURE. YOUR WORLD.**
