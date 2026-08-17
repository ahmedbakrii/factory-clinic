"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, HeartPulse, ShieldAlert, Settings, LogOut, Activity, Menu, X, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setIsMenuOpen(false);
    const session = localStorage.getItem("clinic_session");
    if (session) setCurrentUser(JSON.parse(session));
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("clinic_session");
    router.push("/login");
  };

  const menuItems = [
    { name: "الرئيسية", icon: <LayoutDashboard size={18} />, href: "/" },
    { name: "سجل الزيارات", icon: <Activity size={18} />, href: "/visits" },
    { name: "الموظفين", icon: <Users size={18} />, href: "/employees" },
    { name: "إصابات (HSE)", icon: <ShieldAlert size={18} />, href: "/Work_injuries" },
    { name: "التقارير", icon: <ShieldAlert size={18} />, href: "/reports" },

  ];

  // إخفاء الإعدادات لو اليوزر مجرد ممرض أو زائر (اختياري)
  if (currentUser && ['ADMIN', 'SAFETY', 'CLINIC_MGR'].includes(currentUser.id)) {
    menuItems.push({ name: "الإعدادات", icon: <Settings size={18} />, href: "/settings" });
  }

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-blue-600 p-2 rounded-xl text-white"><HeartPulse size={24} /></div>
            <div>
              <span className="font-black text-lg md:text-xl text-slate-900 tracking-tight block leading-none">Factory Clinic</span>
              <span className="text-[10px] md:text-xs text-slate-500 font-bold">HSE Department</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            {menuItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className={`flex items-center gap-1.5 text-sm font-bold py-2 border-b-2 transition-all ${isActive ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"}`}>
                  {item.icon} {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            
            {/* عرض اسم اليوزر وشارة الزائر */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <div className={`p-1.5 rounded-lg bg-${currentUser.color}-100 text-${currentUser.color}-600`}><UserIcon size={16}/></div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{currentUser.user}</p>
                  {currentUser.id === 'DEMO' ? 
                    <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Demo Mode</span> : 
                    <span className="text-[10px] text-slate-500 font-semibold">{currentUser.name}</span>
                  }
                </div>
              </div>
            )}

            <Link href="/visit/new" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm shadow-emerald-600/20">
              <Activity size={18} /> تسجيل زيارة
            </Link>
            <button onClick={handleLogout} className="text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors p-2.5 rounded-xl" title="تسجيل خروج">
              <LogOut size={20} />
            </button>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
              {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>

        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-xl absolute w-full left-0 animate-in slide-in-from-top-2">
          <div className="px-4 py-4 space-y-1">
            
            {/* يوزر الموبايل */}
            {currentUser && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                 <div className={`p-2 rounded-lg bg-${currentUser.color}-100 text-${currentUser.color}-600`}><UserIcon size={20}/></div>
                 <div>
                   <p className="text-sm font-bold text-slate-800">{currentUser.user}</p>
                   <p className="text-xs text-slate-500">{currentUser.name}</p>
                 </div>
              </div>
            )}

            {menuItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-colors ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
                  {item.icon} {item.name}
                </Link>
              );
            })}
            <div className="border-t border-slate-100 mt-2 pt-2 pb-2">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={18} /> تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}