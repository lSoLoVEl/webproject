"use client";

import { useEffect, useState } from "react";
import { FaSignOutAlt, FaEnvelope, FaUserEdit } from "react-icons/fa";
import DashboardShell from "../components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// กำหนด Type สำหรับข้อมูล
interface UserProfile {
  username: string;
  email: string;
  profile_picture: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // State สำหรับเก็บข้อมูลโปรไฟล์
  const [profile, setProfile] = useState<UserProfile>({ 
    username: "กำลังโหลด...", 
    email: "...", 
    profile_picture: null,
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // 1. เช็ค Session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/login");
          return;
        }

        const userEmail = session.user.email;

        if (userEmail) {
          // 2. ดึงข้อมูล User (เพื่อเอา user_id ไปหา Profile ต่อ)
          const { data: userRecord } = await supabase
            .from("User")
            .select("user_id, username, email")
            .eq("email", userEmail)
            .single();

          if (userRecord) {
            let fetchedProfile = {
              username: userRecord.username || "Unknown User",
              email: userRecord.email,
              profile_picture: null,
            };

            // 3. ดึงข้อมูลรูปภาพจากตาราง Profile
            const { data: profileRecord } = await supabase
              .from("Profile")
              .select("profile_picture")
              .eq("user_id", userRecord.user_id)
              .single();

            if (profileRecord) {
              fetchedProfile.profile_picture = profileRecord.profile_picture;
            }

            setProfile(fetchedProfile);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [router]);

  // ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ฟังก์ชันไปหน้าแก้ไขโปรไฟล์
  const handleEditProfile = () => {
    // เปลี่ยนไปหน้า /profile/edit (ตรวจสอบให้แน่ใจว่าคุณวางไฟล์ Edit Profile ไว้ที่นี่)
    router.push("/editprofile");
  };

  return (
    <DashboardShell
      pageTitle="โปรไฟล์ของฉัน"
      pageDescription="ดูและจัดการข้อมูลบัญชีผู้ใช้ของคุณ"
    >
      <div className="mx-auto max-w-3xl pt-8">
        
        {/* === ข้อมูล Profile === */}
        <section className="relative overflow-hidden rounded-[3rem] border border-slate-200 bg-white shadow-sm">
          
          {/* พื้นหลังตกแต่งด้านบน (Cover Photo) */}
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600"></div>
          
          <div className="relative z-10 flex flex-col items-center px-8 pb-12 pt-24 text-center">
            
            {/* รูปโปรไฟล์ (เอาไอคอนกล้องออกแล้ว) */}
            <div className="group relative flex h-40 w-40 items-center justify-center rounded-full border-8 border-white bg-slate-100 shadow-xl transition-transform hover:scale-105">
              {profile.profile_picture ? (
                <img 
                  src={profile.profile_picture} 
                  alt="Profile" 
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-7xl font-bold text-sky-500 uppercase">
                  {profile.username !== "กำลังโหลด..." ? profile.username.charAt(0) : ""}
                </span>
              )}
            </div>
            
            <div className="mt-6">
              <h2 className="text-3xl font-bold text-slate-900">
                {loading ? "กำลังโหลดข้อมูล..." : profile.username}
              </h2>
              <span className="mt-3 inline-block rounded-full bg-sky-50 px-5 py-1.5 text-sm font-semibold text-sky-700 border border-sky-100">
                ผู้ใช้งานระดับเริ่มต้น (Silver)
              </span>
            </div>
            
            <div className="mt-10 w-full max-w-md space-y-4 text-left">
              <div className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-sky-50">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
                  <FaEnvelope size={24} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">อีเมลติดต่อ</p>
                  <p className="mt-1 truncate text-lg font-bold text-slate-900" title={profile.email}>
                    {loading ? "-" : profile.email}
                  </p>
                </div>
              </div>
            </div>
            
            {/* กลุ่มปุ่ม Action */}
            <div className="mt-12 flex w-full max-w-md flex-col gap-4 sm:flex-row">
              <button 
                onClick={handleEditProfile}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-sky-500 px-6 py-4 text-sm font-bold text-white shadow-md transition hover:bg-sky-600 hover:-translate-y-1"
              >
                <FaUserEdit size={20} /> แก้ไขโปรไฟล์
              </button>

              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-3 rounded-2xl bg-slate-100 px-6 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
              >
                <FaSignOutAlt size={18} /> ออกจากระบบ
              </button>
            </div>

          </div>
        </section>

      </div>
    </DashboardShell>
  );
}