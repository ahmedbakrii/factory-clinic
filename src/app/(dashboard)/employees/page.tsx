"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Search, Building2, Loader2, User, Phone, Fingerprint, Activity, Edit, X, Clock, AlertCircle, HeartPulse, Plus, FileSpreadsheet, Download, FileUp, ChevronDown, Briefcase, HardHat, TrendingUp, Users, ArrowDownAZ } from "lucide-react";
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
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [showChronicOnly, setShowChronicOnly] = useState(false);
  const [sortBy, setSortBy] = useState("most_visits"); // ⚠️ فلتر الترتيب الجديد

  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbNationalities, setDbNationalities] = useState<any[]>([]);
  const [dbChronicDiseases, setDbChronicDiseases] = useState<any[]>([]);

  const [selectedEmp, setSelectedEmp] = useState<any>(null); 
  const [empHistory, setEmpHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const [editingEmp, setEditingEmp] = useState<any>(null); 

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ iqama_number: '', employee_number: '', name: '', phone: '', nationality: '', age: '', department: '', work_place: '', is_chronic: false, chronic_disease_notes: '' });

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
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.role === 'HSE_MANAGER' || session.role === 'NURSE') {
      router.push('/visits');
      return;
    }
    fetchData();
  }, [router]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // ⚠️ هنسحب الموظفين وعدد زياراتهم في نفس الوقت عشان الترتيب
      const { data: empData, error: empError } = await supabase.from("employees").select("*, visits(id)");
      if (empError) throw empError;
      
      if (empData) {
        // بنحسب عدد الزيارات ونجهزه
        const processedEmps = empData.map(emp => ({
          ...emp,
          visitCount: emp.visits ? emp.visits.length : 0
        }));
        setEmployees(processedEmps);
      }

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
    if (session.isDemo) return alert("👁️ وضع المشاهدة مفعل. غير مصرح لك بالإضافة.");
    if (!newEmp.iqama_number && !newEmp.employee_number) return alert("يجب إدخال رقم الإقامة أو الرقم الوظيفي!");
    if (!newEmp.name) return alert("الاسم مطلوب!");

    setIsLoading(true);
    try {
      const payload = { 
        ...newEmp, 
        age: newEmp.age ? parseInt(newEmp.age) : null,
        iqama_number: newEmp.iqama_number || null,
        employee_number: newEmp.employee_number || null
      };
      
      const { error } = await supabase.from("employees").insert([payload]);
      
      if (error) throw error;
      alert("✅ تمت إضافة الموظف بنجاح!");
      setShowAddModal(false);
      setNewEmp({ iqama_number: '', employee_number: '', name: '', phone: '', nationality: '', age: '', department: '', work_place: '', is_chronic: false, chronic_disease_notes: '' });
      fetchData();
    } catch (error: any) { alert("❌ خطأ (قد يكون الرقم مسجل بالفعل): " + error.message); } finally { setIsLoading(false); }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (session.isDemo) {
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
        age: editingEmp.age ? parseInt(editingEmp.age) : null,
        work_place: editingEmp.work_place,
        employee_number: editingEmp.employee_number || null, 
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
    const headers = ['Iqama num', 'Employee num', 'Name', 'Nationality', 'Age', 'Phone', 'Department', 'Supervisor'];
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
    if (session.isDemo) return alert("👁️ وضع المشاهدة مفعل. غير مصرح لك بالرفع.");

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
          iqama_number: row['Iqama num'] || row['رقم الإقامة'] || row['iqama'] ? String(row['Iqama num'] || row['رقم الإقامة'] || row['iqama']) : null,
          employee_number: row['Employee num'] || row['الرقم الوظيفي'] ? String(row['Employee num'] || row['الرقم الوظيفي']) : null,
          name: row['Name'] || row['الاسم'],
          department: row['Work place'] || row['القسم'] || row['Department'],
          nationality: row['Nationality'] || row['الجنسية'],
          age: parseInt(row['Age'] || row['العمر']) || null, 
          phone: row['Phone'] || row['الجوال'],
        })).filter(e => (e.iqama_number && e.iqama_number !== "undefined") || (e.employee_number && e.employee_number !== "undefined"));

        if (employeesToInsert.length > 0) {
          let success = 0;
          for (const emp of employeesToInsert) {
             const conflictCol = emp.iqama_number ? 'iqama_number' : 'employee_number';
             const { error } = await supabase.from('employees').upsert([emp], { onConflict: conflictCol });
             if (!error) success++;
          }
          alert(`✅ تم رفع/تحديث ${success} موظف بنجاح!`);
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

  // ⚠️ فلترة وترتيب ذكي للموظفين
  let filteredEmployees = employees.filter((emp) => {
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.iqama_number || "").includes(searchTerm) || 
                          (emp.employee_number || "").includes(searchTerm) || 
                          (emp.phone || "").includes(searchTerm);
    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    const matchesChronic = showChronicOnly ? emp.is_chronic : true;
    return matchesSearch && matchesDept && matchesChronic;
  });

  // الترتيب بناءً على اختيار المستخدم
  if (sortBy === "most_visits") {
    filteredEmployees.sort((a, b) => b.visitCount - a.visitCount);
  } else if (sortBy === "newest") {
    filteredEmployees.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortBy === "name") {
    filteredEmployees.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'ar'));
  }

  const uniqueFilterDepts = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)));

  return (
    <div className="p-4 md:p-8 pb-24 font-sans bg-[#f8fafc] min-h-screen" dir="rtl">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">سجل الموظفين</h1>
          <p className="text-slate-500 mt-1 font-medium">قاعدة البيانات والملف الطبي الشامل للعمال</p>
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

      {/* ⚠️ كروت الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-2 mb-2"><Users size={18} className="text-blue-500" /><span className="text-xs font-bold text-slate-500">إجمالي العمالة</span></div>
            <div className="text-3xl font-black text-slate-800">{isLoading ? "..." : employees.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-red-300 transition-colors">
            <div className="flex items-center gap-2 mb-2"><AlertCircle size={18} className="text-red-500" /><span className="text-xs font-bold text-slate-500">حالات مزمنة مسجلة</span></div>
            <div className="text-3xl font-black text-slate-800">{isLoading ? "..." : employees.filter(e => e.is_chronic).length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-2 mb-2"><Activity size={18} className="text-emerald-500" /><span className="text-xs font-bold text-slate-500">موظفين زاروا العيادة</span></div>
            <div className="text-3xl font-black text-slate-800">{isLoading ? "..." : employees.filter(e => e.visitCount > 0).length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-orange-300 transition-colors">
            <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-orange-500" /><span className="text-xs font-bold text-slate-500">إجمالي الزيارات</span></div>
            <div className="text-3xl font-black text-slate-800">{isLoading ? "..." : employees.reduce((acc, curr) => acc + curr.visitCount, 0)}</div>
        </div>
      </div>

      {/* شريط البحث والفلاتر السريعة */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input type="text" placeholder="ابحث بالاسم، الإقامة، الوظيفي، أو الجوال..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium transition-shadow" />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={20} />
        </div>
        
        <button onClick={() => setShowChronicOnly(!showChronicOnly)} className={`md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border ${showChronicOnly ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
          <AlertCircle size={18} className={showChronicOnly ? "text-red-500" : "text-slate-400"} /> أمراض مزمنة فقط
        </button>

        <div className="w-full md:w-56 relative">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-bold text-slate-700 appearance-none">
            <option value="All">جميع الأقسام والورش</option>
            {uniqueFilterDepts.map((dept: any, idx) => <option key={idx} value={dept}>{dept}</option>)}
          </select>
          <Building2 className="absolute right-3 top-3.5 text-emerald-500 pointer-events-none" size={18} />
        </div>

        {/* ⚠️ فلتر الترتيب الجديد */}
        <div className="w-full md:w-56 relative">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold text-slate-700 appearance-none">
            <option value="most_visits">الأكثر زيارة للعيادة</option>
            <option value="newest">المضاف حديثاً</option>
            <option value="name">الاسم (أ - ي)</option>
          </select>
          <ArrowDownAZ className="absolute right-3 top-3.5 text-blue-500 pointer-events-none" size={18} />
        </div>
      </div>

      {/* قائمة الموظفين (الكروت) */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20"><Loader2 className="animate-spin text-emerald-500 mb-4" size={40} /><p className="text-slate-500 font-bold">جاري تحميل قاعدة البيانات...</p></div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm"><User className="mx-auto text-slate-300 mb-4" size={60} /><h3 className="text-xl font-bold text-slate-700">لا يوجد موظفين مسجلين بهذه الفلاتر</h3></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} onClick={() => openEmployeeHistory(emp)} className="bg-white rounded-[24px] shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all flex flex-col h-full relative overflow-hidden group cursor-pointer hover:-translate-y-1">
              
              {/* البادجات العلوية */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 items-end">
                 {emp.is_chronic && <span className="bg-red-100 text-red-700 px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"><AlertCircle size={12} /> مزمن</span>}
                 {emp.visitCount > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"><Activity size={12}/> {emp.visitCount} زيارات</span>}
              </div>
              
              {/* زر التعديل (يظهر بالماوس أو لو مفيش بادجات كتير) */}
              <button onClick={(e) => { e.stopPropagation(); setEditingEmp(emp); }} className="absolute top-4 right-4 bg-slate-50 hover:bg-blue-100 text-slate-500 hover:text-blue-600 p-2 rounded-xl transition-colors md:opacity-0 group-hover:opacity-100 z-10 shadow-sm"><Edit size={16} /></button>
              
              <div className="flex items-start gap-4 mb-4 mt-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><User size={28} className="text-slate-400 group-hover:text-blue-600" /></div>
                <div className="flex-1 min-w-0 pt-1 pr-8 md:pr-0">
                  <h3 className="font-bold text-slate-800 truncate text-base">{emp.name || 'بدون اسم'}</h3>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{emp.nationality || 'جنسية غير مسجلة'} {emp.age && `• ${emp.age} سنة`}</p>
                </div>
              </div>
              
              {/* ⚠️ البيانات الذكية (اللي فاضي مش هيظهر) */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 flex-1 transition-colors group-hover:bg-white group-hover:border-blue-100">
                {emp.iqama_number && <div className="flex items-center gap-2 text-sm"><Fingerprint size={16} className="text-slate-400 shrink-0" /><span className="font-mono font-bold text-slate-700 truncate">إقامة: {emp.iqama_number}</span></div>}
                {emp.employee_number && <div className="flex items-center gap-2 text-sm"><Briefcase size={16} className="text-blue-500 shrink-0" /><span className="font-mono font-bold text-slate-700 truncate">وظيفي: {emp.employee_number}</span></div>}
                {emp.department && <div className="flex items-center gap-2 text-sm"><Building2 size={16} className="text-orange-500 shrink-0" /><span className="font-bold text-slate-600 truncate">{emp.department}</span></div>}
                {emp.phone && <div className="flex items-center gap-2 text-sm"><Phone size={16} className="text-emerald-500 shrink-0" /><span className="font-mono font-bold text-slate-600 truncate" dir="ltr">{emp.phone}</span></div>}
              </div>
              
              <Link href={`/visit/new?iqama=${emp.iqama_number || emp.employee_number}`} onClick={(e) => e.stopPropagation()} className="w-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors relative z-10 shadow-sm"><Plus size={16} /> تسجيل زيارة</Link>
            </div>
          ))}
        </div>
      )}

      {/* Modal: إضافة موظف جديد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Plus size={20} className="text-emerald-600"/> إضافة موظف جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto pb-32">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الإقامة</label><input type="text" value={newEmp.iqama_number} onChange={e => setNewEmp({...newEmp, iqama_number: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الرقم الوظيفي</label><input type="text" value={newEmp.employee_number} onChange={e => setNewEmp({...newEmp, employee_number: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الاسم *</label><input type="text" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الجوال</label><input type="text" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" dir="ltr" /></div>
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجنسية</label><AutocompleteInput options={dbNationalities} value={newEmp.nationality} onChange={(val) => setNewEmp({...newEmp, nationality: val})} placeholder="اختر أو اكتب الجنسية..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">العمر</label><input type="number" value={newEmp.age} onChange={e => setNewEmp({...newEmp, age: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                  <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">القسم</label><AutocompleteInput options={dbDepartments} value={newEmp.department} onChange={(val) => setNewEmp({...newEmp, department: val})} placeholder="اختر أو اكتب القسم..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">المشرف</label><input type="text" value={newEmp.work_place} onChange={e => setNewEmp({...newEmp, work_place: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 text-center bg-gray-50/50" /></div>
                </div>
                
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mt-4 transition-colors hover:bg-red-100/50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={newEmp.is_chronic} onChange={e => setNewEmp({...newEmp, is_chronic: e.target.checked})} className="w-6 h-6 text-red-600 rounded-lg accent-red-600" />
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
              <button type="button" onClick={handleAddEmployee} className="flex-[2] px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xl transition-all">حفظ وإضافة الموظف</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تعديل بيانات الموظف */}
      {editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> تعديل بيانات الموظف</h2>
              <button onClick={() => setEditingEmp(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-xl transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto pb-32">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الإقامة</label><input type="text" value={editingEmp.iqama_number || ''} disabled className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-center text-gray-500 cursor-not-allowed" /></div>
                    <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الرقم الوظيفي</label><input type="text" value={editingEmp.employee_number || ''} onChange={e => setEditingEmp({...editingEmp, employee_number: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الاسم (Name)</label><input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" /></div>
                    <div className="col-span-2 md:col-span-1"><label className="block text-center text-sm font-semibold text-gray-600 mb-2">رقم الجوال (Phone)</label><input type="text" value={editingEmp.phone || ''} onChange={e => setEditingEmp({...editingEmp, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" dir="ltr" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">الجنسية (Nationality)</label><AutocompleteInput options={dbNationalities} value={editingEmp.nationality || ''} onChange={(val) => setEditingEmp({...editingEmp, nationality: val})} placeholder="اختر أو اكتب الجنسية..." /></div>
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">العمر (Age)</label><input type="number" value={editingEmp.age || ''} onChange={e => setEditingEmp({...editingEmp, age: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">القسم/المكان (Work place)</label><AutocompleteInput options={dbDepartments} value={editingEmp.department || ''} onChange={(val) => setEditingEmp({...editingEmp, department: val})} placeholder="اختر أو اكتب القسم..." /></div>
                    <div><label className="block text-center text-sm font-semibold text-gray-600 mb-2">المشرف (Supervisor)</label><input type="text" value={editingEmp.work_place || ''} onChange={e => setEditingEmp({...editingEmp, work_place: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-center bg-gray-50/50" /></div>
                  </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 transition-colors hover:bg-red-100/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editingEmp.is_chronic || false} onChange={e => setEditingEmp({...editingEmp, is_chronic: e.target.checked})} className="w-6 h-6 text-red-600 rounded-lg accent-red-600" />
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
              <button type="button" onClick={handleUpdateEmployee} className="flex-[2] px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl transition-all">حفظ التعديلات</button>
            </div>

          </div>
        </div>
      )}

      {/* Modal 3: الملف الطبي للموظف (Medical History) */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#f8fafc] rounded-[24px] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
            
            <div className="bg-white px-6 py-5 border-b border-slate-200 flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm"><User size={28}/></div>
                <div>
                  <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    {selectedEmp.name}
                    {selectedEmp.is_chronic && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm">مرض مزمن</span>}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">{selectedEmp.department} | إقامة/وظيفي: <span className="font-mono">{selectedEmp.iqama_number || selectedEmp.employee_number}</span></p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="bg-slate-100 p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"><X size={20}/></button>
            </div>

            {selectedEmp.is_chronic && selectedEmp.chronic_disease_notes && (
              <div className="bg-red-50 border-b border-red-100 p-4 shrink-0 shadow-inner">
                <p className="text-sm font-bold text-red-800 flex items-center gap-2"><HeartPulse size={18}/> مرض مزمن مسجل: {selectedEmp.chronic_disease_notes}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><Activity size={18}/> سجل الزيارات والعيادة ({empHistory.length})</h3>
                 <Link href={`/visit/new?iqama=${selectedEmp.iqama_number || selectedEmp.employee_number}`} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 bg-white">تسجيل زيارة جديدة</Link>
              </div>
              
              {isHistoryLoading ? (
                <div className="py-10 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-blue-500 mb-2" size={30} /><span className="text-slate-500 font-bold text-sm">جاري جلب الملف الطبي...</span></div>
              ) : empHistory.length === 0 ? (
                <p className="text-center text-slate-400 py-10 font-bold bg-white rounded-2xl border border-slate-100 shadow-sm">لا يوجد سجل مرضي لهذا الموظف.</p>
              ) : (
                empHistory.map((visit, index) => (
                  <div key={visit.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative hover:shadow-md transition-shadow">
                    <div className="absolute -left-3 -top-3 bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold shadow-md">
                      {empHistory.length - index}
                    </div>
                    <div className="flex justify-between items-start mb-3 pl-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${visit.visit_type === 'Work Injury' ? 'bg-orange-100 text-orange-700' : visit.visit_type === 'First Aid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{visit.visit_type}</span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1" dir="ltr"><Clock size={12}/> {new Date(visit.created_at).toLocaleDateString('ar-EG', {month:'short', day:'numeric'})} - {new Date(visit.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    {visit.visit_type === 'Work Injury' && visit.injury_type && (
                       <div className="bg-orange-50 border border-orange-100 p-2 rounded-lg text-xs font-bold text-orange-800 mb-2 flex items-center gap-2"><HardHat size={14}/> {visit.injury_type} ({visit.body_part})</div>
                    )}
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 mb-3"><span className="text-slate-400 block text-xs mb-1">التشخيص / الشكوى:</span>{visit.diagnosis || visit.complaint || "غير مسجل"}</div>
                    
                    <div className="flex flex-wrap gap-2 text-xs font-bold mt-3">
                      {visit.blood_pressure && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">BP: {visit.blood_pressure}</span>}
                      {visit.temperature && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md border border-orange-100">Temp: {visit.temperature}°C</span>}
                      {visit.rbs && <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">RBS: {visit.rbs} mg</span>}
                      {visit.pulse && <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md border border-rose-100">Pulse: {visit.pulse} bpm</span>}
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