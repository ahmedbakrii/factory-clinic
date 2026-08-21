"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, Loader2, Clock, User, Activity, HardHat, HeartPulse, ShieldAlert, Send, CalendarDays, ChevronDown, AlertCircle, X, FileText, Pill, Download, FileUp, StethoscopeIcon } from "lucide-react";

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

function VisitsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [visits, setVisits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "All");
  const [deptFilter, setDeptFilter] = useState(searchParams.get("department") || "All");
  const [showChronicOnly, setShowChronicOnly] = useState(false); 

  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom" | "all">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const timeFilterRef = useRef<HTMLDivElement>(null);

  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [visitStats, setVisitStats] = useState({ current: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (timeFilterRef.current && !timeFilterRef.current.contains(e.target as Node)) setIsTimeFilterOpen(false);
      if (excelMenuRef.current && !excelMenuRef.current.contains(e.target as Node)) setIsExcelMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (timeFilter === "today") { const b = getIndustrialDayBounds(now); start = b.start; end = b.end; } 
      else if (timeFilter === "week") { const s = new Date(); const daysSinceSat = (s.getDay() + 1) % 7; s.setDate(s.getDate() - daysSinceSat); start = getIndustrialDayBounds(s).start; end = getIndustrialDayBounds(now).end; } 
      else if (timeFilter === "month") { start = getIndustrialDayBounds(new Date(now.getFullYear(), now.getMonth(), 1)).start; end = getIndustrialDayBounds(new Date(now.getFullYear(), now.getMonth() + 1, 0)).end; } 
      else if (timeFilter === "custom") { if (!customStartDate || !customEndDate) { setIsLoading(false); return; } start = getIndustrialDayBounds(new Date(customStartDate)).start; end = getIndustrialDayBounds(new Date(customEndDate)).end; }

      let query = supabase.from("visits").select(`*, employees (id, name, iqama_number, employee_number, department, is_chronic, chronic_disease_notes)`).order("created_at", { ascending: false });
      if (start) query = query.gte("created_at", start.toISOString());
      if (end) query = query.lte("created_at", end.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      setVisits(data || []);
    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (timeFilter !== "custom") fetchVisits(); }, [timeFilter]);

  const openVisitDetails = async (visit: any) => {
    setSelectedVisit(visit);
    setIsDetailsLoading(true);
    try {
      const [vitalsRes, injuriesRes, medsRes, historyRes] = await Promise.all([
        supabase.from('visit_vitals').select('*').eq('visit_id', visit.id).maybeSingle(),
        supabase.from('injuries').select('*').eq('visit_id', visit.id).maybeSingle(),
        supabase.from('visit_medications').select('*, medicines(name)').eq('visit_id', visit.id),
        supabase.from('visits').select('id').eq('employee_id', visit.employee_id).order('created_at', { ascending: true })
      ]);
      const fullHistory = historyRes.data || [];
      const currentIndex = fullHistory.findIndex(v => v.id === visit.id) + 1;
      setSelectedVisit({ ...visit, vitals: vitalsRes.data, injury: injuriesRes.data, medications: medsRes.data });
      setVisitStats({ current: currentIndex, total: fullHistory.length });
    } catch (error) { console.error("Error details:", error); } finally { setIsDetailsLoading(false); }
  };

  const downloadVisitsTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ['Iqama num', 'Name', 'Nationality', 'Age', 'TEMP', 'PULSE', 'Blood Preasure', 'RBS', 'Work place', 'Supervisor', 'Disease', 'Recommendation', 'Transferred', 'Date', 'Time In'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visits_Template");
    XLSX.writeFile(wb, "Visits_Template.xlsx");
    setIsExcelMenuOpen(false);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.id === "DEMO") return alert("👁️ وضع المشاهدة (Demo Mode) مفعل. غير مصرح لك بالرفع.");

    setIsExcelMenuOpen(false);
    setIsLoading(true);
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

        let successCount = 0;

        for (const row of jsonData as any[]) {
          const iqama = row['Iqama num'];
          if (!iqama) continue;

          let empId;
          const { data: existEmp } = await supabase.from('employees').select('id').eq('iqama_number', String(iqama)).single();
          if (existEmp) {
            empId = existEmp.id;
          } else {
            const { data: newEmp } = await supabase.from('employees').insert({
              iqama_number: String(iqama), name: row['Name'] || 'غير مسجل', nationality: row['Nationality'], department: row['Work place'], work_place: row['Supervisor']
            }).select('id').single();
            empId = newEmp?.id;
          }

          if (!empId) continue;

          let visitDate = new Date();
          try {
            if (row['Date']) {
              let dString = String(row['Date']).split(' ')[0];
              let tString = row['Time In'] ? String(row['Time In']) : "00:00:00";
              visitDate = new Date(`${dString}T${tString}`);
              if (isNaN(visitDate.getTime())) visitDate = new Date(); 
            }
          } catch { visitDate = new Date(); }

          const isTransferred = String(row['Transferred']).toLowerCase().includes('transferred') && !String(row['Transferred']).toLowerCase().includes('not') ? 'Transferred' : 'Completed';

          const { data: newVisit } = await supabase.from('visits').insert({
            employee_id: empId, visit_type: "Medical Complaint", diagnosis: row['Disease'], recommendation: row['Recommendation'], status: isTransferred, created_at: visitDate.toISOString()
          }).select('id').single();

          if (newVisit?.id) {
            if (row['TEMP'] || row['PULSE'] || row['Blood Preasure'] || row['RBS']) {
              await supabase.from('visit_vitals').insert({
                visit_id: newVisit.id, temperature: parseFloat(row['TEMP']) || null, pulse: parseInt(row['PULSE']) || null, blood_pressure: row['Blood Preasure'] || null, rbs: parseInt(row['RBS']) || null
              });
            }
            successCount++;
          }
        }
        alert(`✅ تم رفع ${successCount} زيارة تاريخية بنجاح!`);
        fetchVisits();
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) { alert("❌ خطأ: " + error.message); } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const filteredVisits = visits.filter((visit) => {
    const emp = visit.employees || {};
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.iqama_number || "").includes(searchTerm) ||
                          (emp.employee_number || "").includes(searchTerm);
    const matchesType = typeFilter === "All" || visit.visit_type === typeFilter;
    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    const matchesChronic = showChronicOnly ? emp.is_chronic : true;
    
    return matchesSearch && matchesType && matchesDept && matchesChronic;
  });

  const filterOptions = [
    { id: "today", label: "زيارات اليوم" },
    { id: "week", label: "الأسبوع الحالي" },
    { id: "month", label: "الشهر الحالي" },
    { id: "custom", label: "فترة مخصصة..." },
    { id: "all", label: "كل السجلات" }
  ];

  const uniqueDepts = Array.from(new Set(visits.map(v => v.employees?.department).filter(Boolean)));
  
  const currentStats = {
    total: visits.length,
    medical: visits.filter(v => v.visit_type === 'Medical Complaint').length,
    injury: visits.filter(v => v.visit_type === 'Work Injury').length,
    firstAid: visits.filter(v => v.visit_type === 'First Aid').length,
    followUp: visits.filter(v => v.visit_type === 'Follow Up').length,
  };

  return (
    <div className="p-4 md:p-8 pb-24 font-sans bg-[#f8fafc] min-h-screen" dir="rtl">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">سجل الزيارات</h1>
          <p className="text-slate-500 mt-1 font-medium">سجل تفصيلي شامل للحالات الطبية</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-auto" ref={excelMenuRef}>
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleExcelUpload} />
            <button onClick={() => setIsExcelMenuOpen(!isExcelMenuOpen)} className="w-full sm:w-auto bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-bold flex items-center justify-between sm:justify-center gap-2 transition-colors shadow-sm">
              <div className="flex items-center gap-2"><FileText size={18} /> إدارة الإكسيل</div>
              <ChevronDown size={18} className={`transition-transform duration-300 ${isExcelMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {isExcelMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden z-30 animate-in fade-in zoom-in-95">
                <button onClick={downloadVisitsTemplate} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50 flex items-center gap-2"><Download size={16} /> قالب إدخال الزيارات</button>
                <button onClick={() => { fileInputRef.current?.click(); setIsExcelMenuOpen(false); }} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors flex items-center gap-2"><FileUp size={16} /> رفع سجل تاريخي</button>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-auto" ref={timeFilterRef}>
            <button type="button" onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)} className="w-full sm:w-auto flex items-center justify-between gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
              <span className="flex items-center gap-2"><CalendarDays size={18} /> {filterOptions.find(o => o.id === timeFilter)?.label || "الفلتر الزمني"}</span>
            </button>
            {isTimeFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden z-30 animate-in fade-in zoom-in-95">
                {filterOptions.map(opt => (
                  <button key={opt.id} onClick={() => { setTimeFilter(opt.id as any); setIsTimeFilterOpen(false); }} className="w-full text-right px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 hover:bg-slate-50">{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {timeFilter === "custom" && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end mb-6 animate-in fade-in">
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <button onClick={fetchVisits} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-colors">تطبيق الفلتر</button>
        </div>
      )}

      {/* كروت الإحصائيات والفلاتر السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div onClick={() => setTypeFilter("All")} className={`p-4 rounded-2xl border cursor-pointer transition-all ${typeFilter === 'All' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
          <div className="flex items-center gap-2 mb-2"><Activity size={16} className={typeFilter === 'All' ? 'text-slate-300' : 'text-slate-400'} /><span className="text-xs font-bold">الكل</span></div>
          <div className="text-2xl font-black">{isLoading ? "..." : currentStats.total}</div>
        </div>
        <div onClick={() => setTypeFilter("Medical Complaint")} className={`p-4 rounded-2xl border cursor-pointer transition-all ${typeFilter === 'Medical Complaint' ? 'bg-blue-500 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'}`}>
          <div className="flex items-center gap-2 mb-2"><StethoscopeIcon size={16} className={typeFilter === 'Medical Complaint' ? 'text-blue-200' : 'text-blue-500'} /><span className="text-xs font-bold">مرضية</span></div>
          <div className="text-2xl font-black">{isLoading ? "..." : currentStats.medical}</div>
        </div>
        <div onClick={() => setTypeFilter("Work Injury")} className={`p-4 rounded-2xl border cursor-pointer transition-all ${typeFilter === 'Work Injury' ? 'bg-orange-500 border-orange-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-400'}`}>
          <div className="flex items-center gap-2 mb-2"><HardHat size={16} className={typeFilter === 'Work Injury' ? 'text-orange-200' : 'text-orange-500'} /><span className="text-xs font-bold">إصابات عمل</span></div>
          <div className="text-2xl font-black">{isLoading ? "..." : currentStats.injury}</div>
        </div>
        <div onClick={() => setTypeFilter("First Aid")} className={`p-4 rounded-2xl border cursor-pointer transition-all ${typeFilter === 'First Aid' ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'}`}>
          <div className="flex items-center gap-2 mb-2"><ShieldAlert size={16} className={typeFilter === 'First Aid' ? 'text-emerald-200' : 'text-emerald-500'} /><span className="text-xs font-bold">إسعافات</span></div>
          <div className="text-2xl font-black">{isLoading ? "..." : currentStats.firstAid}</div>
        </div>
        <div onClick={() => setTypeFilter("Follow Up")} className={`p-4 rounded-2xl border cursor-pointer transition-all ${typeFilter === 'Follow Up' ? 'bg-purple-500 border-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-400'}`}>
          <div className="flex items-center gap-2 mb-2"><Activity size={16} className={typeFilter === 'Follow Up' ? 'text-purple-200' : 'text-purple-500'} /><span className="text-xs font-bold">متابعة</span></div>
          <div className="text-2xl font-black">{isLoading ? "..." : currentStats.followUp}</div>
        </div>
      </div>

      {/* شريط البحث والأمراض المزمنة */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <input type="text" placeholder="ابحث بالاسم، الإقامة، أو الرقم الوظيفي..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium transition-shadow" />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
        </div>
        <button onClick={() => setShowChronicOnly(!showChronicOnly)} className={`md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border ${showChronicOnly ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <AlertCircle size={18} className={showChronicOnly ? "text-red-500" : "text-slate-400"} /> الأمراض المزمنة
        </button>
      </div>

      {/* فلاتر الورش السريعة (Chips) */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide hide-scrollbar">
        <button onClick={() => setDeptFilter("All")} className={`shrink-0 px-5 py-2 rounded-full text-xs font-bold border transition-colors ${deptFilter === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>كل الورش</button>
        {uniqueDepts.map((dept: any, idx) => (
          <button key={idx} onClick={() => setDeptFilter(dept)} className={`shrink-0 px-5 py-2 rounded-full text-xs font-bold border transition-colors ${deptFilter === dept ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{dept}</button>
        ))}
      </div>

      {/* كروت الزيارات الملعلطة */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500 mb-4" size={40} /><p className="text-slate-500 font-bold">جاري تحميل السجلات...</p></div>
      ) : filteredVisits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm"><ShieldAlert className="mx-auto text-slate-300 mb-4" size={60} /><h3 className="text-xl font-bold text-slate-700">لا توجد زيارات مطابقة للفلتر</h3></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((visit) => {
            const shiftName = getShiftName(visit.created_at);
            const isNight = shiftName === "وردية ليلية";

            return (
            <div key={visit.id} onClick={() => openVisitDetails(visit)} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group cursor-pointer">

              <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${
                visit.visit_type === 'Work Injury' ? 'bg-orange-500' : 
                visit.visit_type === 'First Aid' ? 'bg-emerald-500' : 
                visit.visit_type === 'Follow Up' ? 'bg-purple-500' : 
                'bg-blue-500'
              }`}></div>

              {visit.employees?.is_chronic && <div className="absolute top-4 left-4 bg-red-100 text-red-700 p-1.5 rounded-lg shadow-sm" title="مرض مزمن"><AlertCircle size={16} /></div>}

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2.5 rounded-2xl text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><User size={20} /></div>
                  <div>
                     <h3 className="font-bold text-slate-800 line-clamp-1 pr-1 text-sm">{visit.employees?.name || 'عامل غير مسجل'}</h3>
                     <p className="text-[11px] text-slate-500 font-mono mt-0.5">{visit.employees?.iqama_number || visit.employees?.employee_number}</p>
                  </div>
                </div>
                {visit.status === "Transferred" && <span className="bg-purple-50 text-purple-600 p-2 rounded-xl ml-8 shadow-sm"><Send size={16} /></span>}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
                  <span className={`px-2 py-1 rounded-md border ${
                    visit.visit_type === 'Work Injury' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                    visit.visit_type === 'First Aid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    visit.visit_type === 'Follow Up' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>{visit.visit_type}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 truncate max-w-[120px]">{visit.employees?.department || 'عام'}</span>
                  <span className={`px-2 py-1 rounded-md border ${isNight ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{shiftName}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors group-hover:bg-white group-hover:border-blue-100"><p className="text-sm font-semibold text-slate-700 line-clamp-2"><span className="text-slate-400 text-xs block mb-1">التشخيص:</span> {visit.diagnosis || 'غير مسجل'}</p></div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1"><Clock size={14} /> {new Date(visit.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute:'2-digit' })}</span><span>{new Date(visit.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> تفاصيل الزيارة</h2>
              <button onClick={() => setSelectedVisit(null)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!isDetailsLoading && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white flex justify-between items-center shadow-md">
                  <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><Activity size={24} /></div><div><p className="text-xs text-blue-100 font-medium mb-0.5">مؤشر التردد على العيادة</p><p className="text-sm font-bold">هذه هي الزيارة رقم ({visitStats.current}) من إجمالي ({visitStats.total}) زيارات للموظف.</p></div></div>
                </div>
              )}
              {isDetailsLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
              ) : (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User size={24}/></div><div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">{selectedVisit.employees?.name} {selectedVisit.employees?.is_chronic && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-bold">مرض مزمن</span>}</h3><p className="text-sm text-slate-500">{selectedVisit.employees?.department} | إقامة/وظيفي: <span className="font-mono">{selectedVisit.employees?.iqama_number || selectedVisit.employees?.employee_number}</span></p></div></div>
                    <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 mb-1">وقت الزيارة ({getShiftName(selectedVisit.created_at)})</p>
                      <p className="text-sm font-black text-slate-800" dir="ltr">{new Date(selectedVisit.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                  </div>
                  {selectedVisit.vitals && (
                    <div><h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2"><HeartPulse size={16}/> العلامات الحيوية</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="text-xs text-slate-400 block mb-1">الحرارة</span><span className="font-bold text-slate-700">{selectedVisit.vitals.temperature || '-'}°C</span></div><div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="text-xs text-slate-400 block mb-1">النبض</span><span className="font-bold text-slate-700">{selectedVisit.vitals.pulse || '-'} bpm</span></div><div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="text-xs text-slate-400 block mb-1">الضغط</span><span className="font-bold text-slate-700" dir="ltr">{selectedVisit.vitals.blood_pressure || '-'}</span></div><div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="text-xs text-slate-400 block mb-1">السكر</span><span className="font-bold text-slate-700">{selectedVisit.vitals.rbs || '-'} mg</span></div></div></div>
                  )}
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100"><h4 className="text-sm font-bold text-blue-800 mb-3">التشخيص والتوصية</h4><div className="space-y-3"><div><p className="text-xs text-blue-600 font-bold mb-1">التشخيص:</p><p className="text-sm font-semibold text-slate-700 bg-white p-3 rounded-xl border border-blue-50">{selectedVisit.diagnosis || selectedVisit.complaint || 'لم يسجل'}</p></div><div><p className="text-xs text-blue-600 font-bold mb-1">التوصية:</p><p className="text-sm font-semibold text-slate-700 bg-white p-3 rounded-xl border border-blue-50">{selectedVisit.recommendation || 'لم تسجل'}</p></div></div></div>
                  {selectedVisit.injury && (<div className="bg-orange-50 p-5 rounded-2xl border border-orange-100"><h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2"><HardHat size={16}/> تفاصيل إصابة العمل</h4><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-orange-600 font-bold mb-1">نوع الإصابة:</p><p className="text-sm font-semibold text-slate-700">{selectedVisit.injury.injury_type}</p></div><div><p className="text-xs text-orange-600 font-bold mb-1">مكان الإصابة بالجسم:</p><p className="text-sm font-semibold text-slate-700">{selectedVisit.injury.body_part}</p></div></div></div>)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuspensedVisitsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]"><Loader2 className="animate-spin text-blue-500" size={40}/></div>}>
      <VisitsContent />
    </Suspense>
  );
}