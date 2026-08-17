"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, User, HeartPulse, HardHat, Eye, Activity } from "lucide-react";

const ROLES = [
  { id: "ADMIN", name: "مدير النظام (Admin)", user: "أحمد صلاح", icon: <ShieldAlert size={32} />, color: "blue", desc: "صلاحيات كاملة لكل أجزاء النظام" },
  { id: "SAFETY", name: "مدير السلامة (HSE)", user: "مهندس السلامة", icon: <HardHat size={32} />, color: "orange", desc: "إدارة إصابات العمل والتقارير" },
  { id: "CLINIC_MGR", name: "مدير العيادة", user: "الممرض الرئيسي", icon: <HeartPulse size={32} />, color: "emerald", desc: "إشراف طبي وصلاحيات تعديل" },
  { id: "NURSE", name: "ممرض عيادة", user: "ممرض مناوب", icon: <Activity size={32} />, color: "purple", desc: "تسجيل الزيارات اليومية فقط" },
  { id: "DEMO", name: "زائر (Demo Mode)", user: "متفرج", icon: <Eye size={32} />, color: "slate", desc: "تصفح النظام بالكامل (بدون حفظ)" },
];

export default function LoginPage() {
  const router = useRouter();

  // لو مسجل دخول قبل كده، نرجعه للداشبورد
  useEffect(() => {
    const session = localStorage.getItem("clinic_session");
    if (session) router.push("/");
  }, [router]);

  const handleLogin = (role: any) => {
    // حفظ بيانات اليوزر في المتصفح
    localStorage.setItem("clinic_session", JSON.stringify(role));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
      
      <div className="text-center mb-10 animate-in slide-in-from-top-8">
        <div className="bg-blue-600 p-4 rounded-2xl text-white inline-block mb-4 shadow-xl shadow-blue-200">
          <HeartPulse size={40} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Factory Clinic ERP</h1>
        <p className="text-slate-500 font-bold mt-2">نظام إدارة العيادة والسلامة والصحة المهنية</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-xl border border-slate-100 w-full max-w-4xl animate-in zoom-in-95">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">اختر الصلاحية للدخول للنظام</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => handleLogin(role)}
              className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-right group active:scale-95
                border-${role.color}-100 bg-${role.color}-50/30 hover:bg-${role.color}-50 hover:border-${role.color}-500
              `}
            >
              <div className={`p-3 rounded-xl mb-4 bg-${role.color}-100 text-${role.color}-600 group-hover:scale-110 transition-transform`}>
                {role.icon}
              </div>
              <h3 className={`font-black text-lg text-${role.color}-900`}>{role.name}</h3>
              <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1"><User size={14}/> {role.user}</p>
              <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{role.desc}</p>
            </button>
          ))}
        </div>
      </div>
      
    </div>
  );
}