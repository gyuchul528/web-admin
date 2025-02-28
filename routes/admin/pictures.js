const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../../db');

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../public/uploads/pictures');
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB制限
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('画像ファイル（JPEG, PNG, GIF）のみアップロード可能です。'));
    }
});

// アルバム一覧ページ
router.get('/', async (req, res) => {
    try {
        const [albums] = await db.query(`
            SELECT a.*, COUNT(p.id) as photo_count 
            FROM picture_albums a 
            LEFT JOIN pictures p ON a.id = p.album_id 
            GROUP BY a.id 
            ORDER BY a.created_at DESC
        `);
        
        res.render('admin/pictures/index', { 
            albums,
            activePage: 'pictures'
        });
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).send('アルバム一覧の取得中にエラーが発生しました');
    }
});

// 新規アルバム作成ページ
router.get('/create', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM picture_categories ORDER BY name');
        res.render('admin/pictures/create', { 
            categories,
            activePage: 'pictures'
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('カテゴリー一覧の取得中にエラーが発生しました');
    }
});

// アルバム保存処理
router.post('/', upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'photos', maxCount: 10 }
]), async (req, res) => {
    try {
        const { name, description, category_id, status } = req.body;
        
        // サムネイル画像のパス
        let thumbnailPath = null;
        if (req.files.thumbnail && req.files.thumbnail.length > 0) {
            thumbnailPath = '/uploads/pictures/' + req.files.thumbnail[0].filename;
        }
        
        // アルバムをデータベースに保存
        const [result] = await db.query(
            'INSERT INTO picture_albums (name, description, category_id, thumbnail, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [name, description, category_id || null, thumbnailPath, status || 'published']
        );
        
        const albumId = result.insertId;
        
        // 写真があれば保存
        if (req.files.photos && req.files.photos.length > 0) {
            // 最初の写真をサムネイルとして使用（サムネイルが指定されていない場合）
            if (!thumbnailPath && req.files.photos.length > 0) {
                thumbnailPath = '/uploads/pictures/' + req.files.photos[0].filename;
                await db.query('UPDATE picture_albums SET thumbnail = ? WHERE id = ?', [thumbnailPath, albumId]);
            }
            
            // 写真をデータベースに保存
            for (const photo of req.files.photos) {
                const photoPath = '/uploads/pictures/' + photo.filename;
                await db.query(
                    'INSERT INTO pictures (album_id, file_path, title, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                    [albumId, photoPath, photo.originalname]
                );
            }
        }
        
        res.redirect('/admin/pictures');
    } catch (error) {
        console.error('Error creating album:', error);
        res.status(500).send('アルバムの作成中にエラーが発生しました');
    }
});

