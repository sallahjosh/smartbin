<?php
header('Content-Type: application/json');
require_once '../config/database.php';

// Check if dustbin ID is provided
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dustbin ID is required']);
    exit();
}

$dustbinId = (int)$_GET['id'];

try {
    $pdo = getDBConnection();
    
    // Get dustbin contact numbers
    $stmt = $pdo->prepare("SELECT contact_numbers FROM dustbins WHERE id = ?");
    $stmt->execute([$dustbinId]);
    $dustbin = $stmt->fetch();
    
    if (!$dustbin) {
        throw new Exception('Dustbin not found');
    }
    
    $contacts = [];
    if (!empty($dustbin['contact_numbers'])) {
        // Split comma-separated contact numbers and clean them
        $contactNumbers = array_map('trim', explode(',', $dustbin['contact_numbers']));
        $contacts = array_filter($contactNumbers, function($number) {
            return !empty($number) && strlen($number) >= 10;
        });
    }
    
    echo json_encode([
        'success' => true,
        'contacts' => array_values($contacts),
        'count' => count($contacts)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to get contact numbers: ' . $e->getMessage()
    ]);
}
?>
