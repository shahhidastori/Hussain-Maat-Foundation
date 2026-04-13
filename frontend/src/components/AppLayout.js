import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Receipt, 
  HandCoins, 
  CheckSquare, 
  Users, 
  Bell, 
  LogOut,
  Calendar,
  Menu,
  X,
  History,
  Globe,
  ArrowLeft
} from 'lucide-react';
import { Button } from './ui/button';
import { getInitials } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_khata-connect-1/artifacts/c9uorwus_hmf_full_logo.svg';

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const { t, toggleLanguage, language, isUrdu } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/notifications/unread-count`);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count');
    }
  };

  const memberNavItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/notifications', label: t('notifications'), icon: Bell, badge: unreadCount },
  ];

  const adminNavItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/fee-submission', label: t('collectFee'), icon: Receipt },
    { path: '/fund-allocation', label: t('allocateFunds'), icon: HandCoins },
    { path: '/allocation-history', label: t('allocationHistory'), icon: History },
    { path: '/approvals', label: t('approvals'), icon: CheckSquare },
    { path: '/monthly-fees', label: t('monthlyFees'), icon: Calendar },
    { path: '/users', label: t('users'), icon: Users },
    { path: '/notifications', label: t('notifications'), icon: Bell, badge: unreadCount },
  ];

  const navItems = isAdmin() ? adminNavItems : memberNavItems;

  const isActive = (path) => location.pathname === path;
  const isDashboard = location.pathname === '/dashboard';

  const handleNavClick = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className={`min-h-screen bg-slate-50 ${isUrdu ? 'rtl' : 'ltr'}`}>
      {/* Desktop Sidebar */}
      <aside className={`desktop-sidebar ${isUrdu ? 'right-0 left-auto border-l border-r-0' : ''}`}>
        {/* Clickable Logo with Brand Name */}
        <button 
          onClick={handleLogoClick}
          className="flex flex-col items-center gap-2 mb-6 hover:opacity-80 transition-opacity w-full"
          data-testid="sidebar-logo"
        >
          <img src={LOGO_URL} alt="HMF" className="h-14 w-auto" />
          <span className="text-xs font-semibold text-slate-600 text-center">Hussain Maat Foundation</span>
        </button>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              data-testid={`nav-${item.path.replace('/', '')}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                isActive(item.path)
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              } ${isUrdu ? 'flex-row-reverse text-right' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge > 0 && (
                <span className={`${isUrdu ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Language Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className={`w-full mb-4 rounded-xl border-slate-200 ${isUrdu ? 'flex-row-reverse' : ''}`}
          data-testid="desktop-language-toggle"
        >
          <Globe className="w-4 h-4 mr-2" />
          {language === 'en' ? 'اردو' : 'English'}
        </Button>

        <div className="pt-4 border-t border-slate-200">
          <div className={`flex items-center gap-3 mb-4 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <div className="user-avatar">
              {getInitials(user?.first_name, user?.last_name)}
            </div>
            <div className={`flex-1 min-w-0 ${isUrdu ? 'text-right' : ''}`}>
              <p className="font-medium text-slate-900 truncate text-sm">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-500 truncate" dir="ltr">{user?.phone}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className={`w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 ${isUrdu ? 'flex-row-reverse' : ''}`}
            onClick={logout}
            data-testid="logout-btn"
          >
            <LogOut className={`w-4 h-4 ${isUrdu ? 'ml-2' : 'mr-2'}`} />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-slate-200 z-40 px-4 py-3">
        <div className={`flex items-center justify-between ${isUrdu ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            {/* Back Button - show on inner pages */}
            {!isDashboard && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-lg mr-1"
                data-testid="back-btn"
              >
                <ArrowLeft className={`w-5 h-5 ${isUrdu ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button 
              onClick={handleLogoClick}
              className="flex items-center gap-2"
              data-testid="mobile-logo"
            >
              <img src={LOGO_URL} alt="HMF" className="h-8 w-auto" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="p-2"
            >
              <Globe className="w-5 h-5" />
            </Button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg"
              data-testid="mobile-menu-btn"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed top-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ${
        sidebarOpen 
          ? 'translate-x-0' 
          : isUrdu ? 'translate-x-full' : '-translate-x-full'
      } ${isUrdu ? 'right-0' : 'left-0'}`}>
        <div className="p-4 border-b border-slate-200">
          <div className={`flex items-center gap-3 ${isUrdu ? 'flex-row-reverse' : ''}`}>
            <div className="user-avatar">
              {getInitials(user?.first_name, user?.last_name)}
            </div>
            <div className={`flex-1 min-w-0 ${isUrdu ? 'text-right' : ''}`}>
              <p className="font-medium text-slate-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-500">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              data-testid={`mobile-nav-${item.path.replace('/', '')}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                isActive(item.path)
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100'
              } ${isUrdu ? 'flex-row-reverse text-right' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span className={`${isUrdu ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <Button
            variant="ghost"
            className={`w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 ${isUrdu ? 'flex-row-reverse' : ''}`}
            onClick={logout}
            data-testid="mobile-logout-btn"
          >
            <LogOut className={`w-4 h-4 ${isUrdu ? 'ml-2' : 'mr-2'}`} />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content pt-16 md:pt-0 pb-20 md:pb-6 min-h-screen ${isUrdu ? 'md:mr-[280px] md:ml-0' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Desktop Back Button */}
          {!isDashboard && (
            <button
              onClick={handleBack}
              className={`hidden md:flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 ${isUrdu ? 'flex-row-reverse' : ''}`}
              data-testid="desktop-back-btn"
            >
              <ArrowLeft className={`w-4 h-4 ${isUrdu ? 'rotate-180' : ''}`} />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav">
        <div className={`flex justify-around items-center max-w-md mx-auto ${isUrdu ? 'flex-row-reverse' : ''}`}>
          {(isAdmin() ? adminNavItems.slice(0, 4) : memberNavItems).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-testid={`bottom-nav-${item.path.replace('/', '')}`}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl relative ${
                isActive(item.path) ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              {item.badge > 0 && (
                <span className="notification-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
