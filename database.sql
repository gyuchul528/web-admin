-- 会社テーブル
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 相互リンクテーブル
CREATE TABLE mutual_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- メッセージテーブル
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- コメントテーブル
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id INT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    comment TEXT NOT NULL,
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- フリーモジュールテーブル
CREATE TABLE free_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    position VARCHAR(50),
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 特集テーブル
CREATE TABLE features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_path VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- お知らせテーブル
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    important TINYINT DEFAULT 0,
    publish_date DATE,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- モデルテーブル
CREATE TABLE models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'モデル名',
    table_name VARCHAR(50) NOT NULL COMMENT 'テーブル名',
    description TEXT COMMENT '説明',
    sort_order INT DEFAULT 0 COMMENT '表示順',
    status TINYINT DEFAULT 1 COMMENT '状態（1:有効, 0:無効）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ユーザーグループテーブル
CREATE TABLE user_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- カテゴリー権限テーブル
CREATE TABLE category_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    group_id INT NOT NULL,
    can_view TINYINT DEFAULT 0,
    can_create TINYINT DEFAULT 0,
    can_edit TINYINT DEFAULT 0,
    can_delete TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE
);

-- モデルフィールドテーブル
CREATE TABLE model_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL COMMENT 'モデルID',
    name VARCHAR(255) NOT NULL COMMENT 'フィールド名',
    identifier VARCHAR(50) NOT NULL COMMENT '識別子',
    type VARCHAR(50) NOT NULL COMMENT 'フィールドタイプ',
    description TEXT COMMENT '説明',
    required TINYINT DEFAULT 0 COMMENT '必須（1:必須, 0:任意）',
    sort_order INT DEFAULT 0 COMMENT '表示順',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- 基本的なモデルデータの挿入
INSERT INTO models (name, table_name, description, sort_order, status) VALUES
('ページモデル', 'pages', 'ウェブページ用のモデル', 1, 1),
('記事モデル', 'articles', 'ブログ記事用のモデル', 2, 1),
('製品モデル', 'products', '製品情報用のモデル', 3, 1),
('写真モデル', 'pictures', '写真ギャラリー用のモデル', 4, 1),
('外部リンク', 'links', '外部リンク用のモデル', 5, 1);

-- 基本的なフィールドデータの挿入（例：ページモデル用）
INSERT INTO model_fields (model_id, name, identifier, type, description, required, sort_order) VALUES
(1, 'タイトル', 'title', 'text', 'ページのタイトル', 1, 1),
(1, '本文', 'content', 'textarea', 'ページの本文内容', 1, 2),
(1, 'メタ説明', 'meta_description', 'textarea', 'SEO用のメタ説明', 0, 3),
(1, 'キーワード', 'keywords', 'text', 'SEO用のキーワード', 0, 4),

(2, 'タイトル', 'title', 'text', '記事のタイトル', 1, 1),
(2, '本文', 'content', 'textarea', '記事の本文', 1, 2),
(2, 'カテゴリー', 'category', 'select', '記事のカテゴリー', 1, 3),
(2, 'タグ', 'tags', 'text', '記事のタグ（カンマ区切り）', 0, 4),

(3, '製品名', 'name', 'text', '製品の名称', 1, 1),
(3, '価格', 'price', 'number', '製品の価格', 1, 2),
(3, '説明', 'description', 'textarea', '製品の詳細説明', 1, 3),
(3, '画像', 'image', 'file', '製品の画像', 1, 4),

(4, 'タイトル', 'title', 'text', '写真のタイトル', 1, 1),
(4, '写真', 'photo', 'file', '写真ファイル', 1, 2),
(4, '説明', 'description', 'textarea', '写真の説明', 0, 3),
(4, 'アルバム', 'album', 'select', '所属アルバム', 0, 4),

(5, 'リンク名', 'name', 'text', 'リンクの表示名', 1, 1),
(5, 'URL', 'url', 'text', 'リンク先URL', 1, 2),
(5, '説明', 'description', 'textarea', 'リンクの説明', 0, 3),
(5, '表示順', 'sort_order', 'number', '表示順序', 0, 4); 