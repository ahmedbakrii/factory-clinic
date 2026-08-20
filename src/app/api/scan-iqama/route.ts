import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// تأكد من إضافة GEMINI_API_KEY في ملف .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'لم يتم إرسال صورة' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      قم بتحليل صورة الهوية السعودية هذه (إقامة). استخرج البيانات التالية باللغة العربية وقم بإرجاعها ككائن JSON فقط بدون أي نص إضافي:
      - iqama_number: رقم الهوية
      - name: الاسم كامل
      - nationality: الجنسية
      - profession: المهنة
      - birth_year: استخرج سنة الميلاد من "تاريخ الميلاد" المكتوب (مثال: إذا كان 1998/02/22، أرجع 1998 كرقم).
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n|\n```/g, '').trim();
    
    const data = JSON.parse(responseText);

    // حساب العمر التقريبي
    const currentYear = new Date().getFullYear();
    const age = data.birth_year ? currentYear - parseInt(data.birth_year) : null;

    return NextResponse.json({ ...data, age });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
