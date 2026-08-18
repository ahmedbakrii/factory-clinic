"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, User, Activity, Loader2, ArrowRight, ShieldAlert, Building2, HardHat, Stethoscope } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showDemoRoles, setShowDemoRoles] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("clinic_session");
    if (session) router.push("/");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        setErrorMsg("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }

      const sessionData = { 
        id: data.id, 
        username: data.username, 
        name: data.name || data.username,
        role: data.role, 
        isDemo: false 
      };
      localStorage.setItem("clinic_session", JSON.stringify(sessionData));
      
      router.push("/");
    } catch (error) {
      setErrorMsg("حدث خطأ في الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: string, roleNameAr: string) => {
    const sessionData = { 
      id: "DEMO", 
      username: `demo_user`, 
      name: `زائر (${roleNameAr})`, 
      role: role, 
      isDemo: true 
    };
    localStorage.setItem("clinic_session", JSON.stringify(sessionData));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans selection:bg-blue-100" dir="rtl">
      
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-100 relative">
        
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative z-10">
          <div className="mb-10 text-center md:text-right">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-lg shadow-blue-600/30">
              <Activity size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">تسجيل الدخول</h1>
            <p className="text-slate-500 font-medium mt-2">مرحباً بك في نظام العيادة والسلامة المهنية</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
                <ShieldAlert size={18}/> {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم</label>
              <div className="relative">
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full p-4 pr-12 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-semibold" placeholder="أدخل اسم المستخدم" />
                <User className="absolute right-4 top-4 text-slate-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-4 pr-12 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-semibold" placeholder="••••••••" dir="ltr" />
                <Lock className="absolute right-4 top-4 text-slate-400" size={20} />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-slate-900/20 flex justify-center items-center gap-2 mt-4 active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : "دخول النظام"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm font-bold text-slate-500 mb-4">هل ترغب في استكشاف النظام؟</p>
            <button type="button" onClick={() => setShowDemoRoles(true)} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-3.5 rounded-2xl font-bold transition-all border border-blue-100 flex justify-center items-center gap-2">
              الدخول كزائر (للتجربة) <ArrowRight size={18}/>
            </button>
          </div>
        </div>

        <div className="w-full md:w-1/2 bg-slate-900 p-12 flex-col justify-between hidden md:flex relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle fill="white" cx="2" cy="2" r="2"></circle></pattern></defs><rect x="0" y="0" width="100%" height="100%" fill="url(#dots)"></rect></svg>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-white leading-snug mb-4">Bakrii-Flow<br/><span className="text-blue-500">ERP System</span></h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">نظام متكامل لإدارة العيادات الطبية، سجلات الموظفين، تقارير السلامة والصحة المهنية، وإصابات العمل.</p>
          </div>

          <div className="relative z-10 bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <p className="text-white font-bold text-sm">💡 مصمم لضمان السرعة والدقة في بيئات العمل الصناعية.</p>
          </div>
        </div>
      </div>

      {showDemoRoles && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">اختر الصلاحية للتجربة</h2>
            <p className="text-slate-500 text-center font-bold text-sm mb-8">سيتم تفعيل وضع القراءة فقط (لن يتم حفظ البيانات الحقيقية)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => handleDemoLogin('ADMIN', 'مدير نظام')} className="p-5 border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 rounded-2xl text-right transition-all group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><User size={24}/></div>
                <h3 className="font-black text-lg text-slate-800">مدير النظام (Admin)</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">صلاحيات كاملة على كل النظام</p>
              </button>

              <button onClick={() => handleDemoLogin('CLINIC_MANAGER', 'مدير عيادة')} className="p-5 border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl text-right transition-all group">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Building2 size={24}/></div>
                <h3 className="font-black text-lg text-slate-800">مدير العيادة</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">إدارة الأدوية والأقسام والتقارير</p>
              </button>

              <button onClick={() => handleDemoLogin('HSE_MANAGER', 'مدير سلامة')} className="p-5 border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 rounded-2xl text-right transition-all group">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><HardHat size={24}/></div>
                <h3 className="font-black text-lg text-slate-800">مدير سلامة (HSE)</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">متابعة بؤر الخطر وإصابات العمل</p>
              </button>

              <button onClick={() => handleDemoLogin('NURSE', 'ممرض')} className="p-5 border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 rounded-2xl text-right transition-all group">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Stethoscope size={24}/></div>
                <h3 className="font-black text-lg text-slate-800">ممرض العيادة</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">تسجيل الزيارات وصرف الأدوية</p>
              </button>
            </div>

            <button onClick={() => setShowDemoRoles(false)} className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-colors">إلغاء</button>
          </div>
        </div>
      )}

    </div>
  );
}
