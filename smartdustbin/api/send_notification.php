<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../config/sms.php';

// Check if the request is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get the raw POST data
$input = json_decode(file_get_contents('php://input'), true);

// Validate the input
if (!isset($input['dustbin_id']) || !isset($input['type'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$dustbinId = $input['dustbin_id'];
$type = $input['type'];
$message = '';
$title = '';

// Set message and title based on notification type
switch ($type) {
    case 'maintenance':
        $title = 'Maintenance Required';
        $message = 'Maintenance required for dustbin at location ';
        break;
    case 'empty':
        $title = 'Empty Dustbin';
        $message = 'Dustbin needs to be emptied at location ';
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid notification type']);
        exit();
}

try {
    $pdo = getDBConnection();
    
    // Get dustbin details including contact numbers
    $stmt = $pdo->prepare("SELECT location, contact_numbers FROM dustbins WHERE id = ?");
    $stmt->execute([$dustbinId]);
    $dustbin = $stmt->fetch();
    
    if (!$dustbin) {
        throw new Exception('Dustbin not found');
    }
    
    // Create specific messages based on type
    $specificMessage = '';
    if ($type === 'maintenance') {
        $specificMessage = "Maintenance requested for Dustbin ID $dustbinId located at {$dustbin['location']}.";
    } elseif ($type === 'empty') {
        $specificMessage = "Please empty Dustbin ID $dustbinId located at {$dustbin['location']}.";
    }
    
    // Build recipients: business rule requires fixed routing per type
    // - maintenance -> +233509147115
    // - empty       -> +233257048004
    $recipients = $type === 'maintenance'
        ? ['+233503598094']
        : ['+233257048004'];

    // Normalize all numbers to Ghana E.164 digits (233XXXXXXXXX)
    $recipients = array_values(array_unique(array_map(function($n) {
        $digits = preg_replace('/\D+/', '', (string)$n);
        // If starts with 0 and length >= 10 (e.g., 024..., 050...), convert to 233 + rest
        if (strlen($digits) >= 10 && $digits[0] === '0') {
            return '233' . substr($digits, 1);
        }
        // If already starts with 233 and length >= 12, keep
        if (strpos($digits, '233') === 0) {
            return $digits;
        }
        // If starts with 00233, reduce to 233...
        if (strpos($digits, '00233') === 0) {
            return substr($digits, 2);
        }
        // Fallback: return digits as-is
        return $digits;
    }, $recipients)));

    if (empty($recipients)) {
        throw new Exception('No recipients configured for this notification type');
    }

    // Send SMS via mNotify using the specific message
    $smsResponse = mnotify_send_sms($recipients, $specificMessage, null, null, null);
    $statusForLog = $smsResponse['success'] ? 'sent' : 'failed';

    // Log one notification entry
    $stmt = $pdo->prepare("
        INSERT INTO notifications (dustbin_id, user_id, title, message, type, status) 
        VALUES (?, NULL, ?, ?, ?, ?)
    ");
    $stmt->execute([$dustbinId, $title, $specificMessage, $type, $statusForLog]);

    $notificationsSent = [
        [
            'recipient' => $recipients,
            'status' => $statusForLog
        ]
    ];
    
    // Update dustbin status
    $stmt = $pdo->prepare("UPDATE dustbins SET status = ? WHERE id = ?");
    $status = $type === 'maintenance' ? 'maintenance' : 'needs_emptying';
    $stmt->execute([$status, $dustbinId]);
    
    $apiSuccess = isset($smsResponse['success']) ? (bool)$smsResponse['success'] : false;
    $respMessage = $apiSuccess ? 'Notifications sent successfully' : ('Failed to send SMS' . (isset($smsResponse['error']) ? (': ' . $smsResponse['error']) : ''));
    if (!$apiSuccess) {
        http_response_code(502); // Bad Gateway to indicate downstream SMS issue
    }
    echo json_encode([
        'success' => $apiSuccess,
        'message' => $respMessage,
        'notifications_sent' => $notificationsSent,
        'sms_api' => $smsResponse
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send notifications: ' . $e->getMessage()
    ]);
}
?>
