const express = require('express');
const path = require('path');
var logger = require('morgan');
var session = require('express-session');
var svgCaptcha = require('svg-captcha');

const app = express();

// 環境変数の設定（app.jsの先頭付近に追加）
process.env.NODE_ENV = 'development';

// 添加调试日志
console.log('Starting application...');

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    next();
});

// 视图引擎设置
// 设置模板引擎为 EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 添加视图缓存配置（生产环境开启，开发环境关闭）
app.set('view cache', process.env.NODE_ENV === 'production');

// 移除 Jade 相关配置

// 中间件
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
const picturesRouter = require('./routes/admin/pictures');

// indexRouterは使用しないので、直接ルートパスのルーティングを設定
app.use('/admin', adminRouter);
app.use('/admin/pictures', picturesRouter);

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
        res.render('users/login');  // 更新视图路径
    }
});

// 修改管理页面路由
app.get('/admin', checkAuth, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM categories ORDER BY sort_order');
        res.render('admin/dashboard', {  // 更新视图路径
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
    console.error('Error details:', err);
    res.status(500).render('error', {
        message: 'サーバーエラーが発生しました',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 使用端口 3006
const port = process.env.PORT || 3006;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Views directory: ${path.join(__dirname, 'views')}`);  // 打印视图目录
});

module.exports = app;
