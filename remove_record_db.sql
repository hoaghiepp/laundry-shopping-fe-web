WITH target_orders AS (
    -- Lấy toàn bộ ID từ bảng orders để làm gốc
    SELECT id as oid FROM orders
),
delete_order_items AS (
    DELETE FROM order_items
    WHERE order_id IN (SELECT oid FROM target_orders)
),
delete_order_logs AS (
    DELETE FROM order_logs
    WHERE order_id IN (SELECT oid FROM target_orders)
),
delete_incidents AS (
    DELETE FROM incidents
    WHERE tracking_id IN (SELECT id FROM service_item_tracking WHERE order_id IN (SELECT oid FROM target_orders))
),
delete_logistic_trip_items AS (
    DELETE FROM logistic_trip_items
    WHERE service_item_tracking_id IN (SELECT id FROM service_item_tracking WHERE order_id IN (SELECT oid FROM target_orders))
),
delete_factory_batches AS (
    DELETE FROM factory_batches
    WHERE service_item_tracking_id IN (SELECT id FROM service_item_tracking WHERE order_id IN (SELECT oid FROM target_orders))
),
delete_wallet_transaction AS (
    DELETE FROM wallet_transactions
    -- Ép kiểu oid về text nếu ref_id là kiểu dữ liệu text/varchar
    WHERE ref_id::text IN (SELECT oid::text FROM target_orders)
),
delete_service_item_tracking AS (
    DELETE FROM service_item_tracking
    WHERE order_id IN (SELECT oid FROM target_orders)
),
delete_orders_final AS (
    -- Bước cuối cùng: Xóa bảng gốc orders
    DELETE FROM orders
)
SELECT 'All orders and related data deleted' AS status;