<?php
/**
 * Payment Model
 */
require_once __DIR__ . '/../config/database.php';

class Payment {
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['week_id'])) {
            $where[] = "p.week_id = ?";
            $params[] = $filters['week_id'];
        }
        if (!empty($filters['seller_id'])) {
            $where[] = "p.seller_id = ?";
            $params[] = $filters['seller_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = "p.status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['user_id'])) {
            $where[] = "p.user_id = ?";
            $params[] = $filters['user_id'];
        }
        // Agency scoping
        if (isset($filters['owner_user_id'])) {
            if ($filters['owner_user_id'] === 'global') {
                $where[] = "p.owner_user_id IS NULL";
            } else {
                $where[] = "p.owner_user_id = ?";
                $params[] = $filters['owner_user_id'];
            }
        }

        $sql = "SELECT p.*, u.name as vendor_name, sl.name as seller_name 
                FROM payments p 
                LEFT JOIN users u ON p.user_id = u.id 
                LEFT JOIN sellers sl ON p.seller_id = sl.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT p.*, u.name as vendor_name, sl.name as seller_name 
            FROM payments p 
            LEFT JOIN users u ON p.user_id = u.id 
            LEFT JOIN sellers sl ON p.seller_id = sl.id 
            WHERE p.id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO payments 
            (user_id, seller_id, week_label, week_id, amount, currency, bank, method, reference, payment_date, status, type, proof_image_path, admin_note, owner_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['user_id'],
            $data['seller_id'],
            $data['week_label'],
            $data['week_id'],
            abs(floatval($data['amount'])),
            $data['currency'],
            $data['bank'],
            $data['method'],
            $data['reference'],
            $data['payment_date'],
            $data['status'] ?? 'pending',
            $data['type'] ?? 'payment',
            $data['proof_image_path'] ?? null,
            $data['admin_note'] ?? null,
            $data['owner_user_id'] ?? null,
        ]);
        $newId = (int) $db->lastInsertId();

        // Apply to weekly ticket immediately when created already approved
        if (($data['status'] ?? 'pending') === 'approved') {
            self::recalcWeeklyTicket(
                (int) $data['seller_id'],
                $data['week_id'],
                $data['currency'],
                isset($data['owner_user_id']) && $data['owner_user_id'] !== null ? (int) $data['owner_user_id'] : null
            );
        }

        return $newId;
    }

    public static function updateStatus(int $id, string $status, ?string $adminNote = null): bool {
        $db = getDB();
        $payment = self::findById($id);
        if (!$payment) return false;

        $sql = "UPDATE payments SET status = ?, updated_at = NOW()";
        $params = [$status];
        if ($adminNote !== null) {
            $sql .= ", admin_note = ?";
            $params[] = $adminNote;
        }
        $sql .= " WHERE id = ?";
        $params[] = $id;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        // Recalculate the weekly ticket from the payments ledger (idempotent)
        self::recalcWeeklyTicket(
            (int) $payment['seller_id'],
            $payment['week_id'],
            $payment['currency'],
            $payment['owner_user_id'] !== null ? (int) $payment['owner_user_id'] : null
        );

        return true;
    }

    /**
     * Recalculate weekly ticket total_paid/balance from the payments ledger.
     * Idempotent: always derives the truth from approved non-credit payments,
     * so it also self-heals payments that were never applied previously.
     */
    private static function recalcWeeklyTicket(int $sellerId, string $weekId, string $currency, ?int $ownerUserId): void {
        $db = getDB();

        $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) AS paid, MAX(week_label) AS week_label 
            FROM payments 
            WHERE seller_id = ? AND week_id = ? AND currency = ? 
              AND status = 'approved' AND type <> 'credit' 
              AND owner_user_id <=> ?");
        $stmt->execute([$sellerId, $weekId, $currency, $ownerUserId]);
        $row = $stmt->fetch();
        $totalPaid = round((float) ($row['paid'] ?? 0), 2);

        $stmt = $db->prepare("SELECT * FROM weekly_tickets 
            WHERE seller_id = ? AND week_id = ? AND currency = ? AND owner_user_id <=> ?");
        $stmt->execute([$sellerId, $weekId, $currency, $ownerUserId]);
        $ticket = $stmt->fetch();

        if ($ticket) {
            $balance = round($ticket['total_bank'] - $totalPaid, 2);
            $stmt = $db->prepare("UPDATE weekly_tickets SET total_paid = ?, balance = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$totalPaid, $balance, $ticket['id']]);
        } elseif ($totalPaid != 0) {
            // Create a minimal ticket when a payment exists but sales were not imported yet
            $stmt = $db->prepare("INSERT INTO weekly_tickets 
                (seller_id, week_id, week_label, total_sales, total_prize, total_commission, total_net, total_participation, total_vendor, total_bank, total_paid, balance, currency, status, owner_user_id)
                VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, 'open', ?)");
            $stmt->execute([
                $sellerId,
                $weekId,
                $row['week_label'] ?? '',
                $totalPaid,
                round(-$totalPaid, 2),
                $currency,
                $ownerUserId,
            ]);
        }
    }

    public static function getByVendor(int $sellerId): array {
        return self::getAll(['seller_id' => $sellerId]);
    }

    /**
     * Full update of a payment record (for editing, not just status changes).
     * Handles weekly_ticket recalculation if amount/week/currency changed.
     */
    public static function update(int $id, array $data): bool {
        $db = getDB();
        $existing = self::findById($id);
        if (!$existing) return false;

        $stmt = $db->prepare("UPDATE payments SET 
            seller_id = ?, week_label = ?, week_id = ?, amount = ?, currency = ?,
            bank = ?, method = ?, reference = ?, payment_date = ?, type = ?, updated_at = NOW()
            WHERE id = ?");
        $result = $stmt->execute([
            $data['seller_id'] ?? $existing['seller_id'],
            $data['week_label'] ?? $existing['week_label'],
            $data['week_id'] ?? $existing['week_id'],
            abs(floatval($data['amount'] ?? $existing['amount'])),
            $data['currency'] ?? $existing['currency'],
            $data['bank'] ?? $existing['bank'],
            $data['method'] ?? $existing['method'],
            $data['reference'] ?? $existing['reference'],
            $data['payment_date'] ?? $existing['payment_date'],
            $data['type'] ?? $existing['type'] ?? 'payment',
            $id,
        ]);

        if ($result) {
            // Recalculate both the previous and the new ticket tuples (idempotent)
            $owner = $existing['owner_user_id'] !== null ? (int) $existing['owner_user_id'] : null;
            self::recalcWeeklyTicket((int) $existing['seller_id'], $existing['week_id'], $existing['currency'], $owner);

            $updated = self::findById($id);
            if ($updated && (
                (string) $updated['seller_id'] !== (string) $existing['seller_id'] ||
                (string) $updated['week_id'] !== (string) $existing['week_id'] ||
                (string) $updated['currency'] !== (string) $existing['currency']
            )) {
                self::recalcWeeklyTicket((int) $updated['seller_id'], $updated['week_id'], $updated['currency'], $owner);
            }
        }

        return $result;
    }

    /**
     * Delete a payment and recalculate its weekly ticket.
     */
    public static function delete(int $id): bool {
        $db = getDB();
        $payment = self::findById($id);
        if (!$payment) return false;

        $stmt = $db->prepare("DELETE FROM payments WHERE id = ?");
        $result = $stmt->execute([$id]);

        if ($result) {
            self::recalcWeeklyTicket(
                (int) $payment['seller_id'],
                $payment['week_id'],
                $payment['currency'],
                $payment['owner_user_id'] !== null ? (int) $payment['owner_user_id'] : null
            );
        }

        return $result;
    }
}
