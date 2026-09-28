<?php
/**
 * Postura Model
 *
 * Una "postura" es un adelanto de efectivo que sale de caja para cubrir premios
 * anticipadamente. Puede ser:
 *  - pendiente: dinero fuera, no devuelto
 *  - devuelta:  dinero fue devuelto (con fecha de devolución)
 *  - cancelada: nunca será devuelto (gasto definitivo)
 */
require_once __DIR__ . '/../config/database.php';

class Postura {

    /**
     * Retorna todas las posturas con filtros opcionales.
     */
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['currency'])) {
            $where[] = "currency = ?";
            $params[] = $filters['currency'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = "postura_date >= ?";
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = "postura_date <= ?";
            $params[] = $filters['date_to'];
        }
        if (!empty($filters['week_id'])) {
            $where[] = "week_id = ?";
            $params[] = $filters['week_id'];
        }

        $sql = "SELECT * FROM posturas";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY postura_date DESC, created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Crea una nueva postura en estado 'pendiente'.
     */
    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare(
            "INSERT INTO posturas 
             (postura_date, concept, amount, currency, method, bank, responsible, week_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['postura_date'],
            $data['concept'],
            abs(floatval($data['amount'])),
            $data['currency'],
            $data['method'],
            $data['bank'] ?? 'N/A',
            $data['responsible'] ?? null,
            $data['week_id'] ?? null,
        ]);
        return (int) $db->lastInsertId();
    }

    /**
     * Marca una postura como 'devuelta', registrando la fecha y nota de devolución.
     */
    public static function markReturned(int $id, string $returnedDate, ?string $note = null): bool {
        $db = getDB();
        $stmt = $db->prepare(
            "UPDATE posturas 
             SET status = 'devuelta', returned_date = ?, return_note = ?, updated_at = NOW() 
             WHERE id = ? AND status = 'pendiente'"
        );
        return $stmt->execute([$returnedDate, $note, $id]);
    }

    public static function cancel(int $id, ?string $note = null): bool {
        $db = getDB();
        
        try {
            $db->beginTransaction();
            
            $stmt = $db->prepare(
                "UPDATE posturas 
                 SET status = 'cancelada', return_note = ?, updated_at = NOW() 
                 WHERE id = ? AND status = 'pendiente'"
            );
            $stmt->execute([$note, $id]);
            
            if ($stmt->rowCount() === 0) {
                $db->rollBack();
                return false;
            }
            
            // Obtener los datos de la postura cancelada
            $stmtFind = $db->prepare("SELECT * FROM posturas WHERE id = ?");
            $stmtFind->execute([$id]);
            $postura = $stmtFind->fetch();
            
            // Insertar automáticamente como Gasto Operativo
            $concept = "Postura Cancelada: " . $postura['concept'];
            if ($note) {
                $concept .= " - " . $note;
            }
            
            $stmtExp = $db->prepare(
                "INSERT INTO expenses (expense_date, type, concept, method, bank, amount, currency) 
                 VALUES (?, 'Operativo', ?, ?, ?, ?, ?)"
            );
            
            $stmtExp->execute([
                date('Y-m-d'), // Fecha de la cancelación
                $concept,
                $postura['method'],
                $postura['bank'],
                $postura['amount'],
                $postura['currency']
            ]);
            
            $db->commit();
            return true;
            
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            return false;
        }
    }

    /**
     * Elimina una postura (solo admin).
     */
    public static function delete(int $id): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM posturas WHERE id = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Busca una postura por ID.
     */
    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM posturas WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Retorna un resumen por moneda y estado para el Dashboard.
     * Resultado: [{ currency, status, total, count }]
     */
    public static function getSummaryByCurrency(): array {
        $db = getDB();
        $stmt = $db->query(
            "SELECT currency, status, 
                    COALESCE(SUM(amount), 0) as total, 
                    COUNT(*) as count 
             FROM posturas 
             GROUP BY currency, status"
        );
        return $stmt->fetchAll();
    }
}
