require("module-alias/register");
const chalk = require("chalk");
const { logger } = require("./libs/logger");
const config = require("./config.json");
const db = require("./database/manager");
const path = require("path");
const inquirer = require("inquirer");
const fs = require("fs-extra");
const chokidar = require("chokidar");
const os = require("os");
const { connect, AUTH_ERROR } = require("./bot/connect");
const { startServer, stopServer } = require("./dashboard/server");
const {
  loadPlugins,
  loadCommand,
  unloadCommand,
  loadEvent,
  unloadEvent,
} = require("./bot/loader");

// تهيئة نظام الإعدادات العالمي
const GoatConfig = require("./libs/goatConfig");

// تتبع محاولات إعادة التشغيل لمنع الحلقات اللانهائية
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

const gradient = require("gradient-string");

const bannerLines = [
  "███╗   ███╗ █████╗ ████████╗██████╗ ██╗██╗  ██╗   ██████╗  █████╗ ███████╗██╗  ██╗",
  "████╗ ████║██╔══██╗╚══██╔══╝██╔══██╗██║╚██╗██╔╝   ██╔══██╗██╔══██╗██╔════╝██║  ██║",
  "██╔████╔██║███████║   ██║   ██████╔╝██║ ╚███╔╝    ██║  ██║███████║███████╗███████║",
  "██║╚██╔╝██║██╔══██║   ██║   ██╔══██╗██║ ██╔██╗    ██║  ██║██╔══██║╚════██║██╔══██║",
  "██║ ╚═╝ ██║██║  ██║   ██║   ██║  ██║██║██╔╝ ██╗   ██████╔╝██║  ██║███████║██║  ██║",
  "╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝",
  "                      المطور الرئيسي: -` بط الاسطوري ˎˊ˗"
];

const compactBannerLines = [
  "███╗   ███╗ █████╗ ████████╗██████╗ ██╗██╗  ██╗",
  "████╗ ████║██╔══██╗╚══██╔══╝██╔══██╗██║╚██╗██╔╝",
  "██╔████╔██║███████║   ██║   ██████╔╝██║ ╚███╔╝ ",
  "██║╚██╔╝██║██╔══██║   ██║   ██╔══██╗██║ ██╔██╗ ",
  "██║ ╚═╝ ██║██║  ██║   ██║   ██║  ██║██║██╔╝ ██╗",
  "╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝",
  "             DEV ! ABOODI | MATRIX DASH"
];

function centerText(text, length) {
  const width = process.stdout.columns || 80;
  const leftPadding = Math.floor((width - (length || text.length)) / 2);
  const rightPadding = width - leftPadding - (length || text.length);
  const paddedString =
    " ".repeat(leftPadding > 0 ? leftPadding : 0) +
    text +
    " ".repeat(rightPadding > 0 ? rightPadding : 0);
  console.log(paddedString);
}

function createLine(content, isMaxWidth = false) {
  const widthConsole =
    process.stdout.columns > 50 ? 50 : process.stdout.columns || 50;
  if (!content) {
    return Array(isMaxWidth ? (process.stdout.columns || 50) : widthConsole)
      .fill("─")
      .join("");
  } else {
    content = ` ${content.trim()} `;
    const lengthContent = content.length;
    const lengthLine = isMaxWidth
      ? (process.stdout.columns || 50) - lengthContent
      : widthConsole - lengthContent;
    let left = Math.floor(lengthLine / 2);
    if (left < 0 || isNaN(left)) left = 0;
    const lineOne = Array(left).fill("─").join("");
    return lineOne + content + lineOne;
  }
}