// アルバム削除処理
router.delete('/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        console.log(`アルバム削除処理開始: ID=${albumId}`);
        
        // トランザクション開始
        await db.query('START TRANSACTION');
        
        try {
            // 外部キー制約を確認
            const [foreignKeyChecks] = await db.query('SELECT @@FOREIGN_KEY_CHECKS');
            console.log('Foreign key checks:', foreignKeyChecks);
            
            // 一時的に外部キー制約チェックを無効化
            await db.query('SET FOREIGN_KEY_CHECKS = 0');
            console.log('外部キー制約チェックを無効化しました');
            
            // 循環参照を解決するために、albumsテーブルのthumbnail_photo_id外部キー制約を一時的に無効化
            await db.query('ALTER TABLE albums DROP FOREIGN KEY albums_ibfk_2');
            console.log('albumsテーブルのthumbnail_photo_id外部キー制約を無効化しました');
            
            // 全てのalbumテーブルのthumbnail_photo_idをNULLに設定
            await db.query('UPDATE albums SET thumbnail_photo_id = NULL');
            console.log('全てのalbumテーブルの参照を解除しました');
            
            // 関連するphotosのIDを取得
            const [relatedPhotos] = await db.query('SELECT id FROM photos WHERE album_id = ?', [albumId]);
            console.log(`関連する写真数: ${relatedPhotos.length}`);
            
            if (relatedPhotos.length > 0) {
                // 写真IDのリストを作成
                const photoIds = relatedPhotos.map(photo => photo.id);
                
                // photo_tag_relationsテーブルから関連レコードを削除
                await db.query('DELETE FROM photo_tag_relations WHERE photo_id IN (?)', [photoIds]);
                console.log('photo_tag_relationsテーブルの関連レコードを削除しました');
            }
            
            // 循環参照を解決するために、photosテーブルのalbum_id外部キー制約を一時的に無効化
            await db.query('ALTER TABLE photos DROP FOREIGN KEY photos_ibfk_1');
            console.log('photosテーブルの外部キー制約を無効化しました');
            
            // 関連するphotosテーブルのレコードを削除
            await db.query('DELETE FROM photos WHERE album_id = ?', [albumId]);
            console.log('photosテーブルのレコードを削除しました');
            
            // 外部キー制約を再設定
            await db.query('ALTER TABLE photos ADD CONSTRAINT photos_ibfk_1 FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE');
            console.log('photosテーブルの外部キー制約を再設定しました');
            
            // albumsテーブルの外部キー制約を再設定
            await db.query('ALTER TABLE albums ADD CONSTRAINT albums_ibfk_2 FOREIGN KEY (thumbnail_photo_id) REFERENCES photos (id) ON DELETE SET NULL');
            console.log('albumsテーブルの外部キー制約を再設定しました');
            
            // アルバムに関連する写真を取得
            const [pictures] = await db.query('SELECT id, file_path FROM pictures WHERE album_id = ?', [albumId]);
            console.log(`picturesテーブルの関連レコード数: ${pictures.length}`);
            
            // 写真ファイルを削除
            for (const picture of pictures) {
                const filePath = path.join(__dirname, '../../public', picture.file_path);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`ファイル削除: ${filePath}`);
                    } catch (err) {
                        console.error('Error deleting file:', err);
                        // ファイル削除エラーは無視して続行
                    }
                }
            }
            
            // データベースから写真を削除
            await db.query('DELETE FROM pictures WHERE album_id = ?', [albumId]);
            console.log('picturesテーブルのレコードを削除しました');
            
            // アルバムのサムネイル画像を削除
            const [album] = await db.query('SELECT thumbnail FROM picture_albums WHERE id = ?', [albumId]);
            if (album.length > 0 && album[0].thumbnail) {
                const thumbnailPath = path.join(__dirname, '../../public', album[0].thumbnail);
                if (fs.existsSync(thumbnailPath)) {
                    try {
                        fs.unlinkSync(thumbnailPath);
                        console.log(`サムネイル削除: ${thumbnailPath}`);
                    } catch (err) {
                        console.error('Error deleting thumbnail:', err);
                        // サムネイル削除エラーは無視して続行
                    }
                }
            }
            
            // アルバムを削除
            await db.query('DELETE FROM picture_albums WHERE id = ?', [albumId]);
            console.log('picture_albumsテーブルのレコードを削除しました');
            
            // 外部キー制約チェックを元に戻す
            await db.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('外部キー制約チェックを有効化しました');
            
            // トランザクションをコミット
            await db.query('COMMIT');
            console.log('トランザクションをコミットしました');
            
            res.json({ success: true });
        } catch (error) {
            // エラー発生時はロールバック
            console.error('エラーが発生したためロールバックします:', error);
            await db.query('ROLLBACK');
            // 外部キー制約チェックを元に戻す
            await db.query('SET FOREIGN_KEY_CHECKS = 1');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ success: false, message: '削除に失敗しました: ' + error.message });
    }
});

// カテゴリー一覧ページ
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT c.*, COUNT(a.id) as album_count 
            FROM picture_categories c 
            LEFT JOIN picture_albums a ON c.id = a.category_id 
            GROUP BY c.id 
            ORDER BY c.name
        `);
        
        res.render('admin/pictures/categories', { 
            categories,
            activePage: 'pictures'
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('カテゴリー一覧の取得中にエラーが発生しました');
    }
});

// カテゴリー保存処理
router.post('/categories', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        await db.query(
            'INSERT INTO picture_categories (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
            [name, description]
        );
        
        res.redirect('/admin/pictures/categories');
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).send('カテゴリーの作成中にエラーが発生しました');
    }
});

// カテゴリー更新処理
router.post('/categories', async (req, res) => {
    if (req.body._method === 'PUT') {
        try {
            const { id, name, description } = req.body;
            
            await db.query(
                'UPDATE picture_categories SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
                [name, description, id]
            );
            
            res.redirect('/admin/pictures/categories');
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).send('カテゴリーの更新中にエラーが発生しました');
        }
    } else {
        // 通常のPOSTリクエスト（新規作成）
        try {
            const { name, description } = req.body;
            
            await db.query(
                'INSERT INTO picture_categories (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
                [name, description]
            );
            
            res.redirect('/admin/pictures/categories');
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).send('カテゴリーの作成中にエラーが発生しました');
        }
    }
});

// カテゴリー削除処理
router.delete('/categories/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        // カテゴリーに関連するアルバムがあるか確認
        const [albums] = await db.query('SELECT COUNT(*) as count FROM picture_albums WHERE category_id = ?', [categoryId]);
        if (albums[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'このカテゴリーに関連するアルバムがあるため削除できません。先にアルバムを削除するか、別のカテゴリーに移動してください。' 
            });
        }
        
        // カテゴリーを削除
        await db.query('DELETE FROM picture_categories WHERE id = ?', [categoryId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router; 