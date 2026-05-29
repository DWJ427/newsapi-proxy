// api/register.js
const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');

// ⚠️ 请替换为你用来注册 NewsAPI 的邮箱和密码
const EMAIL = '1427887496@qq.com';   // 例如 mynewsbot@gmail.com
const PASSWORD = '10j23w4d,..';      // 至少8位，含字母和数字

export default async function handler(req, res) {
  let browser = null;
  try {
    // 启动无头浏览器（Vercel 环境自带 chromium）
    browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });
    const page = await browser.newPage();

    // 1. 访问 NewsAPI 注册页
    await page.goto('https://newsapi.org/register', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // 2. 填写邮箱
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', EMAIL);

    // 3. 填写密码
    await page.type('input[name="password"]', PASSWORD);

    // 4. 尝试填写其他可能字段（名字、用途）
    //    字段可能变化，这里尝试常见的 name 属性
    try {
      await page.type('input[name="firstName"]', 'News');
      await page.type('input[name="lastName"]', 'Bot');
    } catch (e) {}
    try {
      // 有些版本有下拉选择用途
      await page.select('select[name="useCase"]', 'personal');
    } catch (e) {}
    try {
      // 有些版本有文本域描述
      await page.type('textarea[name="description"]', 'Personal AI assistant, not for commercial use.');
    } catch (e) {}

    // 5. 勾选同意条款（如果有复选框）
    try {
      await page.click('input[type="checkbox"]');
    } catch (e) {}

    // 6. 提交表单
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
    ]);

    // 7. 注册后通常直接登录并跳转到 Dashboard，尝试获取 API Key 元素
    let apiKey = '';
    try {
      apiKey = await page.evaluate(() => {
        // 查找页面中显示 key 的元素，常见的是一个 <code> 标签
        const codeEl = document.querySelector('code');
        if (codeEl) return codeEl.innerText.trim();
        // 或者某些卡片里
        const keyEl = document.querySelector('.api-key');
        if (keyEl) return keyEl.innerText.trim();
        // 如果都没找到，抓取整个 body 文本便于调试
        return 'NOT_FOUND';
      });
    } catch (e) {
      apiKey = 'EXTRACTION_ERROR';
    }

    // 8. 也抓取页面部分文本作为备查
    const bodyText = await page.evaluate(() => document.body.innerText);
    const snippet = bodyText.substring(0, 800);

    await browser.close();

    // 返回结果
    res.status(200).json({
      apiKey: apiKey,
      note: 'If key is NOT_FOUND, check your email and verify the account, then login manually to get key.',
      pageSnippet: snippet,
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({
      error: 'Script failed',
      message: error.toString(),
      hint: 'Maybe NewsAPI has CAPTCHA, or registration flow changed.',
    });
  }
}
