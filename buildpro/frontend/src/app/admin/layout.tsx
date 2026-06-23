'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Building2, LayoutDashboard, Box, FileText, BarChart2, Calendar, Brain, LogOut, Bell } from 'lucide-react';

const NAV = [
  { href: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/admin/orders',       icon: FileText,         label: 'Orders'      },
  { href: '/admin/inventory',    icon: Box,              label: 'Inventory'   },
  { href: '/admin/analytics',    icon: BarChart2,        label: 'Analytics'  },
  { href: '/admin/appointments', icon: Calendar,         label: 'Appointments'},
  { href: '/admin/chatbot',      icon: Brain,            label: 'AI & Insights'},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, isLoading, pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;
  if (isLoading || !user) return (
    <div className="min-h-screen bg-construction-dark flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-DEFAULT border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">Access denied</p></div>;

  return (
    <div className="flex h-screen bg-construction-light overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 bg-construction-dark flex flex-col py-4 flex-shrink-0">
        <div className="px-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-DEFAULT rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="font-syne font-bold text-white text-base hidden md:block">BuildPro</span>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-yellow-DEFAULT text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}>
                <Icon size={18} className="flex-shrink-0" />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pt-4 border-t border-white/10">
          <div className="hidden md:block px-3 py-2 mb-2">
            <p className="text-white text-xs font-medium">{user.name}</p>
            <p className="text-gray-500 text-xs">{user.email}</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all w-full">
            <LogOut size={18} className="flex-shrink-0" />
            <span className="hidden md:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
