-- ============================================
-- ДОБАВИТЬ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================
-- 
-- Эта миграция добавляет индексы для ускорения запросов
--
-- ============================================

-- Индекс для фильтрации активных товаров
CREATE INDEX IF NOT EXISTS idx_products_active_stock ON products(is_active, stock) WHERE is_active = true AND stock > 0;

-- Индекс для поиска товаров по категории
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE category_id IS NOT NULL;

-- Индекс для сортировки товаров по дате создания
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Индекс для заказов по статусу и дате
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- Индекс для order_items по order_id (уже есть, но проверяем)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Индекс для order_items по product_id
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Индекс для cart_items по user_id и product_id (составной индекс для быстрого поиска)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id);

-- Индекс для stores по owner_id (уже есть, но проверяем)
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- Индекс для user_profiles по role (для быстрой фильтрации админов)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Индекс для banners по is_active
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active) WHERE is_active = true;

-- Индекс для product_categories по is_active
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active) WHERE is_active = true;

