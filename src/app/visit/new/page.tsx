"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Save, User, Activity, FileText, Send, Pill, Loader2, CheckCircle2, Phone, Building2, Search, XCircle, ShieldAlert, StethoscopeIcon, HardHat, HeartPulse, Plus, Camera } from "lucide-react";
import toast from "react-hot-toast";

const VISIT_TYPES = [
  { id: "Medical Complaint", label: "حالة مرضية", icon: <StethoscopeIcon size={28}/>, color: "blue" },
  { id: "First Aid", label: "إسعافات أولية", icon: <HeartPulse size={28}/>, color: "emerald" },
  { id: "Work Injury", label: "إصابة عمل", icon: <HardHat size={28}/>, color: "orange" },
  { id: "Follow Up", label: "متابعة طبية", icon: <Activity size={28}/>, color: "purple" }
];

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
      <input type="text" className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 text-gray-800 transition-all" placeholder={placeholder} value={inputValue} onChange={(e) => { setInputValue(e.target.value); onChange(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[999] top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
          {filtered.map(opt => (
            <div key={opt.value} className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50 last:border-0" onClick={() => { setInputValue(opt.label); onChange(opt.value); setIsOpen(false); }}>{opt.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PerfectVisitScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmp, setIsCheckingEmp] = useState(false);
  const [empStatus, setEmpStatus] = useState<"new" | "found" | "idle">("idle");
  const [currentEmpId, setCurrentEmpId] = useState<number | null>(null); 

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    searchId: "", 
    iqama_number: "", 
    employee_number: "", 
    name: "", phone: "", nationality: "", age: "", department: "", supervisor: "",
    temp: "", pulse: "", rbs: "", bp_sys: "", bp_dia: "", 
    visitType: "", injuryType: "", bodyPart: "", disease: "", recommendation: "", transferred: "Not Transferred", hospital: "", companionName: "", companionPhone: ""
  });

  const [medications, setMedications] = useState([{ id: 1, medId: "" }]);
  
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbNationalities, setDbNationalities] = useState<any[]>([]);
  const [dbInjuryTypes, setDbInjuryTypes] = useState<any[]>([]);
  const [dbBodyParts, setDbBodyParts] = useState<any[]>([]);
  const [dbInventoryOptions, setDbInventoryOptions] = useState<any[]>([]);

  useEffect(() => {
    const sessionStr = localStorage.getItem("clinic_session");
    if (!sessionStr) {
      router.push("/login");
      return;
    }
    const session = JSON.parse(sessionStr);
    if (session.role === "HSE_MANAGER") router.push("/visits"); 
  }, [router]);

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
      } catch (error) { console.error("Error loading data:", error); }
    }
    loadReferenceData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const updateDropdown = (name: string, value: string) => setFormData({ ...formData, [name]: value });

  const checkVitals = (type: string, val1: string, val2?: string) => {
    if (!val1) return null;
    let v1 = parseFloat(val1);
    switch(type) {
      case 'temp': return v1 < 36.1 ? <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-0.5 rounded">منخفض</span> : v1 > 37.5 ? <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-0.5 rounded">مرتفع</span> : <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded">طبيعي</span>;
      case 'pulse': return v1 < 60 ? <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-0.5 rounded">بطيء</span> : v1 > 100 ? <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-0.5 rounded">سريع</span> : <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded">طبيعي</span>;
      case 'rbs': return v1 < 70 ? <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-0.5 rounded">منخفض</span> : v1 > 140 ? <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-0.5 rounded">مرتفع</span> : <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded">طبيعي</span>;
      case 'bp': 
        if (!val2) return null;
        let sys = v1, dia = parseFloat(val2);
        if (sys < 90 || dia < 60) return <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-0.5 rounded">منخفض</span>; 
        if (sys > 130 || dia > 85) return <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-0.5 rounded">مرتفع</span>; 
        return <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-0.5 rounded">طبيعي</span>;
      default: return null;
    }
  };

  const searchIdLength = formData.searchId.trim().length;
  const isInvalidSearch = searchIdLength > 0 && searchIdLength > 10;

  useEffect(() => {
    const checkSearchId = setTimeout(async () => {
      if (formData.searchId.trim() === "") {
        setEmpStatus("idle"); setIsCheckingEmp(false); setCurrentEmpId(null);
        setFormData(prev => ({ ...prev, name: "", phone: "", nationality: "", age: "", department: "", supervisor: "", iqama_number: "", employee_number: "" }));
        return;
      }
      
      if (!isInvalidSearch && searchIdLength >= 1) {
        setIsCheckingEmp(true);
        try {
          const { data } = await supabase.from("employees").select("*").or(`iqama_number.eq.${formData.searchId},employee_number.eq.${formData.searchId}`).single();
          
          if (data) {
            setFormData(prev => ({ 
              ...prev, 
              iqama_number: data.iqama_number || (searchIdLength === 10 ? prev.searchId : ""),
              employee_number: data.employee_number || (searchIdLength < 10 ? prev.searchId : ""),
              name: data.name || "", 
              phone: data.phone || "", 
              nationality: data.nationality || "", 
              age: data.age ? String(data.age) : "", 
              department: data.department || "", 
              supervisor: data.work_place || "" 
            }));
            setEmpStatus("found");
            setCurrentEmpId(data.id);
          } else {
            if (empStatus === "found") setFormData(prev => ({ ...prev, name: "", phone: "", nationality: "", age: "", department: "", supervisor: "", iqama_number: "", employee_number: "" }));
            setEmpStatus("new");
            setCurrentEmpId(null);
            
            if (searchIdLength === 10) setFormData(prev => ({ ...prev, iqama_number: prev.searchId, employee_number: "" }));
            else setFormData(prev => ({ ...prev, employee_number: prev.searchId, iqama_number: "" }));
          }
        } catch { 
          setEmpStatus("new"); setCurrentEmpId(null); 
          if (searchIdLength === 10) setFormData(prev => ({ ...prev, iqama_number: prev.searchId, employee_number: "" }));
          else setFormData(prev => ({ ...prev, employee_number: prev.searchId, iqama_number: "" }));
        } finally { setIsCheckingEmp(false); }
      } else {
        setEmpStatus("idle"); setCurrentEmpId(null);
      }
    }, 500);
    return () => clearTimeout(checkSearchId);
  }, [formData.searchId, isInvalidSearch]);

  const addMedication = () => setMedications([...medications, { id: Date.now(), medId: "" }]);
  const updateMedication = (id: number, field: string, value: any) => setMedications(medications.map(med => med.id === id ? { ...med, [field]: value } : med));

  const handleIqamaScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const toastId = toast.loading('جاري مسح الإقامة واستخراج البيانات...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result;
        const res = await fetch('/api/scan-iqama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });
        const data = await res.json();
        
        if (!res.ok) {
            toast.error(data.error || 'السيرفر مشغول حالياً، يرجى إعادة المحاولة', { id: toastId });
            setIsScanning(false);
            if (e.target) e.target.value = '';
            return; 
        }

        setFormData(prev => ({
          ...prev,
          searchId: data.iqama_number || prev.searchId, 
          iqama_number: data.iqama_number || prev.iqama_number,
          name: data.name || prev.name,
          nationality: data.nationality || prev.nationality,
          age: data.age ? String(data.age) : prev.age
        }));

        toast.success('تم قراءة الهوية بنجاح!', { id: toastId });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('حدث خطأ في قراءة الصورة، يرجى المحاولة مرة أخرى', { id: toastId });
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async () => {
    const sessionStr = localStorage.getItem("clinic_session");
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);

    if (session.isDemo) return toast.error("أنت في وضع المشاهدة (Demo). لا يمكنك إدخال بيانات.", { icon: '👁️' });

    if (!formData.iqama_number && !formData.employee_number) {
        return toast.error("يجب إدخال رقم الإقامة أو الرقم الوظيفي على الأقل!");
    }

    setIsLoading(true);
    try {
      let finalEmpId = currentEmpId;

      const empPayload: any = {
        name: formData.name || 'غير مسجل', 
        phone: formData.phone || null, 
        nationality: formData.nationality || null, 
        department: formData.department || null, 
        work_place: formData.supervisor || null,
        age: formData.age ? parseInt(formData.age) : null,
        iqama_number: formData.iqama_number || null,
        employee_number: formData.employee_number || null
      };

      if (finalEmpId) {
         const { error: updateErr } = await supabase.from('employees').update(empPayload).eq('id', finalEmpId);
         if (updateErr) throw updateErr;
      } else {
         const { data: insertedEmp, error: insertErr } = await supabase.from('employees').insert([empPayload]).select().single();
         if (insertErr) throw insertErr;
         finalEmpId = insertedEmp.id;
      }

      const combinedBP = (formData.bp_sys && formData.bp_dia) ? `${formData.bp_sys}/${formData.bp_dia}` : null;

      // ⚠️ التعديل المهم: الحفظ كله بيتم في visits بس، وشيلنا الحفظ بتاع الجداول الممسوحة
      const { data: newVisit, error: visitErr } = await supabase.from("visits").insert([{
        employee_id: finalEmpId, 
        visit_type: formData.visitType, 
        complaint: formData.disease, 
        diagnosis: formData.disease, 
        recommendation: formData.recommendation, 
        status: formData.transferred === "Transferred" ? "Transferred" : "Completed",
        temperature: formData.temp ? parseFloat(formData.temp) : null,
        pulse: formData.pulse ? parseInt(formData.pulse) : null,
        blood_pressure: combinedBP,
        rbs: formData.rbs ? parseInt(formData.rbs) : null,
        injury_type: formData.injuryType || null,
        body_part: formData.bodyPart || null
      }]).select().single();
      
      if (visitErr) throw visitErr;

      const validMeds = medications.filter(m => m.medId);
      if (validMeds.length > 0) {
        const medsToInsert = validMeds.map(m => ({ visit_id: newVisit.id, medicine_id: m.medId, quantity: 1 }));
        await supabase.from("visit_medications").insert(medsToInsert);
      }

      if (formData.transferred === "Transferred") {
        await supabase.from("referrals").insert([{ visit_id: newVisit.id, employee_id: finalEmpId, hospital: formData.hospital, notes: `المرافق: ${formData.companionName} | جوال: ${formData.companionPhone}`, status: 'Pending' }]);
      }

      toast.success("تم حفظ الزيارة وتحديث بيانات العامل بنجاح!");
      router.push('/');
    } catch (error: any) { 
      toast.error("حدث خطأ أثناء الحفظ (قد يكون الرقم مسجل لموظف آخر)"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6 mt-4 mb-10">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-2xl font-black text-gray-800">تسجيل زيارة طبية جديدة</h1><p className="text-sm text-gray-500 mt-1">تعبئة نموذج الزيارة والحالة الحيوية</p></div>
        </div>

        <div className="max-w-xl mx-auto mb-8">
          <div className="relative group">
            <div className={`absolute -inset-1 rounded-2xl blur opacity-25 transition duration-1000 ${isInvalidSearch ? 'bg-red-500' : empStatus === 'found' ? 'bg-green-400' : empStatus === 'new' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
            <div className={`relative bg-white ring-1 ${isInvalidSearch ? 'ring-red-400' : 'ring-gray-200'} rounded-2xl p-2 flex items-center shadow-sm`}>
              <input 
                type="number" 
                name="searchId" 
                value={formData.searchId} 
                onChange={handleInputChange} 
                className="w-full bg-transparent p-4 outline-none text-2xl font-bold text-center text-gray-800 placeholder-gray-300 tracking-widest" 
                placeholder="ابحث برقم الإقامة أو الوظيفي..." 
                autoComplete="off" 
              />
              
              <div className="absolute right-4">{isCheckingEmp ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <Search size={24} className="text-gray-300" />}</div>
              <div className="absolute left-4">
                {isInvalidSearch ? <XCircle size={24} className="text-red-500" /> : (empStatus === "found" && <CheckCircle2 size={24} className="text-green-500" />)}
                {empStatus === "new" && !isInvalidSearch && <ShieldAlert size={24} className="text-amber-500" />}
              </div>

              <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleIqamaScan} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="absolute right-12 bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100 transition-colors shadow-sm" title="تصوير الهوية واستخراج البيانات">
                <Camera size={20} className={isScanning ? "animate-pulse" : ""} />
              </button>
            </div>
          </div>
          <div className="text-center mt-3 h-6 flex justify-center gap-2">
            {isInvalidSearch && <span className="text-sm font-bold text-red-700 bg-red-100 px-4 py-1 rounded-full animate-pulse">رقم غير صالح! تأكد من الرقم.</span>}
            {empStatus === "found" && !isInvalidSearch && <span className="text-sm font-bold text-green-700 bg-green-100 px-4 py-1 rounded-full">تم العثور على ملف العامل</span>}
            {empStatus === "new" && !isInvalidSearch && searchIdLength > 0 && <span className="text-sm font-bold text-amber-700 bg-amber-100 px-4 py-1 rounded-full">سيتم إنشاء ملف جديد للعامل</span>}
            {isScanning && <span className="text-sm font-bold text-blue-700 bg-blue-100 px-4 py-1 rounded-full animate-pulse">جاري تحليل الإقامة...</span>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><ShieldAlert className="text-indigo-600"/> نوع الزيارة *</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VISIT_TYPES.map(type => (
              <label key={type.id} className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.visitType === type.id ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700 shadow-sm` : 'border-gray-100 hover:border-gray-300 text-gray-500 bg-white'}`}>
                <input type="radio" name="visitType" value={type.id} className="hidden" onChange={handleInputChange} />
                <div className="mb-2">{type.icon}</div>
                <span className="font-bold text-sm text-center">{type.label}</span>
              </label>
            ))}
          </div>

          {(formData.visitType === "Work Injury" || formData.visitType === "First Aid") && (
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
              <div><label className="block text-sm font-bold text-gray-700 mb-2">تصنيف الإصابة</label><AutocompleteInput options={dbInjuryTypes} value={formData.injuryType} onChange={(val) => updateDropdown("injuryType", val)} placeholder="ابحث أو اكتب نوع الإصابة..." /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">مكان الإصابة بالجسم</label><AutocompleteInput options={dbBodyParts} value={formData.bodyPart} onChange={(val) => updateDropdown("bodyPart", val)} placeholder="ابحث أو اكتب مكان الإصابة..." /></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">بيانات العامل</h2><User size={22} className="text-blue-500" /></div>
            <div className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-center text-sm font-bold text-gray-600 mb-2">رقم الإقامة <span className="text-red-500">*</span></label>
                    <input type="number" name="iqama_number" value={formData.iqama_number} onChange={handleInputChange} className={`w-full p-3 border ${!formData.iqama_number ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50/50'} rounded-xl text-center font-bold`} placeholder="أكمل رقم الإقامة..." />
                </div>
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-center text-sm font-bold text-gray-600 mb-2">الرقم الوظيفي</label>
                    <input type="number" name="employee_number" value={formData.employee_number} onChange={handleInputChange} className={`w-full p-3 border ${!formData.employee_number ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50/50'} rounded-xl text-center font-bold`} placeholder="أكمل الرقم الوظيفي..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الاسم</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50/50 text-center" /></div>
                <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجوال</label><input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50/50 text-center" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجنسية</label><AutocompleteInput options={dbNationalities} value={formData.nationality} onChange={(val) => updateDropdown("nationality", val)} placeholder="الجنسية..." /></div>
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">العمر</label><input type="number" name="age" value={formData.age} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50/50 text-center" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">القسم</label><AutocompleteInput options={dbDepartments} value={formData.department} onChange={(val) => updateDropdown("department", val)} placeholder="القسم..." /></div>
                <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">المشرف</label><input type="text" name="supervisor" value={formData.supervisor} onChange={handleInputChange} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50/50 text-center" /></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">العلامات الحيوية</h2><Activity size={22} className="text-emerald-500" /></div>
            <div className="p-6 grid grid-cols-2 gap-6 mt-2">
              <div><div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">الحرارة</label>{checkVitals('temp', formData.temp)}</div><div className="relative"><input type="number" step="0.1" name="temp" value={formData.temp} onChange={handleInputChange} className="w-full p-3 pl-12 pr-4 border border-gray-200 rounded-xl text-center text-lg bg-gray-50/50" placeholder="37.0" /><span className="absolute left-4 top-3.5 text-gray-400 font-medium text-sm">C°</span></div></div>
              <div><div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">النبض</label>{checkVitals('pulse', formData.pulse)}</div><div className="relative"><input type="number" name="pulse" value={formData.pulse} onChange={handleInputChange} className="w-full p-3 pl-12 pr-4 border border-gray-200 rounded-xl text-center text-lg bg-gray-50/50" placeholder="80" /><span className="absolute left-4 top-3.5 text-gray-400 font-medium text-sm">bpm</span></div></div>
              
              <div className="col-span-2 md:col-span-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-600">الضغط (BP)</label>
                  {checkVitals('bp', formData.bp_sys, formData.bp_dia)}
                </div>
                <div className="flex items-center gap-2 bg-gray-50/50 border border-gray-200 rounded-xl p-1">
                  <input type="number" name="bp_sys" value={formData.bp_sys} onChange={handleInputChange} className="w-full p-2 bg-transparent outline-none text-center text-lg font-bold" placeholder="120" dir="ltr" />
                  <span className="text-gray-400 font-bold text-xl">/</span>
                  <input type="number" name="bp_dia" value={formData.bp_dia} onChange={handleInputChange} className="w-full p-2 bg-transparent outline-none text-center text-lg font-bold" placeholder="80" dir="ltr" />
                </div>
              </div>
              
              <div className="col-span-2 md:col-span-1"><div className="flex justify-between items-center mb-2"><label className="text-sm font-semibold text-gray-600">السكر</label>{checkVitals('rbs', formData.rbs)}</div><div className="relative"><input type="number" name="rbs" value={formData.rbs} onChange={handleInputChange} className="w-full p-3 pl-12 pr-4 border border-gray-200 rounded-xl text-center text-lg bg-gray-50/50" placeholder="100" /><span className="absolute left-4 top-3.5 text-gray-400 font-medium text-sm">mg</span></div></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">التشخيص والتوصية</h2><FileText size={22} className="text-gray-500" /></div>
          <div className="p-6 space-y-6">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">التشخيص (Diagnosis)</label><textarea name="disease" value={formData.disease} onChange={handleInputChange} rows={2} className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50/50" placeholder="اكتب التشخيص..."></textarea></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">التوصية (Recommendation)</label><textarea name="recommendation" value={formData.recommendation} onChange={handleInputChange} rows={2} className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50/50" placeholder="الإجراءات المتخذة..."></textarea></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-5">
            <h2 className="font-bold text-gray-800 text-xl flex items-center gap-2">الأدوية المصروفة <Pill className="text-purple-600" size={24}/></h2>
            <button onClick={addMedication} className="bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 px-4 py-2 rounded-xl transition-colors flex items-center gap-1"><Plus size={18}/> إضافة دواء</button>
          </div>
          <div className="space-y-4">
            {medications.map((med) => (
              <div key={med.id} className="flex gap-3 items-center">
                <div className="flex-1">
                  <AutocompleteInput options={dbInventoryOptions} value={med.medId} onChange={(val) => updateMedication(med.id, 'medId', val)} placeholder="ابحث عن اسم الدواء..." />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#fff9f2] border border-orange-200 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-orange-900 font-bold text-lg"><Send size={22} className="text-orange-600" /> حالة التحويل</h3>
            <div className="flex gap-4">
              <label className={`flex items-center justify-center cursor-pointer px-6 py-3 rounded-xl border-2 font-bold ${formData.transferred === "Not Transferred" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"}`}><span>غير محول</span><input type="radio" name="transferred" value="Not Transferred" checked={formData.transferred === "Not Transferred"} onChange={handleInputChange} className="hidden" /></label>
              <label className={`flex items-center justify-center cursor-pointer px-6 py-3 rounded-xl border-2 font-bold ${formData.transferred === "Transferred" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-500"}`}><span>محول للمستشفى</span><input type="radio" name="transferred" value="Transferred" checked={formData.transferred === "Transferred"} onChange={handleInputChange} className="hidden" /></label>
            </div>
          </div>
          {formData.transferred === "Transferred" && (
            <div className="mt-6 pt-6 border-t border-orange-200/50 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="block text-sm font-bold text-orange-900 mb-2">المستشفى</label><input type="text" name="hospital" value={formData.hospital} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-orange-900 mb-2">المرافق</label><input type="text" name="companionName" value={formData.companionName} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-orange-900 mb-2">جوال المرافق</label><input type="text" name="companionPhone" value={formData.companionPhone} onChange={handleInputChange} className="w-full p-3 border border-orange-200 rounded-xl" dir="ltr" /></div>
            </div>
          )}
        </div>

        <div className="pt-6">
          <button onClick={handleSave} disabled={isLoading || isInvalidSearch || !formData.visitType || (!formData.iqama_number && !formData.employee_number)} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={24} /> {isLoading ? "جاري الحفظ..." : "حفظ الزيارة وتحديث البيانات"}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}