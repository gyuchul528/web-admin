const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise'); // Promise版を使用
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// データベースプール作成
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'myapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 添加调试日志
console.log('Admin router loaded');

// 测试路由
router.get('/test', (req, res) => {
    res.send('Test route is working!');
});

// 显示添加栏目页面
router.get('/category/add', async (req, res) => {
    try {
        // モデルの定義
        const models = [
            { id: 1, name: 'ページモデル' },
            { id: 2, name: '記事モデル' },
            { id: 3, name: '製品モデル' },
            { id: 4, name: '写真モデル' },
            { id: 5, name: '外部リンク' }
        ];

        // 親カテゴリーの取得
        const [categories] = await pool.query(
            'SELECT * FROM categories ORDER BY sort_order ASC'
        );

        res.render('admin/category/add', {
            isChild: false,
            parentCategory: null,
            models: models,
            categories: categories
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 处理添加栏目的请求
router.post('/category/add', async (req, res) => {
    try {
        const { name, model_id, parent_id = 0, sort_order = 0, status = 1 } = req.body;
        
        const connection = await pool.getConnection();
        const result = await connection.query(
            'INSERT INTO categories (name, model_id, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?)',
            [name, model_id, parent_id, sort_order, status]
        );
        
        res.json({ success: true, id: result[0].insertId });
    } catch (error) {
        console.error('Database error:', error);
        res.json({ success: false, message: error.message });
    }
});

// 显示栏目列表
router.get('/category/list', async (req, res) => {
    try {
        const [categories] = await pool.query(
            'SELECT * FROM categories ORDER BY sort_order ASC'
        );
        res.render('admin/category/list', { categories });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// コンテンツ一覧の表示（モデルIDに応じてリダイレクト）
router.get('/content/:modelId/list', async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        const categoryId = req.query.category; // カテゴリーIDはクエリパラメータから取得

        if (!categoryId) {
            return res.status(400).send('カテゴリーIDが必要です');
        }

        // モデルIDに応じて適切なルートにリダイレクト
        switch (modelId) {
            case 1: // ページモデル
                return res.redirect(`/admin/pages/${categoryId}/list`);
            case 2: // 記事モデル
                return res.redirect(`/admin/articles/${categoryId}/list`);
            case 3: // 製品モデル
                return res.redirect(`/admin/products/${categoryId}/list`);
            case 4: // 写真モデル
                return res.redirect(`/admin/pictures/${categoryId}/list`);
            case 5: // 外部リンク
                return res.redirect(`/admin/links/${categoryId}/list`);
            default:
                return res.status(404).send('無効なモデルIDです');
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('サーバーエラー');
    }
});

// ページモデルの一覧表示
router.get('/pages/:categoryId/list', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // ページ一覧を取得
        const [pages] = await pool.query(
            `SELECT 
                p.*,
                c.name as category_name,
                DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM pages p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ?
            ORDER BY p.sort_order ASC, p.id DESC`,
            [categoryId]
        );

        // 一覧画面を表示
        res.render('admin/pages/list', {
            category: categories[0],
            pages: pages
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// ページ追加画面の表示
router.get('/pages/:categoryId/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        res.render('admin/pages/add', {
            category: categories[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// ページ追加の処理
router.post('/pages/:categoryId/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { title, content, sort_order = 0, status = 1 } = req.body;
        
        console.log('Received form data:', req.body); // デバッグ用ログ
        
        // タイトルの必須チェック
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'タイトルは必須です'
            });
        }
        
        // ページを追加
        const [result] = await pool.query(
            `INSERT INTO pages 
            (category_id, title, content, sort_order, status) 
            VALUES (?, ?, ?, ?, ?)`,
            [categoryId, title, content, sort_order, status]
        );

        res.json({
            success: true,
            id: result.insertId,
            message: 'ページが正常に追加されました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 記事モデルの一覧表示
router.get('/articles/:categoryId/list', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // 記事一覧を取得
        const [articles] = await pool.query(
            `SELECT 
                a.*,
                c.name as category_name,
                DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM articles a
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.category_id = ?
            ORDER BY a.sort_order ASC, a.id DESC`,
            [categoryId]
        );

        // 一覧画面を表示
        res.render('admin/articles/list', {
            category: categories[0],
            articles: articles
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 製品一覧の表示
router.get('/products/:categoryId/list', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // 製品分類一覧を取得
        const [productCategories] = await pool.query(
            'SELECT * FROM product_categories ORDER BY sort_order ASC, id ASC'
        );

        // 製品一覧を取得
        const [products] = await pool.query(
            `SELECT 
                p.*,
                c.name as category_name,
                pc.name as product_category_name,
                DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_categories pc ON p.product_category_id = pc.id
            WHERE p.category_id = ?
            ORDER BY p.sort_order ASC, p.id DESC`,
            [categoryId]
        );

        // 一覧画面を表示
        res.render('admin/products/list', {
            category: categories[0],
            productCategories: productCategories,
            products: products
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

router.get('/pictures/:categoryId/list', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // アルバム一覧を取得（写真数とサムネイル情報も含む）
        const [albums] = await pool.query(
            `SELECT 
                a.*,
                (SELECT COUNT(*) FROM photos WHERE album_id = a.id) as photo_count,
                p.filename as thumbnail_filename,
                DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM albums a
            LEFT JOIN photos p ON a.thumbnail_photo_id = p.id
            WHERE a.category_id = ?
            ORDER BY a.sort_order ASC, a.id DESC`,
            [categoryId]
        );

        // サムネイルURLを追加
        albums.forEach(album => {
            if (album.thumbnail_filename) {
                album.thumbnail_url = `/uploads/photos/${album.thumbnail_filename}`;
            } else {
                album.thumbnail_url = null;
            }
        });

        // 一覧画面を表示
        res.render('admin/pictures/list', {
            category: categories[0],
            albums: albums,
            message: req.query.message || null,
            messageType: req.query.messageType || 'info'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー: ' + err.message);
    }
});

router.get('/links/:categoryId/list', async (req, res) => {
    // 外部リンクの一覧表示処理
});

// 显示添加子栏目表单
router.get('/category/addChild/:parentId', async (req, res) => {
    try {
        const parentId = req.params.parentId;

        // モデルの定義
        const models = [
            { id: 1, name: 'ページモデル' },
            { id: 2, name: '記事モデル' },
            { id: 3, name: '製品モデル' },
            { id: 4, name: '写真モデル' },
            { id: 5, name: '外部リンク' }
        ];

        // 親カテゴリーの取得
        const [parentCategories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [parentId]
        );

        if (!parentCategories || parentCategories.length === 0) {
            return res.status(404).send('親カテゴリーが見つかりません');
        }

        res.render('admin/category/add', {
            isChild: true,
            parentCategory: parentCategories[0],
            models: models
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 处理添加子栏目的提交
router.post('/category/addChild/:id', async (req, res) => {
    try {
        const parentId = req.params.id;
        const { name, model_id, sort_order = 0 } = req.body;

        // 验证父栏目是否存在
        const connection = await pool.getConnection();
        const [parentCategory] = await connection.query('SELECT * FROM categories WHERE id = ?', [parentId]);
        if (!parentCategory) {
            return res.json({ success: false, message: '親カテゴリーが見つかりません' });
        }

        // 插入新的子栏目
        const result = await connection.query(
            'INSERT INTO categories (name, model_id, parent_id, sort_order) VALUES (?, ?, ?, ?)',
            [name, model_id, parentId, sort_order]
        );

        res.json({ success: true, message: 'サブカテゴリーを追加しました' });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: '追加に失敗しました：' + error.message });
    }
});

// 删除栏目
router.post('/category/delete/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        // 检查是否有子栏目
        const connection = await pool.getConnection();
        const [children] = await connection.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [categoryId]);
        if (children.count > 0) {
            return res.json({ 
                success: false, 
                message: 'サブカテゴリーが存在するため、削除できません'
            });
        }

        // 删除栏目
        await connection.query('DELETE FROM categories WHERE id = ?', [categoryId]);
        
        res.json({ success: true, message: '削除しました' });
    } catch (error) {
        console.error('Error:', error);
        res.json({ 
            success: false, 
            message: '削除に失敗しました：' + error.message 
        });
    }
});

// 更新排序
router.post('/category/updateOrder', async (req, res) => {
    try {
        const orders = req.body;
        
        // 使用事务来确保所有更新都成功
        const connection = await pool.getConnection();
        await connection.query('START TRANSACTION');
        
        for (const [id, order] of Object.entries(orders)) {
            await connection.query(
                'UPDATE categories SET sort_order = ? WHERE id = ?',
                [order, id]
            );
        }
        
        await connection.query('COMMIT');
        
        res.json({ success: true, message: '順序を更新しました' });
    } catch (error) {
        const connection = await pool.getConnection();
        await connection.query('ROLLBACK');
        console.error('Error:', error);
        res.json({ 
            success: false, 
            message: '更新に失敗しました：' + error.message 
        });
    }
});

// コンテンツ新規追加画面の表示
router.get('/content/add/:categoryId', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?', 
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // 新規追加画面を表示
        res.render('admin/content/add', {
            category: categories[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// コンテンツ新規追加の処理
router.post('/content/add/:categoryId', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { title, content, status = 1 } = req.body;

        // データを挿入
        const [result] = await pool.query(
            'INSERT INTO contents (category_id, title, content, status) VALUES (?, ?, ?, ?)',
            [categoryId, title, content, status]
        );

        res.json({ success: true, id: result.insertId });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// コンテンツ編集画面の表示
router.get('/content/edit/:id', async (req, res) => {
    try {
        const contentId = req.params.id;
        
        // コンテンツとカテゴリー情報を取得
        const [contents] = await pool.query(
            'SELECT c.*, cat.name as category_name FROM contents c ' +
            'LEFT JOIN categories cat ON c.category_id = cat.id ' +
            'WHERE c.id = ?',
            [contentId]
        );

        if (!contents || contents.length === 0) {
            return res.status(404).send('コンテンツが見つかりません');
        }

        // 編集画面を表示
        res.render('admin/content/edit', {
            content: contents[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// コンテンツ更新の処理
router.post('/content/edit/:id', async (req, res) => {
    try {
        const contentId = req.params.id;
        const { title, content, status } = req.body;

        // データを更新
        await pool.query(
            'UPDATE contents SET title = ?, content = ?, status = ? WHERE id = ?',
            [title, content, status, contentId]
        );

        res.json({ 
            success: true, 
            message: '更新しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'データベースエラー: ' + err.message 
        });
    }
});

// カテゴリー編集画面の表示
router.get('/category/edit/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // 親カテゴリーのリストを取得（自分以外）
        const [parentCategories] = await pool.query(
            'SELECT * FROM categories WHERE id != ? ORDER BY sort_order ASC',
            [categoryId]
        );

        // 編集画面を表示
        res.render('admin/category/edit', {
            category: categories[0],
            parentCategories: parentCategories,
            models: [
                { id: 1, name: 'ページモデル' },
                { id: 2, name: '記事モデル' },
                { id: 3, name: '製品モデル' },
                { id: 4, name: '写真モデル' },
                { id: 5, name: '外部リンク' }
            ]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// カテゴリー更新の処理
router.post('/category/edit/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, parent_id, model_id, sort_order, status } = req.body;

        // データを更新
        await pool.query(
            'UPDATE categories SET name = ?, parent_id = ?, model_id = ?, sort_order = ?, status = ? WHERE id = ?',
            [name, parent_id || 0, model_id, sort_order || 0, status, categoryId]
        );

        res.json({ 
            success: true, 
            message: '更新しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'データベースエラー: ' + err.message 
        });
    }
});

// コンテンツ削除の処理
router.post('/content/delete/:id', async (req, res) => {
    let connection;
    try {
        const contentId = req.params.id;
        
        // コネクションを取得
        connection = await pool.getConnection();
        
        // トランザクション開始
        await connection.beginTransaction();

        // 削除前にカテゴリーIDを取得
        const [contents] = await connection.query(
            'SELECT category_id FROM contents WHERE id = ?',
            [contentId]
        );

        if (!contents || contents.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'コンテンツが見つかりません'
            });
        }

        // コンテンツを削除
        await connection.query(
            'DELETE FROM contents WHERE id = ?',
            [contentId]
        );

        // トランザクションをコミット
        await connection.commit();

        res.json({
            success: true,
            message: '削除しました',
            categoryId: contents[0].category_id
        });

    } catch (err) {
        // エラーが発生した場合はロールバック
        if (connection) {
            await connection.rollback();
        }
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        // コネクションを解放
        if (connection) {
            connection.release();
        }
    }
});

// アップロードディレクトリの作成
const uploadDir = 'public/uploads/products';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ファイルアップロードの設定
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // アップロード先ディレクトリを指定
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // ファイル名を生成（一意の名前にする）
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // 許可する画像のMIMEタイプ
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('画像ファイル（JPEG, PNG, GIF, WEBP）のみアップロード可能です。'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB制限
    }
});

// エラーハンドリングミドルウェア
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multerのエラー処理
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'ファイルサイズは5MB以下にしてください。'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'ファイルアップロードエラー: ' + err.message
        });
    } else if (err) {
        // その他のエラー
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// 記事追加画面の表示
router.get('/articles/:categoryId/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        res.render('admin/articles/add', {
            category: categories[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 記事追加の処理（ファイルアップロード対応）
router.post('/articles/:categoryId/add', upload.single('thumbnail'), async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { title, content, summary, author, status } = req.body;
        
        // アップロードされた画像のパス
        const thumbnailPath = req.file ? `/uploads/products/${req.file.filename}` : null;

        // 記事を追加
        const [result] = await pool.query(
            `INSERT INTO articles 
            (category_id, title, content, summary, author, status, thumbnail) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [categoryId, title, content, summary, author, status, thumbnailPath]
        );

        res.json({
            success: true,
            message: '記事を追加しました',
            articleId: result.insertId
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 記事編集画面の表示
router.get('/articles/edit/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        
        // 記事情報を取得
        const [articles] = await pool.query(
            `SELECT a.*, c.name as category_name 
            FROM articles a
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.id = ?`,
            [articleId]
        );

        if (!articles || articles.length === 0) {
            return res.status(404).send('記事が見つかりません');
        }

        res.render('admin/articles/edit', {
            article: articles[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 記事更新の処理
router.post('/articles/edit/:id', upload.single('thumbnail'), async (req, res) => {
    try {
        const articleId = req.params.id;
        const { title, content, summary, author, status } = req.body;
        
        // アップロードされた新しい画像のパス
        let thumbnailPath = null;
        if (req.file) {
            thumbnailPath = `/uploads/products/${req.file.filename}`;
        }

        // 既存の画像パスを取得
        const [currentArticle] = await pool.query(
            'SELECT thumbnail FROM articles WHERE id = ?',
            [articleId]
        );

        let updateQuery;
        let updateParams;

        if (thumbnailPath) {
            // 新しい画像がアップロードされた場合
            updateQuery = `
                UPDATE articles 
                SET title = ?, content = ?, summary = ?, 
                    author = ?, status = ?, thumbnail = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            updateParams = [title, content, summary, author, status, thumbnailPath, articleId];
        } else {
            // 画像の更新がない場合
            updateQuery = `
                UPDATE articles 
                SET title = ?, content = ?, summary = ?, 
                    author = ?, status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            updateParams = [title, content, summary, author, status, articleId];
        }

        await pool.query(updateQuery, updateParams);

        res.json({
            success: true,
            message: '記事を更新しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 記事削除の処理
router.post('/articles/delete/:id', async (req, res) => {
    try {
        const articleId = req.params.id;

        // 記事の情報を取得（サムネイル画像のパスを取得するため）
        const [articles] = await pool.query(
            'SELECT thumbnail FROM articles WHERE id = ?',
            [articleId]
        );

        if (!articles || articles.length === 0) {
            return res.status(404).json({
                success: false,
                message: '記事が見つかりません'
            });
        }

        // 記事を削除
        await pool.query(
            'DELETE FROM articles WHERE id = ?',
            [articleId]
        );

        // サムネイル画像が存在する場合、ファイルも削除
        if (articles[0].thumbnail) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '../public', articles[0].thumbnail);
            
            // ファイルが存在する場合のみ削除
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({
            success: true,
            message: '記事を削除しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 記事の表示順序更新
router.post('/articles/updateOrder', async (req, res) => {
    let connection;
    try {
        const orders = req.body;
        
        // コネクションを取得
        connection = await pool.getConnection();
        
        // トランザクション開始
        await connection.beginTransaction();
        
        // 各記事の表示順序を更新
        for (const [id, order] of Object.entries(orders)) {
            await connection.query(
                'UPDATE articles SET sort_order = ? WHERE id = ?',
                [order, id]
            );
        }
        
        // トランザクションをコミット
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: '表示順序を更新しました' 
        });

    } catch (error) {
        // エラーが発生した場合はロールバック
        if (connection) {
            await connection.rollback();
        }
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新に失敗しました：' + error.message 
        });
    } finally {
        // コネクションを解放
        if (connection) {
            connection.release();
        }
    }
});

// 製品分類一覧の表示
router.get('/product-categories', async (req, res) => {
    try {
        const [categories] = await pool.query(
            'SELECT * FROM product_categories ORDER BY sort_order ASC, id ASC'
        );
        
        res.render('admin/product-categories/list', {
            categories: categories
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 製品分類の追加
router.post('/product-categories/add', async (req, res) => {
    try {
        const { name, sort_order } = req.body;
        
        await pool.query(
            'INSERT INTO product_categories (name, sort_order) VALUES (?, ?)',
            [name, sort_order || 0]
        );
        
        res.json({
            success: true,
            message: '製品分類を追加しました'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 製品分類の更新
router.post('/product-categories/edit/:id', async (req, res) => {
    try {
        const { name, sort_order } = req.body;
        const categoryId = req.params.id;
        
        await pool.query(
            'UPDATE product_categories SET name = ?, sort_order = ? WHERE id = ?',
            [name, sort_order || 0, categoryId]
        );
        
        res.json({
            success: true,
            message: '製品分類を更新しました'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 製品分類の削除
router.post('/product-categories/delete/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        // この分類を使用している製品があるか確認
        const [products] = await pool.query(
            'SELECT COUNT(*) as count FROM products WHERE product_category_id = ?',
            [categoryId]
        );
        
        if (products[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'この分類を使用している製品が存在するため削除できません'
            });
        }
        
        await pool.query(
            'DELETE FROM product_categories WHERE id = ?',
            [categoryId]
        );
        
        res.json({
            success: true,
            message: '製品分類を削除しました'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 製品追加画面の表示（小分類データも含める）
router.get('/products/:categoryId/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // 製品分類一覧を取得
        const [productCategories] = await pool.query(
            'SELECT * FROM product_categories ORDER BY sort_order ASC, id ASC'
        );

        // 全ての小分類を取得
        const [subcategories] = await pool.query(
            'SELECT * FROM product_subcategories ORDER BY category_id, sort_order ASC'
        );

        res.render('admin/products/add', {
            category: categories[0],
            productCategories: productCategories,
            subcategories: subcategories
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 製品追加の処理
router.post('/products/:categoryId/add', 
    upload.single('thumbnail'),
    handleUploadError,
    async (req, res) => {
    let connection;
    try {
        const categoryId = req.params.categoryId;
        const { 
            name, 
            product_category_id,
            subcategory_id,
            summary, 
            description, 
            price, 
            status 
        } = req.body;

        // 必須項目のバリデーション
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '製品名は必須です'
            });
        }

        // サムネイル画像のパスを修正
        const thumbnailPath = req.file ? '/uploads/products/' + req.file.filename : null;

        // コネクションを取得
        connection = await pool.getConnection();
        
        // トランザクション開始
        await connection.beginTransaction();

        try {
            // 製品を追加
            const [result] = await connection.query(
                `INSERT INTO products 
                (category_id, product_category_id, subcategory_id, name, summary, 
                 description, thumbnail, price, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [categoryId, 
                 product_category_id || null, 
                 subcategory_id || null, 
                 name, 
                 summary || null, 
                 description || null, 
                 thumbnailPath, 
                 price || null, 
                 status || 1]
            );

            // トランザクションをコミット
            await connection.commit();

            res.json({
                success: true,
                message: '製品を追加しました',
                productId: result.insertId
            });

        } catch (error) {
            // トランザクションのロールバック
            await connection.rollback();
            throw error;
        }

    } catch (err) {
        console.error('Error in product addition:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        // コネクションを解放
        if (connection) {
            connection.release();
        }
    }
});

// 小分類一覧の取得（Ajax用）
router.get('/product-categories/:categoryId/subcategories', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const [subcategories] = await pool.query(
            'SELECT * FROM product_subcategories WHERE category_id = ? ORDER BY sort_order ASC, id ASC',
            [categoryId]
        );
        res.json(subcategories);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'データベースエラー' });
    }
});

// 小分類の追加
router.post('/product-categories/:categoryId/subcategories/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { name, sort_order } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO product_subcategories (category_id, name, sort_order) VALUES (?, ?, ?)',
            [categoryId, name, sort_order || 0]
        );
        
        res.json({
            success: true,
            message: '小分類を追加しました',
            subcategoryId: result.insertId
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 小分類の更新
router.post('/product-subcategories/:id/update', async (req, res) => {
    try {
        const { name, sort_order } = req.body;
        const subcategoryId = req.params.id;
        
        await pool.query(
            'UPDATE product_subcategories SET name = ?, sort_order = ? WHERE id = ?',
            [name, sort_order || 0, subcategoryId]
        );
        
        res.json({
            success: true,
            message: '小分類を更新しました'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 小分類の削除
router.post('/product-subcategories/:id/delete', async (req, res) => {
    try {
        const subcategoryId = req.params.id;
        
        // この小分類を使用している製品があるか確認
        const [products] = await pool.query(
            'SELECT COUNT(*) as count FROM products WHERE subcategory_id = ?',
            [subcategoryId]
        );
        
        if (products[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'この小分類を使用している製品が存在するため削除できません'
            });
        }
        
        await pool.query(
            'DELETE FROM product_subcategories WHERE id = ?',
            [subcategoryId]
        );
        
        res.json({
            success: true,
            message: '小分類を削除しました'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 製品編集画面の表示
router.get('/products/:categoryId/edit/:productId', async (req, res) => {
    try {
        const { categoryId, productId } = req.params;
        
        // 製品情報を取得
        const [products] = await pool.query(
            `SELECT * FROM products WHERE id = ? AND category_id = ?`,
            [productId, categoryId]
        );

        if (!products || products.length === 0) {
            return res.status(404).send('製品が見つかりません');
        }

        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        // 製品分類一覧を取得
        const [productCategories] = await pool.query(
            'SELECT * FROM product_categories ORDER BY sort_order ASC, id ASC'
        );

        // 小分類一覧を取得
        const [subcategories] = await pool.query(
            'SELECT * FROM product_subcategories ORDER BY category_id, sort_order ASC'
        );

        res.render('admin/products/edit', {
            product: products[0],
            category: categories[0],
            productCategories: productCategories,
            subcategories: subcategories
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// 製品更新の処理
router.post('/products/:categoryId/edit/:productId', upload.single('thumbnail'), handleUploadError, async (req, res) => {
    let connection;
    try {
        const { categoryId, productId } = req.params;
        const { 
            name, 
            product_category_id,
            subcategory_id,
            summary, 
            description, 
            price, 
            status,
            current_thumbnail // 現在の画像パス
        } = req.body;

        // 新しい画像がアップロードされた場合のパス
        const thumbnailPath = req.file ? '/uploads/products/' + req.file.filename : current_thumbnail;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 製品情報を更新
        await connection.query(
            `UPDATE products SET 
                product_category_id = ?,
                subcategory_id = ?,
                name = ?,
                summary = ?,
                description = ?,
                thumbnail = ?,
                price = ?,
                status = ?
            WHERE id = ? AND category_id = ?`,
            [product_category_id || null, 
             subcategory_id || null,
             name,
             summary || null,
             description || null,
             thumbnailPath,
             price || null,
             status,
             productId,
             categoryId]
        );

        await connection.commit();

        // 古い画像を削除（新しい画像がアップロードされた場合）
        if (req.file && current_thumbnail) {
            const oldImagePath = path.join(__dirname, '../public', current_thumbnail);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        res.json({
            success: true,
            message: '製品を更新しました'
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// 製品削除の処理
router.post('/products/:categoryId/delete/:productId', async (req, res) => {
    let connection;
    try {
        const { categoryId, productId } = req.params;

        // 製品情報を取得（画像パスのため）
        const [products] = await pool.query(
            'SELECT thumbnail FROM products WHERE id = ? AND category_id = ?',
            [productId, categoryId]
        );

        if (!products || products.length === 0) {
            return res.status(404).json({
                success: false,
                message: '製品が見つかりません'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 製品を削除
        await connection.query(
            'DELETE FROM products WHERE id = ? AND category_id = ?',
            [productId, categoryId]
        );

        await connection.commit();

        // 画像ファイルの削除
        if (products[0].thumbnail) {
            const imagePath = path.join(__dirname, '../public', products[0].thumbnail);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({
            success: true,
            message: '製品を削除しました'
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// ページ編集画面の表示
router.get('/pages/edit/:id', async (req, res) => {
    try {
        const pageId = req.params.id;
        
        // ページ情報を取得
        const [pages] = await pool.query(
            `SELECT p.*, c.name as category_name 
            FROM pages p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?`,
            [pageId]
        );

        if (!pages || pages.length === 0) {
            return res.status(404).send('ページが見つかりません');
        }

        res.render('admin/pages/edit', {
            page: pages[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー');
    }
});

// ページ更新の処理
router.post('/pages/edit/:id', async (req, res) => {
    try {
        const pageId = req.params.id;
        const { title, content, sort_order = 0, status = 1 } = req.body;
        
        console.log('Received form data for update:', req.body); // デバッグ用ログ
        
        // タイトルの必須チェック
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'タイトルは必須です'
            });
        }
        
        // ページを更新
        await pool.query(
            `UPDATE pages 
            SET title = ?, content = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [title, content, sort_order, status, pageId]
        );

        res.json({
            success: true,
            message: 'ページが正常に更新されました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// ページ削除の処理
router.post('/pages/delete/:id', async (req, res) => {
    try {
        const pageId = req.params.id;
        
        // 削除前にカテゴリーIDを取得（リダイレクト用）
        const [pages] = await pool.query(
            'SELECT category_id FROM pages WHERE id = ?',
            [pageId]
        );
        
        if (!pages || pages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ページが見つかりません'
            });
        }
        
        const categoryId = pages[0].category_id;
        
        // ページを削除
        await pool.query(
            'DELETE FROM pages WHERE id = ?',
            [pageId]
        );
        
        res.json({
            success: true,
            message: 'ページが正常に削除されました',
            categoryId: categoryId
        });
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// ページの表示順序更新
router.post('/pages/updateOrder', async (req, res) => {
    let connection;
    try {
        const orders = req.body;
        
        // コネクションを取得
        connection = await pool.getConnection();
        
        // トランザクション開始
        await connection.beginTransaction();
        
        // 各ページの表示順序を更新
        for (const [id, order] of Object.entries(orders)) {
            await connection.query(
                'UPDATE pages SET sort_order = ? WHERE id = ?',
                [order, id]
            );
        }
        
        // トランザクションをコミット
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: '表示順序を更新しました' 
        });

    } catch (error) {
        // エラーが発生した場合はロールバック
        if (connection) {
            await connection.rollback();
        }
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新に失敗しました：' + error.message 
        });
    } finally {
        // コネクションを解放
        if (connection) {
            connection.release();
        }
    }
});

// アップロードディレクトリの作成（写真用）
const photoUploadDir = 'public/uploads/photos';
if (!fs.existsSync(photoUploadDir)) {
    fs.mkdirSync(photoUploadDir, { recursive: true });
}

// 写真アップロード用のmulter設定
const photoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, photoUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const photoUpload = multer({
    storage: photoStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB制限
    }
});

// アルバム追加画面の表示
router.get('/pictures/:categoryId/album/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // サブカテゴリー情報を取得（もしあれば）
        const [subcategories] = await pool.query(
            'SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order ASC',
            [categoryId]
        );

        res.render('admin/pictures/album_add', {
            category: categories[0],
            subcategories: subcategories
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー: ' + err.message);
    }
});

// アルバム追加の処理
router.post('/pictures/:categoryId/album/add', async (req, res) => {
    let connection;
    try {
        const categoryId = req.params.categoryId;
        const { 
            name, 
            description, 
            subcategory_id = null, 
            privacy_level = 0, 
            sort_order = 0 
        } = req.body;

        // 必須項目のバリデーション
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'アルバム名は必須です'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // アルバムを追加
        const [result] = await connection.query(
            `INSERT INTO albums 
            (category_id, name, description, subcategory_id, privacy_level, sort_order) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [categoryId, name, description, subcategory_id === '' ? null : subcategory_id, privacy_level, sort_order]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'アルバムを作成しました',
            albumId: result.insertId
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// アルバム編集画面の表示
router.get('/pictures/:categoryId/album/edit/:albumId', async (req, res) => {
    try {
        const { categoryId, albumId } = req.params;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // アルバム情報を取得
        const [albums] = await pool.query(
            `SELECT 
                a.*,
                p.filename as thumbnail_filename,
                DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM albums a
            LEFT JOIN photos p ON a.thumbnail_photo_id = p.id
            WHERE a.id = ? AND a.category_id = ?`,
            [albumId, categoryId]
        );

        if (!albums || albums.length === 0) {
            return res.status(404).send('アルバムが見つかりません');
        }

        // サムネイルURLを追加
        if (albums[0].thumbnail_filename) {
            albums[0].thumbnail_url = `/uploads/photos/${albums[0].thumbnail_filename}`;
        } else {
            albums[0].thumbnail_url = null;
        }

        // サブカテゴリー情報を取得（もしあれば）
        const [subcategories] = await pool.query(
            'SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order ASC',
            [categoryId]
        );

        res.render('admin/pictures/album_edit', {
            category: categories[0],
            album: albums[0],
            subcategories: subcategories
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー: ' + err.message);
    }
});

// アルバム更新の処理
router.post('/pictures/:categoryId/album/edit/:albumId', async (req, res) => {
    let connection;
    try {
        const { categoryId, albumId } = req.params;
        const { 
            name, 
            description, 
            subcategory_id = null, 
            privacy_level = 0, 
            sort_order = 0 
        } = req.body;

        // 必須項目のバリデーション
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'アルバム名は必須です'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // アルバムを更新
        await connection.query(
            `UPDATE albums 
            SET name = ?, description = ?, subcategory_id = ?, privacy_level = ?, 
                sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND category_id = ?`,
            [name, description, subcategory_id, privacy_level, sort_order, albumId, categoryId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'アルバムを更新しました'
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// アルバム削除の処理
router.post('/pictures/:categoryId/album/delete/:albumId', async (req, res) => {
    let connection;
    try {
        const { categoryId, albumId } = req.params;
        
        // 入力値の検証
        if (!categoryId || !albumId || isNaN(parseInt(categoryId)) || isNaN(parseInt(albumId))) {
            return res.status(400).json({
                success: false,
                message: '無効なパラメータです'
            });
        }

        // CSRF保護（必要に応じて実装）
        // if (!req.csrfToken || req.body._csrf !== req.csrfToken()) {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'CSRF検証に失敗しました'
        //     });
        // }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log(`アルバム削除処理開始: ID=${albumId}, カテゴリID=${categoryId}`);

        // アルバムの存在確認
        const [albumCheck] = await connection.query(
            'SELECT id FROM albums WHERE id = ? AND category_id = ?',
            [albumId, categoryId]
        );

        if (!albumCheck || albumCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '指定されたアルバムが見つかりません'
            });
        }

        // 外部キー制約チェックを一時的に無効化
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('外部キー制約チェックを無効化しました');

        // アルバム内の写真を取得（ファイル削除のため）
        const [photos] = await connection.query(
            'SELECT filename FROM photos WHERE album_id = ?',
            [albumId]
        );
        console.log(`関連写真を取得しました: ${photos.length}件`);

        try {
            // albumsテーブルのthumbnail_photo_idをNULLに設定
            await connection.query(
                'UPDATE albums SET thumbnail_photo_id = NULL WHERE thumbnail_photo_id IN (SELECT id FROM photos WHERE album_id = ?)',
                [albumId]
            );
            console.log('サムネイル参照をクリアしました');

            // photo_tag_relationsテーブルから関連レコードを削除
            await connection.query(
                'DELETE FROM photo_tag_relations WHERE photo_id IN (SELECT id FROM photos WHERE album_id = ?)',
                [albumId]
            );
            console.log('写真タグの関連を削除しました');

            // アルバム内の写真を削除
            await connection.query(
                'DELETE FROM photos WHERE album_id = ?',
                [albumId]
            );
            console.log('写真レコードを削除しました');

            // アルバムを削除
            await connection.query(
                'DELETE FROM albums WHERE id = ? AND category_id = ?',
                [albumId, categoryId]
            );
            console.log('アルバムレコードを削除しました');
        } finally {
            // 外部キー制約チェックを元に戻す（エラーが発生しても必ず実行）
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('外部キー制約チェックを有効化しました');
        }

        // 写真ファイルを削除
        const photoDeletePromises = photos.map(photo => {
            return new Promise((resolve) => {
                const filePath = path.join(__dirname, '../public/uploads/photos', photo.filename);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`写真ファイルを削除しました: ${photo.filename}`);
                    } catch (fileError) {
                        // ファイル削除エラーはログに記録するだけで処理は続行
                        console.error(`ファイル削除エラー: ${photo.filename}`, fileError);
                    }
                }
                resolve();
            });
        });

        // すべてのファイル削除処理を並行して実行
        await Promise.all(photoDeletePromises);

        await connection.commit();
        console.log('トランザクションをコミットしました');
        
        // リクエストがAjaxかどうかを判定
        const isAjaxRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
        
        if (isAjaxRequest) {
            // Ajaxリクエストの場合はJSON形式でレスポンス
            res.json({
                success: true,
                message: 'アルバムが正常に削除されました'
            });
        } else {
            // 通常のリクエストの場合はリダイレクト
            req.session.message = 'アルバムが正常に削除されました';
            req.session.messageType = 'success';
            res.redirect(`/admin/pictures/${categoryId}/list`);
        }
    } catch (error) {
        if (connection) {
            await connection.rollback();
            // 外部キー制約チェックを元に戻す
            try {
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');
                console.log('エラー発生後、外部キー制約チェックを有効化しました');
            } catch (constraintError) {
                console.error('外部キー制約の復元中にエラーが発生しました:', constraintError);
            }
        }
        
        // エラーの詳細をログに記録
        console.error('アルバム削除中にエラーが発生しました:', error);
        
        // リクエストがAjaxかどうかを判定
        const isAjaxRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
        
        // セキュリティのため、クライアントに返すエラーメッセージは一般的なものにする
        const clientErrorMessage = process.env.NODE_ENV === 'production' 
            ? 'アルバムの削除中にエラーが発生しました' 
            : `アルバムの削除中にエラーが発生しました: ${error.message}`;
        
        if (isAjaxRequest) {
            // Ajaxリクエストの場合はJSON形式でエラーレスポンス
            res.status(500).json({
                success: false,
                message: clientErrorMessage
            });
        } else {
            // 通常のリクエストの場合はセッションにエラーメッセージを保存してリダイレクト
            req.session.message = clientErrorMessage;
            req.session.messageType = 'danger';
            res.redirect(`/admin/pictures/${req.params.categoryId}/list`);
        }
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// 写真一覧（アルバム詳細）の表示
router.get('/pictures/:categoryId/album/:albumId/photos', async (req, res) => {
    try {
        const { categoryId, albumId } = req.params;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // アルバム情報を取得
        const [albums] = await pool.query(
            `SELECT 
                a.*,
                DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM albums a
            WHERE a.id = ? AND a.category_id = ?`,
            [albumId, categoryId]
        );

        if (!albums || albums.length === 0) {
            return res.status(404).send('アルバムが見つかりません');
        }

        // 写真一覧を取得
        const [photos] = await pool.query(
            `SELECT * FROM photos 
            WHERE album_id = ? 
            ORDER BY sort_order ASC, id ASC`,
            [albumId]
        );

        res.render('admin/pictures/photos', {
            category: categories[0],
            album: albums[0],
            photos: photos,
            message: req.query.message || null,
            messageType: req.query.messageType || 'info'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー: ' + err.message);
    }
});

// 写真アップロードの処理
router.post('/pictures/:categoryId/album/:albumId/photos/upload', photoUpload.array('photos', 20), async (req, res) => {
    let connection;
    try {
        const { categoryId, albumId } = req.params;
        const { privacy_level = 1 } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'アップロードするファイルが選択されていません'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 各写真をデータベースに登録
        const insertPromises = files.map(async (file, index) => {
            // 画像のサイズを取得（オプション）
            let width = null;
            let height = null;
            
            try {
                const dimensions = await getImageDimensions(path.join(photoUploadDir, file.filename));
                width = dimensions.width;
                height = dimensions.height;
            } catch (error) {
                console.error('Error getting image dimensions:', error);
            }

            // 写真をデータベースに登録
            return connection.query(
                `INSERT INTO photos 
                (album_id, filename, original_filename, file_size, mime_type, width, height, privacy_level, sort_order) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    albumId,
                    file.filename,
                    file.originalname,
                    file.size,
                    file.mimetype,
                    width,
                    height,
                    privacy_level,
                    index // 初期の並び順はアップロード順
                ]
            );
        });

        await Promise.all(insertPromises);

        // アルバムのサムネイルが設定されていない場合、最初の写真をサムネイルに設定
        const [albumCheck] = await connection.query(
            'SELECT thumbnail_photo_id FROM albums WHERE id = ?',
            [albumId]
        );

        if (!albumCheck[0].thumbnail_photo_id) {
            // 最初の写真のIDを取得
            const [firstPhoto] = await connection.query(
                'SELECT id FROM photos WHERE album_id = ? ORDER BY id ASC LIMIT 1',
                [albumId]
            );

            if (firstPhoto.length > 0) {
                await connection.query(
                    'UPDATE albums SET thumbnail_photo_id = ? WHERE id = ?',
                    [firstPhoto[0].id, albumId]
                );
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: `${files.length}枚の写真をアップロードしました`
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Upload error:', err);
        res.status(500).json({
            success: false,
            message: 'アップロードエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// 写真情報の取得（編集用）
router.get('/pictures/:categoryId/album/:albumId/photos/:photoId', async (req, res) => {
    try {
        const { photoId } = req.params;
        
        // 写真情報を取得
        const [photos] = await pool.query(
            'SELECT * FROM photos WHERE id = ?',
            [photoId]
        );

        if (!photos || photos.length === 0) {
            return res.status(404).json({
                success: false,
                message: '写真が見つかりません'
            });
        }

        res.json({
            success: true,
            photo: photos[0]
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 写真情報の更新
router.post('/pictures/:categoryId/album/:albumId/photos/:photoId/edit', async (req, res) => {
    try {
        const { photoId } = req.params;
        const { title, description, privacy_level } = req.body;

        // 写真情報を更新
        await pool.query(
            `UPDATE photos 
            SET title = ?, description = ?, privacy_level = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [title, description, privacy_level, photoId]
        );

        res.json({
            success: true,
            message: '写真情報を更新しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 写真の削除
router.post('/pictures/:categoryId/album/:albumId/photos/:photoId/delete', async (req, res) => {
    let connection;
    try {
        const { albumId, photoId } = req.params;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 写真情報を取得（ファイル削除のため）
        const [photos] = await connection.query(
            'SELECT filename, id FROM photos WHERE id = ?',
            [photoId]
        );

        if (!photos || photos.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '写真が見つかりません'
            });
        }

        // アルバムのサムネイルが削除対象の写真かチェック
        const [albums] = await connection.query(
            'SELECT thumbnail_photo_id FROM albums WHERE id = ?',
            [albumId]
        );

        // 写真を削除
        await connection.query(
            'DELETE FROM photos WHERE id = ?',
            [photoId]
        );

        // サムネイルが削除対象だった場合、別の写真をサムネイルに設定
        if (albums[0].thumbnail_photo_id === parseInt(photoId)) {
            // 別の写真を取得
            const [otherPhotos] = await connection.query(
                'SELECT id FROM photos WHERE album_id = ? ORDER BY id ASC LIMIT 1',
                [albumId]
            );

            if (otherPhotos.length > 0) {
                // 別の写真をサムネイルに設定
                await connection.query(
                    'UPDATE albums SET thumbnail_photo_id = ? WHERE id = ?',
                    [otherPhotos[0].id, albumId]
                );
            } else {
                // 写真がなくなった場合はサムネイルをnullに
                await connection.query(
                    'UPDATE albums SET thumbnail_photo_id = NULL WHERE id = ?',
                    [albumId]
                );
            }
        }

        await connection.commit();

        // 写真ファイルを削除
        const filePath = path.join(photoUploadDir, photos[0].filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({
            success: true,
            message: '写真を削除しました'
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// 写真の並び順更新
router.post('/pictures/:categoryId/album/:albumId/photos/updateOrder', async (req, res) => {
    let connection;
    try {
        const sortOrder = req.body;
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // 各写真の並び順を更新
        for (const [id, order] of Object.entries(sortOrder)) {
            await connection.query(
                'UPDATE photos SET sort_order = ? WHERE id = ?',
                [order, id]
            );
        }
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: '写真の並び順を更新しました' 
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新に失敗しました：' + error.message 
        });
    } finally {
        // コネクションを解放
        if (connection) {
            connection.release();
        }
    }
});

// アルバムのサムネイル設定
router.post('/pictures/:categoryId/album/:albumId/setThumbnail', async (req, res) => {
    try {
        const { albumId } = req.params;
        const { thumbnail_photo_id } = req.body;

        if (!thumbnail_photo_id) {
            return res.status(400).json({
                success: false,
                message: '写真IDが指定されていません'
            });
        }

        // サムネイルを設定
        await pool.query(
            'UPDATE albums SET thumbnail_photo_id = ? WHERE id = ?',
            [thumbnail_photo_id, albumId]
        );

        res.json({
            success: true,
            message: 'サムネイルを設定しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// 画像のサイズを取得するヘルパー関数
function getImageDimensions(filePath) {
    return new Promise((resolve, reject) => {
        const sizeOf = require('image-size');
        try {
            const dimensions = sizeOf(filePath);
            resolve(dimensions);
        } catch (error) {
            reject(error);
        }
    });
}

// サブカテゴリー管理画面の表示
router.get('/pictures/:categoryId/subcategories', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [categories] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (!categories || categories.length === 0) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // サブカテゴリー一覧を取得
        const [subcategories] = await pool.query(
            `SELECT 
                s.*,
                DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i') as formatted_created_at,
                DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i') as formatted_updated_at
            FROM subcategories s
            WHERE s.category_id = ?
            ORDER BY s.sort_order ASC, s.id ASC`,
            [categoryId]
        );

        res.render('admin/pictures/subcategories', {
            category: categories[0],
            subcategories: subcategories,
            message: req.query.message || null,
            messageType: req.query.messageType || 'info'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('データベースエラー: ' + err.message);
    }
});

// サブカテゴリー追加の処理
router.post('/pictures/:categoryId/subcategories/add', async (req, res) => {
    let connection;
    try {
        const categoryId = req.params.categoryId;
        const { name, sort_order = 0 } = req.body;

        // 必須項目のバリデーション
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'サブカテゴリー名は必須です'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // サブカテゴリーを追加
        const [result] = await connection.query(
            `INSERT INTO subcategories 
            (category_id, name, sort_order) 
            VALUES (?, ?, ?)`,
            [categoryId, name, sort_order]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'サブカテゴリーを作成しました',
            subcategoryId: result.insertId
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// サブカテゴリー更新の処理
router.post('/pictures/subcategories/:subcategoryId/update', async (req, res) => {
    try {
        const subcategoryId = req.params.subcategoryId;
        const { name, sort_order = 0 } = req.body;

        // 必須項目のバリデーション
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'サブカテゴリー名は必須です'
            });
        }

        // サブカテゴリーを更新
        await pool.query(
            `UPDATE subcategories 
            SET name = ?, sort_order = ?, updated_at = NOW()
            WHERE id = ?`,
            [name, sort_order, subcategoryId]
        );

        res.json({
            success: true,
            message: 'サブカテゴリーを更新しました'
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    }
});

// サブカテゴリー削除の処理
router.post('/pictures/subcategories/:subcategoryId/delete', async (req, res) => {
    let connection;
    try {
        const subcategoryId = req.params.subcategoryId;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // このサブカテゴリーを使用しているアルバムのサブカテゴリーIDをnullに設定
        await connection.query(
            `UPDATE albums SET subcategory_id = NULL WHERE subcategory_id = ?`,
            [subcategoryId]
        );

        // サブカテゴリーを削除
        await connection.query(
            `DELETE FROM subcategories WHERE id = ?`,
            [subcategoryId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'サブカテゴリーを削除しました'
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            success: false,
            message: 'データベースエラー: ' + err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router; 