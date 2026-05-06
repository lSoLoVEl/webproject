"use client";

import { useState, useEffect } from "react";
import DashboardShell from "../components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { FaArrowUp, FaArrowDown, FaMinus, FaShip } from "react-icons/fa";

// กำหนดสีสำหรับกราฟวงกลม (เรียงตามประเภทขยะ)
const COLORS = ["#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#f43f5e", "#64748b"];

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface VesselLog {
  id: string;
  date: string;
  vesselCode: string;
  amount: number;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  // State หมวดหมู่ที่ 1: กราฟวงกลม
  const [pieData, setPieData] = useState<PieData[]>([]);
  const [totalAllTime, setTotalAllTime] = useState(0);

  // State หมวดหมู่ที่ 2: เปรียบเทียบเมื่อวาน vs วันนี้
  const [compareStats, setCompareStats] = useState({
    today: 0,
    yesterday: 0,
    percentChange: 0,
    trend: "neutral", // 'up', 'down', 'neutral'
  });

  // State หมวดหมู่ที่ 3: บันทึกรายเรือ
  const [vesselLogs, setVesselLogs] = useState<VesselLog[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // หาวันที่ "วันนี้" และ "เมื่อวาน" (โซนเวลาไทย)
        const todayObj = new Date();
        const yesterdayObj = new Date(todayObj);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        const today = todayObj.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
        const yesterday = yesterdayObj.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

        // ดึงข้อมูล WasteData ทั้งหมด และเชื่อมกับตาราง Vessel เพื่อเอาชื่อเรือ
        const { data, error } = await supabase
          .from("WasteData")
          .select(`
            waste_type,
            amount,
            Date,
            vessel_id,
            Vessel ( vessel_code )
          `);

        if (error) throw error;

        let total = 0;
        let todaySum = 0;
        let yesterdaySum = 0;
        const typeCount: Record<string, number> = {};
        const logsMap: Record<string, VesselLog> = {};

        if (data) {
          data.forEach((item) => {
            const amt = item.amount || 0;
            const wType = item.waste_type || "ไม่ระบุประเภท";

            // --- หมวด 1: รวมยอดสำหรับกราฟวงกลม ---
            typeCount[wType] = (typeCount[wType] || 0) + amt;
            total += amt;

            // --- หมวด 2: เปรียบเทียบวันนี้-เมื่อวาน ---
            if (item.Date === today) todaySum += amt;
            if (item.Date === yesterday) yesterdaySum += amt;

            // --- หมวด 3: จัดกลุ่มข้อมูลเรือและวันที่ ---
            // ถ้าดึงชื่อเรือมาได้ ใช้ชื่อเรือ ถ้าไม่ได้ให้ใช้ ID
            const vesselData = Array.isArray(item.Vessel) ? item.Vessel[0] : (item.Vessel as any);
            const vCode = vesselData?.vessel_code || `เรือรหัส: ${item.vessel_id || "?"}`;
            const logKey = `${item.Date}_${vCode}`; // สร้าง Key เฉพาะสำหรับ วันที่+เรือ

            if (!logsMap[logKey]) {
              logsMap[logKey] = {
                id: logKey,
                date: item.Date,
                vesselCode: vCode,
                amount: 0,
              };
            }
            logsMap[logKey].amount += amt;
          });
        }

        // จัดการข้อมูลเพื่อนำไป Set State
        
        // หมวด 1
        const formattedPieData = Object.keys(typeCount).map((key, index) => ({
          name: key,
          value: typeCount[key],
          color: COLORS[index % COLORS.length],
        }));
        setPieData(formattedPieData);
        setTotalAllTime(total);

        // หมวด 2
        let percent = 0;
        if (yesterdaySum === 0) {
          percent = todaySum > 0 ? 100 : 0;
        } else {
          percent = ((todaySum - yesterdaySum) / yesterdaySum) * 100;
        }
        
        let trend = "neutral";
        if (percent > 0) trend = "up";
        if (percent < 0) trend = "down";

        setCompareStats({
          today: todaySum,
          yesterday: yesterdaySum,
          percentChange: Math.round(percent),
          trend,
        });

        // หมวด 3
        const sortedLogs = Object.values(logsMap).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setVesselLogs(sortedLogs);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDateThai = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardShell pageTitle="หน้าแรก" pageDescription="กำลังโหลดข้อมูล...">
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">กำลังวิเคราะห์ข้อมูลขยะ...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      pageTitle="แดชบอร์ดสรุปผล"
      pageDescription="ภาพรวมปริมาณขยะ สถิติรายวัน และข้อมูลการทำงานของเรือเก็บขยะ"
    >
      {/* Grid แถวบน: กราฟ (หมวด 1) และ สถิติเปรียบเทียบ (หมวด 2) */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* ================= หมวดที่ 1: กราฟวงกลม ================= */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-500">
            สัดส่วนประเภทขยะ
          </p>
          
          <div className="relative mt-4 h-64 w-full flex-1">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70} // ทำเป็นโดนัท
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} ชิ้น`, 'ปริมาณ']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">ไม่มีข้อมูลขยะ</div>
            )}
            
            {/* ตัวเลขตรงกลางโดนัท */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-800">{totalAllTime}</span>
              <span className="text-xs text-slate-500">ชิ้นทั้งหมด</span>
            </div>
          </div>

          {/* Legend สีบอกคลาส */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-sm text-slate-600">
                  {entry.name} <span className="font-semibold text-slate-900">({entry.value})</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ================= หมวดที่ 2: สถิติเปรียบเทียบ ================= */}
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm flex flex-col">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-500">
            เปรียบเทียบยอดจัดเก็บ
          </p>
          
          <div className="mt-6 grid grid-cols-2 gap-4 flex-1">
            <div className="flex flex-col justify-center rounded-3xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">เมื่อวาน</p>
              <p className="mt-3 text-4xl font-bold text-slate-900">{compareStats.yesterday}</p>
              <p className="mt-1 text-xs text-slate-400">ชิ้น</p>
            </div>
            <div className="flex flex-col justify-center rounded-3xl bg-white p-6 text-center shadow-sm ring-2 ring-sky-100">
              <p className="text-sm font-medium text-sky-600">วันนี้</p>
              <p className="mt-3 text-5xl font-bold text-sky-500">{compareStats.today}</p>
              <p className="mt-1 text-xs text-slate-400">ชิ้น</p>
            </div>
          </div>

          {/* เปอร์เซ็นต์การเปลี่ยนแปลง */}
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-slate-600">แนวโน้มเทียบกับเมื่อวาน</span>
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-bold ${
              compareStats.trend === 'up' ? 'bg-green-100 text-green-700' :
              compareStats.trend === 'down' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {compareStats.trend === 'up' && <FaArrowUp />}
              {compareStats.trend === 'down' && <FaArrowDown />}
              {compareStats.trend === 'neutral' && <FaMinus />}
              
              <span>
                {compareStats.percentChange > 0 ? "+" : ""}
                {compareStats.percentChange}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= หมวดที่ 3: บันทึกการส่งข้อมูลรายเรือ ================= */}
      <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-500">
            บันทึกปริมาณขยะรายเรือ
          </p>
          <span className="text-xs text-slate-400">เรียงจากล่าสุด</span>
        </div>
        
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          {vesselLogs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {vesselLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-slate-50 p-4 transition hover:bg-sky-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
                      <FaShip size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{log.vesselCode}</p>
                      <p className="text-sm text-slate-500">{formatDateThai(log.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-800">{log.amount}</p>
                    <p className="text-xs text-slate-400">ชิ้น</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">ยังไม่มีประวัติการส่งข้อมูลจากเรือ</div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}