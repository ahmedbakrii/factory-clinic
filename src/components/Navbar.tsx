"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  Activity,
  Menu,
  X,
  User as UserIcon,
  FileText,
  Camera,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setIsMenuOpen(false);

    const session = localStorage.getItem("clinic_session");

    if (session) {
      setCurrentUser(JSON.parse(session));
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("clinic_session");
    router.push("/login");
  };

  const menuItems = [
    {
      name: "سجل الزيارات",
      icon: <Activity size={17} />,
      href: "/visits",
    },
    {
      name: "الموظفين",
      icon: <Users size={17} />,
      href: "/employees",
    },
    {
      name: "الإصـابـات",
      icon: <ShieldAlert size={17} />,
      href: "/injuries",
    },
    {
      name: "التقارير",
      icon: <FileText size={17} />,
      href: "/reports",
    },
    {
      name: "رقمنة السجلات",
      icon: <Camera size={17} />,
      href: "/digitize",
    },
  ];

  if (
    currentUser &&
    ["ADMIN", "CLINIC_MANAGER"].includes(currentUser.role)
  ) {
    menuItems.push({
      name: "الإعدادات",
      icon: <Settings size={17} />,
      href: "/settings",
    });
  }

  const canAddVisit =
    currentUser && currentUser.role !== "HSE_MANAGER";

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-[72px] md:h-[82px]">

          {/* اللوجو */}
          <Link
            href="/"
            className="flex items-center shrink-0 group"
            aria-label="الصفحة الرئيسية"
          >
            <Image
              src="/logos/clinic-logo-name.png"
              alt="Clinic Logo"
              width={180}
              height={60}
              priority
              className="w-auto h-10 md:h-12 object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* روابط النافبار */}
          <nav className="hidden lg:flex items-center gap-1 mr-auto ml-auto">
            <div className="flex items-center gap-1 bg-slate-50/70 border border-slate-100 rounded-2xl px-2 py-1.5">

              {menuItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? "bg-white text-blue-700 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}

            </div>
          </nav>

          {/* منطقة المستخدم */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">

            {/* المستخدم */}
            {currentUser && (
              <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 min-w-[150px]">

                <div className="p-2 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                  <UserIcon size={16} />
                </div>

                <div className="text-right min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
                    {currentUser.name}
                  </p>

                  {currentUser.isDemo && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase block mt-0.5 w-fit">
                      Demo Mode
                    </span>
                  )}
                </div>

              </div>
            )}

            {/* تسجيل زيارة */}
            {canAddVisit && (
              <Link
                href="/visit/new"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm shadow-emerald-600/20 whitespace-nowrap"
              >
                <Activity size={18} />
                <span>تسجيل زيارة</span>
              </Link>
            )}

            {/* تسجيل الخروج */}
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all p-3 rounded-2xl"
              title="تسجيل خروج"
            >
              <LogOut size={19} />
            </button>

          </div>

          {/* الموبايل */}
          <div className="lg:hidden flex items-center gap-2 mr-auto">

            {canAddVisit && (
              <Link
                href="/visit/new"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Activity size={18} />
                <span>زيارة جديدة</span>
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-600 hover:bg-slate-100 p-2.5 rounded-xl transition-colors"
              aria-label="فتح القائمة"
            >
              {isMenuOpen ? (
                <X size={26} />
              ) : (
                <Menu size={26} />
              )}
            </button>

          </div>
        </div>
      </div>

      {/* القائمة المنسدلة للموبايل */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-xl absolute w-full left-0 animate-in slide-in-from-top-2">

          <div className="px-4 py-4 space-y-1">

            {/* المستخدم */}
            {currentUser && (
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl mb-4 border border-slate-100">

                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <UserIcon size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {currentUser.name}
                  </p>

                  {currentUser.isDemo && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                      Demo Mode
                    </span>
                  )}
                </div>

              </div>
            )}

            {/* الروابط */}
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}

            {/* تسجيل الخروج */}
            <div className="border-t border-slate-100 mt-3 pt-3 pb-2">

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                تسجيل خروج
              </button>

            </div>

          </div>
        </div>
      )}
    </header>
  );
}