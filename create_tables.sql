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

