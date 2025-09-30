<?php
require_once '../config/database.php';

// Check if user is logged in and has permission
session_start();
if (!isset($_SESSION['user_id'])) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Not authorized']);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get the dustbin ID from the request
$dustbinId = isset($_POST['id']) ? (int)$_POST['id'] : 0;

if ($dustbinId <= 0) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'message' => 'Invalid dustbin ID']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    // First, delete any notifications related to this dustbin
    $stmt = $pdo->prepare("DELETE FROM notifications WHERE dustbin_id = ?");
    $stmt->execute([$dustbinId]);
    
    // Then delete the dustbin
    $stmt = $pdo->prepare("DELETE FROM dustbins WHERE id = ?");
    $stmt->execute([$dustbinId]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Dustbin not found']);
    }
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    error_log('Error deleting dustbin: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
