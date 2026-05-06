"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LoginImage from "@/assets/images/Login.png";
import { supabase } from "@/lib/supabaseClient"; // 1. นำเข้า supabase client

export default function Home() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 2. ใช้ Supabase Auth ล็อคอินจากฝั่ง Client โดยตรง
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        // ถ้ารหัสผิด หรือไม่มีอีเมลนี้
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        // 3. ล็อคอินสำเร็จ! เบราว์เซอร์ได้รับ Session แล้ว
        // ตรงนี้ให้เปลี่ยน path เป็นหน้าที่คุณต้องการให้ไปหลังจากล็อคอิน
        router.push("/profile"); 
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push("/Register"); // ไปหน้าสมัครสมาชิก
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      <main className="flex h-screen w-full flex-col overflow-hidden bg-white md:flex-row">
        {/* ส่วนรูปภาพฝั่งซ้าย */}
        <section className="hidden w-full items-center justify-center bg-sky-500 p-6 md:flex md:w-1/2">
          <div className="h-70 w-full max-w-[320px] rounded-full bg-white p-6 shadow-inner md:h-90 md:max-w-90">
            <Image
              src={LoginImage}
              alt="Login"
              className="h-full w-full rounded-full object-cover"
              priority
            />
          </div>
        </section>

        {/* ส่วนฟอร์มฝั่งขวา */}
        <section className="flex w-full flex-1 items-center justify-center bg-white p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Account Login</h1>
              <p className="mt-2 text-sm text-slate-500">เข้าสู่ระบบเพื่อจัดการบัญชีของคุณ</p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              {/* แสดงข้อความ Error */}
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm shadow-sm outline-none ring-sky-500/40 transition focus:border-sky-500 focus:ring"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm shadow-sm outline-none ring-sky-500/40 transition focus:border-sky-500 focus:ring"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-md bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
              >
                {loading ? "กำลังตรวจสอบ..." : "Login"}
              </button>
            </form>
            
            <p className="mt-6 text-center text-sm text-slate-500">
              Dont have an account ?{' '}
              <a
                className="font-medium text-sky-600 cursor-pointer hover:text-sky-700"
                onClick={handleSignUp}
              >
                Sign up here
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}