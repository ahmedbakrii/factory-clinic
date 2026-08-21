"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Download,
  Printer,
} from "lucide-react";

type TimeFilter = "today" | "week" | "month" | "custom";

type RecordRow = {
  id: string;
  visit_type: string;
  diagnosis: string | null;
  status: string | null;
  created_at: string;
  temperature: string | number | null;
  pulse: string | number | null;
  blood_pressure: string | null;
  rbs: string | number | null;
  employees: any; // ⚠️ تم حل مشكلة الـ TypeScript هنا
};

type ReportPeriod = {
  start: Date;
  end: Date;
};

const COMPANY_LOGO = "/logos/energya-logo.png";
const CLINIC_LOGO = "/logos/clinic-logo.png";

const getEmployee = (record: RecordRow) => {
  if (Array.isArray(record.employees)) {
    return record.employees[0] || null;
  }
  return record.employees;
};

const getShiftName = (dateString: string) => {
  const hour = new Date(dateString).getHours();
  return hour >= 7 && hour < 19 ? "نهارية" : "ليلية";
};

const getIndustrialDayBounds = (date: Date) => {
  const start = new Date(date);
  if (start.getHours() < 7) {
    start.setDate(start.getDate() - 1);
  }
  start.setHours(7, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(6, 59, 59, 999);

  return { start, end };
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatShortDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const getDayLabel = (dateString: string) =>
  new Date(dateString).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const getRecordDateKey = (dateString: string) => {
  const date = new Date(dateString);
  if (date.getHours() < 7) {
    date.setDate(date.getDate() - 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const getRecordDate = (dateString: string) => {
  const date = new Date(dateString);
  if (date.getHours() < 7) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

const getVisitTypeLabel = (record: RecordRow) => {
  if (record.status === "Transferred") return "محول للمستشفى";
  if (record.visit_type === "Work Injury") return "إصابة عمل";
  if (record.visit_type === "First Aid") return "إسعافات";
  return "مرضية";
};

const getPeriod = (
  filter: TimeFilter,
  customStartDate: string,
  customEndDate: string,
  now = new Date()
): ReportPeriod | null => {
  if (filter === "today") {
    const bounds = getIndustrialDayBounds(now);
    return { start: bounds.start, end: bounds.end };
  }

  if (filter === "week") {
    const start = new Date(now);
    const daysSinceSaturday = (start.getDay() + 1) % 7;
    start.setDate(start.getDate() - daysSinceSaturday);
    const weekStart = getIndustrialDayBounds(start).start;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setMilliseconds(-1);
    return { start: weekStart, end: weekEnd };
  }

  if (filter === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );
    return {
      start: getIndustrialDayBounds(monthStart).start,
      end: getIndustrialDayBounds(monthEnd).end,
    };
  }

  if (!customStartDate || !customEndDate) return null;

  const start = getIndustrialDayBounds(new Date(`${customStartDate}T07:00:00`)).start;
  const end = getIndustrialDayBounds(new Date(`${customEndDate}T07:00:00`)).end;

  return { start, end };
};

export default function ReportsCenter() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod | null>(
    getPeriod("today", "", "")
  );

  const [stats, setStats] = useState({
    total: 0,
    workInjuries: 0,
    firstAid: 0,
    transfers: 0,
  });

  const fetchReportData = async () => {
    setIsLoading(true);

    try {
      const period = getPeriod(
        timeFilter,
        customStartDate,
        customEndDate
      );

      if (!period) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("visits")
        .select(`
          id,
          visit_type,
          diagnosis,
          status,
          created_at,
          temperature,
          pulse,
          blood_pressure,
          rbs,
          employees (
            name,
            iqama_number,
            employee_number,
            department
          )
        `)
        .gte("created_at", period.start.toISOString())
        .lte("created_at", period.end.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // ⚠️ تم إصلاح مشكلة TypeScript هنا باستخدام unknown casting
      const fetchedData = (data as unknown) as RecordRow[];

      setRecords(fetchedData);
      setReportPeriod(period);

      setStats({
        total: fetchedData.length,
        workInjuries: fetchedData.filter(
          (v) => v.visit_type === "Work Injury"
        ).length,
        firstAid: fetchedData.filter(
          (v) => v.visit_type === "First Aid"
        ).length,
        transfers: fetchedData.filter(
          (v) => v.status === "Transferred"
        ).length,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeFilter !== "custom") {
      fetchReportData();
    }
  }, [timeFilter]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        date: Date;
        records: RecordRow[];
      }
    >();

    for (const record of records) {
      const key = getRecordDateKey(record.created_at);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          date: getRecordDate(record.created_at),
          records: [],
        });
      }

      groups.get(key)!.records.push(record);
    }

    return Array.from(groups.values());
  }, [records]);

  const reportTitle =
    timeFilter === "today"
      ? "التقرير الطبي اليومي للعيادة"
      : timeFilter === "week"
      ? "التقرير الطبي الأسبوعي للعيادة"
      : timeFilter === "month"
      ? "التقرير الطبي الشهري للعيادة"
      : "التقرير الطبي المفصل للعيادة";

  const periodText = reportPeriod
    ? `الفترة من ${formatDate(reportPeriod.start)} إلى ${formatDate(
        reportPeriod.end
      )}`
    : "";

  const handlePrint = () => {
    if (records.length === 0) return;
    window.print();
  };

  const handleExportExcel = async () => {
    if (records.length === 0) {
      alert("لا توجد بيانات لتصديرها.");
      return;
    }

    try {
      const XLSX = await import("xlsx");

      const exportData = records.map((record, index) => {
        const employee = getEmployee(record);

        return {
          "#": index + 1,
          "التاريخ": formatShortDate(record.created_at),
          "الوقت": formatTime(record.created_at),
          "الوردية": getShiftName(record.created_at),
          "اسم الموظف": employee?.name || "غير مسجل",
          "رقم الإقامة": employee?.iqama_number || "-",
          "الرقم الوظيفي": employee?.employee_number || "-",
          "القسم / الورشة": employee?.department || "-",
          "نوع الزيارة": getVisitTypeLabel(record),
          "التشخيص الطبي": record.diagnosis || "-",
          "الحرارة": record.temperature ?? "-",
          "النبض": record.pulse ?? "-",
          "الضغط": record.blood_pressure ?? "-",
          "السكر": record.rbs ?? "-",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 10 },
        { wch: 12 },
        { wch: 32 },
        { wch: 18 },
        { wch: 18 },
        { wch: 24 },
        { wch: 18 },
        { wch: 42 },
        { wch: 10 },
        { wch: 10 },
        { wch: 18 },
        { wch: 10 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Clinic Report"
      );

      const datePart = new Date().toISOString().split("T")[0];

      XLSX.writeFile(
        workbook,
        `Clinic_Report_${timeFilter}_${datePart}.xlsx`
      );
    } catch (error) {
      console.error("Export failed", error);
      alert("حدث خطأ أثناء تصدير التقرير.");
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f1f5f9] font-sans selection:bg-blue-100"
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 11mm 9mm 15mm 9mm;
              }

              html,
              body {
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              body * {
                visibility: hidden !important;
              }

              #printable-report,
              #printable-report * {
                visibility: visible !important;
              }

              #printable-report {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                border: 0 !important;
                box-shadow: none !important;
              }

              .no-print {
                display: none !important;
              }

              .print-only {
                display: block !important;
              }

              .print-header {
                display: grid !important;
                grid-template-columns: 180px minmax(0, 1fr) 180px;
                align-items: center;
                gap: 18px;
                width: 100%;
                padding: 0 0 5mm 0;
                margin: 0 0 4mm 0;
                border-bottom: 1.5px solid #0f172a;
              }

              .print-logo {
                display: flex !important;
                align-items: center;
              }

              .print-logo.company {
                justify-content: flex-start;
              }

              .print-logo.clinic {
                justify-content: flex-end;
              }

              .print-logo img {
                display: block !important;
                object-fit: contain !important;
                width: 155px !important;
                height: 70px !important;
                max-width: 155px !important;
                max-height: 70px !important;
              }

              .print-logo.clinic img {
                width: 120px !important;
                height: 70px !important;
                max-width: 120px !important;
                max-height: 70px !important;
              }

              .print-summary {
                display: grid !important;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin: 0 0 5mm 0;
              }

              .print-summary-card {
                background: #fff !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 6px !important;
                padding: 7px !important;
                text-align: center !important;
              }

              .print-summary-card h3 {
                margin: 0 !important;
                font-size: 17px !important;
                line-height: 1.2 !important;
              }

              .print-summary-card p {
                margin: 0 0 2px 0 !important;
                font-size: 8px !important;
              }

              .report-day {
                margin-bottom: 6mm;
              }

              .report-day-title {
                background: #f1f5f9 !important;
                color: #0f172a !important;
                border-right: 4px solid #1e40af !important;
                padding: 5px 8px !important;
                margin: 0 0 3mm 0 !important;
                font-size: 12px !important;
                font-weight: 800 !important;
                break-after: avoid;
                page-break-after: avoid;
                break-inside: avoid;
                page-break-inside: avoid;
              }

              table {
                width: 100% !important;
                table-layout: auto !important;
                border-collapse: collapse !important;
                font-size: 9px !important;
              }

              thead {
                display: table-header-group !important;
              }

              th {
                background: #e2e8f0 !important;
                color: #0f172a !important;
                border: 1px solid #94a3b8 !important;
                padding: 5px 6px !important;
                font-weight: 800 !important;
                white-space: nowrap !important;
              }

              td {
                border: 1px solid #cbd5e1 !important;
                padding: 5px 6px !important;
                vertical-align: top !important;
                white-space: normal !important;
                overflow-wrap: anywhere !important;
                word-break: normal !important;
              }

              tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .employee-name,
              .diagnosis-cell,
              .department-cell {
                white-space: normal !important;
                overflow: visible !important;
                text-overflow: clip !important;
                display: block !important;
              }

              .signature-footer {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                margin-top: 8mm !important;
              }

              .page-number-footer {
                display: block !important;
                position: fixed !important;
                bottom: -8mm !important;
                left: 0 !important;
                right: 0 !important;
                text-align: center !important;
                font-size: 8px !important;
                color: #64748b !important;
              }

              .page-number-footer::after {
                content: "صفحة " counter(page);
              }
            }

            @media screen {
              .print-only {
                display: none;
              }
            }
          `,
        }}
      />

      <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">
        <div className="no-print mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800">
                مركز التقارير
              </h1>
              <p className="text-slate-500 mt-1 font-medium">
                استخراج وتقييم بيانات العيادة بصيغة رسمية
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExportExcel}
                disabled={isLoading || records.length === 0}
                className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                <Download size={18} />
                إكسيل
              </button>

              <button
                onClick={handlePrint}
                disabled={isLoading || records.length === 0}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-md disabled:opacity-50"
              >
                <Printer size={18} />
                طباعة التقرير PDF
              </button>
            </div>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
            {[
              { id: "today", label: "اليوم" },
              { id: "week", label: "الأسبوع" },
              { id: "month", label: "الشهر" },
              { id: "custom", label: "مخصص" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() =>
                  setTimeFilter(option.id as TimeFilter)
                }
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  timeFilter === option.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {timeFilter === "custom" && (
            <div className="bg-white mt-4 p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) =>
                    setCustomStartDate(event.target.value)
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div className="w-full md:flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) =>
                    setCustomEndDate(event.target.value)
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <button
                onClick={fetchReportData}
                disabled={
                  !customStartDate ||
                  !customEndDate ||
                  customStartDate > customEndDate
                }
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                إنشاء التقرير
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center">
            <Loader2
              className="animate-spin text-blue-600 mb-4"
              size={40}
            />
            <p className="font-bold text-slate-500">
              جاري تجهيز التقرير...
            </p>
          </div>
        ) : (
          <div
            id="printable-report"
            className="bg-white p-6 md:p-10 rounded-[32px] print:rounded-none shadow-sm print:shadow-none border border-slate-200 print:border-none min-h-[500px]"
          >
            <div className="print-header hidden">
              <div className="print-logo company">
                <img
                  src={COMPANY_LOGO}
                  alt="Energya Steel Solutions"
                />
              </div>

              <div className="text-center">
                <h1 className="text-lg md:text-xl font-black text-slate-900 mb-1">
                  {reportTitle}
                </h1>

                <p className="text-sm font-bold text-slate-600">
                  Bakrii Clinic
                </p>

                <p className="text-xs font-bold text-slate-500 mt-1">
                  {periodText}
                </p>
              </div>

              <div className="print-logo clinic">
                <img
                  src={CLINIC_LOGO}
                  alt="Bakrii Clinic"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8 print-summary">
              <div className="bg-slate-50 print:bg-white print:border-slate-300 border border-slate-200 p-4 rounded-xl text-center print-summary-card">
                <p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">
                  إجمالي الحالات
                </p>
                <h3 className="text-2xl font-black text-slate-800">
                  {stats.total}
                </h3>
              </div>

              <div className="bg-slate-50 print:bg-white print:border-slate-300 border border-slate-200 p-4 rounded-xl text-center print-summary-card">
                <p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">
                  إصابات
                </p>
                <h3 className="text-2xl font-black text-slate-800">
                  {stats.workInjuries}
                </h3>
              </div>

              <div className="bg-slate-50 print:bg-white print:border-slate-300 border border-slate-200 p-4 rounded-xl text-center print-summary-card">
                <p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">
                  إسعافات أولية
                </p>
                <h3 className="text-2xl font-black text-slate-800">
                  {stats.firstAid}
                </h3>
              </div>

              <div className="bg-slate-50 print:bg-white print:border-slate-300 border border-slate-200 p-4 rounded-xl text-center print-summary-card">
                <p className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">
                  حالات محولة
                </p>
                <h3 className="text-2xl font-black text-slate-800">
                  {stats.transfers}
                </h3>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="py-10 text-center font-bold text-slate-400">
                لا توجد سجلات طبية خلال هذه الفترة.
              </div>
            ) : (
              <div className="space-y-6 print:space-y-0">
                {groupedRecords.map((group, groupIndex) => {
                  const groupOffset = groupedRecords
                    .slice(0, groupIndex)
                    .reduce((total, previousGroup) => total + previousGroup.records.length, 0);

                  return (
                  <section
                    key={group.key}
                    className="report-day"
                  >
                    <div className="report-day-title">
                      {getDayLabel(group.records[0].created_at)}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-800 print:bg-slate-100 text-white print:text-slate-800 text-xs">
                            <th className="p-3 print:p-2 font-bold text-center border print:border-slate-300">
                              #
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300 whitespace-nowrap">
                              الوقت
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300 whitespace-nowrap">
                              الوردية
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300">
                              اسم الموظف
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300 whitespace-nowrap">
                              الرقم الوظيفي
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300 whitespace-nowrap">
                              القسم / الورشة
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300 whitespace-nowrap">
                              التصنيف
                            </th>
                            <th className="p-3 print:p-2 font-bold border print:border-slate-300">
                              التشخيص المبدئي
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {group.records.map((record, index) => {
                            const employee = getEmployee(record);

                            return (
                              <tr
                                key={record.id}
                                className="border-b border-slate-200 text-sm print:text-[10px]"
                              >
                                <td className="p-3 print:p-2 text-center font-mono text-slate-500 border-x print:border-slate-300 align-top">
                                  {groupOffset + index + 1}
                                </td>

                                <td className="p-3 print:p-2 border-x print:border-slate-300 align-top whitespace-nowrap">
                                  <span className="font-mono font-bold text-slate-700">
                                    {formatTime(record.created_at)}
                                  </span>
                                </td>

                                <td className="p-3 print:p-2 border-x print:border-slate-300 align-top whitespace-nowrap font-semibold text-slate-600">
                                  {getShiftName(record.created_at)}
                                </td>

                                <td className="p-3 print:p-2 border-x print:border-slate-300 align-top min-w-[170px]">
                                  <div className="employee-name font-bold text-slate-800 break-words whitespace-normal">
                                    {employee?.name || "غير مسجل"}
                                  </div>

                                  <div className="text-xs print:text-[9px] font-mono text-slate-400 mt-1">
                                    {employee?.iqama_number || "-"}
                                  </div>
                                </td>

                                <td className="p-3 print:p-2 border-x print:border-slate-300 align-top whitespace-nowrap font-mono">
                                  {employee?.employee_number || "-"}
                                </td>

                                <td className="p-3 print:p-2 border-x print:border-slate-300 align-top min-w-[120px]">
                                  <div className="department-cell font-semibold text-slate-600 break-words whitespace-normal">
                                    {employee?.department || "-"}
                                  </div>
                                </td>

                                <td className="p-3 print:p-2 border-x print:border-slate-300 align-top whitespace-nowrap font-bold">
                                  {record.status === "Transferred" ? (
                                    <span className="text-purple-600">
                                      محول للمستشفى
                                    </span>
                                  ) : record.visit_type === "Work Injury" ? (
                                    <span className="text-orange-600">
                                      إصابة عمل
                                    </span>
                                  ) : record.visit_type === "First Aid" ? (
                                    <span className="text-emerald-600">
                                      إسعافات
                                    </span>
                                  ) : (
                                    <span className="text-blue-600">
                                      مرضية
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 print:p-2 text-slate-700 border-x print:border-slate-300 align-top min-w-[220px]">
                                  <div className="diagnosis-cell break-words whitespace-normal leading-relaxed">
                                    {record.diagnosis || "غير مسجل"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  );
                })}
              </div>
            )}

            {records.length > 0 && (
              <div className="signature-footer mt-12 pt-8 border-t-2 border-slate-800 grid grid-cols-3 text-center">
                <div>
                  <p className="font-bold text-sm text-slate-800 mb-10">
                    طبيب / ممرض العيادة
                  </p>
                  <p className="text-slate-400 border-t border-slate-300 mx-8 pt-2">
                    التوقيع
                  </p>
                </div>

                <div>
                  <p className="font-bold text-sm text-slate-800 mb-10">
                    مدير السلامة HSE
                  </p>
                  <p className="text-slate-400 border-t border-slate-300 mx-8 pt-2">
                    التوقيع
                  </p>
                </div>

                <div>
                  <p className="font-bold text-sm text-slate-800 mb-10">
                    يعتمد، مدير المصنع
                  </p>
                  <p className="text-slate-400 border-t border-slate-300 mx-8 pt-2">
                    التوقيع
                  </p>
                </div>
              </div>
            )}

            <div className="page-number-footer print-only">
              صفحة
            </div>
          </div>
        )}
      </div>
    </div>
  );
}