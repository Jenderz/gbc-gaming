<?php
/**
 * User Model
 */
require_once __DIR__ . '/../config/database.php';

class User {
    public static function findByEmail(string $email): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, name, email, role, seller_id, agency_name, is_agency, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function getAll(): array {
        $db = getDB();
        $stmt = $db->query("SELECT id, name, email, role, seller_id, agency_name, is_agency, created_at FROM users ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO users (name, email, password_hash, role, seller_id, agency_name, is_agency) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['email'],
            password_hash($data['password'], PASSWORD_BCRYPT),
            $data['role'] ?? 'Vendedor',
            $data['seller_id'] ?? null,
            $data['agency_name'] ?? null,
            $data['is_agency'] ?? 0,
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $db = getDB();
        $fields = [];
        $values = [];

        foreach (['name', 'email', 'role', 'seller_id', 'agency_name', 'is_agency'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = ?";
                $values[] = $data[$col];
            }
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $fields[] = "password_hash = ?";
            $values[] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) return false;
        $values[] = $id;
        $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    /**
     * Toggle agency mode on/off for a user.
     * Only valid for users with role='Vendedor' and a linked seller_id.
     */
    public static function toggleAgency(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ? AND role = 'Vendedor'");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) return null;

        $newFlag = $user['is_agency'] ? 0 : 1;
        $db->prepare("UPDATE users SET is_agency = ? WHERE id = ?")->execute([$newFlag, $id]);
        return self::findById($id);
    }

    /**
     * Purge ALL isolated agency data (sellers, sales, payments, weekly_tickets)
     * scoped to this user. This is irreversible. Admin only.
     */
    public static function purgeAgencyData(int $userId): bool {
        $db = getDB();
        $db->beginTransaction();
        try {
            // Delete in order to respect FK constraints
            $db->prepare("DELETE FROM weekly_tickets WHERE owner_user_id = ?")->execute([$userId]);
            $db->prepare("DELETE FROM payments WHERE owner_user_id = ?")->execute([$userId]);
            $db->prepare("DELETE FROM sales WHERE owner_user_id = ?")->execute([$userId]);
            // sellers cascade-deletes products & currency_configs
            $db->prepare("DELETE FROM sellers WHERE owner_user_id = ?")->execute([$userId]);
            $db->commit();
            return true;
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function delete(int $id): bool {
        $db = getDB();
        // Prevent deleting last admin
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if ($user && $user['role'] === 'Admin') {
            $count = $db->query("SELECT COUNT(*) FROM users WHERE role = 'Admin'")->fetchColumn();
            if ($count <= 1) return false;
        }
        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public static function findBySellerId(int $sellerId): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, name, email, role, seller_id, agency_name, is_agency FROM users WHERE seller_id = ?");
        $stmt->execute([$sellerId]);
        return $stmt->fetch() ?: null;
    }

    public static function deleteBySellerId(int $sellerId): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM users WHERE seller_id = ?");
        return $stmt->execute([$sellerId]);
    }
}
