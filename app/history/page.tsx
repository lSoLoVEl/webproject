"use client";

import { useState, useEffect } from "react";
import DashboardShell from "../components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { FaShip, FaArrowUp, FaArrowDown, FaMinus, FaHistory, FaCalendarAlt } from "react-icons/fa";

interface Vessel {
  vessel_id: string;
  vessel_code: string;
}

interface GraphData {
  date: string;
  displayDate: string;
  amount: number;
}

interface TimelineItem {
  id: string;
  vesselCode: string;
  amount: number;
  date: string;
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  
  // States สำหรับ Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
  );
  const [selectedVessel, setSelectedVessel] = useState<string>("all");
  const [vessels, setVessels] = useState<Vessel[]>([]);

  // States สำหรับข้อมูลหมวดต่างๆ
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [vesselStat, setVesselStat] = useState({ amount: 0 });
  const [comparison, setComparison] = useState({ current: 0, average: 0, percent: 0, trend: "neutral" });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // 1. ดึงข้อมูลรายชื่อเรือมาใส่ Dropdown
  useEffect(() => {
    const fetchVessels = async () => {
      const { data } = await supabase.from("Vessel").select("vessel_id, vessel_code");
      if (data) setVessels(data);
    };
    fetchVessels();
  }, []);

  // 2. ดึงข้อมูลและประมวลผลเมื่อเปลี่ยนวันที่ หรือเปลี่ยนเรือ
  useEffect(() => {
    const fetchHistoryData = async () => {
      setLoading(true);
      try {
        // สร้าง Array ของวันที่ย้อนหลัง 7 วัน (นับจากวันที่ผู้ใช้เลือก)
        const dateArray = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(selectedDate);
          d.setDate(d.getDate() - i);
          dateArray.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }));
        }

        const startDate = dateArray[0];
        const endDate = dateArray[6]; // คือ selectedDate

        // ดึงข้อมูล WasteData ในช่วง 7 วันนั้น
        const { data: wasteData, error } = await supabase
          .from("WasteData")
          .select("waste_id, Date, amount, vessel_id, waste_type, Vessel(vessel_code)")
          .gte("Date", startDate)
          .lte("Date", endDate);

        if (error) throw error;

        const data = wasteData || [];

        // ================= หมวด 1: กราฟสรุปสัปดาห์ =================
        const processedGraphData = dateArray.map((dateStr) => {
          // ถ้ามีการเลือกเรือ ให้กรองเฉพาะเรือนั้น ถ้าเป็น 'all' เอาทั้งหมด
          const dayRecords = data.filter((w) => 
            w.Date === dateStr && (selectedVessel === "all" || w.vessel_id.toString() === selectedVessel)
          );
          const totalAmount = dayRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
          
          const dateObj = new Date(dateStr);
          return {
            date: dateStr,
            displayDate: `${dateObj.getDate()} ${dateObj.toLocaleDateString("th-TH", { month: "short" })}`,
            amount: totalAmount,
          };
        });
        setGraphData(processedGraphData);

        // ================= หมวด 2: รายละเอียดตัวเรือ =================
        // ยอดรวมขยะของเรือที่เลือก ใน "วันที่ผู้ใช้เลือก"
        const selectedDayRecords = data.filter((w) => 
          w.Date === selectedDate && (selectedVessel === "all" || w.vessel_id.toString() === selectedVessel)
        );
        const selectedDayTotal = selectedDayRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
        setVesselStat({ amount: selectedDayTotal });

        // ================= หมวด 3: การเปรียบเทียบ =================
        // หาค่าเฉลี่ย 6 วันก่อนหน้า
        const past6DaysRecords = data.filter((w) => 
          w.Date !== selectedDate && (selectedVessel === "all" || w.vessel_id.toString() === selectedVessel)
        );
        const past6DaysTotal = past6DaysRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
        const averagePast6Days = past6DaysTotal / 6;

        let percentChange = 0;
        let trend = "neutral";

        if (averagePast6Days > 0) {
          percentChange = ((selectedDayTotal - averagePast6Days) / averagePast6Days) * 100;
        } else if (selectedDayTotal > 0) {
          percentChange = 100; // ถ้าเมื่อก่อนเป็น 0 แต่วันนี้มีค่า ให้เป็น +100%
        }

        if (percentChange > 0) trend = "up";
        if (percentChange < 0) trend = "down";

        setComparison({
          current: selectedDayTotal,
          average: averagePast6Days,
          percent: Math.round(percentChange),
          trend,
        });

        // ================= หมวด 4: ไทม์ไลน์ =================
        // นำข้อมูลของช่วง 7 วันมาจัดเรียงจากล่าสุด
        const sortedTimeline = [...data]
          .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
          .slice(0, 5) // เอามาแสดงแค่ 5 รายการล่าสุด
          .map((item) => ({
            id: item.waste_id.toString(),
            vesselCode: item.Vessel?.vessel_code || "ไม่ระบุเรือ",
            amount: item.amount || 0,
            date: item.Date,
          }));
        setTimeline(sortedTimeline);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (selectedDate) {
      fetchHistoryData();
    }
  }, [selectedDate, selectedVessel]);

  // ตัวจัดรูปแบบ Tooltip ในกราฟ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-sm text-sky-600">เก็บได้: {payload[0].value} ชิ้น</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardShell
      pageTitle="ประวัติและการวิเคราะห์"
      pageDescription="ดูข้อมูลย้อนหลัง วิเคราะห์ประสิทธิภาพการเก็บขยะของเรือแต่ละลำ"
    >
      {/* ตัวจัดการตัวกรองข้อมูล (Filters) */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2">
          <FaCalendarAlt className="text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2">
          <FaShip className="text-slate-400" />
          <select
            value={selectedVessel}
            onChange={(e) => setSelectedVessel(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="all">เรือทั้งหมด</option>
            {vessels.map((v) => (
              <option key={v.vessel_id} value={v.vessel_id}>
                {v.vessel_code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500 animate-pulse">กำลังวิเคราะห์ข้อมูล...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            
            {/* ================= หมวด 1: กราฟสรุปสัปดาห์ ================= */}
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-500">
                กราฟสรุปสัปดาห์ (7 วันย้อนหลัง)
              </p>
              <div className="mt-6 h-64 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="amount" radius={[6, 6, 6, 6]}>
                      {graphData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.date === selectedDate ? '#0ea5e9' : '#bae6fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6">
              {/* ================= หมวด 2: รายละเอียดตัวเรือ ================= */}
              <div className="rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-sky-500 to-sky-600 p-6 shadow-sm text-white relative overflow-hidden">
                <FaShip className="absolute -bottom-4 -right-4 text-9xl opacity-20" />
                <div className="relative z-10">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-100">
                    รายละเอียดการจัดเก็บ
                  </p>
                  <p className="mt-1 text-sm text-sky-50">ประจำวันที่เลือก</p>
                  <div className="mt-6 flex items-end gap-4">
                    <p className="text-6xl font-bold">{vesselStat.amount}</p>
                    <p className="mb-2 text-lg font-medium text-sky-100">ชิ้น</p>
                  </div>
                  <p className="mt-4 inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-semibold backdrop-blur-sm">
                    {selectedVessel === "all" ? "รวมเรือทุกลำ" : `เฉพาะเรือที่เลือก`}
                  </p>
                </div>
              </div>

              {/* ================= หมวด 3: การเปรียบเทียบ ================= */}
              <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-500">
                  สถิติเปรียบเทียบ
                </p>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-3xl bg-slate-50 p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">เทียบค่าเฉลี่ย 6 วันก่อนหน้า</p>
                      <p className="mt-1 text-xs text-slate-400">ค่าเฉลี่ย: {comparison.average.toFixed(1)} ชิ้น/วัน</p>
                    </div>
                    <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-bold ${
                      comparison.trend === 'up' ? 'bg-green-100 text-green-700' :
                      comparison.trend === 'down' ? 'bg-red-100 text-red-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {comparison.trend === 'up' && <FaArrowUp />}
                      {comparison.trend === 'down' && <FaArrowDown />}
                      {comparison.trend === 'neutral' && <FaMinus />}
                      <span>
                        {comparison.percent > 0 ? "+" : ""}{comparison.percent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= หมวด 4: ไทม์ไลน์ ================= */}
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-500">
                <FaHistory />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-500">
                บันทึกการอัปเดตล่าสุด
              </p>
            </div>
            
            <div className="mt-6 space-y-4">
              {timeline.length > 0 ? (
                timeline.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4 transition hover:bg-slate-100">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="text-xs font-bold text-slate-500">วันที่</span>
                      <span className="text-sm font-semibold text-sky-600">
                        {new Date(item.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        เรือ <span className="text-sky-600">{item.vesselCode}</span> อัปเดตข้อมูล
                      </p>
                      <p className="text-sm text-slate-500">จัดเก็บขยะได้เพิ่ม {item.amount} ชิ้น</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  ไม่มีประวัติการเก็บขยะในช่วงเวลานี้
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}