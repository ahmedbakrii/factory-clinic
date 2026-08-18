"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Settings, Loader2, Trash2, Plus } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  const [refData, setRefData] = useState<{ table: string, label: string, items: any[] }[]>([
    { table: 'medicines', label: 'الأدوية', items: [] },
    { table: 'departments', label: 'الأقسام', items: [] },
    { table: 'injury_types', label: 'أنواع الإصابات', items: [] },
    { table: 'chronic_diseases', label: 'الأمراض المزمنة', items: [] },
    { table: 'body_parts', label: 'أماكن الإصابة', items: [] }
  ]);

    useEffect(() => {
    // ⚠️ تجاوز مؤقت (Bypass) لغرض التجربة والبرمجة
    // سيتم استبداله بنظام تسجيل الدخول الحقيقي لاحقاً
    const mockSession = { role: 'ADMIN', username: 'Super Admin' };
    localStorage.setItem("clinic_session", JSON.parse(JSON.stringify(mockSession)));
    
    setRole('ADMIN');
    fetchSystemData();
  }, [router]);


    // لو المستخدم لا يملك صلاحية (ADMIN ولا CLINIC_MANAGER) اطرده فوراً
    if (session.role !== 'ADMIN' && session.role !== 'CLINIC_MANAGER') {
      router.push('/');
      return;
    }

    setRole(session.role);
    fetchSystemData();
  }, [router]);

  async function fetchSystemData() {
    setIsLoading(true);
    // جلب المستخدمين (للأدمن فقط)
    const { data: userData } = await supabase.from('users').select('*');
    setUsers(userData || []);

    // جلب القوائم
    const newData = await Promise.all(refData.map(async (d) => {
      const { data } = await supabase.from(d.table).select('*').order('name');
      return { ...d, items: data || [] };
    }));
    setRefData(newData);
    setIsLoading(false);
  }

  const handleAddItem = async (table: string, name: string) => {
    if (!name) return;
    await supabase.from(table).insert([{ name }]);
    fetchSystemData();
  };

  const handleDeleteItem = async (table: string, id: number) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
        await supabase.from(table).delete().eq('id', id);
        fetchSystemData();
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-3"><Settings className="text-blue-600"/> إعدادات النظام</h1>

      <div className="flex gap-4 mb-8">
        {role === 'ADMIN' && (
          <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:bg-gray-50'}`}>إدارة المستخدمين</button>
        )}
        <button onClick={() => setActiveTab('general')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:bg-gray-50'}`}>إعدادات العيادة والمصنع</button>
      </div>

      {activeTab === 'users' && role === 'ADMIN' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
          <h2 className="font-bold text-lg mb-4">قائمة المستخدمين وصلاحياتهم</h2>
          <table className="w-full text-right">
            <thead><tr className="border-b text-slate-400 text-xs"><th className="pb-3">المستخدم</th><th className="pb-3">الدور</th><th className="pb-3">تحكم</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-4 font-bold text-slate-800">{u.username}</td>
                  <td className="py-4 text-sm font-semibold text-blue-600">{u.role}</td>
                  <td className="py-4"><button className="text-red-500 font-bold text-sm hover:underline">حذف/تعديل</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          {refData.map(d => (
            <div key={d.table} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700">{d.label}</h3>
              <div className="flex gap-2 mb-4">
                <input id={`input-${d.table}`} className="flex-1 p-3 border rounded-xl bg-slate-50 outline-none focus:border-blue-500" placeholder={`إضافة ${d.label} جديدة...`} />
                <button onClick={() => {
                  const input = document.getElementById(`input-${d.table}`) as HTMLInputElement;
                  handleAddItem(d.table, input.value);
                  input.value = '';
                }} className="bg-emerald-600 text-white px-4 rounded-xl hover:bg-emerald-700 transition-colors"><Plus size={20}/></button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {d.items.map(i => (
                  <div key={i.id} className="flex justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="font-semibold text-sm text-slate-700">{i.name}</span>
                    <button onClick={() => handleDeleteItem(d.table, i.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
