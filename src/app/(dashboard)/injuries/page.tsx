"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, Clock, User, HardHat, ShieldAlert, CalendarDays, ChevronDown, FileText, X, AlertTriangle, Building2, Send, Flame, Target, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

// دالة لحل مشكلة TypeScript مع بيانات الموظفين
const getEmp = (empData: any) => {
  if (!empData) return {};
  return Array.isArray(empData) ? empData[0] : empData;
};

export default function HSEReportsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const timeFilterRef = useRef<HTMLDivElement>(null);

  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  const [stats, setStats] = useState({ total: 0, workInjuries: 0, firstAid: 0, transfers: 0 });
  const [injuryTypeStats, setInjuryTypeStats] = useState<{ name: string; count: number }[]>([]);
  const [deptStats, setDeptStats] = useState<{ name: string; value: number }[]>([]);
  const [supervisorStats, setSupervisorStats] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (timeFilterRef.current && !timeFilterRef.current.contains(e.target as Node)) setIsTimeFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start: Date | null = new Date();
      let end: Date | null = new Date();

      if (timeFilter === "today") { start.setHours(0,0,0,0); end.setHours(23,59,59,999); } 
      else if (timeFilter === "week") { const daysSinceSat = (now.getDay() + 1) % 7; start.setDate(now.getDate() - daysSinceSat); start.setHours(0,0,0,0); end.setHours(23,59,59,999); } 
      else if (timeFilter === "month") { start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0,0,0,0); end.setHours(23,59,59,999); } 
      else if (timeFilter === "custom") { if (!customStartDate || !customEndDate) { setIsLoading(false); return; } start = new Date(customStartDate); start.setHours(0,0,0,0); end = new Date(customEndDate); end.setHours(23,59,59,999); } 
      else { start = null; end = null; }

      let query = supabase
        .from("visits")
        .select(`
          id, visit_type, status, created_at, diagnosis, recommendation, injury_type, body_part,
          employees (name, iqama_number, department, work_place)
        `)
        .in('visit_type', ['Work Injury', 'First Aid'])
        .order("created_at", { ascending: false });

      if (start) query = query.gte("created_at", start.toISOString());
      if (end) query = query.lte("created_at", end.toISOString());

      const { data: fetchedData, error } = await query;
      
      if (error) throw error;

      const incidentsData = fetchedData || [];
      setIncidents(incidentsData);

      setStats({
        total: incidentsData.length,
        workInjuries: incidentsData.filter(i => i.visit_type === "Work Injury").length,
        firstAid: incidentsData.filter(i => i.visit_type === "First Aid").length,
        transfers: incidentsData.filter(i => i.status === "Transferred").length,
      });

      const injMap: any = {}; const depMap: any = {}; const supMap: any = {};
      
      incidentsData.forEach(inc => {
        const emp = getEmp(inc.employees);
        
        const injType = inc.injury_type || inc.diagnosis; 
        if (injType) injMap[injType] = (injMap[injType] || 0) + 1;
        
        const dept = emp.department || "عام";
        depMap[dept] = (depMap[dept] || 0) + 1;
        
        const sup = emp.work_place;
        if (sup) supMap[sup] = (supMap[sup] || 0) + 1;
      });

      setInjuryTypeStats(Object.entries(injMap).map(([name, count]) => ({ name, count: count as number })).sort((a, b) => b.count - a.count).slice(0, 5));
      setDeptStats(Object.entries(depMap).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5));
      setSupervisorStats(Object.entries(supMap).map(([name, count]) => ({ name, count: count as number })).sort((a, b) => b.count - a.count));

    } catch (error: any) { 
      console.error("Error fetching HSE data:", error.message || error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { if (timeFilter !== "custom") fetchIncidents(); }, [timeFilter]);

  const filteredIncidents = incidents.filter((incident) => {
    const emp = getEmp(incident.employees);
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.iqama_number || "").includes(searchTerm) || 
                          (emp.work_place || "").includes(searchTerm);
    const matchesType = typeFilter === "All" || incident.visit_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filterOptions = [
    { id: "today", label: "اليوم" }, { id: "week", label: "الأسبوع الحالي" }, { id: "month", label: "الشهر الحالي" },
    { id: "custom", label: "فترة مخصصة..." }, { id: "all", label: "كل السجلات" }
  ];

  const topDept = deptStats.length > 0 ? deptStats[0] : null;
  const topSup = supervisorStats.length > 0 ? supervisorStats[0] : null;
  const topInj = injuryTypeStats.length > 0 ? injuryTypeStats[0] : null;

  return (
    <div className="p-4 md:p-8 pb-24 font-sans" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">إدارة الحوادث وإصابات العمل</h1>
          <p className="text-slate-500 mt-1 font-medium">لوحة تحكم وتحليلات مدير السلامة (HSE)</p>
        </div>
        
        <div className="relative w-full md:w-auto" ref={timeFilterRef}>
          <button type="button" onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)} className="flex items-center justify-between md:justify-start gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl text-sm font-bold transition-all w-full md:w-auto">
            <span className="flex items-center gap-2"><CalendarDays size={18} className="text-orange-600" /> {filterOptions.find(o => o.id === timeFilter)?.label}</span>
            <ChevronDown size={18} className={`transition-transform duration-300 ${isTimeFilterOpen ? "rotate-180" : ""}`} />
          </button>
          {isTimeFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-full md:w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden z-30">
              {filterOptions.map(opt => (
                <button key={opt.id} onClick={() => { setTimeFilter(opt.id as any); setIsTimeFilterOpen(false); }} className={`w-full text-right px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 ${timeFilter === opt.id ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {timeFilter === "custom" && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end mb-6">
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" /></div>
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" /></div>
          <button onClick={fetchIncidents} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold">تطبيق الفلتر</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start"><p className="text-xs font-bold text-slate-500 mb-1">إجمالي حالات الإصابات</p><div className="bg-slate-100 p-2 rounded-lg text-slate-600"><AlertTriangle size={18}/></div></div>
           <h3 className="text-3xl font-black text-slate-800 mt-2">{isLoading ? "..." : stats.total}</h3>
        </div>
        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start"><p className="text-xs font-bold text-orange-600 mb-1">إصابات عمل</p><div className="bg-orange-200/50 p-2 rounded-lg text-orange-700"><HardHat size={18}/></div></div>
           <h3 className="text-3xl font-black text-orange-700 mt-2">{isLoading ? "..." : stats.workInjuries}</h3>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start"><p className="text-xs font-bold text-emerald-600 mb-1">إسعافات أولية</p><div className="bg-emerald-200/50 p-2 rounded-lg text-emerald-700"><ShieldAlert size={18}/></div></div>
           <h3 className="text-3xl font-black text-emerald-700 mt-2">{isLoading ? "..." : stats.firstAid}</h3>
        </div>
        <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start"><p className="text-xs font-bold text-purple-600 mb-1">حالات محولة</p><div className="bg-purple-200/50 p-2 rounded-lg text-purple-700"><Send size={18}/></div></div>
           <h3 className="text-3xl font-black text-purple-700 mt-2">{isLoading ? "..." : stats.transfers}</h3>
        </div>
      </div>

      {!isLoading && incidents.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-bold text-red-800 mb-4 flex items-center gap-2"><Target size={18} /> بؤر الخطر (يجب التركيز عليها)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4">
              <div className="bg-red-100 text-red-600 p-3 rounded-full"><Flame size={20}/></div>
              <div><p className="text-xs text-slate-500 font-bold mb-0.5">أكثر ورشة بها إصابات</p><p className="text-sm font-black text-slate-800">{topDept?.name || "غير محدد"} <span className="text-red-500 text-xs">({topDept?.value} حالة)</span></p></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-full"><User size={20}/></div>
              <div><p className="text-xs text-slate-500 font-bold mb-0.5">المشرف صاحب أعلى سجل</p><p className="text-sm font-black text-slate-800">{topSup?.name || "غير محدد"} <span className="text-orange-500 text-xs">({topSup?.count} حالة)</span></p></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4">
              <div className="bg-purple-100 text-purple-600 p-3 rounded-full"><AlertTriangle size={20}/></div>
              <div><p className="text-xs text-slate-500 font-bold mb-0.5">أكثر نوع إصابة متكرر</p><p className="text-sm font-black text-slate-800">{topInj?.name || "غير محدد"} <span className="text-purple-500 text-xs">({topInj?.count} حالة)</span></p></div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && incidents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> تحليل أنواع الإصابات</h2>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={injuryTypeStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#475569', fontWeight: 'bold'}} width={100} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="count" name="عدد الحالات" fill="#f97316" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={18} className="text-blue-500" /> التوزيع النسبي لإصابات الورش</h2>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptStats} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" label>
                    {deptStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input type="text" placeholder="ابحث باسم المصاب، الإقامة، أو اسم المشرف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 font-medium" />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
        </div>
        <div className="w-full md:w-64">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 font-bold text-slate-700">
            <option value="All">الكل (إصابات وإسعافات)</option>
            <option value="Work Injury">إصابات العمل فقط</option>
            <option value="First Aid">إسعافات أولية فقط</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-orange-500 mb-4" size={40} /><p className="text-slate-500 font-bold">جاري تحميل سجلات السلامة...</p></div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm"><AlertTriangle className="mx-auto text-slate-300 mb-4" size={60} /><h3 className="text-xl font-bold text-slate-700">لا توجد حوادث مسجلة لهذه الفترة</h3></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredIncidents.map((incident) => {
            const isWorkInjury = incident.visit_type === 'Work Injury';
            const emp = getEmp(incident.employees);

            return (
              <div key={incident.id} onClick={() => setSelectedIncident(incident)} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden">
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${isWorkInjury ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                <div className="flex items-center gap-3 md:w-1/3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isWorkInjury ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isWorkInjury ? <HardHat size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{emp.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1"><Building2 size={10}/> {emp.department}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1"><User size={10}/> المشرف: {emp.work_place || 'غير مسجل'}</p>
                  </div>
                </div>
                <div className="flex-1 w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 truncate">{incident.injury_type || incident.diagnosis || 'غير مسجل'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${isWorkInjury ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{incident.visit_type}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">المكان: {incident.body_part || 'غير محدد'}</p>
                </div>
                <div className="text-left md:w-24 shrink-0 flex flex-row md:flex-col justify-between w-full md:justify-center items-center md:items-end">
                  <p className="text-xs font-bold text-slate-400 mb-1">{new Date(incident.created_at).toLocaleDateString('ar-EG')}</p>
                  <p className="text-sm font-black text-slate-700" dir="ltr">{new Date(incident.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' })}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedIncident && (() => {
        const emp = getEmp(selectedIncident.employees);
        return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> تقرير حادث (HSE Incident)</h2>
              <button onClick={() => setSelectedIncident(null)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User size={24}/></div><div><h3 className="font-bold text-lg text-slate-800">{emp.name}</h3><p className="text-sm font-bold text-slate-500">{emp.department} | مشرف: <span className="text-orange-600">{emp.work_place || 'غير مسجل'}</span></p></div></div>
                <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200"><p className="text-xs font-bold text-slate-400 mb-1">وقت وتاريخ الحادثة</p><p className="text-sm font-black text-slate-800" dir="ltr">{new Date(selectedIncident.created_at).toLocaleString('ar-EG')}</p></div>
              </div>
              <div className={`p-5 rounded-2xl border ${selectedIncident.visit_type === 'Work Injury' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${selectedIncident.visit_type === 'Work Injury' ? 'text-orange-800' : 'text-emerald-800'}`}>{selectedIncident.visit_type === 'Work Injury' ? <HardHat size={18}/> : <ShieldAlert size={18}/>} معلومات الإصابة الفنية</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-white/50"><p className="text-xs font-bold text-slate-400 mb-1">نوع الإصابة / الحادث</p><p className="text-sm font-bold text-slate-800">{selectedIncident.injury_type || selectedIncident.diagnosis || 'لم يُحدد'}</p></div>
                  <div className="bg-white p-3 rounded-xl border border-white/50"><p className="text-xs font-bold text-slate-400 mb-1">مكان الإصابة بالجسم</p><p className="text-sm font-bold text-slate-800">{selectedIncident.body_part || 'لم يُحدد'}</p></div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> التقرير الطبي المبدئي للعيادة</h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs font-bold text-slate-500 mb-2">وصف الحالة:</p><p className="text-sm font-semibold text-slate-800 leading-relaxed">{selectedIncident.diagnosis || 'لا يوجد تفاصيل طبية'}</p></div>
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs font-bold text-slate-500 mb-2">الإجراء المتخذ (Recommendation):</p><p className="text-sm font-semibold text-slate-800 leading-relaxed">{selectedIncident.recommendation || 'لم يُسجل إجراء'}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

    </div>
  );
}