function printBanner() {
  console.clear();

  // طباعة الخط العلوي
  console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
  console.log();

  // اختيار الشعار بناءً على عرض الشاشة
  const maxWidth = process.stdout.columns || 80;
  const selectedBanner = maxWidth > 60 ? bannerLines : compactBannerLines;

  // طباعة الشعار الرئيسي سطر بسطر مع التدرج اللوني
  for (const line of selectedBanner) {
    const textColor = gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(line);
    centerText(textColor, line.length);
  }

  // طباعة العناوين الفرعية
  const currentVersion = require("./package.json").version;
  const vvv = currentVersion.charAt(0);

  const subtitle = `MatrixBot V${vvv}@${currentVersion} - بوت واتساب متقدم، سريع ومستقر بالكامل`;
  const subTitleArray = [];

  let subTitle = subtitle;
  if (subTitle.length > maxWidth) {
    while (subTitle.length > maxWidth) {
      let lastSpace = subTitle.slice(0, maxWidth).lastIndexOf(" ");
      lastSpace = lastSpace === -1 ? maxWidth : lastSpace;
      subTitleArray.push(subTitle.slice(0, lastSpace).trim());
      subTitle = subTitle.slice(lastSpace).trim();
    }
    if (subTitle) subTitleArray.push(subTitle);
  } else {
    subTitleArray.push(subTitle);
  }

  const author = "تم التطوير والتعديل بواسطة: -`بط الاسطوري ˎˊ˗ مع كل الحب ♡";
  const srcUrl = "قناتنا أو مستودع السكريبت الخاص بك حباً بالحقوق";
  const supportMsg = "تنبيه: هذا البوت مخصص للاستخدام الشخصي والتعليمي فقط";

  for (const t of subTitleArray) {
    const textColor2 = gradient("#9F98E8", "#AFF6CF")(t);
    centerText(textColor2, t.length);
  }

  centerText(gradient("#9F98E8", "#AFF6CF")(author), author.length);
  centerText(gradient("#9F98E8", "#AFF6CF")(srcUrl), srcUrl.length);
  centerText(gradient("#f5af19", "#f12711")(supportMsg), supportMsg.length);

  console.log();
  console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
}

printBanner();


// حالة التشغيل العالمية للبوت
global.GoatBot = {
  commands: new Map(),
  aliases: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  startTime: Date.now(),
  stats: {
    messagesProcessed: 0,
    commandsExecuted: 0,
    errors: 0,
  },
  isConnected: false,
  connectionStatus: "initializing",
  authMethod: null,
  sessionValid: false,
  initialized: false,
  qrCode: null,
  pairingCode: null,
  lastError: null,
  startAuthentication: async function () {
    try {
      this.connectionStatus = "connecting";
      this.qrCode = null;
      this.pairingCode = null;
      this.lastError = null;

      // استدعاء ملف الاتصال
      const { connect } = require("./bot/connect");

      // بدء عملية الاتصال
      await connect();

      return true;
    } catch (error) {
      this.lastError = error.message;
      this.connectionStatus = "error";
      logger.error("حدث خطأ أثناء بدء المصادقة:", error);
      return false;
    }
  },
};

// تهيئة الأدوات المساعدة العالمية
global.utils = require("./utils/utils");

// إسكات اللوجر مؤقتاً أثناء مرحلة الاتصال والمصادقة
const originalLoggerLevel = logger.level;
logger.setLevel("debug");

async function promptLoginMethod() {
  printBanner();
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.cyan.bold("           🔐 يرجى تسجيل الدخول والمصادقة"));
  console.log(chalk.cyan("=".repeat(50)));
  console.log(chalk.yellow("يرجى اختيار طريقة ربط البوت بحسابك:\n"));

  const choices = [
    { name: "📷 المسح عبر رمز الاستجابة السريعة QR code (موصى به)", value: "qr" },
    { name: "📱 الربط عبر كود الهاتف (Pair-code login)", value: "paircode" },
    { name: "📂 إعادة استيراد ملف جلسة قديم", value: "session-file" },
    { name: "❌ خروج وإغلاق", value: "exit" },
  ];

  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "method",
        message: "اختر الطريقة المناسبة لك الآن:",
        choices,
        pageSize: 4,
        prefix: "👑",
      },
    ]);

    if (answer.method === "exit") {
      console.log(chalk.yellow("👋 تم إغلاق البوت بناءً على طلبك."));
      process.exit(0);
    }
    return answer.method;
  } catch (error) {
    console.error(chalk.red("❌ خطأ في قائمة اختيار طريقة تسجيل الدخول:"), error.message);
    global.GoatBot.stats.errors++;
    throw error;
  }
}

// الاتصال بقاعدة البيانات
async function connectDatabase() {
  try {
    await db.connect(config.database);
    return true;
  } catch (error) {
    logger.error("❌ فشل الاتصال بقاعدة البيانات:", error);
    global.GoatBot.stats.errors++;
    return false;
  }
}

