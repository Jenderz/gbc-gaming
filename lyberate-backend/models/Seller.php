<?php
/**
 * Seller Model (with nested products & currency configs)
 */
require_once __DIR__ . '/../config/database.php';

class Seller {
    /**
     * Get all GLOBAL sellers (owner_user_id IS NULL).
     * Agency sub-sellers are excluded from this list.
     */
    public static function getAll(): array {
        $db = getDB();
        $sellers = $db->query("SELECT * FROM sellers WHERE owner_user_id IS NULL ORDER BY created_at DESC")->fetchAll();

        foreach ($sellers as &$seller) {
            $seller['products'] = self::getProductsForSeller((int)$seller['id']);
        }
        return $sellers;
    }

    /**
     * Get all sub-sellers belonging to a specific agency (owner_user_id = X).
     */
    public static function getAllByOwner(int $ownerUserId): array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM sellers WHERE owner_user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$ownerUserId]);
        $sellers = $stmt->fetchAll();

        foreach ($sellers as &$seller) {
            $seller['products'] = self::getProductsForSeller((int)$seller['id']);
        }
        return $sellers;
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM sellers WHERE id = ?");
        $stmt->execute([$id]);
        $seller = $stmt->fetch();
        if (!$seller) return null;
        $seller['products'] = self::getProductsForSeller((int)$seller['id']);
        return $seller;
    }

    public static function findByName(string $name, ?int $ownerUserId = null): ?array {
        $db = getDB();
        if ($ownerUserId !== null) {
            $stmt = $db->prepare("SELECT * FROM sellers WHERE LOWER(name) = LOWER(?) AND owner_user_id = ?");
            $stmt->execute([$name, $ownerUserId]);
        } else {
            $stmt = $db->prepare("SELECT * FROM sellers WHERE LOWER(name) = LOWER(?) AND owner_user_id IS NULL");
            $stmt->execute([$name]);
        }
        $seller = $stmt->fetch();
        if (!$seller) return null;
        $seller['products'] = self::getProductsForSeller((int)$seller['id']);
        return $seller;
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO sellers (name, id_number, phone, owner_user_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['id_number'] ?? null,
            $data['phone'] ?? null,
            $data['owner_user_id'] ?? null,
        ]);
        $sellerId = (int) $db->lastInsertId();

        // Insert products with currencies
        if (!empty($data['products'])) {
            self::syncProducts($sellerId, $data['products']);
        }

        return $sellerId;
    }

    public static function update(int $id, array $data): bool {
        $db = getDB();
        $fields = [];
        $values = [];

        foreach (['name', 'id_number', 'phone'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = ?";
                $values[] = $data[$col];
            }
        }

        if (!empty($fields)) {
            $values[] = $id;
            $stmt = $db->prepare("UPDATE sellers SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($values);
        }

        // Re-sync products if provided
        if (array_key_exists('products', $data)) {
            self::syncProducts($id, $data['products']);
        }

        return true;
    }

    public static function delete(int $id): bool {
        $db = getDB();
        // CASCADE will handle products & currency_configs
        $stmt = $db->prepare("DELETE FROM sellers WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // ─── Products & Currency Configs ──────────────────────────────────────────

    private static function getProductsForSeller(int $sellerId): array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM products WHERE seller_id = ?");
        $stmt->execute([$sellerId]);
        $products = $stmt->fetchAll();

        foreach ($products as &$product) {
            $stmtC = $db->prepare("SELECT * FROM currency_configs WHERE product_id = ?");
            $stmtC->execute([$product['id']]);
            $product['currencies'] = $stmtC->fetchAll();
        }
        return $products;
    }

    /**
     * Replace all products & currencies for a seller (sync strategy).
     */
    private static function syncProducts(int $sellerId, array $products): void {
        $db = getDB();
        // Delete existing (cascade deletes currency_configs)
        $db->prepare("DELETE FROM products WHERE seller_id = ?")->execute([$sellerId]);

        foreach ($products as $product) {
            $stmt = $db->prepare("INSERT INTO products (seller_id, name) VALUES (?, ?)");
            $stmt->execute([$sellerId, $product['name']]);
            $productId = (int) $db->lastInsertId();

            if (!empty($product['currencies'])) {
                foreach ($product['currencies'] as $currency) {
                    $stmtC = $db->prepare("INSERT INTO currency_configs (product_id, name, commission_pct, part_pct) VALUES (?, ?, ?, ?)");
                    $stmtC->execute([
                        $productId,
                        $currency['name'],
                        floatval($currency['commission_pct'] ?? $currency['commissionPct'] ?? 0),
                        floatval($currency['part_pct'] ?? $currency['partPct'] ?? 0),
                    ]);
                }
            }
        }
    }
}
