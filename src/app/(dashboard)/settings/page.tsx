"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Settings, Loader2, Trash2, Plus, Users, Database, FileSpreadsheet, Stethoscope, Building2, HardHat, HeartPulse, Activity, Globe2, Edit, Ban, CheckCircle, X, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";

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
    { table: 'body_parts', label: 'أجزاء الجسم (HSE)', icon: <Activity size={20}/>, items: [] },
    { table: 'nationalities', label: 'الجنسيات', icon: <Globe2 size={20}/>, items: [] }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTableForUpload, setActiveTableForUpload] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // حالات إدارة المستخدمين
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'NURSE' });

  // حالات إدارة العناصر (تعديل وحذف متعدد)
  const [selectedItems, setSelectedItems] = useState<Record<string, number[]>>({});
  const [editingItemInfo, setEditingItemInfo] = useState<{table: string, id: number, name: string} | null>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("clinic_session") || "{}");
    if (!session || !session.role) {
      router.push("/login");
      return;
    }
    if (session.role !== 'ADMIN' && session.role !== 'CLINIC_MANAGER') {
      router.push('/');
      return;
    }
    
    setRole(session.role);
    fetchSystemData();
  }, [router]);

  async function fetchSystemData() {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('*').order('name');
      setUsers(userData || []);

      const newData = await Promise.all(refData.map(async (d) => {
        const { data } = await supabase.from(d.table).select('*').order('name');
        return { ...d, items: data || [] };
      }));
      setRefData(newData);
    } catch (error) { 
      toast.error("حدث خطأ أثناء تحميل البيانات");
    } finally { 
      setIsLoading(false); 
    }
  }

  // ==========================================
  // دوال إدارة القواعد (إضافة، تعديل، حذف، تحديد)
  // ==========================================
  const handleAddItem = async (table: string, name: string) => {
    if (!name.trim()) return;
    try {
      const { error } = await supabase.from(table).insert([{ name: name.trim() }]);
      if (error) throw error;
      toast.success("تمت الإضافة بنجاح");
      fetchSystemData();
    } catch (error) { toast.error("حدث خطأ أو العنصر موجود مسبقاً"); }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemInfo || !editingItemInfo.name.trim()) return;
    try {
      const { error } = await supabase.from(editingItemInfo.table).update({ name: editingItemInfo.name.trim() }).eq('id', editingItemInfo.id);
      if (error) throw error;
      toast.success("تم تعديل العنصر بنجاح");
      setEditingItemInfo(null);
      fetchSystemData();
    } catch (error) { toast.error("حدث خطأ أثناء التعديل"); }
  };

  const handleDeleteItem = async (table: string, id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        toast.success("تم الحذف بنجاح");
        fetchSystemData();
      } catch (error) { toast.error("لا يمكن الحذف لارتباط العنصر بسجلات أخرى"); }
    }
  };

  // دوال التحديد المتعدد (Bulk Selection)
  const toggleSelection = (table: string, id: number) => {
    setSelectedItems(prev => {
      const tableSelections = prev[table] || [];
      if (tableSelections.includes(id)) {
        return { ...prev, [table]: tableSelections.filter(itemId => itemId !== id) };
      } else {
        return { ...prev, [table]: [...tableSelections, id] };
      }
    });
  };

  const toggleSelectAll = (table: string, allIds: number[]) => {
    setSelectedItems(prev => {
      const tableSelections = prev[table] || [];
      if (tableSelections.length === allIds.length) {
        return { ...prev, [table]: [] }; // إلغاء تحديد الكل
      } else {
        return { ...prev, [table]: allIds }; // تحديد الكل
      }
    });
  };

  const handleBulkDelete = async (table: string) => {
    const idsToDelete = selectedItems[table] || [];
    if (idsToDelete.length === 0) return;
    
    if (confirm(`هل أنت متأكد من حذف ${idsToDelete.length} عنصر؟`)) {
      try {
        const { error } = await supabase.from(table).delete().in('id', idsToDelete);
        if (error) throw error;
        toast.success(`تم حذف ${idsToDelete.length} عنصر بنجاح`);
        setSelectedItems(prev => ({ ...prev, [table]: [] }));
        fetchSystemData();
      } catch (error) { toast.error("لا يمكن حذف بعض العناصر لارتباطها بسجلات سابقة"); }
    }
  };

  // دوال الإكسيل
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
          toast.success(`تم رفع ${itemsToInsert.length} عنصر من الإكسيل بنجاح!`);
          fetchSystemData();
        } else {
          toast.error("لم يتم العثور على بيانات صالحة في الملف");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast.error("حدث خطأ أثناء رفع الملف");
    } finally {
      setIsUploading(false);
      setActiveTableForUpload(null);
      if (e.target) e.target.value = '';
    }
  };

  // ==========================================
  // دوال إدارة المستخدمين 
  // ==========================================
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.name || !userForm.role) return toast.error("يرجى إكمال البيانات الأساسية");
    if (!editingUser && !userForm.password) return toast.error("كلمة المرور مطلوبة للمستخدم الجديد");

    try {
      if (editingUser) {
        const updatePayload: any = { 
          name: userForm.name, 
          username: userForm.username, 
          role: userForm.role 
        };
        if (userForm.password) updatePayload.password = userForm.password; 
        
        const { error } = await supabase.from('users').update(updatePayload).eq('id', editingUser.id);
        if (error) throw error;
        toast.success("تم تحديث بيانات المستخدم بنجاح");
      } else {
        const { error } = await supabase.from('users').insert([userForm]);
        if (error) throw error;
        toast.success("تمت إضافة المستخدم الجديد بنجاح");
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ name: '', username: '', password: '', role: 'NURSE' });
      fetchSystemData();
    } catch (error: any) {
      toast.error("حدث خطأ! (قد يكون اسم الدخول مستخدماً مسبقاً)");
    }
  };

  const handleToggleSuspendUser = async (user: any) => {
    const newRole = user.role === 'SUSPENDED' ? 'NURSE' : 'SUSPENDED';
    const msg = user.role === 'SUSPENDED' ? 'تنشيط' : 'تعطيل';
    if (confirm(`هل أنت متأكد من ${msg} حساب ${user.name}؟`)) {
      try {
        const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
        if (error) throw error;
        toast.success(`تم ${msg} الحساب بنجاح`);
        fetchSystemData();
      } catch (error) { toast.error("حدث خطأ أثناء تحديث حالة الحساب"); }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف النهائي لهذا المستخدم؟ (هذا الإجراء لا يمكن التراجع عنه)")) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        toast.success("تم حذف المستخدم نهائياً");
        fetchSystemData();
      } catch (error) { toast.error("لا يمكن الحذف! المستخدم مرتبط بسجلات قديمة. (يُفضل تعطيله)"); }
    }
  };


  if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-[#f8fafc]"><Loader2 className="animate-spin text-blue-600" size={50}/></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-24" dir="rtl">
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
        
        {/* ===================== Sidebar ===================== */}
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
          
          {/* ===================== إدارة المستخدمين ===================== */}
          {activeTab === 'users' && role === 'ADMIN' && (
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                <div><h2 className="font-black text-2xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> إدارة المستخدمين</h2><p className="text-slate-500 font-medium text-sm mt-1">إضافة وحذف وتعديل أدوار العاملين على النظام</p></div>
                <button onClick={() => { setUserForm({ name: '', username: '', password: '', role: 'NURSE' }); setEditingUser(null); setShowUserModal(true); }} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95">
                  <Plus size={18}/> مستخدم جديد
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold"><tr className="border-b border-slate-100"><th className="py-4 px-4">الاسم الحقيقي</th><th className="py-4 px-4">اسم الدخول</th><th className="py-4 px-4">الدور (Role)</th><th className="py-4 px-4 text-center">إجراءات التحكم</th></tr></thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-400 font-bold">لا يوجد مستخدمين مسجلين.</td></tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${u.role === 'SUSPENDED' ? 'opacity-50 bg-slate-50' : ''}`}>
                          <td className="py-4 px-4 font-black text-slate-800 flex items-center gap-2">{u.name} {u.role === 'SUSPENDED' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px]">معطل</span>}</td>
                          <td className="py-4 px-4 font-mono text-slate-500">{u.username}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-lg font-bold text-xs ${u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : u.role === 'CLINIC_MANAGER' ? 'bg-emerald-100 text-emerald-700' : u.role === 'HSE_MANAGER' ? 'bg-orange-100 text-orange-700' : u.role === 'SUSPENDED' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => { setEditingUser(u); setUserForm({ name: u.name, username: u.username, password: '', role: u.role }); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل البيانات"><Edit size={16}/></button>
                              <button onClick={() => handleToggleSuspendUser(u)} className={`p-2 rounded-lg transition-colors ${u.role === 'SUSPENDED' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-orange-500 hover:bg-orange-50'}`} title={u.role === 'SUSPENDED' ? "تنشيط الحساب" : "تعطيل مؤقت"}>{u.role === 'SUSPENDED' ? <CheckCircle size={16}/> : <Ban size={16}/>}</button>
                              <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف نهائي"><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================== القواعد الطبية والأقسام ===================== */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
              {refData.map(d => {
                const selectedCount = selectedItems[d.table]?.length || 0;
                const isAllSelected = d.items.length > 0 && selectedCount === d.items.length;

                return (
                <div key={d.table} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-200 flex flex-col h-[460px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">{d.icon}</div>
                      {d.label} <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-500">{d.items.length}</span>
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && (
                        <button onClick={() => handleBulkDelete(d.table)} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg flex items-center gap-1 transition-colors shadow-sm animate-in fade-in">
                          <Trash2 size={14}/> حذف ({selectedCount})
                        </button>
                      )}
                      <button onClick={() => triggerExcelUpload(d.table)} className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg flex items-center gap-1 transition-colors border border-emerald-100">
                        <FileSpreadsheet size={14}/> رفع
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4 shrink-0 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <input id={`input-${d.table}`} className="flex-1 px-4 py-2.5 bg-transparent outline-none font-semibold text-sm" placeholder={`إضافة عنصر جديد...`} onKeyDown={(e) => {
                      if (e.key === 'Enter') { handleAddItem(d.table, e.currentTarget.value); e.currentTarget.value = ''; }
                    }}/>
                    <button onClick={() => {
                      const input = document.getElementById(`input-${d.table}`) as HTMLInputElement;
                      handleAddItem(d.table, input.value); input.value = '';
                    }} className="bg-blue-600 text-white w-10 h-10 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center shrink-0 shadow-sm active:scale-95"><Plus size={20}/></button>
                  </div>

                  {d.items.length > 0 && (
                    <div className="flex items-center gap-3 px-4 pb-3 border-b border-slate-100 shrink-0">
                      <input type="checkbox" checked={isAllSelected} onChange={() => toggleSelectAll(d.table, d.items.map(i => i.id))} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                      <span className="text-xs font-bold text-slate-500">تحديد الكل</span>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-2 mt-2 custom-scrollbar">
                    {d.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                        <Database size={32} opacity={0.5}/>
                        <p className="text-sm font-bold">القائمة فارغة</p>
                      </div>
                    ) : (
                      d.items.map((i, index) => (
                        <div key={i.id} className="flex justify-between items-center px-4 py-3 bg-white rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group">
                          <label className="flex items-center gap-3 flex-1 cursor-pointer">
                            <input type="checkbox" checked={selectedItems[d.table]?.includes(i.id) || false} onChange={() => toggleSelection(d.table, i.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-md border border-slate-200">{index + 1}</span>
                            <span className="font-bold text-sm text-slate-700">{i.name}</span>
                          </label>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingItemInfo({table: d.table, id: i.id, name: i.name})} className="text-slate-400 hover:text-blue-600 bg-white hover:bg-blue-50 w-8 h-8 flex items-center justify-center rounded-lg transition-colors border border-slate-200 hover:border-blue-200"><Edit size={14}/></button>
                            <button onClick={() => handleDeleteItem(d.table, i.id)} className="text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-lg transition-colors border border-slate-200 hover:border-red-200"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* نافذة إضافة/تعديل المستخدم */}
      {/* ========================================== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                {editingUser ? <Edit className="text-blue-600" size={20}/> : <Plus className="text-emerald-600" size={20}/>} 
                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <button type="button" onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-xl shadow-sm"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الحقيقي (يظهر في السيستم)</label>
                <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500" placeholder="مثال: أحمد صلاح" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم الدخول (Username)</label>
                <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-mono" placeholder="مثال: ahmed_salah" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور {editingUser && <span className="text-xs text-slate-400 font-normal">(اتركها فارغة إذا لم ترد تغييرها)</span>}</label>
                <input type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required={!editingUser} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-mono" placeholder="••••••••" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الدور والصلاحية (Role)</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-bold">
                  <option value="ADMIN">مدير النظام (Admin)</option>
                  <option value="CLINIC_MANAGER">مدير العيادة (Manager)</option>
                  <option value="HSE_MANAGER">مدير السلامة (HSE)</option>
                  <option value="NURSE">ممرض (Nurse)</option>
                  <option value="SUSPENDED">معطل (Suspended)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">إلغاء</button>
                <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/30">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* نافذة تعديل عنصر في القواعد الطبية (Modal) */}
      {/* ========================================== */}
      {editingItemInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 p-6">
            <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Edit className="text-blue-600" size={20}/> تعديل العنصر</h2>
            <form onSubmit={handleUpdateItem}>
              <input type="text" value={editingItemInfo.name} onChange={e => setEditingItemInfo({...editingItemInfo, name: e.target.value})} required className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-semibold mb-6 text-center" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingItemInfo(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors">إلغاء</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg">حفظ التعديل</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}
