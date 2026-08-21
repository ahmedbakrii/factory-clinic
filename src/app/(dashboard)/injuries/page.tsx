"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Clock, User, HardHat, ShieldAlert, CalendarDays, ChevronDown, FileText, X, AlertTriangle, Building2, Send, Flame, Target, Filter, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

const getEmp = (empData: any) => {
  if (!empData) return {};
  return Array.isArray(empData) ? empData[0] : empData;
};

const getShiftName = (dateString: string) => {
  const h = new Date(dateString).getHours();
  return (h >= 7 && h < 19) ? "وردية نهارية" : "وردية ليلية";
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

function HSEContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const [typeFilter, setTypeFilter] = useState(searchParams.get("filter") || "All");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "All");
  
  const [deptFilter, setDeptFilter] = useState(searchParams.get("dept") || "All");
  const [interactiveInjuryFilter, setInteractiveInjuryFilter] = useState<string | null>(null);

  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const timeFilterRef = useRef<HTMLDivElement>(null);

  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  const [stats, setStats] = useState({ total: 0, workInjuries: 0, firstAid: 0, transfers: 0 });

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

      if (timeFilter === "today") {
        const bounds = getIndustrialDayBounds(now);
        start = bounds.start; end = bounds.end;
      } 
      else if (timeFilter === "week") { 
        const daysSinceSat = (now.getDay() + 1) % 7; 
        start.setDate(now.getDate() - daysSinceSat); 
        start = getIndustrialDayBounds(start).start;
        end = getIndustrialDayBounds(now).end; 
      } 
      else if (timeFilter === "month") { 
        start = new Date(now.getFullYear(), now.getMonth(), 1); 
        start = getIndustrialDayBounds(start).start;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end = getIndustrialDayBounds(lastDay).end;
      } 
      else if (timeFilter === "custom") { 
        if (!customStartDate || !customEndDate) { setIsLoading(false); return; } 
        start = getIndustrialDayBounds(new Date(customStartDate)).start;
        end = getIndustrialDayBounds(new Date(customEndDate)).end;
      } 
      else { start = null; end = null; }

      let query = supabase
        .from("visits")
        .select(`
          id, visit_type, status, created_at, diagnosis, recommendation, injury_type, body_part,
          employees (name, iqama_number, employee_number, department, work_place)
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

    } catch (error: any) { 
      console.error("Error fetching HSE data:", error.message || error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { 
    if (timeFilter !== "custom") fetchIncidents(); 
  }, [timeFilter]);

  const baseFilteredIncidents = incidents.filter((incident) => {
    const emp = getEmp(incident.employees);
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.iqama_number || "").includes(searchTerm) || 
                          (emp.employee_number || "").includes(searchTerm) || 
                          (emp.work_place || "").includes(searchTerm);
                          
    const matchesType = typeFilter === "All" || incident.visit_type === typeFilter;
    const matchesStatus = statusFilter === "All" || incident.status === statusFilter;
    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesDept;
  });

  const injMap: Record<string, number> = {}; 
  const depMap: Record<string, number> = {}; 
  const supMap: Record<string, number> = {};
  
  baseFilteredIncidents.forEach(inc => {
    const emp = getEmp(inc.employees);
    const injType = inc.injury_type || inc.diagnosis; 
    if (injType) injMap[injType] = (injMap[injType] || 0) + 1;
    
    const dept = emp.department || "عام";
    depMap[dept] = (depMap[dept] || 0) + 1;
    
    const sup = emp.work_place;
    if (sup) supMap[sup] = (supMap[sup] || 0) + 1;
  });

  const dynamicInjuryStats = Object.entries(injMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const dynamicDeptStats = Object.entries(depMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  const dynamicSupStats = Object.entries(supMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const topDept = dynamicDeptStats.length > 0 ? dynamicDeptStats[0] : null;
  const topSup = dynamicSupStats.length > 0 ? dynamicSupStats[0] : null;
  const topInj = dynamicInjuryStats.length > 0 ? dynamicInjuryStats[0] : null;

  const fullyFilteredIncidents = baseFilteredIncidents.filter((incident) => {
    const matchesInteractive = !interactiveInjuryFilter || (incident.injury_type === interactiveInjuryFilter || incident.diagnosis === interactiveInjuryFilter);
    return matchesInteractive;
  });

  const filterOptions = [
    { id: "today", label: "اليوم (وردية المصنع)" }, 
    { id: "week", label: "الأسبوع الحالي" }, 
    { id: "month", label: "الشهر الحالي" },
    { id: "custom", label: "فترة مخصصة..." }, 
    { id: "all", label: "كل السجلات" }
  ];

  return (
    <div className="p-4 md:p-8 pb-24 font-sans" dir="rtl">
      
      {/* رأس الصفحة وفلتر الوقت */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">إدارة الحوادث وإصابات العمل</h1>
          <p className="text-slate-500 mt-1 font-medium">لوحة تحكم وتحليلات مدير السلامة (HSE)</p>
        </div>
        
        <div className="relative w-full md:w-auto" ref={timeFilterRef}>
          <button type="button" onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)} className="flex items-center justify-between md:justify-start gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl text-sm font-bold transition-all w-full md:w-auto shadow-sm">
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
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end mb-6 animate-in fade-in">
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" /></div>
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" /></div>
          <button onClick={fetchIncidents} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-colors">تطبيق الفلتر</button>
        </div>
      )}

      {/* الكروت الإحصائية العلوية التفاعلية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div onClick={() => { setTypeFilter("All"); setStatusFilter("All"); setDeptFilter("All"); setInteractiveInjuryFilter(null); router.replace('/injuries', undefined); }} className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 ${typeFilter === 'All' && statusFilter === 'All' ? 'bg-slate-800 border-slate-800 ring-4 ring-slate-200' : 'bg-white border-slate-200 hover:border-slate-400'}`}>
           <div className="flex justify-between items-start"><p className={`text-xs font-bold mb-1 ${typeFilter === 'All' && statusFilter === 'All' ? 'text-slate-300' : 'text-slate-500'}`}>إجمالي الحوادث</p><div className={`p-2 rounded-lg ${typeFilter === 'All' && statusFilter === 'All' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}><Activity size={18}/></div></div>
           <h3 className={`text-3xl font-black mt-2 ${typeFilter === 'All' && statusFilter === 'All' ? 'text-white' : 'text-slate-800'}`}>{isLoading ? "..." : stats.total}</h3>
        </div>
        <div onClick={() => { setTypeFilter("Work Injury"); setStatusFilter("All"); }} className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 ${typeFilter === 'Work Injury' && statusFilter === 'All' ? 'bg-orange-500 border-orange-600 ring-4 ring-orange-200' : 'bg-orange-50 border-orange-100 hover:border-orange-300'}`}>
           <div className="flex justify-between items-start"><p className={`text-xs font-bold mb-1 ${typeFilter === 'Work Injury' && statusFilter === 'All' ? 'text-orange-100' : 'text-orange-600'}`}>إصابات عمل</p><div className={`p-2 rounded-lg ${typeFilter === 'Work Injury' && statusFilter === 'All' ? 'bg-orange-600 text-white' : 'bg-orange-200/50 text-orange-700'}`}><HardHat size={18}/></div></div>
           <h3 className={`text-3xl font-black mt-2 ${typeFilter === 'Work Injury' && statusFilter === 'All' ? 'text-white' : 'text-orange-700'}`}>{isLoading ? "..." : stats.workInjuries}</h3>
        </div>
        <div onClick={() => { setTypeFilter("First Aid"); setStatusFilter("All"); }} className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 ${typeFilter === 'First Aid' && statusFilter === 'All' ? 'bg-emerald-500 border-emerald-600 ring-4 ring-emerald-200' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'}`}>
           <div className="flex justify-between items-start"><p className={`text-xs font-bold mb-1 ${typeFilter === 'First Aid' && statusFilter === 'All' ? 'text-emerald-100' : 'text-emerald-600'}`}>إسعافات أولية</p><div className={`p-2 rounded-lg ${typeFilter === 'First Aid' && statusFilter === 'All' ? 'bg-emerald-600 text-white' : 'bg-emerald-200/50 text-emerald-700'}`}><ShieldAlert size={18}/></div></div>
           <h3 className={`text-3xl font-black mt-2 ${typeFilter === 'First Aid' && statusFilter === 'All' ? 'text-white' : 'text-emerald-700'}`}>{isLoading ? "..." : stats.firstAid}</h3>
        </div>
        <div onClick={() => { setStatusFilter("Transferred"); setTypeFilter("All"); }} className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 ${statusFilter === 'Transferred' ? 'bg-purple-500 border-purple-600 ring-4 ring-purple-200' : 'bg-purple-50 border-purple-100 hover:border-purple-300'}`}>
           <div className="flex justify-between items-start"><p className={`text-xs font-bold mb-1 ${statusFilter === 'Transferred' ? 'text-purple-100' : 'text-purple-600'}`}>حالات محولة</p><div className={`p-2 rounded-lg ${statusFilter === 'Transferred' ? 'bg-purple-600 text-white' : 'bg-purple-200/50 text-purple-700'}`}><Send size={18}/></div></div>
           <h3 className={`text-3xl font-black mt-2 ${statusFilter === 'Transferred' ? 'text-white' : 'text-purple-700'}`}>{isLoading ? "..." : stats.transfers}</h3>
        </div>
      </div>

      {/* بؤر الخطر الديناميكية */}
      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-red-800 mb-4 flex items-center gap-2"><Target size={18} /> بؤر الخطر (للحالات المحددة حالياً)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-red-100 text-red-600 p-3 rounded-full"><Flame size={20}/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold mb-0.5">أكثر ورشة بها حوادث</p>
              <p className="text-sm font-black text-slate-800">
                {topDept ? `${topDept.name} ` : "لا توجد بيانات"} 
                {topDept && <span className="text-red-500 text-xs">({topDept.value} حالة)</span>}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-orange-100 text-orange-600 p-3 rounded-full"><User size={20}/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold mb-0.5">المشرف صاحب أعلى سجل</p>
              <p className="text-sm font-black text-slate-800">
                {topSup ? `${topSup.name} ` : "لا توجد بيانات"} 
                {topSup && <span className="text-orange-500 text-xs">({topSup.count} حالة)</span>}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-full"><AlertTriangle size={20}/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold mb-0.5">أكثر نوع حادث متكرر</p>
              <p className="text-sm font-black text-slate-800">
                {topInj ? `${topInj.name} ` : "لا توجد بيانات"} 
                {topInj && <span className="text-purple-500 text-xs">({topInj.count} حالة)</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* الرسوم البيانية التفاعلية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          {interactiveInjuryFilter && (
            <div className="absolute top-4 left-4 z-10 animate-in fade-in">
              <button onClick={() => setInteractiveInjuryFilter(null)} className="flex items-center gap-1 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-slate-700 transition-colors"><X size={14}/> إلغاء الفلتر</button>
            </div>
          )}
          <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> تحليل أنواع الإصابات</h2>
          <p className="text-[11px] text-slate-400 font-bold mb-4">اضغط على العمود لفلترة الحالات في الجدول بالأسفل</p>
          
          <div className="h-64 w-full" dir="ltr">
            {dynamicInjuryStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">لا توجد بيانات مطابقة</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicInjuryStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#475569', fontWeight: 'bold'}} width={100} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', direction: 'rtl' }} />
                  
                  <Bar 
                    dataKey="count" 
                    name="عدد الحالات" 
                    radius={[0, 8, 8, 0]} 
                    barSize={24}
                    onClick={(data: any) => {
                       const clickedName = data?.name;
                       if (interactiveInjuryFilter === clickedName) setInteractiveInjuryFilter(null);
                       else setInteractiveInjuryFilter(clickedName || null);
                    }}
                  >
                    {dynamicInjuryStats.map((entry, index) => (
                      <Cell 
                        cursor="pointer"
                        key={`cell-${index}`} 
                        fill={interactiveInjuryFilter === entry.name ? '#f97316' : interactiveInjuryFilter ? '#fed7aa' : '#3b82f6'} 
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
          {deptFilter !== "All" && (
            <div className="absolute top-4 left-4 z-10 animate-in fade-in">
              <button onClick={() => setDeptFilter("All")} className="flex items-center gap-1 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-slate-700 transition-colors"><X size={14}/> إظهار كل الورش</button>
            </div>
          )}
          <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Building2 size={18} className="text-blue-500" /> التوزيع النسبي للورش</h2>
          <p className="text-[11px] text-slate-400 font-bold mb-4">اضغط على الجزء لفلترة الورشة</p>
          <div className="h-64 w-full" dir="ltr">
            {dynamicDeptStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">لا توجد بيانات مطابقة</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={dynamicDeptStats} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none" label
                    onClick={(data: any) => {
                       const clickedName = data?.name;
                       if (deptFilter === clickedName) setDeptFilter("All");
                       else setDeptFilter(clickedName || "All");
                    }}
                  >
                    {dynamicDeptStats.map((entry, index) => (
                      <Cell 
                        cursor="pointer"
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className={`transition-all duration-300 hover:opacity-80 ${deptFilter !== "All" && deptFilter !== entry.name ? 'opacity-30' : ''}`}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', direction: 'rtl' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* شريط البحث المباشر */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input type="text" placeholder="ابحث باسم الموظف، الإقامة، الرقم الوظيفي، أو المشرف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium transition-shadow" />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
        </div>
      </div>

      {/* قائمة الحالات */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500 mb-4" size={40} /><p className="text-slate-500 font-bold">جاري تحميل السجلات...</p></div>
      ) : fullyFilteredIncidents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm"><AlertTriangle className="mx-auto text-slate-300 mb-4" size={60} /><h3 className="text-xl font-bold text-slate-700">لا توجد حالات مطابقة للفلاتر المحددة</h3></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fullyFilteredIncidents.map((incident) => {
            const isWorkInjury = incident.visit_type === 'Work Injury';
            const isFirstAid = incident.visit_type === 'First Aid';
            const isTransferred = incident.status === 'Transferred';
            const emp = getEmp(incident.employees);
            
            const shiftName = getShiftName(incident.created_at);
            const isNight = shiftName === "وردية ليلية";

            let cardColor = "border-slate-200 hover:border-blue-300 bg-white";
            let iconColor = "bg-blue-50 text-blue-600";
            let typeColor = "bg-blue-100 text-blue-700";
            let stripeColor = "bg-blue-500";
            let Icon = Activity;

            if (isTransferred) { cardColor = "border-purple-200 hover:border-purple-400 bg-purple-50/30"; iconColor = "bg-purple-100 text-purple-600"; typeColor = "bg-purple-200 text-purple-800"; stripeColor = "bg-purple-500"; Icon = Send; }
            else if (isWorkInjury) { cardColor = "border-orange-200 hover:border-orange-400 bg-orange-50/30"; iconColor = "bg-orange-100 text-orange-600"; typeColor = "bg-orange-200 text-orange-800"; stripeColor = "bg-orange-500"; Icon = HardHat; }
            else if (isFirstAid) { cardColor = "border-emerald-200 hover:border-emerald-400 bg-emerald-50/30"; iconColor = "bg-emerald-100 text-emerald-600"; typeColor = "bg-emerald-200 text-emerald-800"; stripeColor = "bg-emerald-500"; Icon = ShieldAlert; }

            return (
              <div key={incident.id} onClick={() => setSelectedIncident(incident)} className={`p-5 rounded-[24px] shadow-sm border transition-all cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden group hover:-translate-y-1 hover:shadow-md ${cardColor}`}>
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${stripeColor}`}></div>
                <div className="flex items-center gap-3 md:w-1/3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${iconColor}`}><Icon size={24} /></div>
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{emp.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1"><Building2 size={10}/> {emp.department}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1"><User size={10}/> مشرف: {emp.work_place || 'غير مسجل'}</p>
                  </div>
                </div>
                <div className="flex-1 w-full bg-white/60 p-3 rounded-xl border border-white/50 text-sm shadow-sm backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 truncate pr-2">{incident.injury_type || incident.diagnosis || 'التفاصيل غير مسجلة'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${typeColor}`}>{isTransferred ? "محول للمستشفى" : incident.visit_type}</span>
                  </div>
                  {incident.body_part && <p className="text-xs text-slate-500 font-medium line-clamp-1 pr-2">المكان: {incident.body_part}</p>}
                </div>
                <div className="text-left md:w-24 shrink-0 flex flex-row md:flex-col justify-between w-full md:justify-center items-center md:items-end">
                  <p className="text-xs font-bold text-slate-500 mb-1">{new Date(incident.created_at).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'})}</p>
                  <p className="text-sm font-black text-slate-800" dir="ltr">{new Date(incident.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' })}</p>
                  <span className={`text-[9px] font-bold px-1.5 rounded mt-1 ${isNight ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{shiftName}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تفاصيل الحادثة */}
      {selectedIncident && (() => {
        const emp = getEmp(selectedIncident.employees);
        return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> تفاصيل وسجل الحالة</h2>
              <button onClick={() => setSelectedIncident(null)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User size={24}/></div><div><h3 className="font-bold text-lg text-slate-800">{emp.name}</h3><p className="text-sm font-bold text-slate-500">{emp.department} | إقامة/وظيفي: <span className="text-slate-700">{emp.iqama_number || emp.employee_number || 'غير مسجل'}</span></p></div></div>
                <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200"><p className="text-xs font-bold text-slate-400 mb-1">وقت الزيارة ({getShiftName(selectedIncident.created_at)})</p><p className="text-sm font-black text-slate-800" dir="ltr">{new Date(selectedIncident.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</p></div>
              </div>
              <div className={`p-5 rounded-2xl border ${selectedIncident.visit_type === 'Work Injury' ? 'bg-orange-50 border-orange-100' : selectedIncident.status === 'Transferred' ? 'bg-purple-50 border-purple-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${selectedIncident.visit_type === 'Work Injury' ? 'text-orange-800' : selectedIncident.status === 'Transferred' ? 'text-purple-800' : 'text-emerald-800'}`}>{selectedIncident.visit_type === 'Work Injury' ? <HardHat size={18}/> : <Activity size={18}/>} التصنيف: {selectedIncident.status === 'Transferred' ? 'محول للمستشفى' : selectedIncident.visit_type}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-white/50 shadow-sm"><p className="text-xs font-bold text-slate-400 mb-1">نوع الإصابة / التشخيص</p><p className="text-sm font-bold text-slate-800">{selectedIncident.injury_type || selectedIncident.diagnosis || 'لم يُحدد'}</p></div>
                  <div className="bg-white p-3 rounded-xl border border-white/50 shadow-sm"><p className="text-xs font-bold text-slate-400 mb-1">مكان الإصابة بالجسم</p><p className="text-sm font-bold text-slate-800">{selectedIncident.body_part || 'غير مسجل'}</p></div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> التقرير والتوصية</h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs font-bold text-slate-500 mb-2">وصف الحالة الطبية:</p><p className="text-sm font-semibold text-slate-800 leading-relaxed">{selectedIncident.diagnosis || 'لا يوجد تفاصيل طبية'}</p></div>
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

export default function SuspensedHSEReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]"><Loader2 className="animate-spin text-blue-500" size={40}/></div>}>
      <HSEContent />
    </Suspense>
  );
}