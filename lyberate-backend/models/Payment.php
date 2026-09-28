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
        return (int) $db->lastInsertId();
    }

    public static function updateStatus(int $id, string $status, ?string $adminNote = null): bool {
        $db = getDB();
        $payment = self::findById($id);
        if (!$payment) return false;

        $oldStatus = $payment['status'];
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

        // Update weekly ticket if payment type != credit
        if ($payment['type'] !== 'credit') {
            if ($oldStatus !== 'approved' && $status === 'approved') {
                self::applyToWeeklyTicket($payment, false);
            } elseif ($oldStatus === 'approved' && $status !== 'approved') {
                self::applyToWeeklyTicket($payment, true);
            }
        }

        return true;
    }

    /**
     * Apply payment amount to weekly ticket totals
     */
    private static function applyToWeeklyTicket(array $payment, bool $reverse = false): void {
        $db = getDB();
        $amount = $reverse ? -abs($payment['amount']) : abs($payment['amount']);

        // Find existing ticket
        $stmt = $db->prepare("SELECT * FROM weekly_tickets WHERE seller_id = ? AND week_id = ? AND currency = ?");
        $stmt->execute([$payment['seller_id'], $payment['week_id'], $payment['currency']]);
        $ticket = $stmt->fetch();

        if ($ticket) {
            $newPaid = round($ticket['total_paid'] + $amount, 2);
            $newBalance = round($ticket['total_bank'] - $newPaid, 2);
            $stmt = $db->prepare("UPDATE weekly_tickets SET total_paid = ?, balance = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$newPaid, $newBalance, $ticket['id']]);
        } elseif (!$reverse) {
            // Create new ticket entry
            $vendorName = '';
            $stmtS = $db->prepare("SELECT name FROM sellers WHERE id = ?");
            $stmtS->execute([$payment['seller_id']]);
            $seller = $stmtS->fetch();
            if ($seller) $vendorName = $seller['name'];

            $stmt = $db->prepare("INSERT INTO weekly_tickets 
                (seller_id, week_id, week_label, total_sales, total_prize, total_commission, total_net, total_participation, total_vendor, total_bank, total_paid, balance, currency, status)
                VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, 'open')");
            $stmt->execute([
                $payment['seller_id'],
                $payment['week_id'],
                $payment['week_label'],
                round($amount, 2),
                round(-$amount, 2),
                $payment['currency'],
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

        // If the payment was approved and financial fields are changing, reverse the old ticket first
        $wasApproved = $existing['status'] === 'approved';
        $oldType = $existing['type'] ?? 'payment';

        if ($wasApproved && $oldType !== 'credit') {
            self::applyToWeeklyTicket($existing, true); // Reverse old amount
        }

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
            $data['type'] ?? $oldType,
            $id,
        ]);

        // Re-apply the new amount to weekly ticket if still approved
        if ($wasApproved && ($data['type'] ?? $oldType) !== 'credit') {
            $updated = self::findById($id);
            if ($updated) {
                self::applyToWeeklyTicket($updated, false);
            }
        }

        return $result;
    }
}
