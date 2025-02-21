const express = require('express');
const router = express.Router();
const db = require('../db');  // 使用已经配置好的数据库连接

// 添加调试日志
console.log('Admin router loaded');

// 测试路由
router.get('/test', (req, res) => {
    res.send('Test route is working!');
});

// 显示添加栏目页面
router.get('/category/add', async (req, res) => {
    try {
        // 获取所有模型
        const models = await db.query('SELECT * FROM models WHERE status = 1');
        
        // 获取所有栏目（用于选择父栏目）
        const categories = await db.query('SELECT * FROM categories ORDER BY sort_order ASC');
        
        res.render('admin/category/add', { 
            models,
            categories,
            isChild: false,
            parentCategory: null
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});

// 处理添加栏目的请求
router.post('/category/add', async (req, res) => {
    try {
        const { name, model_id, parent_id = 0, sort_order = 0, status = 1 } = req.body;
        
        const result = await db.query(
            'INSERT INTO categories (name, model_id, parent_id, sort_order, status) VALUES (?, ?, ?, ?, ?)',
            [name, model_id, parent_id, sort_order, status]
        );
        
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Database error:', error);
        res.json({ success: false, message: error.message });
    }
});

// 显示栏目列表
router.get('/category/list', async (req, res) => {
    try {
        // 获取所有分类，并连接模型表以获取模型名称
        const categories = await db.query(`
            SELECT c.*, m.name as model_name 
            FROM categories c 
            LEFT JOIN models m ON c.model_id = m.id 
            ORDER BY c.sort_order ASC, c.id ASC
        `);
        
        res.render('admin/category/list', { categories });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('データベースエラー');
    }
});

// 内容列表路由
router.get('/content/:categoryId/list', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // 获取当前栏目信息
        const categories = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
        
        if (categories.length === 0) {
            return res.status(404).send('栏目不存在');
        }
        
        const category = categories[0];
        
        // 获取该栏目下的内容列表
        const contents = await db.query('SELECT * FROM contents WHERE category_id = ? ORDER BY sort_order ASC', [categoryId]);
        
        res.render('admin/content/list', {
            category: category,
            contents: contents || []
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('数据库错误');
    }
});

// 显示添加子栏目表单
router.get('/category/addChild/:id', async (req, res) => {
    try {
        const parentId = req.params.id;
        // 获取父栏目信息
        const [parentCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [parentId]);
        
        if (!parentCategory) {
            return res.status(404).send('親カテゴリーが見つかりません');
        }

        // 获取所有可用的模型
        const models = await db.query('SELECT * FROM models WHERE status = 1');
        
        res.render('admin/category/add', {
            parentCategory,
            models,
            isChild: true
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// 处理添加子栏目的提交
router.post('/category/addChild/:id', async (req, res) => {
    try {
        const parentId = req.params.id;
        const { name, model_id, sort_order = 0 } = req.body;

        // 验证父栏目是否存在
        const [parentCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [parentId]);
        if (!parentCategory) {
            return res.json({ success: false, message: '親カテゴリーが見つかりません' });
        }

        // 插入新的子栏目
        const result = await db.query(
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
        const [children] = await db.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [categoryId]);
        if (children.count > 0) {
            return res.json({ 
                success: false, 
                message: 'サブカテゴリーが存在するため、削除できません'
            });
        }

        // 删除栏目
        await db.query('DELETE FROM categories WHERE id = ?', [categoryId]);
        
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
        await db.query('START TRANSACTION');
        
        for (const [id, order] of Object.entries(orders)) {
            await db.query(
                'UPDATE categories SET sort_order = ? WHERE id = ?',
                [order, id]
            );
        }
        
        await db.query('COMMIT');
        
        res.json({ success: true, message: '順序を更新しました' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error:', error);
        res.json({ 
            success: false, 
            message: '更新に失敗しました：' + error.message 
        });
    }
});

module.exports = router; 