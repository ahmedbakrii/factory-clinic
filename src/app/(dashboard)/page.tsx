"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Activity, HardHat, Send, Clock, ShieldAlert, Loader2, ChevronDown, Flame, AlertTriangle, HeartPulse, User, CalendarDays, Filter } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function MobileFirstDashboard() {
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({ totalVisits: 0, workInjuries: 0, firstAid: 0, transfers: 0 });
  const [deptStats, setDeptStats] = useState<{ name: string; value: number }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; visits: number; injuries: number }[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
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

      if (timeFilter === "today") { start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); } 
      else if (timeFilter === "week") { const daysSinceSaturday = (now.getDay() + 1) % 7; start.setDate(now.getDate() - daysSinceSaturday); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); } 
      else if (timeFilter === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); } 
      else if (timeFilter === "custom") { if (!customStartDate || !customEndDate) { setIsLoading(false); return; } start = new Date(customStartDate); start.setHours(0, 0, 0, 0); end = new Date(customEndDate); end.setHours(23, 59, 59, 999); } 
      else { start = null; end = null; }

      // ⚠️ التعديل الجوهري: بنسحب كل حاجة من جدول visits الموحد
      let visitsQuery = supabase.from("visits").select(`
        id, visit_type, status, created_at, diagnosis, injury_type, body_part, 
        employees (name, department)
      `).order("created_at", { ascending: false });

      if (start) visitsQuery = visitsQuery.gte("created_at", start.toISOString());
      if (end) visitsQuery = visitsQuery.lte("created_at", end.toISOString());
      
      const { data: visitsData, error } = await visitsQuery;
      if (error) throw error;
      
      const visits = visitsData || [];

      // 1. الإحصائيات العلوية
      setStats({
        totalVisits: visits.length,
        workInjuries: visits.filter(v => v.visit_type === "Work Injury").length,
        firstAid: visits.filter(v => v.visit_type === "First Aid").length,
        transfers: visits.filter(v => v.status === "Transferred").length,
      });

      // 2. نسبة التردد للورش (Pie Chart)
      const deptMap: { [key: string]: number } = {};
      visits.forEach(v => { const dept = (v.employees as any)?.department || "عام"; deptMap[dept] = (deptMap[dept] || 0) + 1; });
      setDeptStats(Object.entries(deptMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5));

      // 3. معدل التردد الزمني (Area Chart)
      const trendMap: { [key: string]: { visits: number, injuries: number } } = {};
      visits.forEach(v => {
        const dateStr = new Date(v.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
        if (!trendMap[dateStr]) trendMap[dateStr] = { visits: 0, injuries: 0 };
        trendMap[dateStr].visits += 1;
        if (v.visit_type === "Work Injury" || v.visit_type === "First Aid") trendMap[dateStr].injuries += 1;
      });
      const trendArray = Object.entries(trendMap).map(([date, counts]) => ({ date, ...counts })).reverse();
      setTrendData(trendArray);

      // 4. أحدث 5 زيارات
      setRecentVisits(visits.slice(0, 5));

    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (timeFilter !== "custom") fetchDashboardAnalytics(); }, [timeFilter]);

  const filterOptions = [
    { id: "today", label: "اليوم" },
    { id: "week", label: "الأسبوع الحالي (من السبت)" },
    { id: "month", label: "الشهر الحالي" },
    { id: "custom", label: "فترة مخصصة..." },
    { id: "all", label: "كل الأوقات" }
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24 font-sans selection:bg-blue-100" dir="rtl">
      
      <header className="bg-white px-5 py-4 sticky top-0 z-30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">لـوحـة الـتـحـكـم</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">مؤشرات الأداء (HSE Analytics)</p>
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
        
        {timeFilter === "custom" && (
          <div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
            <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono" /></div>
            <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-sm font-mono" /></div>
            <button type="button" onClick={fetchDashboardAnalytics} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"><Filter size={18} /> تطبيق</button>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          <Link href="/visits" className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 md:p-5 rounded-[20px] shadow-md active:scale-95 transition-transform flex flex-col justify-between h-32 relative overflow-hidden group">
            <Activity className="absolute -left-2 -top-2 opacity-10 text-white w-24 h-24 transform group-hover:scale-110 transition-transform" />
            <p className="text-blue-100 font-semibold text-sm">الزيارات</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-white">{isLoading ? "..." : stats.totalVisits}</h3></div>
          </Link>

          <Link href="/injuries" className="bg-white p-4 md:p-5 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute -left-2 -top-2 opacity-5 text-orange-500"><HardHat size={80} /></div>
            <p className="text-slate-500 font-bold text-sm">إصابات العمل</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-orange-600">{isLoading ? "..." : stats.workInjuries}</h3><div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><HardHat size={16}/></div></div>
          </Link>

          <Link href="/injuries" className="bg-white p-4 md:p-5 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute -left-2 -top-2 opacity-5 text-emerald-500"><ShieldAlert size={80} /></div>
            <p className="text-slate-500 font-bold text-sm">إسعافات أولية</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-emerald-600">{isLoading ? "..." : stats.firstAid}</h3><div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><ShieldAlert size={16}/></div></div>
          </Link>

          <Link href="/visits" className="bg-white p-4 md:p-5 rounded-[20px] shadow-sm border border-slate-100 active:scale-95 transition-transform flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute -left-2 -top-2 opacity-5 text-purple-500"><Send size={80} /></div>
            <p className="text-slate-500 font-bold text-sm">حالات محولة</p>
            <div className="flex items-end justify-between"><h3 className="text-4xl font-black text-purple-600">{isLoading ? "..." : stats.transfers}</h3><div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Send size={16}/></div></div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-500" /> معدل تردد العيادة الزمني</h2>
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
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorInjuries" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} labelStyle={{ color: '#64748b', marginBottom: '4px' }} />
                    <Area type="monotone" name="كل الزيارات" dataKey="visits" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                    <Area type="monotone" name="الإصابات" dataKey="injuries" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorInjuries)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2"><Flame size={18} className="text-red-500" /> أكثر الورش تردداً</h2>
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={30} /></div>
            ) : deptStats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-sm">لا توجد بيانات</div>
            ) : (
              <div className="flex-1 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={deptStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {deptStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> أحدث الحالات السجل</h2>
            <Link href="/visits" className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">عرض الكل</Link>
          </div>

          <div className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div>
            ) : recentVisits.length === 0 ? (
              <p className="p-8 text-center text-slate-400 font-bold text-xs">لا توجد زيارات حديثة</p>
            ) : (
              recentVisits.map((visit) => (
                <div key={visit.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200"><User size={18} className="text-slate-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-slate-800 truncate">{visit.employees?.name || "عامل غير مسجل"}</h4><span className="text-[10px] text-slate-400 font-mono shrink-0 pt-0.5" dir="ltr">{new Date(visit.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span></div>
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