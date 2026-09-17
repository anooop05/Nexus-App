import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Database,
  FileText,
  MessageSquare,
  Video,
  BookmarkCheck,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { type User } from '../services/api';

export type TabType = 'jobs' | 'resume' | 'agent' | 'shortlist' | 'briefings';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: User | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  isBackendConnected: boolean;
  shortlistCount: number;
  runningTasks?: Record<string, string | boolean>;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  isAuthenticated,
  onOpenAuth,
  onLogout,
  shortlistCount,
  runningTasks,
}: NavbarProps) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'jobs', label: 'Jobs & Scraper', icon: Database },
    { id: 'resume', label: 'Resume Matcher', icon: FileText },
    { id: 'agent', label: 'AI Agent Chat', icon: MessageSquare, badge: 'Tool Calling' },
    { id: 'shortlist', label: 'Shortlist', icon: BookmarkCheck, count: shortlistCount },
    { id: 'briefings', label: 'Briefings', icon: Video },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & Status Badge */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className="flex items-center space-x-2.5 focus:outline-none group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:scale-105 transition duration-150">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-slate-900">
                    NEXUS
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 tracking-wide uppercase">
                    AI Agent
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Autonomous Career Intelligence
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative ${isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="ml-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[10px] font-medium">
                      {item.badge}
                    </span>
                  )}
                  {runningTasks && runningTasks[item.id] && (
                    <span
                      className="relative flex h-2.5 w-2.5 ml-1"
                      title={typeof runningTasks[item.id] === 'string' ? (runningTasks[item.id] as string) : 'Task running in background'}
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: Auth Button or User Profile */}
          <div className="flex items-center space-x-2.5">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-xs transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 pr-3 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors text-slate-800"
                >
                  <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold max-w-[130px] truncate hidden sm:inline-block">
                    {user?.email || 'User'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-xs font-medium text-slate-900 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 space-y-1 animate-fadeIn">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {runningTasks && runningTasks[item.id] && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    )}
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}