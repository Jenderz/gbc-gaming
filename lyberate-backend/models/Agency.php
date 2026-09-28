<?php
/**
 * Agency Model
 */
require_once __DIR__ . '/../config/database.php';

class Agency {
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['seller_id'])) {
            $where[] = "a.seller_id = ?";
            $params[] = $filters['seller_id'];
        }

        $sql = "SELECT a.*, s.name as seller_name FROM agencies a LEFT JOIN sellers s ON a.seller_id = s.id";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY a.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT a.*, s.name as seller_name FROM agencies a LEFT JOIN sellers s ON a.seller_id = s.id WHERE a.id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO agencies (name, address, phone, email, seller_id) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['address'] ?? null,
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['seller_id'],
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $db = getDB();
        $fields = [];
        $values = [];

        foreach (['name', 'address', 'phone', 'email', 'seller_id'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = ?";
                $values[] = $data[$col];
            }
        }

        if (empty($fields)) return false;
        $values[] = $id;
        $stmt = $db->prepare("UPDATE agencies SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    public static function delete(int $id): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM agencies WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
