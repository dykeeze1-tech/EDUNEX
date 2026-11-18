import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { EdunexaLogo } from '../components/EdunexaLogo';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../utils/apiFetch';

export const StudentLoginPage: React.FC = () => {
  const { refreshUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoBanner, setInfoBanner] = useState('');
  const [loading, setLoading] = useState(false);

  // Two-step Password Reset state
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [devResetHint, setDevResetHint] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');

  const doLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
      } else {
        if (data.sessionToken) {
          sessionStorage.setItem('edunexa_token', data.sessionToken);
        }
        await refreshUser();
        navigate('/student/dashboard');
      }
    } catch {
      setError('Unable to reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMsg('');
    setDevResetHint('');
    const res = await apiFetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error || 'Could not process reset request.');
      return;
    }
    setResetMsg(data.message || 'Reset request recorded.');
    if (data.devResetCode) {
      setDevResetHint(data.devResetCode);
      setResetCode(data.devResetCode);
    }
    setResetStep('confirm');
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPassword !== confirmNewPassword) {
      setResetError('New password and confirmation do not match.');
      return;
    }
    const res = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: resetCode, newPassword, confirmPassword: confirmNewPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error || 'Password reset failed.');
      return;
    }
    setResetMode(false);
    setResetStep('request');
    setPassword('');
    setInfoBanner(data.message || 'Password updated. Please sign in.');
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-[#F4F7FA] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <div className="space-y-2">
          <EdunexaLogo />
          <h1 className="font-display font-bold text-2xl text-[#10243D] pt-2">Student Portal Login</h1>
          <p className="text-sm text-[#64748B]">Sign in to access your courses, examinations, AI Tutor, and certificates.</p>
        </div>

        {infoBanner && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            {infoBanner}
          </div>
        )}

        {resetMode ? (
          resetStep === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#10243D] mb-1">Registered Student Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.org"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                />
              </div>
              {resetError && <p className="text-xs text-red-600">{resetError}</p>}
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setResetMode(false)} className="text-xs text-[#64748B] hover:text-[#10243D]">
                  ← Back to login
                </button>
                <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white text-sm font-semibold rounded-lg">
                  Request Reset Code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              {resetMsg && <p className="text-xs text-[#008F9F] bg-[#EAF9FB] p-3 rounded-lg border border-[#90DFEC]">{resetMsg}</p>}
              {devResetHint && (
                <div className="text-xs bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
                  Temporary Reset Code (Dev/Test Mode): <strong className="font-mono-tabular">{devResetHint}</strong>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#10243D] mb-1">Reset Code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#10243D] mb-1">New Password (8+ chars, letters & numbers)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#10243D] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                />
              </div>
              {resetError && <p className="text-xs text-red-600">{resetError}</p>}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(false);
                    setResetStep('request');
                  }}
                  className="text-xs text-[#64748B] hover:text-[#10243D]"
                >
                  ← Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#10243D] text-white text-sm font-semibold rounded-lg">
                  Update Password
                </button>
              </div>
            </form>
          )
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doLogin(email, password);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#10243D] mb-1">Email or Username</label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.org"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#10243D]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setResetStep('request');
                      setResetError('');
                      setResetMsg('');
                    }}
                    className="text-xs text-[#008F9F] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="text-xs font-semibold text-[#64748B]">Quick Demo Student Accounts (to test stream access)</div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => doLogin('amara@student.edunexa.org', 'StudentPass!2026')}
                  className="text-left px-3 py-2 text-xs rounded-lg border border-slate-200 hover:border-[#008F9F] hover:bg-[#EAF9FB]/40 transition-colors flex items-center justify-between"
                >
                  <span><strong className="text-[#10243D]">Amara Nwosu</strong> · Science (60-day eligible)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#008F9F]" />
                </button>
                <button
                  type="button"
                  onClick={() => doLogin('liam@student.edunexa.org', 'StudentPass!2026')}
                  className="text-left px-3 py-2 text-xs rounded-lg border border-slate-200 hover:border-[#008F9F] hover:bg-[#EAF9FB]/40 transition-colors flex items-center justify-between"
                >
                  <span><strong className="text-[#10243D]">Liam Reid</strong> · Arts & Humanities</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#008F9F]" />
                </button>
                <button
                  type="button"
                  onClick={() => doLogin('sofia@student.edunexa.org', 'StudentPass!2026')}
                  className="text-left px-3 py-2 text-xs rounded-lg border border-slate-200 hover:border-[#008F9F] hover:bg-[#EAF9FB]/40 transition-colors flex items-center justify-between"
                >
                  <span><strong className="text-[#10243D]">Sofia Martinez</strong> · Commercial</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#008F9F]" />
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#64748B] pt-2">
              New to EDUNEXA?{' '}
              <Link to="/student/register" className="font-semibold text-[#008F9F] hover:underline">
                Create a free student account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const StudentRegisterPage: React.FC = () => {
  const { refreshUser } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    department: 'Science',
    country: 'Nigeria',
    date_of_birth: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Password and password confirmation do not match.');
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must be at least 8 characters and include at least one letter and one number.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
      } else {
        if (data.sessionToken) {
          sessionStorage.setItem('edunexa_token', data.sessionToken);
        }
        if (data.devVerificationCode) {
          sessionStorage.setItem('edunexa_pending_verify_code', data.devVerificationCode);
        }
        await refreshUser();
        navigate('/student/dashboard');
      }
    } catch {
      setError('Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-[#F4F7FA] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        <div className="space-y-2">
          <EdunexaLogo />
          <h1 className="font-display font-bold text-2xl text-[#10243D] pt-2">Free Student Registration</h1>
          <p className="text-sm text-[#64748B]">
            No payment details or subscriptions required. Access common subjects immediately alongside your academic department.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Chinedu Adeyemi"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Username *</label>
              <input
                type="text"
                required
                minLength={3}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="letters, numbers, _, ., -"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#10243D] mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="student@example.org"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Academic Department *</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              >
                <option value="Science">Science</option>
                <option value="Arts and Humanities">Arts and Humanities</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Country *</label>
              <input
                type="text"
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#10243D] mb-1">Date of Birth (Optional — used for under-18 safety protections)</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 chars, letter + number"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Confirm Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Free Student Account'}
          </button>
        </form>

        <div className="text-center text-xs text-[#64748B]">
          Already registered?{' '}
          <Link to="/student/login" className="font-semibold text-[#008F9F] hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export const AdminLoginPage: React.FC = () => {
  const { refreshUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doAdminLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Administrator login failed.');
      } else {
        if (data.sessionToken) {
          sessionStorage.setItem('edunexa_token', data.sessionToken);
        }
        await refreshUser();
        navigate('/admin/dashboard');
      }
    } catch {
      setError('Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10243D] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <EdunexaLogo />
            <ShieldCheck className="w-5 h-5 text-[#008F9F]" />
          </div>
          <h1 className="font-display font-bold text-2xl text-[#10243D] pt-2">Administrator Portal</h1>
          <p className="text-sm text-[#64748B]">Protected access for Super, Academic, Content, and Moderation administrators.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doAdminLogin(email, password);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#10243D] mb-1">Administrator Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#10243D] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#10243D] hover:bg-[#1a365c] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-[#90DFEC]" />
            {loading ? 'Authenticating...' : 'Authenticate Administrator'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-[#64748B]">Quick Role Test Logins</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => doAdminLogin('admin@edunexa.org', 'EdunexaAdmin!2026')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:border-[#008F9F] text-left"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => doAdminLogin('academic@edunexa.org', 'EdunexaAcademic!2026')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:border-[#008F9F] text-left"
            >
              Academic Admin
            </button>
            <button
              type="button"
              onClick={() => doAdminLogin('content@edunexa.org', 'EdunexaContent!2026')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:border-[#008F9F] text-left"
            >
              Content / Media
            </button>
            <button
              type="button"
              onClick={() => doAdminLogin('mod@edunexa.org', 'EdunexaMod!2026')}
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:border-[#008F9F] text-left"
            >
              Moderator
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-[#64748B]">
          <Link to="/" className="hover:text-[#10243D]">← Return to EDUNEXA Public Site</Link>
        </div>
      </div>
    </div>
  );
};
