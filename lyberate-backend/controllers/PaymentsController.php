<?php
/**
 * Payments Controller
 */
require_once __DIR__ . '/../models/Payment.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handlePayments(string $method, ?string $action = null, ?string $id = null) {
    $auth = requireAuth();

    switch ($method) {
        case 'GET':
            // Vendor-specific endpoint
            if ($action === 'vendor' && $id) {
                // Vendedor can only see their own
                if ($auth['role'] === 'Vendedor') {
                    $user = User::findById($auth['userId']);
                    if (!$user || (string)$user['seller_id'] !== $id) {
                        jsonError('Acceso denegado', 403);
                    }
                }
                jsonSuccess(Payment::getByVendor((int)$id));
                break;
            }

            // Vendedor solo puede ver sus propios pagos (seller_id forzado desde JWT)
            $filters = [];
            if ($auth['role'] === 'Vendedor') {
                $filters['seller_id']      = $auth['seller_id'] ?? '';
                $filters['owner_user_id']  = 'global';
            } elseif (in_array($auth['role'], ['Admin', 'Supervisor', 'Banca'])) {
                // Admin/Supervisor/Banca: solo pagos globales, nunca datos de agencias
                $filters['owner_user_id'] = 'global';
                if (!empty($_GET['week_id']))   $filters['week_id']   = $_GET['week_id'];
                if (!empty($_GET['seller_id'])) $filters['seller_id'] = $_GET['seller_id'];
                if (!empty($_GET['status']))    $filters['status']    = $_GET['status'];
            } else {
                jsonError('Acceso denegado', 403);
            }
            jsonSuccess(Payment::getAll($filters));
            break;

        case 'POST':
            $data = getJsonBody();
            
            // Handle proof image upload
            if (!empty($_FILES['proof'])) {
                $file = $_FILES['proof'];
                $allowed = ['image/jpeg', 'image/png', 'image/webp'];
                if (!in_array($file['type'], $allowed)) {
                    jsonError('Solo se permiten imágenes JPG, PNG o WEBP');
                }
                if ($file['size'] > MAX_UPLOAD_SIZE) {
                    jsonError('La imagen no puede exceder 5MB');
                }
                $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = 'proof_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                $uploadDir = __DIR__ . '/../uploads/proofs/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                move_uploaded_file($file['tmp_name'], $uploadDir . $filename);
                $data['proof_image_path'] = 'uploads/proofs/' . $filename;
            }

            // Handle base64 proof (from mobile/Capacitor)
            if (!empty($data['proof_base64'])) {
                $uploadDir = __DIR__ . '/../uploads/proofs/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                $filename = 'proof_' . time() . '_' . bin2hex(random_bytes(4)) . '.jpg';
                $imageData = base64_decode($data['proof_base64']);
                file_put_contents($uploadDir . $filename, $imageData);
                $data['proof_image_path'] = 'uploads/proofs/' . $filename;
                unset($data['proof_base64']);
            }

            $data['user_id'] = $auth['userId'];
            $err = validateRequired($data, ['seller_id', 'week_label', 'week_id', 'amount', 'currency', 'bank', 'method', 'reference', 'payment_date']);
            if ($err) jsonError($err);

            $newId = Payment::create($data);
            $payment = Payment::findById($newId);

            // Auto-apply if approved
            if (($data['status'] ?? 'pending') === 'approved' && ($data['type'] ?? 'payment') !== 'credit') {
                // Already handled in create if needed
            }

            jsonSuccess($payment, 'Pago registrado', 201);
            break;

        case 'PUT':
            if (!$id) jsonError('ID requerido');
            requireRole(['Admin', 'Supervisor']);
            $data = getJsonBody();

            if ($action === 'edit') {
                // Full edit of payment data
                $result = Payment::update((int)$id, $data);
                if (!$result) jsonError('Pago no encontrado', 404);
                $payment = Payment::findById((int)$id);
                jsonSuccess($payment, 'Pago actualizado');
            } else {
                // Status-only update (approve/reject)
                $err = validateRequired($data, ['status']);
                if ($err) jsonError($err);

                $result = Payment::updateStatus((int)$id, $data['status'], $data['admin_note'] ?? null);
                if (!$result) jsonError('Pago no encontrado', 404);

                $payment = Payment::findById((int)$id);
                jsonSuccess($payment, 'Estado actualizado');
            }
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
