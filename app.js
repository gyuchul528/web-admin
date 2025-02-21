const express = require('express');
const path = require('path');
var logger = require('morgan');
var session = require('express-session');
var svgCaptcha = require('svg-captcha');

const app = express();

// 添加调试日志
console.log('Starting application...');

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    next();
});

// 视图引擎设置
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 中间件
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Session配置
app.use(session({
  secret: 'adamsoft-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // 在开发环境中使用 false
}));

// 数据库连接
const db = require('./db');

// 路由配置
const adminRouter = require('./routes/admin');
app.use('/admin', adminRouter);

// 添加内容管理路由（添加调试日志）
console.log('Loading content routes...');
const contentRouter = require('./routes/admin/content');
app.use('/admin/content', contentRouter);

// 检查用户是否已登录的中间件
const checkAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// 登录页面路由
app.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/admin');
    } else {
        res.render('login');
    }
});

// 首页路由
app.get('/', async (req, res) => {
    try {
        const categories = await db.query(`
            SELECT c.*, m.name as model_name 
            FROM categories c 
            LEFT JOIN models m ON c.model_id = m.id 
            ORDER BY c.sort_order ASC, c.id ASC
        `);
        res.render('index', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 生成验证码
app.get('/captcha', function(req, res) {
  var captcha = svgCaptcha.create({
    size: 4,      // 验证码长度
    width: 150,   // 宽度
    height: 50,   // 高度
    fontSize: 50, // 字体大小
    noise: 2,     // 干扰线条数
    color: true,  // 使用彩色字符
    background: '#fff',  // 背景色
    charPreset: '0123456789' // 仅使用数字
  });
  
  // 将验证码存入session
  req.session.captcha = captcha.text;
  
  // 设置响应头，防止缓存
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.type('svg');
  res.status(200).send(captcha.data);
});

// 登录处理
app.post('/login', function(req, res) {
  const { username, password, verify } = req.body;
  
  // 验证码检查
  if (!verify || verify.toLowerCase() !== req.session.captcha.toLowerCase()) {
    return res.json({ success: false, message: '認証コードが正しくありません' });
  }

  // 这里是示例账号，实际应用中应该从数据库验证
  if (username === 'admin' && password === 'password123') {
    req.session.user = {
      username: username,
      isAdmin: true
    };
    res.json({ success: true, redirect: '/admin' });
  } else {
    res.json({ success: false, message: 'ユーザー名またはパスワードが正しくありません' });
  }
});

// 管理页面路由
app.get('/admin', checkAuth, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM categories ORDER BY sort_order');
        res.render('index', { 
            categories: categories,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            message: 'サーバーエラーが発生しました',
            error: {}
        });
    }
});

app.get('/main', function(req, res) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.render('main');
});

// 退出登录
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

// 404 处理
app.use((req, res, next) => {
    console.log('404 Not Found:', req.url);  // 添加404日志
    res.status(404).send('Not Found');
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).send('Something broke!');
});

// 使用端口 3005
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Views directory: ${path.join(__dirname, 'views')}`);  // 打印视图目录
});

module.exports = app;
