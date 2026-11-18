import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Megaphone, Menu, User, X } from 'lucide-react';
import { EdunexaLogo } from './EdunexaLogo';
import { useApp } from '../context/AppContext';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, bootstrap, previewMode, refreshBootstrap, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const contact = bootstrap?.cmsBlocks?.contact || {};
  const appearance = bootstrap?.siteAppearance || {};
  const primaryColor = appearance.primaryColor || '#008F9F';

  useEffect(() => {
    const isDraft = new URLSearchParams(location.search).get('preview') === 'draft';
    if (isDraft !== previewMode) {
      refreshBootstrap(isDraft);
    }
  }, [location.search, previewMode, refreshBootstrap]);

  useEffect(() => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const isAdmin = Boolean(user && user.role !== 'student');

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'About Us', to: '/about' },
    { label: 'Subjects', to: '/subjects' },
    { label: 'Examinations', to: '/examinations' },
    { label: 'Learning Centre', to: '/learning-centre' },
    { label: 'Testimonials', to: '/testimonials' },
    { label: 'Contact Us', to: '/contact' },
  ];

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const activeBannerAnnouncement = (bootstrap?.announcements || []).find((a: any) => a.is_banner === 1 && a.is_active === 1);
  const bannerMessage = activeBannerAnnouncement?.banner_text || (appearance.showBanner ? appearance.bannerText : '');

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#10243D]">
      {previewMode && isAdmin && (
        <div className="bg-[#10243D] text-white text-xs px-4 py-2 flex items-center justify-between gap-4">
          <span>
            <strong>Draft Preview Mode:</strong> Displaying unpublished Website Customisation changes.
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/admin/customisation" className="text-[#90DFEC] font-semibold hover:underline">
              Return to Customisation Studio →
            </Link>
          </div>
        </div>
      )}

      {bannerMessage && (
        <div className="bg-[#EAF9FB] border-b border-[#90DFEC] text-[#10243D] text-xs px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
            <Megaphone className="w-3.5 h-3.5 text-[#008F9F] shrink-0" />
            <span>{bannerMessage}</span>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <Link to="/" className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008F9F] rounded-lg">
            <EdunexaLogo />
          </Link>

          {/* Zone 2: Public Navigation Links */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-4 xl:gap-5 text-[13px] font-medium text-[#64748B]">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={active ? { borderBottomColor: primaryColor } : undefined}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-[#10243D] font-semibold'
                      : 'border-transparent hover:text-[#10243D] hover:border-[#90DFEC]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Auth Links OR Authenticated Account Menu */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((o) => !o)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#008F9F] bg-white transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div
                      style={{ backgroundColor: isAdmin ? '#10243D' : primaryColor }}
                      className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                    >
                      {user.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-[#10243D] max-w-[140px] truncate">
                    {user.full_name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50 text-xs"
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="font-bold text-[#10243D] truncate">{user.full_name}</div>
                      <div className="text-[#64748B] truncate">
                        {isAdmin ? user.role.replace('_', ' ') : `${user.department} Stream`}
                      </div>
                    </div>
                    <Link
                      to={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-[#10243D] hover:bg-[#EAF9FB] font-medium"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#008F9F]" />
                      <span>{isAdmin ? 'Admin Dashboard' : 'Dashboard'}</span>
                    </Link>
                    {!isAdmin && (
                      <Link
                        to="/student/profile"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-[#10243D] hover:bg-[#EAF9FB] font-medium"
                      >
                        <User className="w-4 h-4 text-[#008F9F]" />
                        <span>Profile</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-red-600 hover:bg-red-50 font-semibold border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/student/login"
                  className="text-xs xl:text-sm font-medium text-[#10243D] hover:text-[#008F9F] transition-colors whitespace-nowrap shrink-0"
                >
                  Student Login
                </Link>
                <Link
                  to="/student/register"
                  style={{ backgroundColor: primaryColor }}
                  className="px-3.5 py-2 text-xs xl:text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-lg text-[#10243D] hover:bg-[#F4F7FA] min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#10243D] hover:bg-[#EAF9FB]"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              <Link to="/leaders" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[#64748B]">EDUNEXA Leaders</Link>
              <Link to="/community" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[#64748B]">Community</Link>
              <Link to="/verify" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[#64748B]">Verify Certificate</Link>
              <Link to="/faq" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm text-[#64748B]">FAQ &amp; Help</Link>

              {user ? (
                <div className="pt-2 mt-1 border-t border-slate-200 space-y-2">
                  <div className="px-3 py-1 flex items-center gap-2.5">
                    <div
                      style={{ backgroundColor: isAdmin ? '#10243D' : primaryColor }}
                      className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                    >
                      {user.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#10243D] truncate">{user.full_name}</div>
                      <div className="text-xs text-[#64748B] truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
                      onClick={() => setMobileOpen(false)}
                      style={{ backgroundColor: primaryColor }}
                      className="px-3 py-2.5 text-center text-sm font-semibold text-white rounded-lg"
                    >
                      Dashboard
                    </Link>
                    {!isAdmin ? (
                      <Link
                        to="/student/profile"
                        onClick={() => setMobileOpen(false)}
                        className="px-3 py-2.5 text-center text-sm font-semibold text-[#10243D] bg-[#F4F7FA] rounded-lg"
                      >
                        Profile
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 py-2.5 text-center text-sm font-semibold text-red-600 bg-red-50 rounded-lg"
                      >
                        Logout
                      </button>
                    )}
                  </div>
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3 py-2.5 text-center text-sm font-semibold text-red-600 bg-red-50 rounded-lg"
                    >
                      Logout
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    to="/student/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-2.5 text-center text-sm font-semibold text-[#10243D] bg-[#F4F7FA] rounded-lg"
                  >
                    Student Login
                  </Link>
                  <Link
                    to="/student/register"
                    onClick={() => setMobileOpen(false)}
                    style={{ backgroundColor: primaryColor }}
                    className="px-4 py-2.5 text-center text-sm font-semibold text-white rounded-lg"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#10243D] text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-4">
              <EdunexaLogo variant="light" />
              <p className="text-sm text-slate-300 leading-relaxed">
                The Next Generation of Learning. Your Knowledge. Your Future. Your World.
              </p>
              <p className="text-xs text-slate-400">
                {contact.footerNote || 'Independent international examination preparation and assessment community. Free initial access for all students.'}
              </p>
            </div>

            <div>
              <h3 className="font-display font-semibold text-sm text-white mb-4">Platform</h3>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li><Link to="/about" className="hover:text-[#90DFEC] transition-colors">About EDUNEXA</Link></li>
                <li><Link to="/examinations" className="hover:text-[#90DFEC] transition-colors">Examinations</Link></li>
                <li><Link to="/subjects" className="hover:text-[#90DFEC] transition-colors">Subjects &amp; Streams</Link></li>
                <li><Link to="/learning-centre" className="hover:text-[#90DFEC] transition-colors">Learning Centre</Link></li>
                <li><Link to="/leaders" className="hover:text-[#90DFEC] transition-colors">EDUNEXA Leaders</Link></li>
                <li><Link to="/testimonials" className="hover:text-[#90DFEC] transition-colors">Testimonials</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display font-semibold text-sm text-white mb-4">Trust &amp; Verification</h3>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li><Link to="/verify" className="hover:text-[#90DFEC] transition-colors">Certificate Verification</Link></li>
                <li><Link to="/community" className="hover:text-[#90DFEC] transition-colors">Student Community</Link></li>
                <li><Link to="/faq" className="hover:text-[#90DFEC] transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-[#90DFEC] transition-colors">Contact Support</Link></li>
                <li><Link to="/admin/login" className="hover:text-[#90DFEC] transition-colors">Administrator Portal</Link></li>
              </ul>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <h3 className="font-display font-semibold text-sm text-white mb-4">Contact</h3>
              <p>{contact.email || 'admissions@edunexa.org'}</p>
              <p className="text-xs text-slate-400">{contact.supportHours || 'Monday – Friday, 08:00 – 18:00 UTC'}</p>
              <p className="text-xs text-slate-400">{contact.address || 'EDUNEXA Academic Operations'}</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} EDUNEXA. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
