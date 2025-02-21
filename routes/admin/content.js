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

module.exports = router; 