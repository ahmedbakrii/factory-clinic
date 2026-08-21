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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Extract medical log data from the image. 
      Rules:
      1. Apply the date (e.g. 11/8/2026) to all patient rows below it.
      2. Convert dates to YYYY-MM-DD format.
      3. If iqama_number is missing, return null.
      
      You MUST return ONLY a valid JSON array of objects, and nothing else (no markdown formatting, no backticks, just raw JSON).
      Columns: date, iqama_number, name, nationality, age, time_in, blood_pressure, department, diagnosis, recommendation.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }
    ]);

    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n|\n```|```/g, '').trim();
    
    let data = JSON.parse(responseText);
    
    data = data.map((row: any) => ({
      ...row,
      iqama_number: row.iqama_number ? convertToArabicToEnglishNumbers(String(row.iqama_number)).replace(/\D/g, '') : null,
      age: row.age ? parseInt(convertToArabicToEnglishNumbers(String(row.age))) : null
    }));

    return NextResponse.json({ records: data });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "تعذر قراءة الصورة، تأكد من وضوحها." }, { status: 500 });
  }
}