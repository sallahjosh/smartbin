<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/database.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
        exit;
    }

    // Required fields
    $username = isset($input['username']) ? trim($input['username']) : '';
    $email = isset($input['email']) ? trim($input['email']) : '';
    $password = isset($input['password']) ? $input['password'] : '';
    $role = isset($input['role']) ? trim($input['role']) : '';
    $phone_number = isset($input['phone_number']) ? trim($input['phone_number']) : null;

    // Basic validation
    $errors = [];
    if ($username === '') { $errors[] = 'username is required'; }
    if ($email === '') { $errors[] = 'email is required'; }
    if ($password === '') { $errors[] = 'password is required'; }
    if ($role === '') { $errors[] = 'role is required'; }

    if (!in_array($role, ['admin', 'user'], true)) {
        $errors[] = 'role must be either "admin" or "user"';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'email is not valid';
    }
    if ($phone_number !== null && $phone_number !== '') {
        // Optional: light validation (5-20 chars)
        if (strlen($phone_number) < 5 || strlen($phone_number) > 20) {
            $errors[] = 'phone_number must be between 5 and 20 characters';
        }
    } else {
        $phone_number = null; // normalize empty to null
    }

    if (!empty($errors)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Validation failed', 'errors' => $errors]);
        exit;
    }

    $pdo = getDBConnection();

    // Uniqueness checks
    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ((int)$stmt->fetch()['c'] > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ((int)$stmt->fetch()['c'] > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email already exists']);
        exit;
    }

    // Hash password
    $hashed = password_hash($password, PASSWORD_DEFAULT);

    // Insert user
    $stmt = $pdo->prepare('INSERT INTO users (username, password, email, role, phone_number) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$username, $hashed, $email, $role, $phone_number]);
    $newId = (int)$pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'User created successfully',
        'user' => [
            'id' => $newId,
            'username' => $username,
            'email' => $email,
            'role' => $role,
            'phone_number' => $phone_number,
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
