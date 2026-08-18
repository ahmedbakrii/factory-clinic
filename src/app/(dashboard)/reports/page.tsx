"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Loader2, CalendarDays, FileText, Download, Printer, Filter, Building2, Activity, HardHat, ShieldAlert, Send } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function ReportsCenter() {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [stats, setStats] = useState({ total: 0, workInjuries: 0, firstAid: 0, transfers: 0 });

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start: Date | null = new Date();
      let end: Date | null = new Date();

      if (timeFilter === "today") {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (timeFilter === "week") {
        const daysSinceSat = (now.getDay() + 1) % 7; 
        start.setDate(now.getDate() - daysSinceSat);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (timeFilter === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (timeFilter === "custom") {
        if (!customStartDate || !customEndDate) { setIsLoading(false); return; }
        start = new Date(customStartDate); start.setHours(0, 0, 0, 0);
        end = new Date(customEndDate); end.setHours(23, 59, 59, 999);
      }

      let query = supabase
        .from("visits")
        .select(`id, visit_type, diagnosis, status, created_at, employees (name, iqama_number, department)`)
        .order("created_at", { ascending: false });

      if (start) query = query.gte("created_at", start.toISOString());
      if (end) query = query.lte("created_at", end.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      const fetchedData = data || [];
      setRecords(fetchedData);

      setStats({
        total: fetchedData.length,
        workInjuries: fetchedData.filter(v => v.visit_type === "Work Injury").length,
        firstAid: fetchedData.filter(v => v.visit_type === "First Aid").length,
        transfers: fetchedData.filter(v => v.status === "Transferred").length,
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeFilter !== "custom") fetchReportData();
  }, [timeFilter]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    if (records.length === 0) return alert("لا توجد بيانات لتصديرها.");
    try {
      const XLSX = await import("xlsx");
      const exportData = records.map(rec => ({
        "التاريخ": new Date(rec.created_at).toLocaleDateString('ar-EG'),
        "الوقت": new Date(rec.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
        "اسم الموظف": rec.employees?.name || "غير مسجل",
        "رقم الإقامة": rec.employees?.iqama_number || "-",
        "القسم / الورشة": rec.employees?.department || "-",
        "نوع الزيارة": rec.visit_type,
        "التشخيص الطبي": rec.diagnosis || "-",
        "حالة التحويل": rec.status === "Transferred" ? "محول للمستشفى" : "تم العلاج بالعيادة"
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clinic_Report");
      XLSX.writeFile(wb, `Clinic_Report_${timeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Export failed", error);
      alert("حدث خطأ أثناء تصدير التقرير");
    }
  };

  const reportTitle = timeFilter === 'today' ? "التقرير الطبي اليومي" : 
                      timeFilter === 'week' ? "التقرير الطبي الأسبوعي" : 
                      timeFilter === 'month' ? "التقرير الطبي الشهري" : "تقرير طبي مفصل";

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans selection:bg-blue-100" dir="rtl">
      
      {/* ستايل مخصص للطباعة فقط */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          @page { margin: 15mm; }
        }
      `}} />

      <div className="p-4 md:p-8 pb-24 max-w-6xl mx-auto">
        
        {/* الهيدر وأدوات الفلترة (لا تظهر في الطباعة) */}
        <div className="no-print mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800">مركز التقارير</h1>
              <p className="text-slate-500 mt-1 font-medium">استخراج وتقييم بيانات العيادة والسلامة</p>
            </div>
            
            <div className="flex gap-3">
              <button onClick={handleExportExcel} disabled={isLoading || records.length === 0} className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                <Download size={18}/> إكسيل
              </button>
              <button onClick={handlePrint} disabled={isLoading || records.length === 0} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-md disabled:opacity-50">
                <Printer size={18}/> طباعة التقرير
              </button>
            </div>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
            {[ {id: 'today', label: 'اليوم'}, {id: 'week', label: 'الأسبوع'}, {id: 'month', label: 'الشهر'}, {id: 'custom', label: 'مخصص'} ].map(opt => (
              <button key={opt.id} onClick={() => setTimeFilter(opt.id as any)} className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${timeFilter === opt.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {timeFilter === "custom" && (
            <div className="bg-white mt-4 p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
              <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label><input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" /></div>
              <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label><input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" /></div>
              <button onClick={fetchReportData} disabled={!customStartDate || !customEndDate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold">إنشاء التقرير</button>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* التقرير القابل للطباعة (يظهر على الشاشة ويطبع بشكل نظيف) */}
        {/* ---------------------------------------------------- */}
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center"><Loader2 className="animate-spin text-blue-600 mb-4" size={40}/><p className="font-bold text-slate-500">جاري تجهيز التقرير...</p></div>
        ) : (
          <div id="printable-report" className="bg-white p-6 md:p-10 rounded-[32px] shadow-sm border border-slate-200 min-h-[500px]">
            
            {/* رأس التقرير الرسمي (يظهر بقوة في الطباعة) */}
            <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">{reportTitle}</h1>
                <p className="text-sm font-bold text-slate-500">
                  {timeFilter === 'custom' && customStartDate && customEndDate ? `الفترة: ${customStartDate} إلى ${customEndDate}` : `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`}
                </p>
              </div>
              <div className="text-left">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Factory Clinic</h2>
                <p className="text-sm font-bold text-slate-500">HSE & Medical Department</p>
              </div>
            </div>

            {/* ملخص الأرقام (شكلها شيك في الطباعة) */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center"><p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">إجمالي الحالات</p><h3 className="text-2xl font-black text-slate-800">{stats.total}</h3></div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center"><p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">إصابات عمل</p><h3 className="text-2xl font-black text-slate-800">{stats.workInjuries}</h3></div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center"><p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">إسعافات أولية</p><h3 className="text-2xl font-black text-slate-800">{stats.firstAid}</h3></div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center"><p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">حالات محولة</p><h3 className="text-2xl font-black text-slate-800">{stats.transfers}</h3></div>
            </div>

            {/* جدول البيانات */}
            {records.length === 0 ? (
              <div className="py-10 text-center font-bold text-slate-400">لا توجد سجلات طبية خلال هذه الفترة.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs">
                      <th className="p-3 rounded-tr-lg font-bold w-12 text-center">#</th>
                      <th className="p-3 font-bold w-24">التاريخ</th>
                      <th className="p-3 font-bold">اسم المصاب / الموظف</th>
                      <th className="p-3 font-bold w-28">القسم</th>
                      <th className="p-3 font-bold w-28">التصنيف</th>
                      <th className="p-3 rounded-tl-lg font-bold w-48">التشخيص المبدئي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, index) => (
                      <tr key={rec.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                        <td className="p-3 text-center font-mono text-slate-400 text-xs">{index + 1}</td>
                        <td className="p-3 font-mono text-xs font-bold text-slate-600" dir="ltr">{new Date(rec.created_at).toLocaleDateString('ar-EG')}</td>
                        <td className="p-3 font-bold text-slate-800">{rec.employees?.name || 'غير مسجل'}</td>
                        <td className="p-3 font-semibold text-slate-600 text-xs">{rec.employees?.department || '-'}</td>
                        <td className="p-3 font-bold text-xs">
                          {rec.visit_type === "Work Injury" ? <span className="text-orange-600">إصابة عمل</span> : 
                           rec.visit_type === "First Aid" ? <span className="text-emerald-600">إسعافات</span> :
                           <span className="text-blue-600">حالة مرضية</span>}
                        </td>
                        <td className="p-3 text-xs font-medium text-slate-600 line-clamp-1">{rec.diagnosis || 'غير مسجل'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* تذييل التقرير الرسمي والتوقيعات */}
            <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-3 text-center print:grid print:grid-cols-3">
              <div>
                <p className="font-bold text-sm text-slate-800 mb-8">ممرض العيادة</p>
                <p className="text-slate-400 border-t border-slate-300 mx-8 pt-2">التوقيع</p>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 mb-8">مدير السلامة (HSE)</p>
                <p className="text-slate-400 border-t border-slate-300 mx-8 pt-2">التوقيع</p>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 mb-8">يعتمد، مدير المصنع</p>
                <p className="text-slate-400 border-t border-slate-300 mx-8 pt-2">التوقيع</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}