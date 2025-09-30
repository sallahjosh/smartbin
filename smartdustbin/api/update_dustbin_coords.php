<?php
// One-off endpoint to update a dustbin's coordinates
// Usage (GET or POST):
//   id=9&lat=5.5530095&lng=-0.1680166
// Returns JSON { success: true }

header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();

    // Accept both GET and POST
    $id  = isset($_REQUEST['id']) ? (int)$_REQUEST['id'] : 0;
    $lat = isset($_REQUEST['lat']) ? (float)$_REQUEST['lat'] : null;
    $lng = isset($_REQUEST['lng']) ? (float)$_REQUEST['lng'] : null;

    if ($id <= 0 || $lat === null || $lng === null) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing or invalid parameters. Expected: id, lat, lng'
        ]);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE dustbins SET latitude = ?, longitude = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$lat, $lng, $id]);

    echo json_encode([
        'success' => true,
        'id' => $id,
        'latitude' => $lat,
        'longitude' => $lng
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
