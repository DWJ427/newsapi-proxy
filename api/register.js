// api/register.js
import fetch from 'node-fetch';

const EMAIL = '1427887496@qq.com';
const PASSWORD = '10j23w4d';

export default async function handler(req, res) {
  try {
    // 第一步：获取注册页及可能的 CSRF token（NewsAPI 可能不需要）
    const getPage = await fetch('https://newsapi.org/register');
    const pageHtml = await getPage.text();

    // 第二步：构造注册请求
    const formData = new URLSearchParams();
    formData.append('email', EMAIL);
    formData.append('password', PASSWORD);
    formData.append('firstName', 'News');
    formData.append('lastName', 'Bot');
    formData.append('useCase', 'personal');        // 可能字段名不同
    formData.append('description', 'Personal AI assistant');

    const registerRes = await fetch('https://newsapi.org/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual', // 不自动跟随重定向
    });

    // 第三步：查看注册响应
    const cookies = registerRes.headers.get('set-cookie');
    const status = registerRes.status;
    const location = registerRes.headers.get('location');

    // 如果注册成功，通常会重定向到登录后页面或提示验证邮箱
    let apiKey = null;
    if (status === 302 && location && location.includes('dashboard')) {
      // 尝试访问 Dashboard 抓取 Key（需要 cookie）
      const dashRes = await fetch('https://newsapi.org/account', {
        headers: {
          Cookie: cookies,
        },
      });
      const dashHtml = await dashRes.text();
      const match = dashHtml.match(/apiKey[\s=]+['"]([^'"]+)['"]/);
      if (match) apiKey = match[1];
    }

    res.status(200).json({
      status,
      location,
      apiKey,
      note: 'If no key, check your email to verify account, then login manually.',
    });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
}
