"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  Activity, HardHat, Send, Clock, ShieldAlert, Loader2, ChevronDown, 
  Flame, AlertTriangle, HeartPulse, User, CalendarDays, Filter
} from "lucide-react";

export default function MobileFirstDashboard() {
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom" | "all">("week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({ totalVisits: 0, workInjuries: 0, firstAid: 0, transfers: 0 });
  const [deptStats, setDeptStats] = useState<{ name: string; count: number; percentage: number }[]>([]);
  const [bodyPartStats, setBodyPartStats] = useState<{ name: string; count: number; percentage: number }[]>([]);
  const [injuryTypeStats, setInjuryTypeStats] = useState<{ name: string; count: number; percentage: number }[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  // 🚀 دعم مخصص للمس الشاشة على الموبايل لغلق الفلتر
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside); // سحر الموبايل
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const fetchDashboardAnalytics = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start: Date | null = new Date();
      let end: Date | null = new Date();

      if (timeFilter === "today") {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } 
      else if (timeFilter === "week") {
        // الأسبوع يبدأ من السبت
        const dayOfWeek = now.getDay(); // 0 = الأحد, 6 = السبت
        const daysSinceSaturday = (dayOfWeek + 1) % 7; 
        start.setDate(now.getDate() - daysSinceSaturday);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } 
      else if (timeFilter === "month") {
        // من أول يوم في الشهر الحالي
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } 
      else if (timeFilter === "custom") {
        if (!customStartDate || !customEndDate) {
          setIsLoading(false);
          return;
        }
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      } 
      else {
        start = null;
        end = null;
      }

      let visitsQuery = supabase.from("visits").select(`id, visit_type, diagnosis, status, created_at, employees (name, department)`).order("created_at", { ascending: false });
      if (start) visitsQuery = visitsQuery.gte("created_at", start.toISOString());
      if (end) visitsQuery = visitsQuery.lte("created_at", end.toISOString());
      const { data: visitsData } = await visitsQuery;
      const visits = visitsData || [];

      let injuriesQuery = supabase.from("work_injuries").select("id, injury_type, body_part, created_at");
      if (start) injuriesQuery = injuriesQuery.gte("created_at", start.toISOString());
      if (end) injuriesQuery = injuriesQuery.lte("created_at", end.toISOString());
      const { data: injuriesData } = await injuriesQuery;
      const injuries = injuriesData || [];

      const totalVisitsCount = visits.length;
      setStats({
        totalVisits: totalVisitsCount,
        workInjuries: visits.filter(v => v.visit_type === "Work Injury").length,
        firstAid: visits.filter(v => v.visit_type === "First Aid").length,
        transfers: visits.filter(v => v.status === "Transferred").length,
      });

      const deptMap: { [key: string]: number } = {};
      visits.forEach(v => { const dept = (v.employees as any)?.department || "عام"; deptMap[dept] = (deptMap[dept] || 0) + 1; });
      setDeptStats(Object.entries(deptMap).map(([name, count]) => ({ name, count, percentage: totalVisitsCount > 0 ? Math.round((count / totalVisitsCount) * 100) : 0 })).sort((a, b) => b.count - a.count).slice(0, 4));

      const bodyPartMap: { [key: string]: number } = {};
      injuries.forEach(i => { if (i.body_part) bodyPartMap[i.body_part] = (bodyPartMap[i.body_part] || 0) + 1; });
      const totalInjuredParts = injuries.filter(i => i.body_part).length;
      setBodyPartStats(Object.entries(bodyPartMap).map(([name, count]) => ({ name, count, percentage: totalInjuredParts > 0 ? Math.round((count / totalInjuredParts) * 100) : 0 })).sort((a, b) => b.count - a.count).slice(0, 4));

      const injuryTypeMap: { [key: string]: number } = {};
      injuries.forEach(i => { if (i.injury_type) injuryTypeMap[i.injury_type] = (injuryTypeMap[i.injury_type] || 0) + 1; });
      const totalInjuryTypes = injuries.filter(i => i.injury_type).length;
      setInjuryTypeStats(Object.entries(injuryTypeMap).map(([name, count]) => ({ name, count, percentage: totalInjuryTypes > 0 ? Math.round((count / totalInjuryTypes) * 100) : 0 })).sort((a, b) => b.count - a.count).slice(0, 4));

      setRecentVisits(visits.slice(0, 5));

    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (timeFilter !== "custom") {
      fetchDashboardAnalytics();
    }
  }, [timeFilter]);

  const filterOptions = [
    { id: "today", label: "اليوم" },
    { id: "week", label: "الأسبوع الحالي (من السبت)" },
    { id: "month", label: "الشهر الحالي" },
    { id: "custom", label: "فترة مخصصة..." },
    { id: "all", label: "كل الأوقات" }
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans selection:bg-blue-100" dir="rtl">
      
      <header className="bg-white px-5 py-4 sticky top-0 z-30 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">الداشبورد</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">عيادة المصنع (HSE)</p>
        </div>

        <div className="relative self-end md:self-auto w-full md:w-auto" ref={filterRef}>
          <button 
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-between md:justify-start gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3.5 md:py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 w-full md:w-auto"
          >
            <span className="flex items-center gap-2"><CalendarDays size={18} className="text-blue-600" /> {filterOptions.find(o => o.id === timeFilter)?.label}</span>
            <ChevronDown size={18} className={`transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 md:left-0 top-full mt-2 w-full md:w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
              {filterOptions.map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => { setTimeFilter(opt.id as any); setIsFilterOpen(false); }}
                  className={`w-full text-right px-5 py-4 md:py-3 text-sm font-bold transition-colors border-b border-slate-50 last:border-0 active:bg-blue-100
                    ${timeFilter === opt.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {timeFilter === "custom" && (
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
            <div className="w-full md:flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono" />
            </div>
            <div className="w-full md:flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono" />
            </div>
            <button type="button" onClick={fetchDashboardAnalytics} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
              <Filter size={18} /> تطبيق الفلتر
            </button>
          </div>
        )}
        
        {/* كروت الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          <Link href="/visits" className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-28 relative overflow-hidden group">
            <div className="absolute -left-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} /></div>
            <p className="text-xs text-slate-500 font-bold">إجمالي الزيارات</p>
            <div className="flex items-end justify-between"><h3 className="text-3xl font-black text-slate-800">{isLoading ? "..." : stats.totalVisits}</h3><div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Activity size={16}/></div></div>
          </Link>

          <Link href="/hse-reports" className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-28 relative overflow-hidden group">
            <div className="absolute -left-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-orange-500"><HardHat size={80} /></div>
            <p className="text-xs text-slate-500 font-bold">إصابات عمل</p>
            <div className="flex items-end justify-between"><h3 className="text-3xl font-black text-orange-600">{isLoading ? "..." : stats.workInjuries}</h3><div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600"><HardHat size={16}/></div></div>
          </Link>

          <Link href="/hse-reports" className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-28 relative overflow-hidden group">
            <div className="absolute -left-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500"><ShieldAlert size={80} /></div>
            <p className="text-xs text-slate-500 font-bold">إسعافات أولية</p>
            <div className="flex items-end justify-between"><h3 className="text-3xl font-black text-emerald-600">{isLoading ? "..." : stats.firstAid}</h3><div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><ShieldAlert size={16}/></div></div>
          </Link>

          <Link href="/visits" className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-28 relative overflow-hidden group">
            <div className="absolute -left-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity text-purple-500"><Send size={80} /></div>
            <p className="text-xs text-slate-500 font-bold">حالات محولة</p>
            <div className="flex items-end justify-between"><h3 className="text-3xl font-black text-purple-600">{isLoading ? "..." : stats.transfers}</h3><div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><Send size={16}/></div></div>
          </Link>
        </div>

        {/* التحليلات المتقدمة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5"><Flame size={16} className="text-red-500" /> معدل الزيارات للورش</h2>
            <div className="space-y-4">
              {isLoading ? <div className="py-4 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div> :
               deptStats.length === 0 ? <p className="text-xs text-slate-400 text-center">لا بيانات</p> :
               deptStats.map((item, i) => (
                <div key={i}><div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-700 truncate max-w-[150px]">{item.name}</span><span className="text-slate-400">{item.count}</span></div><div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percentage}%` }}></div></div></div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5"><AlertTriangle size={16} className="text-amber-500" /> أماكن الإصابة في الجسم</h2>
            <div className="space-y-4">
              {isLoading ? <div className="py-4 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div> :
               bodyPartStats.length === 0 ? <p className="text-xs text-slate-400 text-center">لا إصابات</p> :
               bodyPartStats.map((item, i) => (
                <div key={i}><div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-700 truncate max-w-[150px]">{item.name}</span><span className="text-slate-400">{item.count}</span></div><div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.percentage}%` }}></div></div></div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5"><HeartPulse size={16} className="text-orange-500" /> طبيعة الإصابة</h2>
            <div className="space-y-4">
              {isLoading ? <div className="py-4 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div> :
               injuryTypeStats.length === 0 ? <p className="text-xs text-slate-400 text-center">لا إصابات</p> :
               injuryTypeStats.map((item, i) => (
                <div key={i}><div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-700 truncate max-w-[150px]">{item.name}</span><span className="text-slate-400">{item.count}</span></div><div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${item.percentage}%` }}></div></div></div>
              ))}
            </div>
          </div>
        </div>

        {/* قائمة الزيارات الأخيرة */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex justify-between items-center"><h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> أحدث الحالات السجل</h2></div>
          <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div>
            ) : recentVisits.length === 0 ? (
              <p className="p-8 text-center text-slate-400 font-bold text-xs">لا توجد زيارات</p>
            ) : (
              recentVisits.map((visit) => (
                <div key={visit.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><User size={18} className="text-slate-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-slate-800 truncate">{visit.employees?.name || "عامل غير مسجل"}</h4><span className="text-[10px] text-slate-400 font-mono shrink-0 pt-0.5" dir="ltr">{new Date(visit.created_at).toLocaleDateString('ar-EG')}</span></div>
                    <div className="flex items-center gap-2 flex-wrap"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">{visit.employees?.department || "عام"}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${visit.visit_type === 'Work Injury' ? 'bg-orange-50 text-orange-600' : visit.visit_type === 'First Aid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{visit.visit_type}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}