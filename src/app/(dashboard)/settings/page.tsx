"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Settings, Loader2, Trash2, Plus, Users, Database, FileSpreadsheet, Stethoscope, Building2, HardHat, HeartPulse, Activity } from "lucide-react";

export default function PremiumSettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  
  const [refData, setRefData] = useState<{ table: string, label: string, icon: any, items: any[] }[]>([
    { table: 'medicines', label: 'صيدلية الأدوية', icon: <Stethoscope size={20}/>, items: [] },
    { table: 'departments', label: 'الأقسام والورش', icon: <Building2 size={20}/>, items: [] },
    { table: 'injury_types', label: 'تصنيفات الإصابات', icon: <HardHat size={20}/>, items: [] },
    { table: 'chronic_diseases', label: 'الأمراض المزمنة', icon: <HeartPulse size={20}/>, items: [] },
    { table: 'body_parts', label: 'أجزاء الجسم (HSE)', icon: <Activity size={20}/>, items: [] }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTableForUpload, setActiveTableForUpload] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const mockSession = { role: 'ADMIN', username: 'Super Admin', id: 'DEMO_ADMIN' };
    localStorage.setItem("clinic_session", JSON.stringify(mockSession));
    
    setRole('ADMIN');
    fetchSystemData();
  }, [router]);

  async function fetchSystemData() {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('*');
      setUsers(userData || []);

      const newData = await Promise.all(refData.map(async (d) => {
        const { data } = await supabase.from(d.table).select('*').order('name');
        return { ...d, items: data || [] };
      }));
      setRefData(newData);
    } catch (error) { console.error("Error fetching data:", error); } finally { setIsLoading(false); }
  }

  const handleAddItem = async (table: string, name: string) => {
    if (!name.trim()) return;
    try {
      await supabase.from(table).insert([{ name: name.trim() }]);
      fetchSystemData();
    } catch (error) { console.error("Error adding item:", error); }
  };

  const handleDeleteItem = async (table: string, id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        await supabase.from(table).delete().eq('id', id);
        fetchSystemData();
      } catch (error) { console.error("Error deleting item:", error); }
    }
  };

  const triggerExcelUpload = (table: string) => {
    setActiveTableForUpload(table);
    fileInputRef.current?.click();
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTableForUpload) return;

    setIsUploading(true);
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); 
        
        const itemsToInsert = jsonData
          .slice(1)
          .map((row: any) => row[0]?.toString().trim())
          .filter(name => name && name.length > 0)
          .map(name => ({ name }));

        if (itemsToInsert.length > 0) {
          const { error } = await supabase.from(activeTableForUpload).upsert(itemsToInsert, { onConflict: 'name' });
          if (error) throw error;
          alert(`✅ تم رفع ${itemsToInsert.length} عنصر بنجاح!`);
          fetchSystemData();
        } else {
          alert("❌ لم يتم العثور على بيانات صالحة في العمود الأول.");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      alert("❌ حدث خطأ أثناء الرفع: " + error.message);
    } finally {
      setIsUploading(false);
      setActiveTableForUpload(null);
      if (e.target) e.target.value = '';
    }
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-[#f8fafc]"><Loader2 className="animate-spin text-blue-600" size={50}/></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans" dir="rtl">
      <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleExcelUpload} />

      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20"><Settings size={24}/></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات النظام المركزية</h1>
              <p className="text-sm font-bold text-slate-500">التحكم الكامل في قواعد بيانات العيادة وصلاحيات الوصول</p>
            </div>
          </div>
          {isUploading && <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse"><Loader2 className="animate-spin" size={16}/> جاري رفع البيانات...</span>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-white p-3 rounded-[24px] shadow-sm border border-slate-200 sticky top-32 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 mb-4 px-4 pt-2 uppercase tracking-wider">القوائم الرئيسية</h3>
            <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === 'general' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Database size={20} className={activeTab === 'general' ? 'text-blue-600' : 'text-slate-400'}/> القواعد الطبية والأقسام
            </button>
            {role === 'ADMIN' && (
              <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Users size={20} className={activeTab === 'users' ? 'text-blue-400' : 'text-slate-400'}/> إدارة الصلاحيات والوصول
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === 'users' && role === 'ADMIN' && (
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                <div><h2 className="font-black text-2xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> إدارة المستخدمين</h2><p className="text-slate-500 font-medium text-sm mt-1">إضافة وحذف وتعديل أدوار العاملين على النظام</p></div>
                <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"><Plus size={18}/> مستخدم جديد</button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold"><tr className="border-b border-slate-100"><th className="py-4 px-6">اسم المستخدم</th><th className="py-4 px-6">الدور (Role)</th><th className="py-4 px-6 text-center">إجراءات</th></tr></thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-8 text-slate-400 font-bold">لا يوجد مستخدمين مسجلين.</td></tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-black text-slate-800">{u.username}</td>
                          <td className="py-4 px-6"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-bold text-xs">{u.role}</span></td>
                          <td className="py-4 px-6 text-center"><button className="text-red-500 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">إلغاء الصلاحية</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
              {refData.map(d => (
                <div key={d.table} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 flex flex-col h-[420px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">{d.icon}</div>
                      {d.label}
                    </h3>
                    <button onClick={() => triggerExcelUpload(d.table)} className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg flex items-center gap-1 transition-colors border border-emerald-100" title="يجب أن يحتوي الملف على عمود واحد فقط بأسماء العناصر">
                      <FileSpreadsheet size={14}/> إكسيل
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4 shrink-0">
                    <input id={`input-${d.table}`} className="flex-1 p-3.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-semibold text-sm" placeholder={`إضافة عنصر جديد...`} onKeyDown={(e) => {
                      if (e.key === 'Enter') { handleAddItem(d.table, e.currentTarget.value); e.currentTarget.value = ''; }
                    }}/>
                    <button onClick={() => {
                      const input = document.getElementById(`input-${d.table}`) as HTMLInputElement;
                      handleAddItem(d.table, input.value); input.value = '';
                    }} className="bg-slate-900 text-white w-14 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center shrink-0 shadow-md"><Plus size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-2 custom-scrollbar">
                    {d.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                        <Database size={32} opacity={0.5}/>
                        <p className="text-sm font-bold">القائمة فارغة</p>
                      </div>
                    ) : (
                      d.items.map((i, index) => (
                        <div key={i.id} className="flex justify-between items-center p-3.5 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100/50 group">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-400 bg-white w-6 h-6 flex items-center justify-center rounded-md border border-slate-200">{index + 1}</span>
                            <span className="font-bold text-sm text-slate-700">{i.name}</span>
                          </div>
                          <button onClick={() => handleDeleteItem(d.table, i.id)} className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-slate-200 hover:border-red-200"><Trash2 size={14}/></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* ⚠️ تم تعديل الكلمة هنا من dangerouslySetContent لـ dangerouslySetInnerHTML */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}
