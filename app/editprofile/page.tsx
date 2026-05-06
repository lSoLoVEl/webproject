"use client";

import { useEffect, useState, useRef } from "react";
import { FaArrowLeft, FaCamera, FaSave } from "react-icons/fa";
import DashboardShell from "@/app/components/DashboardShell";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States สำหรับจัดการ UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // States สำหรับเก็บข้อมูลผู้ใช้
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // States สำหรับรหัสผ่าน (ปล่อยว่างไว้ จะเปลี่ยนก็ต่อเมื่อพิมพ์)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/login");
          return;
        }

        const userEmail = session.user.email;
        setEmail(userEmail || "");

        if (userEmail) {
          // ดึงชื่อและ ID จากตาราง User
          const { data: userRecord } = await supabase
            .from("User")
            .select("user_id, username")
            .eq("email", userEmail)
            .single();

          if (userRecord) {
            setUserId(userRecord.user_id);
            setUsername(userRecord.username || "");

            // ดึงรูปภาพจากตาราง Profile
            const { data: profileRecord } = await supabase
              .from("Profile")
              .select("profile_picture")
              .eq("user_id", userRecord.user_id)
              .single();

            if (profileRecord) {
              setAvatarUrl(profileRecord.profile_picture);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // 🔥 1. ปรับปรุงฟังก์ชันอัปโหลดรูป ให้บันทึกลงตาราง Profile อัตโนมัติ!
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage({ text: "", type: "" });

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("กรุณาเลือกรูปภาพ");
      }

      if (!userId) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`; 
      const filePath = `${fileName}`;

      // 1. อัปโหลดไฟล์ไปที่ Bucket ชื่อ 'trash_bk'
      const { error: uploadError } = await supabase.storage
        .from("trash_bk")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. ดึง URL แบบ Public ออกมา
      const { data } = supabase.storage.from("trash_bk").getPublicUrl(filePath);
      const newProfilePicUrl = data.publicUrl;
      
      setAvatarUrl(newProfilePicUrl);

      // 3. อัปเดต URL ลงในตาราง Profile ทันทีโดยไม่ต้องรอให้ผู้ใช้กดปุ่มเซฟ
      const { data: existingProfile } = await supabase
        .from("Profile")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingProfile) {
        // ถ้ามีข้อมูล Profile อยู่แล้วให้อัปเดต
        await supabase
          .from("Profile")
          .update({ profile_picture: newProfilePicUrl })
          .eq("user_id", userId);
      } else {
        // ถ้ายังไม่เคยมี ให้สร้างใหม่เลย
        await supabase
          .from("Profile")
          .insert({ 
            user_id: userId, 
            profile_picture: newProfilePicUrl,
            notification_status: false 
          });
      }

      setMessage({ text: "เปลี่ยนรูปโปรไฟล์สำเร็จแล้ว!", type: "success" });
      
    } catch (error: any) {
      setMessage({ text: `อัปโหลดล้มเหลว: ${error.message}`, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  // 🔥 2. ปรับปรุงการบันทึกข้อมูล (ไม่ต้องยุ่งกับรูปภาพแล้ว เพราะด้านบนจัดการให้แล้ว)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    if (!userId) {
      setMessage({ text: "ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่", type: "error" });
      setSaving(false);
      return;
    }

    try {
      // 1. เช็ครหัสผ่าน (ถ้ามีการพิมพ์รหัสผ่านใหม่)
      if (password) {
        if (password !== confirmPassword) {
          throw new Error("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
        }
        if (password.length < 6) {
          throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        }
        
        const { error: authError } = await supabase.auth.updateUser({ password: password });
        if (authError) throw authError;
      }

      // 2. อัปเดตชื่อในตาราง User
      const { error: userError } = await supabase
        .from("User")
        .update({ username: username })
        .eq("user_id", userId);

      if (userError) throw userError;

      // แจ้งเตือนและรีเฟรชหน้าต่าง
      setMessage({ text: "บันทึกข้อมูลสำเร็จ! กำลังรีเฟรชหน้าจอ...", type: "success" });
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      setMessage({ text: error.message, type: "error" });
      setSaving(false);
    } 
  };

  if (loading) {
    return (
      <DashboardShell pageTitle="แก้ไขโปรไฟล์" pageDescription="กำลังโหลดข้อมูล...">
        <div className="flex h-64 items-center justify-center text-slate-500">
          กำลังเตรียมข้อมูลบัญชีของคุณ...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      pageTitle="แก้ไขโปรไฟล์"
      pageDescription="ปรับปรุงข้อมูลส่วนตัว รหัสผ่าน และรูปโปรไฟล์ของคุณ"
    >
      <div className="mx-auto max-w-2xl pt-4">
        
        {/* ปุ่มย้อนกลับ */}
        <Link 
          href="/profile" 
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-sky-600"
        >
          <FaArrowLeft /> กลับไปหน้าโปรไฟล์
        </Link>

        <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-700"></div>
          
          <form onSubmit={handleSaveProfile} className="px-8 pb-10">
            
            {/* ส่วนเปลี่ยนรูปโปรไฟล์ */}
            <div className="-mt-16 mb-8 flex flex-col items-center">
              <div className="relative h-32 w-32 rounded-full border-4 border-white bg-slate-100 shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-sky-100 text-4xl font-bold text-sky-500 uppercase">
                    {username.charAt(0)}
                  </div>
                )}
                
                {/* ปุ่มอัปโหลดรูป */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-sky-500 text-white shadow-md transition hover:bg-sky-600 hover:scale-110 disabled:opacity-50"
                >
                  <FaCamera size={16} />
                </button>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden" 
                />
              </div>
              {uploading && <p className="mt-3 text-sm text-sky-600 animate-pulse">กำลังอัปโหลดและบันทึกรูปภาพ...</p>}
            </div>

            {/* แจ้งเตือนข้อความ */}
            {message.text && (
              <div className={`mb-6 rounded-2xl p-4 text-sm font-semibold ${
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              {/* ข้อมูลทั่วไป */}
              <div>
                <h3 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลทั่วไป</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">ชื่อผู้ใช้งาน</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">อีเมล (เปลี่ยนไม่ได้)</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* เปลี่ยนรหัสผ่าน */}
              <div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">เปลี่ยนรหัสผ่าน</h3>
                <p className="mb-4 text-sm text-slate-500">ปล่อยว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">รหัสผ่านใหม่</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">ยืนยันรหัสผ่านใหม่</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>
                </div>
              </div>

              {/* ปุ่มบันทึก */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 p-4 font-bold text-white shadow-md transition hover:bg-sky-600 disabled:opacity-50 sm:w-auto sm:px-10"
                >
                  <FaSave size={18} />
                  {saving ? "กำลังบันทึกและรีเฟรช..." : "บันทึกข้อมูล"}
                </button>
              </div>

            </div>
          </form>
        </section>

      </div>
    </DashboardShell>
  );
}