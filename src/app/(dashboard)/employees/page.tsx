"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Building2, Loader2, User, Phone, Fingerprint, Activity, MapPin, Edit, X, Clock, AlertCircle, HeartPulse, Stethoscope, Plus, FileSpreadsheet, Download, FileUp, ChevronDown } from "lucide-react";
import Link from "next/link";

const getEmp = (empData: any) => {
  if (!empData) return {};
  return Array.isArray(empData) ? empData[0] : empData;
};

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
        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 text-gray-800 text-center transition-all"
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbNationalities, setDbNationalities] = useState<any[]>([]);
  const [dbChronicDiseases, setDbChronicDiseases] = useState<any[]>([]);

  const [selectedEmp, setSelectedEmp] = useState<any>(null); 
  const [empHistory, setEmpHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const [editingEmp, setEditingEmp] = useState<any>(null); 

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ iqama_number: '', name: '', phone: '', nationality: '', department: '', work_place: '', is_chronic: false, chronic_disease_notes: '' });

  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) setIsExcelMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const { data: empData, error: empError } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (empError) throw empError;
      if (empData) setEmployees(empData);

      const [deptsRes, natsRes, diseasesRes] = await Promise.all([
        supabase.from('departments').select('name').order('name'),
        supabase.from('nationalities').select('name').order('name'),
        supabase.from('chronic_diseases').select('name').order('name')
      ]);

      if (deptsRes.data) setDbDepartments(deptsRes.data.map(d => ({ label: d.name, value: d.name })));
      if (natsRes.data) setDbNationalities(natsRes.data.map(n => ({ label: n.name, value: n.name })));
      if (diseasesRes.data) setDbChronicDiseases(diseasesRes.data.map(cd => ({ label: cd.name, value: cd.name })));

    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  }

  const openEmployeeHistory = async (emp: any) => {
    setSelectedEmp(emp);
    setIsHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("visits")
        .select(`id, visit_type, diagnosis, recommendation, created_at, temperature, pulse, blood_pressure, rbs, injury_type, body_part`)
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setEmpHistory(data || []);
    } catch (error: any) { 
      console.error("Error fetching history:", error.message || error); 
    } finally { 
      setIsHistoryLoading(false); 
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.id === "DEMO") return alert("👁️ وضع المشاهدة مفعل. غير مصرح لك بالإضافة.");
    if (!newEmp.iqama_number || !newEmp.name) return alert("الاسم ورقم الإقامة مطلوبين!");

    setIsLoading(true);
    try {
      const { error } = await supabase.from("employees").insert([newEmp]);
      if (error) throw error;
      alert("✅ تمت إضافة الموظف بنجاح!");
      setShowAddModal(false);
      setNewEmp({ iqama_number: '', name: '', phone: '', nationality: '', department: '', work_place: '', is_chronic: false, chronic_disease_notes: '' });
      fetchData();
    } catch (error: any) { alert("❌ خطأ: " + error.message); } finally { setIsLoading(false); }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.id === "DEMO") {
      alert("👁️ وضع المشاهدة مفعل. غير مصرح لك بتعديل بيانات الموظفين.");
      setEditingEmp(null);
      return;
    }

    try {
      const { error } = await supabase.from("employees").update({
        name: editingEmp.name,
        phone: editingEmp.phone,
        department: editingEmp.department,
        nationality: editingEmp.nationality,
        work_place: editingEmp.work_place,
        is_chronic: editingEmp.is_chronic,
        chronic_disease_notes: editingEmp.chronic_disease_notes
      }).eq("id", editingEmp.id);
      
      if (error) throw error;
      alert("✅ تم تحديث بيانات الموظف بنجاح");
      setEditingEmp(null);
      fetchData(); 
    } catch (error: any) { alert("❌ خطأ: " + error.message); }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ['Iqama num', 'Name', 'Nationality', 'Phone', 'Department', 'Supervisor'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees_Template");
    XLSX.writeFile(wb, "Employees_Template.xlsx");
    setIsExcelMenuOpen(false); 
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.id === "DEMO") return alert("👁️ وضع المشاهدة مفعل. غير مصرح لك بالرفع.");

    setIsExcelMenuOpen(false);
    setIsLoading(true);
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const employeesToInsert = jsonData.map((row: any) => ({
          iqama_number: String(row['Iqama num'] || row['رقم الإقامة'] || row['iqama']),
          name: row['Name'] || row['الاسم'],
          department: row['Work place'] || row['القسم'] || row['Department'],
          nationality: row['Nationality'] || row['الجنسية'],
          phone: row['Phone'] || row['الجوال'],
        })).filter(e => e.iqama_number && e.iqama_number !== "undefined");

        if (employeesToInsert.length > 0) {
          const { error } = await supabase.from('employees').upsert(employeesToInsert, { onConflict: 'iqama_number' });
          if (error) throw error;
          alert(`✅ تم رفع ${employeesToInsert.length} موظف بنجاح!`);
          fetchData();
        } else {
          alert("❌ لم يتم العثور على بيانات صحيحة في الملف.");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) { alert("❌ حدث خطأ أثناء الرفع: " + error.message); } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (emp.iqama_number || "").includes(searchTerm) || (emp.phone || "").includes(searchTerm);
    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const uniqueFilterDepts = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)));

  return (
    <div className="p-4 md:p-8 pb-24 font-sans" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">سجل الموظفين</h1>
          <p className="text-slate-500 mt-1 font-medium">قاعدة البيانات والملف الطبي الشامل</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-auto" ref={excelMenuRef}>
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleExcelUpload} />
            <button onClick={() => setIsExcelMenuOpen(!isExcelMenuOpen)} className="w-full sm:w-auto bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold flex items-center justify-between sm:justify-center gap-2 transition-colors shadow-sm">
              <div className="flex items-center gap-2"><FileSpreadsheet size={18} /> خيارات الإكسيل</div>
              <ChevronDown size={18} className={`transition-transform duration-300 ${isExcelMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isExcelMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden z-30 animate-in fade-in zoom-in-95">
                <button onClick={downloadTemplate} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50 flex items-center gap-2"><Download size={16} /> تحميل قالب البيانات</button>
                <button onClick={() => { fileInputRef.current?.click(); setIsExcelMenuOpen(false); }} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors flex items-center gap-2"><FileUp size={16} /> رفع ملف الموظفين</button>
              </div>
            )}
          </div>
          <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-200"><Plus size={18} /> إضافة موظف</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input type="text" placeholder="ابحث بالاسم، الإقامة، الجوال..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium" />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
        </div>
        <div className="w-full md:w-72 relative">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-bold text-slate-700 appearance-none">
            <option value="All">جميع الأقسام والورش</option>
            {uniqueFilterDepts.map((dept: any, idx) => <option key={idx} value={dept}>{dept}</option>)}
          </select>
          <Building2 className="absolute right-3 top-3.5 text-emerald-500 pointer-events-none" size={18} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} onClick={() => openEmployeeHistory(emp)} className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group cursor-pointer">
              {emp.is_chronic && <div className="absolute top-4 left-4 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><AlertCircle size={12} /> مرض مزمن</div>}
              <button onClick={(e) => { e.stopPropagation(); setEditingEmp(emp); }} className="absolute top-4 left-4 md:left-auto md:right-4 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 p-2 rounded-xl transition-colors md:opacity-0 group-hover:opacity-100 z-10" style={{ display: emp.is_chronic ? 'none' : 'block' }}><Edit size={16} /></button>
              <div className="flex items-start gap-4 mb-4 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0"><User size={24} className="text-slate-500" /></div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 truncate text-base">{emp.name || 'بدون اسم'}</h3>{emp.is_chronic && <button onClick={(e) => { e.stopPropagation(); setEditingEmp(emp); }} className="text-slate-400 hover:text-blue-600 z-10 relative"><Edit size={14}/></button>}</div>
                  <p className="text-xs text-slate-500 font-medium truncate">{emp.nationality || 'جنسية غير مسجلة'}</p>
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 flex-1 transition-colors group-hover:bg-blue-50/50">
                <div className="flex items-center gap-2 text-sm"><Fingerprint size={16} className="text-blue-500" /><span className="font-mono font-bold text-slate-700">{emp.iqama_number}</span></div>
                <div className="flex items-center gap-2 text-sm"><Building2 size={16} className="text-orange-500" /><span className="font-bold text-slate-600">{emp.department || 'القسم غير محدد'}</span></div>
                <div className="flex items-center gap-2 text-sm"><Phone size={16} className="text-purple-500" /><span className="font-mono font-bold text-slate-600" dir="ltr">{emp.phone || '-'}</span></div>
              </div>
              <Link href={`/visit/new?iqama=${emp.iqama_number}`} onClick={(e) => e.stopPropagation()} className="w-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors relative z-10"><Activity size={16} /> تسجيل زيارة للموظف</Link>
            </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* Modal: إضافة موظف جديد */}
      {/* ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f4f7f6] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Plus size={20} className="text-emerald-600"/> إضافة موظف جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 p-2 rounded-xl"><X size={20}/></button>
            </div>
            
            {/* ⚠️ التعديل هنا: شيلنا overflow-hidden وضيفنا pb-32 */}
            <div className="p-6 overflow-y-auto pb-32">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الإقامة *</label><input type="text" value={newEmp.iqama_number} onChange={e => setNewEmp({...newEmp, iqama_number: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الاسم *</label><input type="text" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الجوال</label><input type="text" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" dir="ltr" /></div>
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجنسية</label><AutocompleteInput options={dbNationalities} value={newEmp.nationality} onChange={(val) => setNewEmp({...newEmp, nationality: val})} placeholder="اختر أو اكتب الجنسية..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">القسم</label><AutocompleteInput options={dbDepartments} value={newEmp.department} onChange={(val) => setNewEmp({...newEmp, department: val})} placeholder="اختر أو اكتب القسم..." /></div>
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">المشرف</label><input type="text" value={newEmp.work_place} onChange={e => setNewEmp({...newEmp, work_place: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                </div>
                
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={newEmp.is_chronic} onChange={e => setNewEmp({...newEmp, is_chronic: e.target.checked})} className="w-6 h-6 text-red-600 rounded-lg" />
                    <span className="font-bold text-red-800 text-lg flex items-center gap-2"><HeartPulse size={20}/> تسجيل كحالة مرض مزمن</span>
                  </label>
                  {newEmp.is_chronic && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-red-800 mb-2">نوع المرض المزمن</label>
                      <AutocompleteInput options={dbChronicDiseases} value={newEmp.chronic_disease_notes} onChange={(val) => setNewEmp({...newEmp, chronic_disease_notes: val})} placeholder="ابحث أو اختر المرض..." />
                    </div>
                  )}
                </div>

              </div>
            </div>
            <div className="p-6 bg-white border-t border-gray-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">إلغاء</button>
              <button type="button" onClick={handleAddEmployee} className="flex-[2] px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xl transition-all">إضافة الموظف</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Modal: تعديل بيانات الموظف */}
      {/* ========================================== */}
      {editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f4f7f6] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> تعديل بيانات الموظف</h2>
              <button onClick={() => setEditingEmp(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 p-2 rounded-xl"><X size={20}/></button>
            </div>

            {/* ⚠️ التعديل هنا: شيلنا overflow-hidden وضيفنا pb-32 */}
            <div className="p-6 overflow-y-auto pb-32">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">بيانات العامل (Employee Info)</h2><User size={22} className="text-blue-500" /></div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الاسم (Name)</label><input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" /></div>
                    <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الجوال (Phone)</label><input type="text" value={editingEmp.phone || ''} onChange={e => setEditingEmp({...editingEmp, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" dir="ltr" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجنسية (Nationality)</label><AutocompleteInput options={dbNationalities} value={editingEmp.nationality || ''} onChange={(val) => setEditingEmp({...editingEmp, nationality: val})} placeholder="اختر أو اكتب الجنسية..." /></div>
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الإقامة</label><input type="text" value={editingEmp.iqama_number} disabled className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-center text-gray-500 cursor-not-allowed" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">القسم/المكان (Work place)</label><AutocompleteInput options={dbDepartments} value={editingEmp.department || ''} onChange={(val) => setEditingEmp({...editingEmp, department: val})} placeholder="اختر أو اكتب القسم..." /></div>
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">المشرف (Supervisor)</label><input type="text" value={editingEmp.work_place || ''} onChange={e => setEditingEmp({...editingEmp, work_place: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" /></div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editingEmp.is_chronic || false} onChange={e => setEditingEmp({...editingEmp, is_chronic: e.target.checked})} className="w-6 h-6 text-red-600 rounded-lg" />
                  <span className="font-bold text-red-800 text-lg flex items-center gap-2"><HeartPulse size={20}/> تسجيل كحالة مرض مزمن</span>
                </label>
                {editingEmp.is_chronic && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-red-800 mb-2">نوع المرض المزمن</label>
                    <AutocompleteInput 
                      options={dbChronicDiseases} 
                      value={editingEmp.chronic_disease_notes || ''} 
                      onChange={(val) => setEditingEmp({...editingEmp, chronic_disease_notes: val})} 
                      placeholder="ابحث أو اختر المرض..." 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 px-4 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">إلغاء</button>
              <button type="button" onClick={handleUpdateEmployee} className="flex-[2] px-4 py-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold rounded-xl shadow-xl transition-all">حفظ واعتماد البيانات</button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Modal 3: الملف الطبي للموظف (Medical History) */}
      {/* ========================================== */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
            
            <div className="bg-white px-6 py-5 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><User size={28}/></div>
                <div>
                  <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    {selectedEmp.name}
                    {selectedEmp.is_chronic && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">مرض مزمن</span>}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedEmp.department} | إقامة: <span className="font-mono">{selectedEmp.iqama_number}</span></p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-slate-800"><X size={20}/></button>
            </div>

            {selectedEmp.is_chronic && selectedEmp.chronic_disease_notes && (
              <div className="bg-red-50 border-b border-red-100 p-4 shrink-0">
                <p className="text-sm font-bold text-red-800 flex items-center gap-2"><HeartPulse size={18}/> مرض مزمن مسجل: {selectedEmp.chronic_disease_notes}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Activity size={18}/> سجل الزيارات ({empHistory.length})</h3>
              
              {isHistoryLoading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></div>
              ) : empHistory.length === 0 ? (
                <p className="text-center text-slate-400 py-10 font-bold bg-white rounded-2xl border border-slate-100">لا يوجد سجل مرضي لهذا الموظف.</p>
              ) : (
                empHistory.map((visit, index) => (
                  <div key={visit.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                    <div className="absolute -left-3 -top-3 bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold shadow-md">
                      {empHistory.length - index}
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${visit.visit_type === 'Work Injury' ? 'bg-orange-100 text-orange-700' : visit.visit_type === 'First Aid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{visit.visit_type}</span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1" dir="ltr"><Clock size={12}/> {new Date(visit.created_at).toLocaleDateString('ar-EG')} - {new Date(visit.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 mb-3"><span className="text-slate-400 block text-xs mb-1">التشخيص / الشكوى:</span>{visit.diagnosis || visit.complaint || "غير مسجل"}</div>
                    
                    <div className="flex flex-wrap gap-2 text-xs font-bold mt-3">
                      {visit.blood_pressure && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">BP: {visit.blood_pressure}</span>}
                      {visit.temperature && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md">Temp: {visit.temperature}°C</span>}
                      {visit.rbs && <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">RBS: {visit.rbs} mg</span>}
                      {visit.pulse && <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md">Pulse: {visit.pulse} bpm</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}