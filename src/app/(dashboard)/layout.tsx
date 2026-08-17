"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, HeartPulse, Pill, ShieldAlert, Settings, LogOut, Activity, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: "الرئيسية والإحصائيات", icon: <LayoutDashboard size={20} />, href: "/" },
    { name: "سجل الزيارات", icon: <Activity size={20} />, href: "/visits" },
    { name: "سجل الموظفين", icon: <Users size={20} />, href: "/employees" },
    { name: "مخزن الأدوية", icon: <Pill size={20} />, href: "/inventory" },
    { name: "إصابات العمل (HSE)", icon: <ShieldAlert size={20} />, href: "/hse-reports" },
    { name: "الإعدادات", icon: <Settings size={20} />, href: "/settings" },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f1f5f9] overflow-hidden font-sans relative" dir="rtl">
      
      {/* 1. هيدر الموبايل */}
      <div className="md:hidden shrink-0 bg-[#0f172a] text-white p-4 flex justify-between items-center z-40 shadow-md relative">
        <div className="flex items-center gap-2">
          <HeartPulse size={26} className="text-blue-500" />
          <h1 className="font-bold text-lg">Factory Clinic</h1>
        </div>
        <button 
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors active:scale-95"
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* 2. خلفية ضبابية تمنع لمس الشاشة وراء القائمة */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* 3. القائمة الجانبية (Sidebar) */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-[#1e293b] text-slate-300 flex flex-col shadow-2xl transition-all duration-300 ease-in-out
        md:relative md:translate-x-0 md:opacity-100 md:pointer-events-auto
        ${isMobileMenuOpen ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none"}
      `}>
        <div className="hidden md:flex h-20 items-center px-6 border-b border-slate-700/50 bg-[#0f172a]">
          <HeartPulse size={28} className="text-blue-500 ml-3" />
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Factory Clinic</h1>
            <p className="text-xs text-slate-400">إدارة السلامة والصحة المهنية</p>
          </div>
        </div>

        <div className="md:hidden flex items-center justify-between p-5 border-b border-slate-700/50 bg-[#0f172a]">
           <span className="font-bold text-white text-lg">القائمة الرئيسية</span>
           <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg active:scale-95"><X size={22}/></button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-semibold
                  ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "hover:bg-slate-800 hover:text-white"}`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50 bg-[#1e293b]">
          <Link 
            href="/visit/new" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full mb-3 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Activity size={20} /> تسجيل زيارة جديدة
          </Link>
        </div>
      </aside>

      {/* 4. مساحة المحتوى */}
      <main className="flex-1 overflow-y-auto relative w-full z-10">
        {children}
      </main>
    </div>
  );
}