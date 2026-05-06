"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RegisterImage from "@/assets/images/register.png";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    // 1. สร้าง User ในระบบ Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    // หากระบบ Auth สมัครไม่ผ่าน (เช่น รหัสผ่านสั้นไป หรือ เมลซ้ำ)
    if (authError) {
      setErrorMessage(authError.message);
      setLoading(false);
      return;
    }

    // 2. เมื่อสร้าง Auth สำเร็จ ให้นำข้อมูลมาบันทึกลงตาราง "User"
    if (authData.user) {
      const { error: dbError } = await supabase
        .from("User") // 👈 ตรงนี้ใส่ชื่อตารางตามรูปของคุณ (User หรือ Profile)
        .insert([
          {
            user_id: authData.user.id, // ใช้ ID จาก Auth เพื่อใช้อ้างอิง
            username: name,
            email: email,
            password: password, // บันทึกพาสเวิร์ดลงตารางตามที่คุณออกแบบไว้
          },
        ]);

      if (dbError) {
        setErrorMessage("ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้: " + dbError.message);
      } else {
        alert("สมัครสมาชิกสำเร็จ!");
        router.push("/login"); // ส่งกลับไปหน้าล็อคอิน
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      <main className="flex h-screen w-full flex-col overflow-hidden bg-white md:flex-row">
        {/* ฝั่งรูปภาพ */}
        <section className="hidden w-full items-center justify-center bg-sky-500 p-6 md:flex md:w-1/2">
          <div className="h-[280px] w-full max-w-[320px] rounded-full bg-white p-6 shadow-inner md:h-[360px] md:max-w-[360px]">
            <Image
              src={RegisterImage}
              alt="Register"
              className="h-full w-full rounded-full object-cover"
              priority
            />
          </div>
        </section>

        {/* ฝั่งฟอร์ม */}
        <section className="flex w-full flex-1 flex-col justify-center bg-white p-6 md:p-12">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <span className="text-xl">←</span> Back
            </Link>

            <div className="mt-6 mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Account Signup</h1>
              <p className="mt-2 text-sm text-slate-500">Create your free account to continue.</p>
            </div>

            <form className="space-y-4" onSubmit={handleRegister}>
              {/* แสดงแจ้งเตือน Error */}
              {errorMessage && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm border border-red-200">
                  {errorMessage}
                </div>
              )}

              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                  User Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm shadow-sm outline-none ring-sky-500/40 transition focus:border-sky-500 focus:ring"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm shadow-sm outline-none ring-sky-500/40 transition focus:border-sky-500 focus:ring"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm shadow-sm outline-none ring-sky-500/40 transition focus:border-sky-500 focus:ring"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-md bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
              >
                {loading ? "กำลังบันทึกข้อมูล..." : "Continue"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-sky-600 hover:text-sky-700">
                Login
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}