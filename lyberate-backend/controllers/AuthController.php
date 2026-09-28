<?php
/**
 * Auth Controller - Login, session, etc.
 */
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleAuth(string $method, string $action) {
    switch ("$method:$action") {
        case 'POST:login':
            $data = getJsonBody();
            $err = validateRequired($data, ['email', 'password']);
            if ($err) jsonError($err);

            $user = User::findByEmail($data['email']);
            if (!$user || !password_verify($data['password'], $user['password_hash'])) {
                jsonError('Credenciales inválidas', 401);
            }

            $token = generateJWT([
                'userId'    => $user['id'],
                'role'      => $user['role'],
                'email'     => $user['email'],
                'seller_id' => $user['seller_id'],
                'is_agency' => (bool)($user['is_agency'] ?? false),
            ]);

            jsonSuccess([
                'token' => $token,
                'user' => [
                    'id'         => $user['id'],
                    'name'       => $user['name'],
                    'email'      => $user['email'],
                    'role'       => $user['role'],
                    'sellerId'   => $user['seller_id'],
                    'agencyName' => $user['agency_name'],
                    'isAgency'   => (bool)($user['is_agency'] ?? false),
                ],
            ], 'Login exitoso');
            break;

        case 'GET:me':
            $auth = requireAuth();
            $user = User::findById($auth['userId']);
            if (!$user) jsonError('Usuario no encontrado', 404);
            jsonSuccess([
                'id'         => $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'role'       => $user['role'],
                'sellerId'   => $user['seller_id'],
                'agencyName' => $user['agency_name'],
                'isAgency'   => (bool)($user['is_agency'] ?? false),
            ]);
            break;

        default:
            jsonError('Endpoint no encontrado', 404);
    }
}
