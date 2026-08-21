"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Camera, Upload, Loader2, Save, FileText, CheckCircle2, AlertTriangle, Edit3, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

type ParsedRecord = {
  id: string; 
  date: string;
  iqama_number: string | null;
  name: string;
  nationality: string | null;
  age: number | null;
  time_in: string | null;
  blood_pressure: string | null;
  department: string | null;
  diagnosis: string | null;
  recommendation: string | null;
};

export default function DigitizeRecordsPage() {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (!session || !session.role) {
      router.push("/login");
    }
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      scanImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const scanImage = async (base64: string) => {
    setIsScanning(true);
    setRecords([]);
    const toastId = toast.loading('جاري تحليل السجل بخوارزميات الذكاء الاصطناعي...');

    try {
      const res = await fetch('/api/scan-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'خطأ في السيرفر');

      const parsedData = data.records.map((r: any, i: number) => ({ ...r, id: `rec_${i}` }));
      setRecords(parsedData);
      toast.success(`تم استخراج ${parsedData.length} حالة بنجاح! يرجى مراجعتها.`, { id: toastId });
      
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تحليل الصورة', { id: toastId });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateRecord = (id: string, field: keyof ParsedRecord, value: any) => {
    setRecords(records.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  const handleSaveToDatabase = async () => {
    if (records.length === 0) return toast.error("لا توجد بيانات لحفظها");
    
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.isDemo) return toast.error("أنت في وضع المشاهدة (Demo).");

    setIsSaving(true);
    const toastId = toast.loading('جاري معالجة البيانات وحفظها في قاعدة البيانات...');

    try {
      let successCount = 0;

      for (const rec of records) {
        if (!rec.name) continue;

        let empId = null;

        // 1. محاولة البحث برقم الإقامة لو موجود
        if (rec.iqama_number) {
          const { data: existEmp } = await supabase.from('employees').select('id').eq('iqama_number', rec.iqama_number).single();
          if (existEmp) empId = existEmp.id;
        }

        // 2. لو ملقيناش إقامة، ندور بالاسم
        if (!empId) {
          const { data: existEmpName } = await supabase.from('employees').select('id').eq('name', rec.name).limit(1);
          if (existEmpName && existEmpName.length > 0) {
            empId = existEmpName[0].id;
          } else {
            // 3. لو مش موجود خالص، نكريت موظف جديد (بالاسم بس والإقامة Null)
            const { data: newEmp, error: empErr } = await supabase.from('employees').insert({
              name: rec.name,
              iqama_number: rec.iqama_number || null,
              nationality: rec.nationality || null,
              age: rec.age || null,
              department: rec.department || null
            }).select('id').single();
            
            if (empErr) console.error("Error creating emp:", empErr);
            if (newEmp) empId = newEmp.id;
          }
        }

        if (!empId) continue;

        // 4. تظبيط التاريخ والوقت
        let visitDate = new Date();
        try {
          if (rec.date) {
            let tString = rec.time_in ? String(rec.time_in).replace('.', ':') : "00:00";
            if (tString.length <= 2) tString = `${tString}:00`; 
            visitDate = new Date(`${rec.date}T${tString}:00`);
            if (isNaN(visitDate.getTime())) visitDate = new Date(rec.date); 
          }
        } catch { visitDate = new Date(); }

        // 5. حفظ الزيارة
        let visitType = "Medical Complaint";
        let diagLower = (rec.diagnosis || "").toLowerCase();
        if (diagLower.includes("injury") || diagLower.includes("جرح") || diagLower.includes("إصابة")) visitType = "Work Injury";
        if (diagLower.includes("first aid") || (rec.recommendation || "").toLowerCase().includes("dressing")) visitType = "First Aid";

        const { error: visitErr } = await supabase.from('visits').insert({
          employee_id: empId,
          visit_type: visitType,
          diagnosis: rec.diagnosis || "سجل قديم مسترد",
          recommendation: rec.recommendation || null,
          status: "Completed",
          created_at: visitDate.toISOString(),
          blood_pressure: rec.blood_pressure || null,
        });

        if (!visitErr) successCount++;
      }

      toast.success(`تم حفظ ${successCount} حالة بنجاح!`, { id: toastId });
      setRecords([]);
      setImagePreview(null);
      router.push('/visits');

    } catch (error: any) {
      toast.error('حدث خطأ أثناء الحفظ', { id: toastId });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 font-sans bg-[#f8fafc] min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">رقمنة السجلات الورقية</h1>
            <p className="text-slate-500 mt-1 font-medium">استخراج البيانات من الكشوفات المكتوبة يدوياً عبر الذكاء الاصطناعي</p>
          </div>
          <button onClick={() => router.push('/')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors">لوحة التحكم</button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          {isScanning ? (
            <div className="flex flex-col items-center text-blue-600 z-10">
              <Loader2 className="animate-spin mb-4" size={60} />
              <h3 className="text-xl font-black mb-2">جاري قراءة خط اليد...</h3>
              <p className="text-sm font-bold text-slate-500">يقوم الذكاء الاصطناعي الآن بربط التواريخ وفك شفرة الكلمات</p>
            </div>
          ) : imagePreview ? (
            <div className="w-full flex flex-col items-center z-10">
              <img src={imagePreview} alt="Scanned" className="max-h-64 rounded-xl border-4 border-slate-100 shadow-md mb-6 object-contain" />
              <button onClick={() => { setImagePreview(null); setRecords([]); }} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors">مسح الصورة وإعادة الرفع</button>
            </div>
          ) : (
            <div className="text-center z-10 w-full max-w-md">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-8 ring-blue-50/50">
                <Camera size={36} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">التقط صورة للكشف</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">ارفع صورة واضحة لجدول العيادة المكتوب بخط اليد. سيقوم النظام باستخراج الأسماء، التشخيص، والتواريخ المظللة تلقائياً.</p>
              
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              
              <div className="flex gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                  <Upload size={20} /> رفع أو تصوير
                </button>
              </div>
            </div>
          )}

          {/* ⚠️ هنا كان الخطأ وتم حذفه (التاج الزيادة) */}
          {!imagePreview && !isScanning && (
            <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
              </svg>
            </div>
          )}
        </div>

        {records.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h2 className="font-black text-xl text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-emerald-500"/> مراجعة البيانات المستخرجة</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">يرجى مراجعة الخانات وتعديل الأخطاء الإملائية قبل الاعتماد النهائي.</p>
              </div>
              <button onClick={handleSaveToDatabase} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 w-full sm:w-auto">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                {isSaving ? "جاري الاعتماد..." : "اعتماد وحفظ السجلات"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-800 text-white font-bold">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الاسم (Name)</th>
                    <th className="p-3">الإقامة (Iqama)</th>
                    <th className="p-3">الجنسية</th>
                    <th className="p-3 w-16">العمر</th>
                    <th className="p-3">التشخيص (Disease)</th>
                    <th className="p-3">الضغط (BP)</th>
                    <th className="p-3 text-center w-12"><Trash2 size={16}/></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2"><input type="text" value={rec.date || ''} onChange={e => updateRecord(rec.id, 'date', e.target.value)} className="w-24 p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none font-mono text-xs" dir="ltr"/></td>
                      <td className="p-2"><input type="text" value={rec.name || ''} onChange={e => updateRecord(rec.id, 'name', e.target.value)} className="w-full min-w-[150px] p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none font-bold text-slate-800"/></td>
                      <td className="p-2"><input type="text" value={rec.iqama_number || ''} onChange={e => updateRecord(rec.id, 'iqama_number', e.target.value)} className="w-28 p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none font-mono text-slate-600" placeholder="بدون إقامة"/></td>
                      <td className="p-2"><input type="text" value={rec.nationality || ''} onChange={e => updateRecord(rec.id, 'nationality', e.target.value)} className="w-20 p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none text-xs"/></td>
                      <td className="p-2"><input type="number" value={rec.age || ''} onChange={e => updateRecord(rec.id, 'age', parseInt(e.target.value))} className="w-12 p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none text-center"/></td>
                      <td className="p-2"><input type="text" value={rec.diagnosis || ''} onChange={e => updateRecord(rec.id, 'diagnosis', e.target.value)} className="w-full min-w-[180px] p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none text-slate-700"/></td>
                      <td className="p-2"><input type="text" value={rec.blood_pressure || ''} onChange={e => updateRecord(rec.id, 'blood_pressure', e.target.value)} className="w-20 p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none font-mono text-xs" dir="ltr" placeholder="-"/></td>
                      <td className="p-2 text-center"><button onClick={() => removeRecord(rec.id)} className="text-slate-300 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors"><X size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}