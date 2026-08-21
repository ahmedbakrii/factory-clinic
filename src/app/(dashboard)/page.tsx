"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, HardHat, Send, Clock, ShieldAlert, Loader2, ChevronDown, Flame, AlertTriangle, HeartPulse, User, CalendarDays, Filter, Trophy, X, FileText, Pill, StethoscopeIcon } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

const getShiftName = (dateString: string) => {
  const h = new Date(dateString).getHours();
  return (h >= 7 && h < 19) ? "وردية صباحية" : "وردية مسائية";
};

const getIndustrialDayBounds = (date: Date) => {
  const start = new Date(date);
  if (start.getHours() < 7) start.setDate(start.getDate() - 1);
  start.setHours(7, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(6, 59, 59, 999);
  return { start, end };
};

export default function MobileFirstDashboard() {
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [ltiDays, setLtiDays] = useState<number | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null); 

  const [stats, setStats] = useState({ totalVisits: 0, workInjuries: 0, firstAid: 0, transfers: 0 });
  const [deptStats, setDeptStats] = useState<{ name: string; value: number }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; total: number; medical: number; firstAid: number; injury: number; followUp: number }[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("touchstart", handleClickOutside); };
  }, []);

  const fetchDashboardAnalytics = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start: Date | null = new Date();
      let end: Date | null = new Date();

      if (timeFilter === "today") {
        const bounds = getIndustrialDayBounds(now);
        start = bounds.start; end = bounds.end;
      } else if (timeFilter === "week") { 
        const daysSinceSaturday = (now.getDay() + 1) % 7; 
        start.setDate(now.getDate() - daysSinceSaturday); 
        start = getIndustrialDayBounds(start).start;
        end = getIndustrialDayBounds(now).end; 
      } else if (timeFilter === "month") { 
        start = new Date(now.getFullYear(), now.getMonth(), 1); 
        start = getIndustrialDayBounds(start).start;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end = getIndustrialDayBounds(lastDay).end;
      } else if (timeFilter === "custom") { 
        if (!customStartDate || !customEndDate) { setIsLoading(false); return; } 
        start = getIndustrialDayBounds(new Date(customStartDate)).start;
        end = getIndustrialDayBounds(new Date(customEndDate)).end;
      } else { start = null; end = null; }

      const { data: lastInjuryData } = await supabase.from("visits").select("created_at").eq("visit_type", "Work Injury").order("created_at", { ascending: false }).limit(1);
      if (lastInjuryData && lastInjuryData.length > 0) {
        const lastDate = new Date(lastInjuryData[0].created_at);
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        setLtiDays(Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      } else { setLtiDays(0); }

      let visitsQuery = supabase.from("visits").select(`
        *, employees (name, department, work_place, iqama_number, employee_number), visit_medications ( quantity, medicines (name) )
      `).order("created_at", { ascending: false });

      if (start) visitsQuery = visitsQuery.gte("created_at", start.toISOString());
      if (end) visitsQuery = visitsQuery.lte("created_at", end.toISOString());
      
      const { data: visitsData, error } = await visitsQuery;
      if (error) throw error;
      const visits = visitsData || [];

      setStats({
        totalVisits: visits.length,
        workInjuries: visits.filter(v => v.visit_type === "Work Injury").length,
        firstAid: visits.filter(v => v.visit_type === "First Aid").length,
        transfers: visits.filter(v => v.status === "Transferred").length,
      });

      const deptMap: { [key: string]: number } = {};
      visits.forEach(v => { const dept = (v.employees as any)?.department || "عام"; deptMap[dept] = (deptMap[dept] || 0) + 1; });
      setDeptStats(Object.entries(deptMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5));

      const trendMap: { [key: string]: { total: number, medical: number, firstAid: number, injury: number, followUp: number } } = {};
      visits.forEach(v => {
        const dateStr = new Date(v.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
        if (!trendMap[dateStr]) trendMap[dateStr] = { total: 0, medical: 0, firstAid: 0, injury: 0, followUp: 0 };
        
        trendMap[dateStr].total += 1;
        
        if (v.visit_type === "Medical Complaint") trendMap[dateStr].medical += 1;
        else if (v.visit_type === "First Aid") trendMap[dateStr].firstAid += 1;
        else if (v.visit_type === "Work Injury") trendMap[dateStr].injury += 1;
        else if (v.visit_type === "Follow Up") trendMap[dateStr].followUp += 1;
      });
      const trendArray = Object.entries(trendMap).map(([date, counts]) => ({ date, ...counts })).reverse();
      setTrendData(trendArray);

      setRecentVisits(visits.slice(0, 8)); 

    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (timeFilter !== "custom") fetchDashboardAnalytics(); }, [timeFilter]);

  const filterOptions = [
    { id: "today", label: "اليوم (وردية المصنع)" },
    { id: "week", label: "الأسبوع الحالي" },
    { id: "month", label: "الشهر الحالي" },
    { id: "custom", label: "فترة مخصصة..." },
    { id: "all", label: "كل الأوقات" }
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans selection:bg-blue-100" dir="rtl">
      <header className="bg-white px-5 py-4 sticky top-0 z-30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">لـوحـة الـتـحـكـم</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">مؤشرات أداء السلامة (HSE Analytics)</p>
        </div>

        <div className="relative self-end md:self-auto w-full md:w-auto" ref={filterRef}>
          <button type="button" onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center justify-between md:justify-start gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3.5 md:py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 w-full md:w-auto">
            <span className="flex items-center gap-2"><CalendarDays size={18} className="text-blue-600" /> {filterOptions.find(o => o.id === timeFilter)?.label}</span>
            <ChevronDown size={18} className={`transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`} />
          </button>
          {isFilterOpen && (
            <div className="absolute right-0 md:left-0 top-full mt-2 w-full md:w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden z-50">
              {filterOptions.map(opt => (
                <button type="button" key={opt.id} onClick={() => { setTimeFilter(opt.id as any); setIsFilterOpen(false); }} className="w-full text-right px-5 py-4 md:py-3 text-sm font-bold transition-colors border-b border-slate-50 hover:bg-slate-50">{opt.label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        <div className="bg-gradient-to-l from-emerald-500 to-teal-600 rounded-[24px] p-6 md:p-8 text-white shadow-lg flex items-center justify-between relative overflow-hidden animate-in fade-in zoom-in-95">
          <Trophy className="absolute -left-6 -top-6 w-40 h-40 opacity-10 rotate-12" />
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-black mb-1 drop-shadow-md flex items-center gap-2">
              <ShieldAlert size={24} className="text-emerald-200"/> أيام عمل آمنة (LTI Free)
            </h2>
            <p className="text-emerald-100 text-sm md:text-base font-medium">عدد الأيام منذ آخر إصابة عمل مسجلة بالنظام</p>
          </div>
          <div className="relative z-10 text-center">
            <div className="text-5xl md:text-6xl font-black drop-shadow-lg leading-none">
              {ltiDays !== null ? ltiDays : <Loader2 className="animate-spin inline" />}
            </div>
            <span className="text-emerald-100 font-bold mt-1 block">يوم عمل</span>
          </div>
        </div>

        {timeFilter === "custom" && (
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
            <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono" /></div>
            <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono" /></div>
            <button type="button" onClick={fetchDashboardAnalytics} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"><Filter size={18} /> تطبيق</button>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {/* ⚠️ يودي لصفحة الزيارات مش التقارير */}
          <Link href="/visits" className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 md:p-5 rounded-[20px] shadow-md active:scale-95 hover:shadow-lg transition-all flex flex-col justify-between h-32 relative overflow-hidden group">
            <Activity className="absolute -left-2 -top-2 opacity-10 text-white w-24 h-24 transform group-hover:scale-110 transition-transform" />
            <p className="text-blue-100 font-semibold text-sm">إجمالي الزيارات</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-white">{isLoading ? "..." : stats.totalVisits}</h3></div>
          </Link>

          <Link href="/injuries?filter=Work Injury" className="bg-white p-4 md:p-5 rounded-[20px] shadow-sm border border-slate-100 hover:border-orange-200 hover:shadow-md active:scale-95 transition-all flex flex-col justify-between h-32 relative overflow-hidden group cursor-pointer">
            <div className="absolute -left-2 -top-2 opacity-5 text-orange-500 transform group-hover:scale-110 transition-transform"><HardHat size={80} /></div>
            <p className="text-slate-500 font-bold text-sm group-hover:text-orange-600 transition-colors">إصابات</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-orange-600">{isLoading ? "..." : stats.workInjuries}</h3><div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><HardHat size={16}/></div></div>
          </Link>

          <Link href="/injuries?filter=First Aid" className="bg-white p-4 md:p-5 rounded-[20px] shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md active:scale-95 transition-all flex flex-col justify-between h-32 relative overflow-hidden group cursor-pointer">
            <div className="absolute -left-2 -top-2 opacity-5 text-emerald-500 transform group-hover:scale-110 transition-transform"><ShieldAlert size={80} /></div>
            <p className="text-slate-500 font-bold text-sm group-hover:text-emerald-600 transition-colors">إسعافات أولية</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-emerald-600">{isLoading ? "..." : stats.firstAid}</h3><div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><ShieldAlert size={16}/></div></div>
          </Link>

          {/* ⚠️ يودي لصفحة الإصابات ويعرض المحولين */}
          <Link href="/injuries?status=Transferred" className="bg-white p-4 md:p-5 rounded-[20px] shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-md active:scale-95 transition-all flex flex-col justify-between h-32 relative overflow-hidden group cursor-pointer">
            <div className="absolute -left-2 -top-2 opacity-5 text-purple-500 transform group-hover:scale-110 transition-transform"><Send size={80} /></div>
            <p className="text-slate-500 font-bold text-sm group-hover:text-purple-600 transition-colors">حالات محولة للمستشفى</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-purple-600">{isLoading ? "..." : stats.transfers}</h3><div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Send size={16}/></div></div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-500" /> معدل تردد العيادة الزمني (تفصيلي)</h2>
            </div>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={30} /></div>
            ) : trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 font-bold text-sm">لا توجد بيانات للفترة المحددة</div>
            ) : (
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/><stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorMedical" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorFirstAid" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorInjury" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorFollowUp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', direction: 'rtl' }} labelStyle={{ color: '#64748b', marginBottom: '4px' }} />
                    
                    <Area type="monotone" name="إجمالي الحالات" dataKey="total" stroke="#64748b" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" name="مرضية" dataKey="medical" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMedical)" />
                    <Area type="monotone" name="إسعافات" dataKey="firstAid" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFirstAid)" />
                    <Area type="monotone" name="إصابة عمل" dataKey="injury" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorInjury)" />
                    <Area type="monotone" name="متابعة" dataKey="followUp" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorFollowUp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2"><Flame size={18} className="text-red-500" /> أكثر الورش تردداً</h2>
            <p className="text-xs text-slate-400 font-semibold mb-4">اضغط على الورشة لفلترة الحالات</p>
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={30} /></div>
            ) : deptStats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-sm">لا توجد بيانات</div>
            ) : (
              <div className="flex-1 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie 
                      data={deptStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none"
                      // ⚠️ التعديل المهم هنا: بيودي لصفحة الزيارات مش التقارير 
                      onClick={(data: any) => { 
                         const clickedName = data?.name;
                         if (clickedName) router.push(`/visits?department=${clickedName}`);
                      }} 
                      className="cursor-pointer"
                    >
                      {deptStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> أحدث الحالات السجل (اضغط للتفاصيل)</h2>
            <Link href="/visits" className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">سجل العيادة كامل</Link>
          </div>

          <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div>
            ) : recentVisits.length === 0 ? (
              <p className="p-8 text-center text-slate-400 font-bold text-xs">لا توجد زيارات حديثة</p>
            ) : (
              recentVisits.map((visit) => {
                const shiftName = getShiftName(visit.created_at); 
                const isNight = shiftName === "وردية مسائية";
                
                return (
                <div key={visit.id} onClick={() => setSelectedVisit(visit)} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><User size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{visit.employees?.name || "عامل غير مسجل"}</h4>
                      <div className="flex flex-col items-end shrink-0 pt-0.5" dir="ltr">
                        <span className="text-[11px] text-slate-500 font-black">{new Date(visit.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                        <span className={`text-[9px] font-bold px-1.5 rounded mt-0.5 ${isNight ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{shiftName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[100px]">{visit.employees?.department || "عام"}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${visit.visit_type === 'Work Injury' ? 'bg-orange-50 text-orange-600' : visit.visit_type === 'First Aid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{visit.visit_type}</span>
                    </div>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>

      </main>

      {selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> تفاصيل الزيارة</h2>
              <button onClick={() => setSelectedVisit(null)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User size={24}/></div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{selectedVisit.employees?.name}</h3>
                    <p className="text-sm font-bold text-slate-500">{selectedVisit.employees?.department} | {selectedVisit.employees?.iqama_number ? `إقامة: ${selectedVisit.employees.iqama_number}` : `وظيفي: ${selectedVisit.employees.employee_number}`}</p>
                  </div>
                </div>
                <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 mb-1">وقت الزيارة ({getShiftName(selectedVisit.created_at)})</p>
                  <p className="text-sm font-black text-slate-800" dir="ltr">{new Date(selectedVisit.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><p className="text-xs text-slate-400 font-bold mb-1">الحرارة</p><p className="font-black text-slate-700">{selectedVisit.temperature || '--'} °C</p></div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><p className="text-xs text-slate-400 font-bold mb-1">النبض</p><p className="font-black text-slate-700">{selectedVisit.pulse || '--'} bpm</p></div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><p className="text-xs text-slate-400 font-bold mb-1">الضغط</p><p className="font-black text-slate-700" dir="ltr">{selectedVisit.blood_pressure || '--'}</p></div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><p className="text-xs text-slate-400 font-bold mb-1">السكر</p><p className="font-black text-slate-700">{selectedVisit.rbs || '--'} mg</p></div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><StethoscopeIcon size={18} className="text-indigo-500"/> التقرير الطبي للعيادة</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">التشخيص (Diagnosis):</p><p className="text-sm font-semibold text-slate-800">{selectedVisit.diagnosis || 'غير مسجل'}</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">التوصية (Recommendation):</p><p className="text-sm font-semibold text-slate-800">{selectedVisit.recommendation || 'غير مسجل'}</p></div>
                  {selectedVisit.injury_type && (
                    <div className="flex gap-4">
                      <div className="flex-1 bg-orange-50 p-3 rounded-xl border border-orange-100"><p className="text-xs font-bold text-orange-600 mb-1">نوع الإصابة:</p><p className="text-sm font-bold text-orange-800">{selectedVisit.injury_type}</p></div>
                      <div className="flex-1 bg-orange-50 p-3 rounded-xl border border-orange-100"><p className="text-xs font-bold text-orange-600 mb-1">الجزء المصاب:</p><p className="text-sm font-bold text-orange-800">{selectedVisit.body_part}</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}