// منطق التحقق من الجلسة والمصادقة الذكية
async function ensureAuthenticated() {
  const sessionPath = path.join(__dirname, "session");

  // التحقق من مجلد الجلسة وإنشائه صامتاً إذا لم يكن موجوداً
  try {
    if (!(await fs.pathExists(sessionPath))) {
      await fs.mkdir(sessionPath);
      global.GoatBot.sessionValid = false;
      global.GoatBot.connectionStatus = "awaiting-login";
      global.GoatBot.authMethod = await promptLoginMethod();
    }
  } catch (error) {
    console.error(
      chalk.red("❌ فشل إنشاء مجلد الجلسة الزمني:"),
      error.message
    );
    global.GoatBot.stats.errors++;
    global.GoatBot.connectionStatus = "awaiting-login";
    global.GoatBot.authMethod = await promptLoginMethod();
  }

  while (true) {
    try {
      global.GoatBot.connectionStatus = "connecting";
      await connect({ method: global.GoatBot.authMethod });
      global.GoatBot.isConnected = true;
      global.GoatBot.sessionValid = true;
      global.GoatBot.connectionStatus = "connected";
      restartAttempts = 0; // إعادة تصفير عداد محاولات الرستارت عند النجاح
      return;
    } catch (err) {
      console.error(chalk.red("❌ خطأ أثناء محاولة الاتصال بالسيرفر:"), err.message);
      global.GoatBot.stats.errors++;
      if (err === AUTH_ERROR || err.message === "Session expired") {
        global.GoatBot.isConnected = false;
        global.GoatBot.sessionValid = false;
        global.GoatBot.connectionStatus = "awaiting-login";
        global.GoatBot.authMethod = await promptLoginMethod();
      } else {
        if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
          console.error(
            chalk.red(
              `❌ تم الوصول للحد الأقصى لمحاولات التشغيل (${MAX_RESTART_ATTEMPTS}). يتم الإغلاق الحين.`
            )
          );
          process.exit(1);
        }
        restartAttempts++;
        console.error(
          chalk.yellow(
            `⚠️ محاولة إعادة التشغيل التلقائي رقم ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`
          )
        );
        gracefulRestart();
      }
    }
  }
}

function invalidateSessionAndRestart() {
  global.GoatBot.sessionValid = false;
  global.GoatBot.authMethod = null;
  global.GoatBot.connectionStatus = "awaiting-login";
  logger.warn("🔄 تم إلغاء الجلسة بطلب داخلي - جاري إعادة تشغيل نظام المصادقة…");
  ensureAuthenticated().catch((e) => {
    console.error(
      chalk.red("❌ فشل معالج التحقق التلقائي بعد الرستارت اليدوي:"),
      e.message
    );
    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.error(
        chalk.red(
          `❌ تم الوصول للحد الأقصى لمحاولات التشغيل (${MAX_RESTART_ATTEMPTS}). يتم الإغلاق الحين.`
        )
      );
      process.exit(1);
    }
    restartAttempts++;
    console.error(
      chalk.yellow(
        `⚠️ محاولة إعادة التشغيل التلقائي رقم ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`
      )
    );
    gracefulRestart();
  });
}

function gracefulRestart() {
  console.log(
    chalk.yellow(
      `🔄 جاري تفعيل نظام إعادة التشغيل الآمن (محاولة رقم ${
        restartAttempts + 1
      }/${MAX_RESTART_ATTEMPTS}) …`
    )
  );
  stopServer(() => console.log(chalk.yellow("🔌 تم إغلاق سيرفر لوحة التحكم بنجاح.")));
  process.exit(2);
}

