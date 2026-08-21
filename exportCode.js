const fs = require('fs');
const path = require('path');

// الدالة دي بتلف جوه الفولدرات وتجيب الملفات المطلوبة
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getFiles('./src');
let output = '';

output += "================== مشروع Energya Clinic ==================\n\n";

allFiles.forEach(file => {
  output += `\n\n/* ` + '='.repeat(60) + ` */\n`;
  output += `/* FILE: ${file} */\n`;
  output += `/* ` + '='.repeat(60) + ` */\n\n`;
  
  // قراءة محتوى الملف
  const content = fs.readFileSync(file, 'utf8');
  output += content;
});

// حفظ كل الأكواد في ملف واحد
fs.writeFileSync('FullCodeDump.txt', output, 'utf8');
console.log('✅ تمت العملية بنجاح! تم استخراج الأكواد في ملف FullCodeDump.txt');