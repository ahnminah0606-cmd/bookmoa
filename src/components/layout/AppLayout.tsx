import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, Home, Book, Library, Activity, Trash2, ChevronDown, LogOut, UserPlus, Copy, Check, X, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, partner, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const inviteCode = user?.spaceId || 'SAYU-INIT';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDrawerOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDrawerOpen]);

  const navItems = [
    { name: '홈', path: '/', icon: Home },
    { name: '현재 책', path: '/current', icon: Book },
    { name: '라이브러리', path: '/library', icon: Library },
    { name: '생각의 흐름', path: '/flow', icon: Activity },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-screen h-dvh w-full min-w-0 bg-white text-gray-900 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-gray-100 flex-col justify-between shrink-0 bg-white">
        <div>
          <div className="h-20 flex items-center px-6">
            <Link to="/" className="flex items-center gap-3 font-semibold text-gray-900">
              <BookOpen className="w-5 h-5" />
              <span>사유의 서재</span>
            </Link>
          </div>
          <nav className="flex flex-col gap-1 px-3 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'font-medium text-gray-900 bg-gray-50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-3 space-y-1 border-t border-gray-100/80">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
              <span className="font-medium text-gray-700 group-hover:text-gray-900">파트너 초대</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {inviteCode.length > 10 ? inviteCode.substring(0, 7) + '..' : inviteCode}
            </span>
          </button>
          
          <Link
            to="/trash"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              location.pathname === '/trash'
                ? 'text-gray-900 bg-gray-50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
            )}
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
            <span>휴지통</span>
          </Link>

          {/* User Profile in Sidebar Bottom */}
          <div className="pt-2 border-t border-gray-100/60 relative" ref={dropdownRef}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-6 h-6 rounded-full bg-gray-100 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-medium shrink-0">
                    {user?.nickname ? user.nickname.charAt(0) : 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-gray-800 truncate">{user?.nickname || '사용자 1'}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </div>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden z-30">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <UserPlus className="w-3.5 h-3.5 text-gray-400" />
                  <span>초대 코드 확인</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50/50 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="메뉴 닫기" className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" onClick={() => setIsDrawerOpen(false)} />
          <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="주 메뉴" className="absolute inset-y-0 left-0 flex w-[min(82vw,320px)] flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5">
              <Link to="/" className="flex items-center gap-3 font-semibold text-gray-900">
                <BookOpen className="h-5 w-5" /><span>사유의 서재</span>
              </Link>
              <button type="button" onClick={() => setIsDrawerOpen(false)} aria-label="메뉴 닫기" className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} className={cn('flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm transition-colors', isActive ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-900')}>
                    <Icon className="h-4 w-4 shrink-0" /><span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="space-y-1 border-t border-gray-100 p-3">
              <button type="button" onClick={() => { setIsDrawerOpen(false); setIsInviteModalOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                <UserPlus className="h-4 w-4 shrink-0 text-gray-400" /><span className="flex-1">파트너 초대</span>
                <span className="max-w-24 truncate rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{inviteCode}</span>
              </button>
              <Link to="/trash" className="flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                <Trash2 className="h-4 w-4 shrink-0 text-gray-400" /><span>휴지통</span>
              </Link>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50/50">
                <LogOut className="h-4 w-4 shrink-0" /><span>로그아웃</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area - Completely free of overlapping floating widgets */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="flex h-16 shrink-0 items-center border-b border-gray-100 px-4 md:hidden">
          <button type="button" onClick={() => setIsDrawerOpen(true)} aria-label="메뉴 열기" aria-controls="mobile-navigation" aria-expanded={isDrawerOpen} className="-ml-2 rounded-lg p-2 text-gray-700 hover:bg-gray-50">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="ml-2 flex min-w-0 items-center gap-2 font-semibold text-gray-900">
            <BookOpen className="h-4 w-4 shrink-0" /><span className="truncate text-sm">사유의 서재</span>
          </Link>
        </header>
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Partner Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-5 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">파트너 초대</h2>
              <button 
                onClick={() => setIsInviteModalOpen(false)} 
                className="text-gray-400 hover:text-gray-900 rounded-md p-1 hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed break-keep">
              파트너에게 아래 초대 코드를 공유해 주세요. 파트너가 로그인 후 '초대 코드로 참여'에 입력하면 하나의 서재를 함께 이용할 수 있습니다.
            </p>

            {/* Invite Code Box */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
              <div className="min-w-0">
                <span className="text-xs text-gray-400 block mb-0.5">내 서재 초대 코드</span>
                <span className="block truncate text-base sm:text-lg font-mono font-medium text-gray-900 tracking-wider">
                  {inviteCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all",
                  isCopied
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-900"
                )}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>코드 복사</span>
                  </>
                )}
              </button>
            </div>

            {/* Members status */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-400 block mb-2">서재 구성원</span>
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-gray-900 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {user?.nickname || '사용자 1'} (나)
                </span>
                <span className="text-[11px] text-gray-400 font-medium">참여 중</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5">
                {partner ? (
                  <>
                    <span className="text-gray-900 flex items-center gap-2 text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      {partner.nickname || partner.displayName || '파트너'} (파트너)
                    </span>
                    <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      연결됨
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-400 flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block animate-pulse" />
                      파트너 초대 대기 중...
                    </span>
                    <span className="text-[11px] text-gray-400">대기 중</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