function watchPlugins() {
  const pluginPath = path.join(__dirname, "plugins");
  const watcher = chokidar.watch(pluginPath, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("add", (filePath) => {
    if (!filePath.endsWith(".js")) return;

    logger.info(`➕ تم رصد إضافة ملف جديد: ${path.basename(filePath)}`);
    if (filePath.includes("commands")) {
      loadCommand(filePath, logger);
    } else if (filePath.includes("events")) {
      loadEvent(filePath, logger);
    }
  });

  watcher.on("change", (filePath) => {
    if (!filePath.endsWith(".js")) return;

    logger.info(`✏️ تم رصد تعديل على الملف الحين: ${path.basename(filePath)}`);
    if (filePath.includes("commands")) {
      unloadCommand(filePath, logger);
      loadCommand(filePath, logger);
    } else if (filePath.includes("events")) {
      unloadEvent(filePath, logger);
      loadEvent(filePath, logger);
    }
  });

  watcher.on("unlink", (filePath) => {
    if (!filePath.endsWith(".js")) return;

    logger.info(`🗑️ تم حذف ملف من المجلد: ${path.basename(filePath)}`);
    if (filePath.includes("commands")) {
      unloadCommand(filePath, logger);
    } else if (filePath.includes("events")) {
      unloadEvent(filePath, logger);
    }
  });

  logger.info("👀 نظام المراقبة الفورية للأوامر والإضافات نشط الحين...");
}

async function start() {
  // بدء عملية المصادقة وفحص الاتصال أولاً
  await ensureAuthenticated();

  // تشغيل قاعدة البيانات
  if (!(await connectDatabase())) process.exit(1);

  // تخزين كائن قاعدة البيانات عالمياً للوصول له من بقية الموديلات
  global.GoatBot.db = db;

  // إعادة مستوى اللوجر إلى طبيعته بعد نجاح الاتصال والمصادقة
  logger.setLevel(originalLoggerLevel);

  // تحميل الملحقات والإضافات أولاً قبل طباعة ملخص التشغيل
  await loadPlugins(logger);

  await printStartupSummary();

  // المزامنة التلقائية للبيانات بعد اكتمال التهيئة
  if (global.GoatBot.isConnected) {
    const SyncManager = require("./libs/syncManager");
    logger.info("🔄 جاري بدء مزامنة البيانات والجروبات تلقائياً...");

    try {
      if (global.GoatBot.sock) {
        const syncResult = await SyncManager.syncAllGroups(
          global.GoatBot.sock,
          global.GoatBot.db,
          logger
        );
        logger.info(
          `✅ اكتملت المزامنة بنجاح: تم تحديث ${syncResult.syncedGroups} جروب، و ${syncResult.syncedUsers} مستخدم.`
        );
      }
    } catch (error) {
      logger.error("❌ فشلت عملية المزامنة التلقائية للبيانات:", error);
    }
  }

  watchPlugins();

  // تشغيل سيرفر لوحة التحكم لوحة الويب لو كانت مدعومة
  startServer();

  // رفع راية الجاهزية الكاملة للبوت
  global.GoatBot.initialized = true;

  logger.info(chalk.yellow("" + "=".repeat(50)));
  logger.info(chalk.green("🎉 مبروك يا عبودي! البوت الحين أونلاين وجاهز لاستلام الأوامر بالكامل!"));
  logger.info(chalk.yellow("=".repeat(50)));
}

async function printStartupSummary() {
  const { user, commands, events } = global.GoatBot;
  const botName = user.name || config.botName || "Matrix-Bot";
  const botNumber = user.id?.split(":")[0] || "غير متوفر";
  const dbStats = await db.getStats();

  logger.info(chalk.yellow("" + "=".repeat(50)));
  logger.info(chalk.cyan.bold(`           👑 ملخص تهيئة وإقلاع البوت بنجاح 👑`));
  logger.info(chalk.yellow("=".repeat(50)));

  logger.info(chalk.white(`- اسم البوت الحين:   ${chalk.green(botName)}`));
  logger.info(chalk.white(`- رقم الواتساب:     ${chalk.green(botNumber)}`));
  logger.info(chalk.white(`- البادئة (البريفكس): ${chalk.green(config.prefix)}`));
  logger.info(
    chalk.white(`- نوع قاعدة البيانات: ${chalk.green(config.database.type)}`)
  );
  logger.info(
    chalk.white(
      `- إجمالي مدخلات الداتا: ${chalk.green(dbStats.total || dbStats.entries || 0)}`
    )
  );

  logger.info(chalk.yellow("=".repeat(50)));
}

start().catch((err) => {
  console.error(chalk.red("❌ حدث فشل غير متوقع في المستوى الأعلى للبرنامج:"), err.message);
  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error(
      chalk.red(
        `❌ تم الوصول للحد الأقصى لمحاولات التشغيل (${MAX_RESTART_ATTEMPTS}). يتم الإغلاق الحين.`
      )
    );
    process.exit(1);
  }
  restartAttempts++;
  console.error(
    chalk.yellow(
      `⚠️ محاولة إعادة التشغيل التلقائي رقم ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`
    )
  );
  gracefulRestart();
});

