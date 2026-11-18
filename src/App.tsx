import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { LeadersPage } from './pages/LeadersPage';
import { VerifyCertificatePage } from './pages/VerifyCertificatePage';
import {
  AboutPage,
  ContactPage,
  FaqPage,
  LegalPage,
  PublicCommunityPage,
  PublicExaminationsPage,
  PublicLearningCentrePage,
  PublicSubjectsPage,
  TestimonialsPage,
} from './pages/PublicPages';
import { AdminLoginPage, StudentLoginPage, StudentRegisterPage } from './pages/AuthPages';
import { StudentPortal } from './pages/StudentPortal';
import { ExamRunnerPage, ResultDetailPage } from './pages/ExamRunnerPage';
import { AdminPortal } from './pages/AdminPortal';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/examinations" element={<PublicLayout><PublicExaminationsPage /></PublicLayout>} />
          <Route path="/subjects" element={<PublicLayout><PublicSubjectsPage /></PublicLayout>} />
          <Route path="/learning-centre" element={<PublicLayout><PublicLearningCentrePage /></PublicLayout>} />
          <Route path="/leaders" element={<PublicLayout><LeadersPage /></PublicLayout>} />
          <Route path="/community" element={<PublicLayout><PublicCommunityPage /></PublicLayout>} />
          <Route path="/testimonials" element={<PublicLayout><TestimonialsPage /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FaqPage /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
          <Route path="/verify" element={<PublicLayout><VerifyCertificatePage /></PublicLayout>} />
          <Route path="/privacy" element={<PublicLayout><LegalPage kind="privacy" /></PublicLayout>} />
          <Route path="/terms" element={<PublicLayout><LegalPage kind="terms" /></PublicLayout>} />

          {/* Authentication Routes */}
          <Route path="/login" element={<PublicLayout><StudentLoginPage /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><StudentRegisterPage /></PublicLayout>} />
          <Route path="/student/login" element={<PublicLayout><StudentLoginPage /></PublicLayout>} />
          <Route path="/student/register" element={<PublicLayout><StudentRegisterPage /></PublicLayout>} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Student Portal & Official Examination Runner */}
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/student/exam/:id" element={<ExamRunnerPage />} />
          <Route path="/student/results/:attemptId" element={<ResultDetailPage />} />
          <Route path="/student/:section" element={<StudentPortal />} />

          {/* Administrator Portal */}
          <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
          <Route path="/admin/dashboard" element={<AdminPortal />} />
          <Route path="/admin/:section" element={<AdminPortal />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
