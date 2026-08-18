'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // إخفاء الفوتر في صفحة تسجيل الدخول (عشان تبقى شاشة كاملة ونظيفة)
  if (pathname === '/login') return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="print:hidden bg-white border-t py-6 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* الجزء الرسمي الخاص بالعيادة والسلامة */}
        <div className="text-center md:text-right">
          <p className="text-sm font-bold text-gray-600">
            نظام إدارة العيادة    (Energya Clinic) © {currentYear}
          </p>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Energya Steel Solutions - جميع الحقوق محفوظة
          </p>
        </div>

        {/* بصمة المهندس (قابلة للضغط) */}
        <a 
          href="https://www.linkedin.com/in/ahmed-salah-5b0567197?utm_source=share_via&utm_content=profile&utm_medium=member_android" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-center md:text-left bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer block"
        >
          <p className="text-[10px] uppercase tracking-wider font-bold text-blue-800/70 mb-0.5">
            System Architecture & Developed by
          </p>
          <p className="text-sm font-black text-slate-800 flex items-center justify-center md:justify-start gap-1">
            Ahmed Salah 
          </p>
        </a>
        
      </div>
    </footer>
  );
}