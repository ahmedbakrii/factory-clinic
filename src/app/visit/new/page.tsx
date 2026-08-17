"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { Save, User, Activity, FileText, Send, Pill, Loader2, CheckCircle2, Phone, Building2, Search, XCircle, ShieldAlert, StethoscopeIcon, HardHat, HeartPulse } from "lucide-react";

// نوع الزيارة فقط هو الثابت لأنه يتحكم في إظهار وإخفاء أجزاء من الشاشة
const VISIT_TYPES = [
  { id: "Medical Complaint", label: "حالة مرضية", icon: <StethoscopeIcon size={28}/>, color: "blue" },
  { id: "First Aid", label: "إسعافات أولية", icon: <HeartPulse size={28}/>, color: "emerald" },
  { id: "Work Injury", label: "إصابة عمل", icon: <HardHat size={28}/>, color: "orange" },
  { id: "Follow Up", label: "متابعة طبية", icon: <Activity size={28}/>, color: "purple" }
];

// ==========================================
// مكوّن الإدخال المباشر والبحث (Autocomplete)
// ==========================================
function AutocompleteInput({ options, value, onChange, placeholder }: { options: any[], value: string, onChange: (val: string) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = options.find(o => o.value === value);
    setInputValue(selected ? selected.label : value);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(opt => opt.label.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 text-gray-800 transition-all"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value); 
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[999] top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
          {filtered.map(opt => (
            <div 
              key={opt.value} 
              className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50 last:border-0"
              onClick={() => { setInputValue(opt.label); onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// الشاشة الرئيسية
// ==========================================
export default function PerfectVisitScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmp, setIsCheckingEmp] = useState(false);
  const [empStatus, setEmpStatus] = useState<"new" | "found" | "idle">("idle");

  const [formData, setFormData] = useState({
    iqama: "", name: "", phone: "", nationality: "", age: "", department: "", supervisor: "",
    temp: "", pulse: "", bp: "", rbs: "",
    visitType: "", injuryType: "", bodyPart: "", disease: "", recommendation: "", transferred: "Not Transferred",
    hospital: "", companionName: "", companionPhone: ""
  });

  const [medications, setMedications] = useState([{ id: 1, medId: "", qty: 1 }]);
  
  // States لتخزين البيانات القادمة من الداتا بيز
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbNationalities, setDbNationalities] = useState<any[]>([]);
  const [dbInjuryTypes, setDbInjuryTypes] = useState<any[]>([]);
  const [dbBodyParts, setDbBodyParts] = useState<any[]>([]);
  const [dbInventoryOptions, setDbInventoryOptions] = useState<any[]>([]);

  // 🚀 تحميل كل البيانات من الداتا بيز أول ما الصفحة تفتح
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [medsRes, deptsRes, natsRes, injRes, partsRes] = await Promise.all([
          supabase.from('medicines').select('id, name').eq('is_active', true),
          supabase.from('departments').select('name').order('name'),
          supabase.from('nationalities').select('name').order('name'),
          supabase.from('injury_types').select('name').order('name'),
          supabase.from('body_parts').select('name').order('name')
        ]);

        if (medsRes.data) setDbInventoryOptions(medsRes.data.map(m => ({ label: m.name, value: m.id })));
        if (deptsRes.data) setDbDepartments(deptsRes.data.map(d => ({ label: d.name, value: d.name })));
        if (natsRes.data) setDbNationalities(natsRes.data.map(n => ({ label: n.name, value: n.name })));
        if (injRes.data) setDbInjuryTypes(injRes.data.map(i => ({ label: i.name, value: i.name })));
        if (partsRes.data) setDbBodyParts(partsRes.data.map(p => ({ label: p.name, value: p.name })));
      } catch (error) {
        console.error("Error loading reference data:", error);
      }
    }
    loadReferenceData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const updateDropdown = (name: string, value: string) => setFormData({ ...formData, [name]: value });

  // بحث الإقامة اللحظي
  useEffect(() => {
    const checkIqama = setTimeout(async () => {
      if (formData.iqama.trim() === "") {
        setEmpStatus("idle"); setIsCheckingEmp(false);
        setFormData(prev => ({ ...prev, name: "", phone: "", nationality: "", age: "", department: "", supervisor: "" }));
        return;
      }
      if (formData.iqama.length >= 4) {
        setIsCheckingEmp(true);
        try {
          const { data } = await supabase.from("employees").select("*").or(`iqama_number.eq.${formData.iqama},employee_number.eq.${formData.iqama}`).single();
          if (data) {
            setFormData(prev => ({ ...prev, name: data.name || "", phone: data.phone || "", nationality: data.nationality || "", department: data.department || "", supervisor: data.work_place || "" }));
            setEmpStatus("found");
          } else {
            if (empStatus === "found") setFormData(prev => ({ ...prev, name: "", phone: "", nationality: "", age: "", department: "", supervisor: "" }));
            setEmpStatus("new");
          }
        } catch { setEmpStatus("new"); } finally { setIsCheckingEmp(false); }
      }
    }, 500);
    return () => clearTimeout(checkIqama);
  }, [formData.iqama]);

  const addMedication = () => setMedications([...medications, { id: Date.now(), medId: "", qty: 1 }]);
  const updateMedication = (id: number, field: string, value: any) => {
    setMedications(medications.map(med => med.id === id ? { ...med, [field]: value } : med));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let currentEmpId = null;
      if (empStatus === "new") {
        const { data: newEmp, error: empErr } = await supabase.from("employees").insert([{
          iqama_number: formData.iqama, name: formData.name, phone: formData.phone, nationality: formData.nationality, department: formData.department, work_place: formData.supervisor
        }]).select().single();
        if (empErr) throw empErr;
        currentEmpId = newEmp.id;
      } else {
        const { data: existEmp } = await supabase.from("employees").select("id").eq("iqama_number", formData.iqama).single();
        currentEmpId = existEmp?.id;
      }

      const { data: newVisit, error: visitErr } = await supabase.from("visits").insert([{
        employee_id: currentEmpId, visit_type: formData.visitType, complaint: formData.disease, diagnosis: formData.disease, recommendation: formData.recommendation, status: formData.transferred === "Transferred" ? "Transferred" : "Completed"
      }]).select().single();
      if (visitErr) throw visitErr;

      if (formData.temp || formData.bp || formData.pulse || formData.rbs) {
        await supabase.from("visit_vitals").insert([{
          visit_id: newVisit.id, temperature: formData.temp ? parseFloat(formData.temp) : null, blood_pressure: formData.bp || null, pulse: formData.pulse ? parseInt(formData.pulse) : null, rbs: formData.rbs ? parseInt(formData.rbs) : null
        }]);
      }

      if (formData.visitType === "Work Injury" || formData.visitType === "First Aid") {
        await supabase.from("work_injuries").insert([{
          visit_id: newVisit.id, employee_id: currentEmpId, injury_type: formData.injuryType, body_part: formData.bodyPart, description: formData.disease
        }]);
      }

      const validMeds = medications.filter(m => m.medId && m.qty > 0);
      if (validMeds.length > 0) {
        const medsToInsert = validMeds.map(m => ({ visit_id: newVisit.id, medicine_id: m.medId, quantity: m.qty }));
        await supabase.from("visit_medications").insert(medsToInsert);
      }

      if (formData.transferred === "Transferred") {
        await supabase.from("referrals").insert([{
          visit_id: newVisit.id, employee_id: currentEmpId, hospital: formData.hospital, notes: `المرافق: ${formData.companionName} | جوال: ${formData.companionPhone}`, status: 'Pending'
        }]);
      }

      alert("✅ تم حفظ الزيارة واعتماد البيانات بنجاح!");
      window.location.reload();
    } catch (error: any) { alert("❌ حدث خطأ أثناء الحفظ: " + error.message); } finally { setIsLoading(false); }
  };

  const checkVitals = (type: string, value: string) => {
    if (!value) return null;
    let val = parseFloat(value);
    switch(type) {
      case 'temp': return val < 36.1 ? <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded">منخفض</span> : val > 37.5 ? <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded">مرتفع</span> : <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">طبيعي</span>;
      case 'pulse': return val < 60 ? <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded">بطيء</span> : val > 100 ? <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded">سريع</span> : <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">طبيعي</span>;
      case 'rbs': return val < 70 ? <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded">منخفض</span> : val > 140 ? <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded">مرتفع</span> : <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">طبيعي</span>;
      case 'bp': const parts = value.split('/'); if (parts.length === 2 && parts[0] && parts[1]) { let sys = parseInt(parts[0]), dia = parseInt(parts[1]); if (sys < 90 || dia < 60) return <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded">منخفض</span>; if (sys > 130 || dia > 85) return <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded">مرتفع</span>; return <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">طبيعي</span>; } return null;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] pb-20 font-sans" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div><h1 className="text-2xl font-bold text-gray-800">تسجيل زيارة عيادة</h1><p className="text-sm text-gray-500 mt-1">Factory Clinic System</p></div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold border border-blue-100 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> ممرض العيادة</div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6 mt-4">
        
        {/* مربع الإقامة */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-2xl blur opacity-25 transition duration-1000 ${empStatus === 'found' ? 'bg-green-400' : empStatus === 'new' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
            <div className="relative bg-white ring-1 ring-gray-200 rounded-2xl p-2 flex items-center shadow-sm">
              <input type="text" name="iqama" value={formData.iqama} onChange={handleInputChange} className="w-full bg-transparent p-4 outline-none text-2xl font-bold text-center text-gray-800 placeholder-gray-300 tracking-widest" placeholder="أدخل رقم الإقامة للبحث التلقائي" autoComplete="off" />
              <div className="absolute right-4">{isCheckingEmp ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <Search size={24} className="text-gray-300" />}</div>
              <div className="absolute left-4">{empStatus === "found" && <CheckCircle2 size={24} className="text-green-500" />}{empStatus === "new" && <XCircle size={24} className="text-amber-500" />}</div>
            </div>
          </div>
          <div className="text-center mt-2 h-6">
            {empStatus === "found" && <span className="text-sm font-bold text-green-700 bg-green-100 px-4 py-1 rounded-full">الموظف مسجل مسبقاً بالنظام</span>}
            {empStatus === "new" && <span className="text-sm font-bold text-amber-700 bg-amber-100 px-4 py-1 rounded-full">يتم تسجيل موظف جديد</span>}
          </div>
        </div>

        {/* تصنيف الزيارة */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><ShieldAlert className="text-indigo-600"/> نوع الزيارة (Visit Type) *</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VISIT_TYPES.map(type => (
              <label key={type.id} className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.visitType === type.id ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700 shadow-sm` : 'border-gray-100 hover:border-gray-300 text-gray-500 bg-white'}`}>
                <input type="radio" name="visitType" value={type.id} className="hidden" onChange={handleInputChange} />
                <div className="mb-2">{type.icon}</div>
                <span className="font-bold text-sm text-center">{type.label}</span>
              </label>
            ))}
          </div>

          {/* محرك الـ HSE (مربوط بقاعدة البيانات) */}
          {(formData.visitType === "Work Injury" || formData.visitType === "First Aid") && (
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">تصنيف الإصابة (Injury Type)</label>
                <AutocompleteInput options={dbInjuryTypes} value={formData.injuryType} onChange={(val) => updateDropdown("injuryType", val)} placeholder="ابحث أو اكتب نوع الإصابة..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">مكان الإصابة بالجسم (Body Part)</label>
                <AutocompleteInput options={dbBodyParts} value={formData.bodyPart} onChange={(val) => updateDropdown("bodyPart", val)} placeholder="ابحث أو اكتب مكان الإصابة..." />
              </div>
            </div>
          )}
        </div>

        {/* الكروت المزدوجة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* كارت العامل */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">بيانات العامل (Employee)</h2><User size={22} className="text-blue-500" /></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الاسم (Name)</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50/50 text-center" /></div>
                <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجوال (Phone)</label><input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50/50 text-center" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجنسية (Nationality)</label><AutocompleteInput options={dbNationalities} value={formData.nationality} onChange={(val) => updateDropdown("nationality", val)} placeholder="الجنسية..." /></div>
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">العمر (Age)</label><input type="number" name="age" value={formData.age} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50/50 text-center" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">القسم (Department)</label><AutocompleteInput options={dbDepartments} value={formData.department} onChange={(val) => updateDropdown("department", val)} placeholder="القسم..." /></div>
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">المشرف (Supervisor)</label><input type="text" name="supervisor" value={formData.supervisor} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50/50 text-center" /></div>
              </div>
            </div>
          </div>

          {/* كارت العلامات الحيوية */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">العلامات الحيوية (Vitals)</h2><Activity size={22} className="text-emerald-500" /></div>
            <div className="p-6 grid grid-cols-2 gap-6 mt-2">
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">الحرارة (TEMP)</label>{checkVitals('temp', formData.temp)}</div>
                <div className="relative"><input type="number" step="0.1" name="temp" value={formData.temp} onChange={handleInputChange} className="w-full p-3 pl-12 pr-4 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center text-lg bg-gray-50/50" placeholder="37.0" /><span className="absolute left-4 top-3.5 text-gray-400 font-medium text-sm">C°</span></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">النبض (PULSE)</label>{checkVitals('pulse', formData.pulse)}</div>
                <div className="relative"><input type="number" name="pulse" value={formData.pulse} onChange={handleInputChange} className="w-full p-3 pl-12 pr-4 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center text-lg bg-gray-50/50" placeholder="80" /><span className="absolute left-4 top-3.5 text-gray-400 font-medium text-sm">bpm</span></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">الضغط (BP)</label>{checkVitals('bp', formData.bp)}</div>
                <input type="text" name="bp" value={formData.bp} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center text-lg bg-gray-50/50" placeholder="120/80" dir="ltr" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">السكر (RBS)</label>{checkVitals('rbs', formData.rbs)}</div>
                <div className="relative"><input type="number" name="rbs" value={formData.rbs} onChange={handleInputChange} className="w-full p-3 pl-12 pr-4 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center text-lg bg-gray-50/50" placeholder="100" /><span className="absolute left-4 top-3.5 text-gray-400 font-medium text-sm">mg</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* التقييم الطبي */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">التفاصيل الطبية (Medical Assessment)</h2><FileText size={22} className="text-gray-500" /></div>
          <div className="p-6 space-y-6">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">التشخيص (Diagnosis)</label><textarea name="disease" value={formData.disease} onChange={handleInputChange} rows={2} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none bg-gray-50/50" placeholder="اكتب التشخيص التفصيلي هنا..."></textarea></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">التوصية (Recommendation)</label><textarea name="recommendation" value={formData.recommendation} onChange={handleInputChange} rows={2} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none bg-gray-50/50" placeholder="ما هي التوصيات والإجراءات المتخذة؟"></textarea></div>
          </div>
        </div>

        {/* الأدوية المباشرة */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-5">
            <h2 className="font-bold text-gray-800 text-xl flex items-center gap-2">الأدوية (Medications) <Pill className="text-purple-600" size={24}/></h2>
            <button onClick={addMedication} className="text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-1">+ إضافة</button>
          </div>
          <div className="space-y-4">
            {medications.map((med) => (
              <div key={med.id} className="flex gap-3 items-center">
                <div className="flex-1">
                  <AutocompleteInput options={dbInventoryOptions} value={med.medId} onChange={(val) => updateMedication(med.id, 'medId', val)} placeholder="اكتب للبحث عن الدواء..." />
                </div>
                <input type="number" min="1" className="w-24 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-center bg-gray-50/50 text-lg font-semibold text-gray-700" value={med.qty} onChange={(e) => updateMedication(med.id, 'qty', parseInt(e.target.value))} />
              </div>
            ))}
          </div>
        </div>

        {/* صندوق التحويل */}
        <div className="bg-[#fff9f2] border border-orange-200 rounded-2xl p-6 transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-orange-900 font-bold text-lg"><Send size={22} className="text-orange-600" /> حالة التحويل (Transfer Status)</h3>
            <div className="flex gap-4">
              <label className={`flex items-center justify-center cursor-pointer px-6 py-3 rounded-xl border-2 transition-all font-bold ${formData.transferred === "Not Transferred" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"}`}><span>غير محول</span><input type="radio" name="transferred" value="Not Transferred" checked={formData.transferred === "Not Transferred"} onChange={handleInputChange} className="hidden" /></label>
              <label className={`flex items-center justify-center cursor-pointer px-6 py-3 rounded-xl border-2 transition-all font-bold ${formData.transferred === "Transferred" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-500"}`}><span>محول للمستشفى</span><input type="radio" name="transferred" value="Transferred" checked={formData.transferred === "Transferred"} onChange={handleInputChange} className="hidden" /></label>
            </div>
          </div>
          {formData.transferred === "Transferred" && (
            <div className="mt-6 pt-6 border-t border-orange-200/50 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
              <div><label className="block text-sm font-bold text-orange-900 mb-2 flex items-center gap-1"><Building2 size={16}/> المستشفى المحول لها</label><input type="text" name="hospital" value={formData.hospital} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl outline-none focus:border-orange-500 bg-white" /></div>
              <div><label className="block text-sm font-bold text-orange-900 mb-2 flex items-center gap-1"><User size={16}/> الــمرافــق</label><input type="text" name="companionName" value={formData.companionName} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl outline-none focus:border-orange-500 bg-white font-semibold" /></div>
              <div><label className="block text-sm font-bold text-orange-900 mb-2 flex items-center gap-1"><Phone size={16}/> رقم جوال المرافق</label><input type="text" name="companionPhone" value={formData.companionPhone} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl outline-none focus:border-orange-500 bg-white" dir="ltr" /></div>
            </div>
          )}
        </div>

        {/* زر الحفظ */}
        <div className="pt-6">
          <button onClick={handleSave} disabled={isLoading || !formData.iqama || !formData.visitType} className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50">
            <Save size={24} /> {isLoading ? "جاري تسجيل البيانات بقاعدة البيانات..." : "حفظ بيانات الزيارة"}
          </button>
        </div>
      </main>
    </div>
  );
}