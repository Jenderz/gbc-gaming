<?php
/**
 * Seller Alias Model
 */
require_once __DIR__ . '/../config/database.php';

class SellerAlias {
    /**
     * Get all aliases mapped as alias_name => seller_id
     */
    public static function getAllMap(): array {
        $db = getDB();
        $aliases = $db->query("SELECT alias_name, seller_id FROM seller_aliases")->fetchAll(PDO::FETCH_ASSOC);
        
        $map = [];
        foreach ($aliases as $row) {
            $map[strtoupper(trim($row['alias_name']))] = (int)$row['seller_id'];
        }
        return $map;
    }

    /**
     * Create a new alias for a seller
     */
    public static function create(int $sellerId, string $aliasName): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO seller_aliases (seller_id, alias_name) VALUES (?, ?)");
        $stmt->execute([$sellerId, strtoupper(trim($aliasName))]);
        return (int) $db->lastInsertId();
    }

    /**
     * Upsert an alias for a seller (update seller_id if alias exists)
     */
    public static function upsert(int $sellerId, string $aliasName): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO seller_aliases (seller_id, alias_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE seller_id = VALUES(seller_id)");
        $stmt->execute([$sellerId, strtoupper(trim($aliasName))]);
        return (int) $db->lastInsertId();
    }
    
    /**
     * Check if an alias exists
     */
    public static function findByAlias(string $aliasName): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM seller_aliases WHERE alias_name = ?");
        $stmt->execute([strtoupper(trim($aliasName))]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Delete an alias by name
     */
    public static function deleteByAlias(string $aliasName): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM seller_aliases WHERE UPPER(alias_name) = ?");
        return $stmt->execute([strtoupper(trim($aliasName))]);
    }
}
