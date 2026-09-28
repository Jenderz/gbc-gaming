<?php
/**
 * Expense Model
 */
require_once __DIR__ . '/../config/database.php';

class Expense {
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['date_from'])) {
            $where[] = "expense_date >= ?";
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = "expense_date <= ?";
            $params[] = $filters['date_to'];
        }

        $sql = "SELECT * FROM expenses";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO expenses (expense_date, type, concept, method, bank, amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['expense_date'],
            $data['type'],
            $data['concept'],
            $data['method'],
            $data['bank'],
            abs(floatval($data['amount'])),
            $data['currency'],
        ]);
        return (int) $db->lastInsertId();
    }

    public static function delete(int $id): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM expenses WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }
}
