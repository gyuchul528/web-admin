const express = require('express');
const router = express.Router();
const db = require('../../db');  // 修正数据库引用路径

// 获取菜单列表页面
router.get('/', async (req, res) => {
    try {
        const menus = await db.query(
            'SELECT * FROM menus ORDER BY parent_id, sort_order'
        );
        res.render('admin/menus/index', { menus });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取菜单数据的API端点
router.get('/list', async (req, res) => {
    try {
        const menus = await db.query(
            'SELECT * FROM menus ORDER BY parent_id, sort_order'
        );
        res.json(menus);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取单个菜单
router.get('/:id', async (req, res) => {
    try {
        const [menu] = await db.query(
            'SELECT * FROM menus WHERE id = ?',
            [req.params.id]
        );
        res.json(menu);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 添加新菜单
router.post('/add', async (req, res) => {
    try {
        const { parent_id, name, url, icon, sort_order } = req.body;
        await db.query(
            'INSERT INTO menus (parent_id, name, url, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
            [parent_id, name, url, icon, sort_order]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 更新菜单
router.put('/update/:id', async (req, res) => {
    try {
        const { name, url, icon, sort_order } = req.body;
        await db.query(
            'UPDATE menus SET name = ?, url = ?, icon = ?, sort_order = ? WHERE id = ?',
            [name, url, icon, sort_order, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除菜单
router.delete('/delete/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM menus WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 