/*
Name: 𝑹𝒂𝒛𝒂𝒏 𝑯𝒂𝒔𝒂𝒏
Description: المساعد الشخصي الذكي لإدارة المهام والخدمات التلقائية عبر الواتساب
Author: 𝑹𝒂𝒛𝒂𝒏 𝑯𝒂𝒔𝒂𝒏
Version: 1.0.5
License: MIT
Channel: https://whatsapp.com/channel/0029Vb8QyE2KgsNvTVmCvM2L
📌 هذا الملف مسؤول عن تشغيل البوت الرئيسي
📌 يقوم بإعادة تشغيل البوت تلقائياً في حال توقفه
*/

const { spawn } = require("child_process")
const path = require("path")
const { logger } = require("./libs/logger")

/*
🚀 دالة تشغيل البوت الأساسية
هذه الدالة تقوم بتشغيل ملف البوت الرئيسي Goat.js
*/
function startBot() {

  // 🧹 تنظيف شاشة التيرمنال قبل التشغيل
  console.clear()

  /*
  ⚙️ تشغيل عملية جديدة للبوت باستخدام node
  - spawn = تشغيل عملية خارجية
  - node Goat.js = تشغيل ملف البوت الرئيسي
  - cwd = تحديد مكان التشغيل الحالي
  - stdio inherit = عرض كل اللوجات مباشرة في التيرمنال
  */
  const child = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  })

  /*
  🔁 عند توقف البوت
  هذا الحدث يتم تشغيله لو البوت وقف لأي سبب
  */
  child.on("close", (code) => {

    // 📌 إذا كود الخروج = 2 يعني نعيد تشغيل البوت
    if (code === 2) {
      logger.info("🔄 جاري إعادة تشغيل البوت...")

      // ⏱️ انتظار ثانية قبل إعادة التشغيل
      setTimeout(() => {
        startBot()
      }, 1000)
    }
  })

  /*
  ❌ في حالة حدوث خطأ في تشغيل العملية
  */
  child.on("error", (err) => {
    logger.error("❌ فشل في بدء تشغيل عملية البوت:", err)
  })
}

/*
▶️ تشغيل البوت لأول مرة
*/
startBot()