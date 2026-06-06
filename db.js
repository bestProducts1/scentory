// ==========================================
// db.js - 产品数据管理中心 (纯香水单表版)
// ==========================================

// 原本的香水表链接 (gid=0)
const URL_PERFUME = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwZ_BgnXtX_ZdO87jkvLU_IMUByJwFKZoyzVVI0Sghwe-2_Qq676JsqsrO0AnGubJGuCxonKizijyj/pub?gid=0&single=true&output=csv";

// 缓存时间 (1分钟)
const CACHE_DURATION = 1 * 60 * 1000;

window.perfumeDB = [];

document.addEventListener("DOMContentLoaded", () => {
  initProductData();
});

async function initProductData() {
  // 更新版本号，强制刷新旧缓存，清除之前残留的电子烟数据
  const cacheKey = "perfumeDB_Data_V7";
  const timeKey = "perfumeDB_Time_V7";

  const now = new Date().getTime();
  const cachedTime = localStorage.getItem(timeKey);
  const cachedData = localStorage.getItem(cacheKey);

  // 1. 尝试加载缓存
  if (cachedData && cachedTime && now - cachedTime < CACHE_DURATION) {
    console.log("🚀 加载香水缓存数据");
    try {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
      return;
    } catch (e) {
      console.warn("缓存损坏，准备重新下载");
    }
  }

  // 2. 只下载香水表格的数据
  console.log("🌐 正在同步香水数据...");
  try {
    const response = await fetch(URL_PERFUME);

    if (!response.ok) throw new Error("香水表格获取失败");

    const csvPerfume = await response.text();

    // 解析数据
    window.perfumeDB = parseCSV(csvPerfume);

    // 存入缓存
    localStorage.setItem(cacheKey, JSON.stringify(window.perfumeDB));
    localStorage.setItem(timeKey, now);

    console.log(`✅ 数据同步完成！总计: ${window.perfumeDB.length} 个香水产品`);
    runPageLogic();
  } catch (error) {
    console.error("数据下载失败:", error);
    if (cachedData) {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
    }
  }
}

function runPageLogic() {
  if (typeof renderHome === "function") renderHome();
  if (typeof renderCart === "function") renderCart();
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]
    .trim()
    .split(",")
    .map((h) => h.trim().toLowerCase());

  return lines
    .slice(1)
    .map((line) => {
      const values = [];
      let current = "";
      let inQuote = false;
      for (let char of line) {
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const obj = {};
      if (values.length < headers.length) return null;

      headers.forEach((header, index) => {
        let val = values[index] ? values[index].replace(/^"|"$/g, "") : "";

        // 强制转为数字的字段
        if (
          header === "price" ||
          header === "stock" ||
          header === "inventory" ||
          header === "top" ||
          header === "new" ||
          header === "sale"
        ) {
          val = isNaN(Number(val)) ? 0 : Number(val);
        }

        obj[header] = val;
      });
      return obj;
    })
    .filter((item) => item !== null);
}