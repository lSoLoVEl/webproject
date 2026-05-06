import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // นำเข้า supabase client ที่คุณมีอยู่

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. ใช้ Supabase Auth ในการตรวจสอบ Email และ Password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    // 2. ตรวจสอบว่ามี Error หรือไม่ (เช่น รหัสผ่านผิด หรือ ไม่มีอีเมลนี้)
    if (error) {
      return NextResponse.json(
        { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, // เรามักไม่บอกเจาะจงว่าผิดที่ตัวไหนเพื่อความปลอดภัย
        { status: 401 }
      );
    }

    // 3. ถ้าผ่าน ให้ส่งข้อมูล User หรือ Success กลับไป
    return NextResponse.json(
      { 
        message: "Login successful", 
        user: data.user,
        session: data.session 
      }, 
      { status: 200 }
    );

  } catch (err) {
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}