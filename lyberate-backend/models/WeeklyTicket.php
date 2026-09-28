<?php
/**
 * WeeklyTicket Model
 */
require_once __DIR__ . '/../config/database.php';

class WeeklyTicket {
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['week_id'])) {
            $where[] = "wt.week_id = ?";
            $params[] = $filters['week_id'];
        }
        if (!empty($filters['seller_id'])) {
            $where[] = "wt.seller_id = ?";
            $params[] = $filters['seller_id'];
        }
        // Agency scoping
        if (isset($filters['owner_user_id'])) {
            if ($filters['owner_user_id'] === 'global') {
                $where[] = "wt.owner_user_id IS NULL";
            } else {
                $where[] = "wt.owner_user_id = ?";
                $params[] = $filters['owner_user_id'];
            }
        }

        $sql = "SELECT wt.*, s.name as seller_name FROM weekly_tickets wt LEFT JOIN sellers s ON wt.seller_id = s.id";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY wt.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT wt.*, s.name as seller_name FROM weekly_tickets wt LEFT JOIN sellers s ON wt.seller_id = s.id WHERE wt.id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Upsert: create or update based on seller_id + week_id + currency + owner_user_id
     */
    public static function upsert(array $data): array {
        $db = getDB();
        $ownerUserId = $data['owner_user_id'] ?? null;

        if ($ownerUserId !== null) {
            $stmt = $db->prepare("SELECT * FROM weekly_tickets WHERE seller_id = ? AND week_id = ? AND currency = ? AND owner_user_id = ?");
            $stmt->execute([$data['seller_id'], $data['week_id'], $data['currency'], $ownerUserId]);
        } else {
            $stmt = $db->prepare("SELECT * FROM weekly_tickets WHERE seller_id = ? AND week_id = ? AND currency = ? AND owner_user_id IS NULL");
            $stmt->execute([$data['seller_id'], $data['week_id'], $data['currency']]);
        }
        $existing = $stmt->fetch();

        if ($existing) {
            // Update
            $stmt = $db->prepare("UPDATE weekly_tickets SET 
                week_label = ?, total_sales = ?, total_prize = ?, total_commission = ?, total_net = ?, 
                total_participation = ?, total_vendor = ?, total_bank = ?, total_paid = ?, balance = ?, 
                status = ?, updated_at = NOW()
                WHERE id = ?");
            $stmt->execute([
                $data['week_label'] ?? $existing['week_label'],
                round(floatval($data['total_sales'] ?? $existing['total_sales']), 2),
                round(floatval($data['total_prize'] ?? $existing['total_prize']), 2),
                round(floatval($data['total_commission'] ?? $existing['total_commission']), 2),
                round(floatval($data['total_net'] ?? $existing['total_net']), 2),
                round(floatval($data['total_participation'] ?? $existing['total_participation']), 2),
                round(floatval($data['total_vendor'] ?? $existing['total_vendor']), 2),
                round(floatval($data['total_bank'] ?? $existing['total_bank']), 2),
                round(floatval($data['total_paid'] ?? $existing['total_paid']), 2),
                round(floatval($data['balance'] ?? $existing['balance']), 2),
                $data['status'] ?? $existing['status'],
                $existing['id'],
            ]);

            return self::findById($existing['id']);
        } else {
            // Insert
            $stmt = $db->prepare("INSERT INTO weekly_tickets 
                (seller_id, week_id, week_label, total_sales, total_prize, total_commission, total_net, total_participation, total_vendor, total_bank, total_paid, balance, currency, status, owner_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['seller_id'],
                $data['week_id'],
                $data['week_label'] ?? '',
                round(floatval($data['total_sales'] ?? 0), 2),
                round(floatval($data['total_prize'] ?? 0), 2),
                round(floatval($data['total_commission'] ?? 0), 2),
                round(floatval($data['total_net'] ?? 0), 2),
                round(floatval($data['total_participation'] ?? 0), 2),
                round(floatval($data['total_vendor'] ?? 0), 2),
                round(floatval($data['total_bank'] ?? 0), 2),
                round(floatval($data['total_paid'] ?? 0), 2),
                round(floatval($data['balance'] ?? 0), 2),
                $data['currency'],
                $data['status'] ?? 'open',
                $ownerUserId,
            ]);
            $id = (int) $db->lastInsertId();
            return self::findById($id);
        }
    }

    public static function updateStatus(int $id, string $status): bool {
        $db = getDB();
        $stmt = $db->prepare("UPDATE weekly_tickets SET status = ?, updated_at = NOW() WHERE id = ?");
        return $stmt->execute([$status, $id]);
    }

    public static function getBySeller(int $sellerId): array {
        return self::getAll(['seller_id' => $sellerId]);
    }
}
