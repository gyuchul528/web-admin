const express = require('express');
const router = express.Router();
const db = require('../../db');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件！'));
        }
    }
});

// 内容列表页面
router.get('/:category', async (req, res) => {
    console.log('访问内容列表页面:', req.params.category);
    try {
        const category = await db.query(
            'SELECT * FROM categories WHERE slug = ?', 
            [req.params.category]
        );
        console.log('分类信息:', category);

        if (category.length === 0) {
            return res.status(404).render('error', { 
                message: 'カテゴリーが見つかりません',
                error: {}
            });
        }

        const contents = await db.query(
            'SELECT * FROM contents WHERE category_id = ? ORDER BY created_at DESC',
            [category[0].id]
        );
        console.log('内容列表:', contents);

        res.render('admin/content/list', {
            category: category[0],
            contents: contents,
            title: category[0].name
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            message: 'サーバーエラーが発生しました',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// 新規作成ページ
router.get('/:category/create', async (req, res) => {
    try {
        const category = await db.query(
            'SELECT * FROM categories WHERE slug = ?',
            [req.params.category]
        );

        if (category.length === 0) {
            return res.status(404).render('error', { 
                message: 'カテゴリーが見つかりません',
                error: {}
            });
        }

        res.render('admin/content/create', {
            category: category[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            message: 'サーバーエラーが発生しました',
            error: {}
        });
    }
});

// 新規作成処理
router.post('/:category', upload.single('thumbnail'), async (req, res) => {
    try {
        const category = await db.query(
            'SELECT * FROM categories WHERE slug = ?',
            [req.params.category]
        );

        if (category.length === 0) {
            return res.status(404).render('error', { 
                message: 'カテゴリーが見つかりません',
                error: {}
            });
        }

        const thumbnail = req.file ? '/uploads/' + req.file.filename : null;

        await db.query(
            'INSERT INTO contents (category_id, title, content, thumbnail, status) VALUES (?, ?, ?, ?, ?)',
            [
                category[0].id,
                req.body.title,
                req.body.content,
                thumbnail,
                req.body.status || 1
            ]
        );

        res.redirect(`/admin/content/${req.params.category}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            message: 'サーバーエラーが発生しました',
            error: {}
        });
    }
});

// 编辑页面
router.get('/:category/:id/edit', async (req, res) => {
    try {
        const category = await db.query(
            'SELECT * FROM categories WHERE slug = ?',
            [req.params.category]
        );

        if (category.length === 0) {
            return res.status(404).render('error', { 
                message: 'カテゴリーが見つかりません',
                error: {}
            });
        }

        const content = await db.query(
            'SELECT * FROM contents WHERE id = ? AND category_id = ?',
            [req.params.id, category[0].id]
        );

        if (content.length === 0) {
            return res.status(404).render('error', { 
                message: 'コンテンツが見つかりません',
                error: {}
            });
        }

        res.render('admin/content/edit', {
            category: category[0],
            content: content[0]
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            message: 'サーバーエラーが発生しました',
            error: {}
        });
    }
});

// 更新处理
router.post('/:category/:id', upload.single('thumbnail'), async (req, res) => {
    try {
        const category = await db.query(
            'SELECT * FROM categories WHERE slug = ?',
            [req.params.category]
        );

        if (category.length === 0) {
            return res.status(404).render('error', { 
                message: 'カテゴリーが見つかりません',
                error: {}
            });
        }

        const content = await db.query(
            'SELECT * FROM contents WHERE id = ? AND category_id = ?',
            [req.params.id, category[0].id]
        );

        if (content.length === 0) {
            return res.status(404).render('error', { 
                message: 'コンテンツが見つかりません',
                error: {}
            });
        }

        const thumbnail = req.file ? '/uploads/' + req.file.filename : content[0].thumbnail;

        await db.query(
            'UPDATE contents SET title = ?, content = ?, thumbnail = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [
                req.body.title,
                req.body.content,
                thumbnail,
                req.body.status,
                req.params.id
            ]
        );

        res.redirect(`/admin/content/${req.params.category}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            message: 'サーバーエラーが発生しました',
            error: {}
        });
    }
});

// 删除处理
router.post('/:category/:id/delete', async (req, res) => {
    try {
        const category = await db.query(
            'SELECT * FROM categories WHERE slug = ?',
            [req.params.category]
        );

        if (category.length === 0) {
            return res.status(404).render('error', { 
                message: 'カテゴリーが見つかりません' 
            });
        }

        await db.query(
            'DELETE FROM contents WHERE id = ? AND category_id = ?',
            [req.params.id, category[0].id]
        );

        res.redirect(`/admin/content/${req.params.category}`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', { 
            message: 'サーバーエラーが発生しました' 
        });
    }
});

// カテゴリー別コンテンツ一覧表示
router.get('/:categoryId/list', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        console.log('Accessing category:', categoryId);
        
        // カテゴリー情報を取得
        const [category] = await db.query(`
            SELECT c.*, m.name as model_name, m.table_name 
            FROM categories c
            LEFT JOIN models m ON c.model_id = m.id
            WHERE c.id = ?
        `, [categoryId]);
        
        // より詳細なデバッグ情報
        console.log('Raw category data:', category);
        console.log('Category model_id:', category ? category.model_id : 'null');
        console.log('Category model_name:', category ? category.model_name : 'null');

        if (!category) {
            throw new Error('カテゴリーが見つかりません（ID: ' + categoryId + '）');
        }

        // モデル情報の確認
        const [modelInfo] = await db.query('SELECT * FROM models WHERE id = ?', [category.model_id]);
        console.log('Model info:', modelInfo);

        let contents = [];
        try {
            switch (parseInt(category.model_id)) {
                case 1: // ページモデル
                    contents = await db.query('SELECT * FROM pages WHERE category_id = ? ORDER BY sort_order ASC', [categoryId]);
                    break;
                case 2: // 記事モデル
                    contents = await db.query('SELECT * FROM articles WHERE category_id = ? ORDER BY created_at DESC', [categoryId]);
                    break;
                case 3: // 製品モデル
                    contents = await db.query('SELECT * FROM products WHERE category_id = ? ORDER BY sort_order ASC', [categoryId]);
                    break;
                case 4: // 写真モデル
                    contents = await db.query('SELECT * FROM pictures WHERE category_id = ? ORDER BY created_at DESC', [categoryId]);
                    break;
                case 5: // 外部リンク
                    contents = await db.query('SELECT * FROM links WHERE category_id = ? ORDER BY sort_order ASC', [categoryId]);
                    break;
                default:
                    throw new Error('未対応のモデルタイプです（model_id: ' + category.model_id + '）');
            }
            console.log('Contents count:', contents.length);
        } catch (queryError) {
            console.error('Query error:', queryError);
            throw queryError;
        }

        res.render('admin/content/list', {
            category,
            contents,
            modelType: category.model_id
        });
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).render('error', {
            message: 'エラーが発生しました: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// ページ追加画面の表示
router.get('/:categoryId/add', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // カテゴリー情報を取得
        const [category] = await db.query(`
            SELECT c.*, m.name as model_name 
            FROM categories c
            LEFT JOIN models m ON c.model_id = m.id
            WHERE c.id = ?
        `, [categoryId]);

        if (!category) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // モデルタイプに応じて適切なビューを表示
        switch (parseInt(category.model_id)) {
            case 1: // ページモデル
                res.render('admin/content/add_page', { category });
                break;
            // 他のモデルタイプの処理は後で追加
            default:
                res.status(400).send('未対応のモデルタイプです');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// ページの保存処理
router.post('/:categoryId/add_page', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { title, content, sort_order, status } = req.body;

        const result = await db.query(
            'INSERT INTO pages (category_id, title, content, sort_order, status) VALUES (?, ?, ?, ?, ?)',
            [categoryId, title, content, sort_order, status]
        );

        res.json({ 
            success: true, 
            message: 'ページを保存しました',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({ 
            success: false, 
            message: '保存に失敗しました：' + error.message 
        });
    }
});

// ページ編集画面の表示
router.get('/:categoryId/edit_page/:pageId', async (req, res) => {
    try {
        const { categoryId, pageId } = req.params;
        
        // カテゴリー情報を取得
        const [category] = await db.query(`
            SELECT c.*, m.name as model_name 
            FROM categories c
            LEFT JOIN models m ON c.model_id = m.id
            WHERE c.id = ?
        `, [categoryId]);

        if (!category) {
            return res.status(404).send('カテゴリーが見つかりません');
        }

        // ページ情報を取得
        const [page] = await db.query('SELECT * FROM pages WHERE id = ? AND category_id = ?', [pageId, categoryId]);
        
        if (!page) {
            return res.status(404).send('ページが見つかりません');
        }

        res.render('admin/content/edit_page', { category, page });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// ページの更新処理
router.post('/:categoryId/edit_page/:pageId', async (req, res) => {
    try {
        const { categoryId, pageId } = req.params;
        const { title, content, sort_order, status } = req.body;

        // ページの存在確認
        const [existingPage] = await db.query(
            'SELECT * FROM pages WHERE id = ? AND category_id = ?',
            [pageId, categoryId]
        );

        if (!existingPage) {
            return res.json({ 
                success: false, 
                message: 'ページが見つかりません'
            });
        }

        // ページを更新
        await db.query(
            'UPDATE pages SET title = ?, content = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, content, sort_order, status, pageId]
        );

        res.json({ 
            success: true, 
            message: 'ページを更新しました'
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({ 
            success: false, 
            message: '更新に失敗しました：' + error.message 
        });
    }
});

// ページの削除処理
router.post('/:categoryId/delete_page/:pageId', async (req, res) => {
    try {
        const { categoryId, pageId } = req.params;

        // ページの存在確認
        const [existingPage] = await db.query(
            'SELECT * FROM pages WHERE id = ? AND category_id = ?',
            [pageId, categoryId]
        );

        if (!existingPage) {
            return res.json({ 
                success: false, 
                message: 'ページが見つかりません'
            });
        }

        // ページを削除
        await db.query('DELETE FROM pages WHERE id = ?', [pageId]);

        res.json({ 
            success: true, 
            message: 'ページを削除しました'
        });
    } catch (error) {
        console.error('Error:', error);
        res.json({ 
            success: false, 
            message: '削除に失敗しました：' + error.message 
        });
    }
});

module.exports = router; 