process.on("SIGINT", () => {
  logger.info("📴 تم تلقي إشارة إغلاق SIGINT - يتم إنهاء العمليات بأمان الحين …");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("📴 تم تلقي إشارة إغلاق SIGTERM - يتم إنهاء العمليات بأمان الحين …");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error(chalk.red("💥 خطأ غير متوقع في النظام العام (Uncaught Exception):"), error.message);
  global.GoatBot.stats.errors++;

  // تجاهل أخطاء تحميل يوتيوب لمنع كراش البوت الكامل بسبب السيرفرات الخارجية
  if (
    error.message?.includes("youtube-dl-exec") ||
    error.message?.includes("yt-dlp")
  ) {
    console.error(
      chalk.yellow("🎬 تم رصد مشكلة في مفسر تحميل اليوتيوب، يتخطاها السيرفر الحين تلقائياً ويستمر العمل...")
    );
    return;
  }

  // ميزة الحماية القصوى: حل مشكلة التشفير و Bad MAC تلقائياً دون تجميد السيرفر
  if (
    error.message?.includes("Bad MAC") ||
    error.message?.includes("session") ||
    error.message?.includes("decrypt")
  ) {
    console.error(
      chalk.red("🔑 خطأ فادح في جلسة التشفير (Bad MAC)، يقوم البوت الحين بمسح الملفات التالفة تلقائياً لإعادة الربط النظيف...")
    );

    const fs = require("fs-extra");
    const path = require("path");
    const sessionPath = path.join(__dirname, "session");

    fs.remove(sessionPath)
      .then(() => {
        console.log(chalk.yellow("✅ تم تنظيف ملفات الجلسة التالفة بنجاح وعمل ريستارت تلقائي"));
        process.exit(2);
      })
      .catch(() => {
        process.exit(2);
      });

    return;
  }

  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error(
      chalk.red(
        `❌ تم الوصول للحد الأقصى لمحاولات التشغيل (${MAX_RESTART_ATTEMPTS}). يتم الإغلاق الحين.`
      )
    );
    process.exit(1);
  }
  restartAttempts++;
  console.error(
    chalk.yellow(
      `⚠️ محاولة إعادة التشغيل التلقائي رقم ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`
    )
  );
  gracefulRestart();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    chalk.red("💥 رفض غير معالج في الوعود البرمجية (Unhandled Rejection) في:"),
    promise,
    "السبب:",
    reason.message || reason
  );
  global.GoatBot.stats.errors++;

  // ميزة الحماية القصوى من أخطاء الـ Session التالفة والـ Bad MAC في الوعود الخلفية
  if (
    reason.message?.includes("Bad MAC") ||
    reason.message?.includes("session") ||
    reason.message?.includes("decrypt")
  ) {
    console.error(
      chalk.red("🔑 خطأ فادح في جلسة التشفير (Bad MAC) داخل الوعود الخلفية، يتم تصفير الجلسة فوراً…")
    );

    const fs = require("fs-extra");
    const path = require("path");
    const sessionPath = path.join(__dirname, "session");

    fs.remove(sessionPath)
      .then(() => {
        console.log(chalk.yellow("✅ تم تصفير الجلسة بنجاح، جاري عمل ريستارت لإعادة طلب كود الربط"));
        process.exit(2);
      })
      .catch(() => {
        process.exit(2);
      });

    return;
  }

  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error(
      chalk.red(
        `❌ تم الوصول للحد الأقصى لمحاولات التشغيل (${MAX_RESTART_ATTEMPTS}). يتم الإغلاق الحين.`
      )
    );
    process.exit(1);
  }
  restartAttempts++;
  console.error(
    chalk.yellow(
      `⚠️ محاولة إعادة التشغيل التلقائي رقم ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`
    )
  );
  gracefulRestart();
});
