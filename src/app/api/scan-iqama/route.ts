import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const convertToArabicToEnglishNumbers = (str: string) => {
  if (!str) return '';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => String(arabicNumbers.indexOf(w)));
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'لم يتم إرسال صورة' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    
    const prompt = `
      أنت نظام خبير وممتاز لاستخراج البيانات من بطاقات الهوية السعودية (الإقامة).
      البطاقة قد تحتوي على نصوص باللغة العربية أو الإنجليزية أو كلاهما.
      استخرج البيانات التالية وقم بإرجاعها ككائن JSON صالح (Valid JSON) فقط وبدون أي نصوص إضافية:
      - iqama_number: رقم الهوية المكون من 10 أرقام (يجب أن يكون بالأرقام الإنجليزية 0-9 حصراً).
      - name: الاسم كاملاً (يفضل استخراجه باللغة العربية إذا كان متاحاً في الصورة، وإلا بالإنجليزية).
      - nationality: الجنسية.
      - birth_year: استخرج سنة الميلاد من "تاريخ الميلاد" (يجب أن يكون بالأرقام الإنجليزية 0-9 حصراً سواء كان هجرياً أو ميلادياً).
      
      إذا لم تجد حقلاً، اجعل قيمته null.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n|\n```|```/g, '').trim();
    
    const data = JSON.parse(responseText);

    const cleanIqama = convertToArabicToEnglishNumbers(String(data.iqama_number || '')).replace(/\D/g, ''); 
    const cleanBirthYear = convertToArabicToEnglishNumbers(String(data.birth_year || ''));

    let age = null;
    if (cleanBirthYear) {
      const yearMatch = cleanBirthYear.match(/\d{4}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        const currentYear = new Date().getFullYear(); 
        
        if (year > 1900 && year <= currentYear) {
          age = currentYear - year;
        } 
        else if (year > 1300 && year < 1450) {
          age = 1448 - year; 
        }
      }
    }

    return NextResponse.json({ 
      ...data, 
      iqama_number: cleanIqama || data.iqama_number,
      profession: data.profession || null,
      age 
    });

  } catch (error: any) {
    console.error("AI Error:", error);
    // ⚠️ استيعاب صدمة الـ 503
    let msg = error.message;
    if (msg.includes("503") || msg.includes("high demand")) {
        msg = "سيرفرات الذكاء الاصطناعي عليها ضغط حالياً، يرجى المحاولة بعد قليل.";
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}