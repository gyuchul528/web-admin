-- モデルテーブルの作成
CREATE TABLE `models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'モデル名',
  `table_name` varchar(50) NOT NULL COMMENT 'テーブル名',
  `description` varchar(255) DEFAULT NULL COMMENT '説明',
  `status` tinyint(1) DEFAULT '1' COMMENT 'ステータス：1有効、0無効',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='コンテンツモデルテーブル';

-- カテゴリーテーブルの作成
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'カテゴリー名',
  `model_id` int NOT NULL COMMENT '所属モデルID',
  `parent_id` int DEFAULT '0' COMMENT '親カテゴリーID',
  `sort_order` int DEFAULT '0' COMMENT '表示順序',
  `status` tinyint(1) DEFAULT '1' COMMENT 'ステータス：1表示、0非表示',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_model_id` (`model_id`),
  CONSTRAINT `fk_categories_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='カテゴリーテーブル';

-- デフォルトモデルデータの挿入
INSERT INTO `models` (`name`, `table_name`, `description`) VALUES
('ページモデル', 'pages', '会社概要などの単一ページ用'),
('記事モデル', 'articles', 'ニュースや記事用'),
('製品モデル', 'products', '製品展示用'),
('画像モデル', 'pictures', '画像ギャラリー用'),
('外部リンク', 'links', '外部リンク用');

-- 写真カテゴリーテーブル
CREATE TABLE IF NOT EXISTS `picture_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 写真アルバムテーブル
CREATE TABLE IF NOT EXISTS `picture_albums` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `category_id` int(11) DEFAULT NULL,
  `thumbnail` varchar(255) DEFAULT NULL,
  `thumbnail_photo_id` int(11) DEFAULT NULL,
  `status` enum('published','draft') NOT NULL DEFAULT 'published',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `thumbnail_photo_id` (`thumbnail_photo_id`),
  CONSTRAINT `picture_albums_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `picture_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `picture_albums_ibfk_2` FOREIGN KEY (`thumbnail_photo_id`) REFERENCES `pictures` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 写真テーブル
CREATE TABLE IF NOT EXISTS `pictures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `sort_order` int(11) DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `album_id` (`album_id`),
  CONSTRAINT `pictures_ibfk_1` FOREIGN KEY (`album_id`) REFERENCES `picture_albums` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 既存のalbumテーブルの外部キー制約を修正
ALTER TABLE `albums` DROP FOREIGN KEY `albums_ibfk_2`;
ALTER TABLE `albums` ADD CONSTRAINT `albums_ibfk_2` FOREIGN KEY (`thumbnail_photo_id`) REFERENCES `photos` (`id`) ON DELETE SET NULL;

