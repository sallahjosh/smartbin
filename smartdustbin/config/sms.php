<?php
// mNotify SMS Helper
// Configure your API credentials here
// IMPORTANT: Do not commit real API keys to version control

define('MNOTIFY_API_ENDPOINT', 'https://api.mnotify.com/api/sms/quick');
// Replace with your real API key (consider loading from env or separate private config)
define('MNOTIFY_API_KEY', 'mKOcvgPXjg63BZknwy7B0xiNA');
// Default sender name registered on mNotify (approved Sender ID)
define('MNOTIFY_SENDER', 'Smart Bin');

/**
 * Send SMS via mNotify quick endpoint
 *
 * @param array $recipients Array of phone numbers as strings, e.g., ['0241234567', '0201234567']
 * @param string $message The SMS message content
 * @param string|null $sms_type Optional. Only set to 'otp' when sending OTP messages. Otherwise leave null.
 * @param string|null $schedule_date Optional schedule date in format 'YYYY-MM-DD HH:MM'
 * @param string|null $sender Optional sender ID. Defaults to MNOTIFY_SENDER
 * @return array [success => bool, data => mixed, error => string|null, http_code => int|null]
 */
function mnotify_send_sms(array $recipients, string $message, ?string $sms_type = null, ?string $schedule_date = null, ?string $sender = null): array {
    // Use default sender if none provided (keep EXACT as registered in mNotify, including spaces/case)
    $sender = $sender ?: MNOTIFY_SENDER;

    // Build URL with API key
    $url = MNOTIFY_API_ENDPOINT . '?key=' . urlencode(MNOTIFY_API_KEY);

    // Build payload
    $normalizedRecipients = array_values(array_filter(array_map(function ($n) {
        if (!is_string($n)) { return null; }
        $n = trim($n);
        if ($n === '') { return null; }
        // Keep original format; mNotify handles local and international formats
        // Basic sanity check: must have at least 10 characters (digits and symbols)
        $digits = preg_replace('/\D+/', '', $n);
        if (strlen($digits) >= 10) {
            return $n; // send exactly as provided (trimmed)
        }
        return null;
    }, $recipients)));

    $payload = [
        'recipient' => $normalizedRecipients,
        'message' => $message,
        'is_schedule' => $schedule_date ? true : false,
        'schedule_date' => $schedule_date ? $schedule_date : ''
    ];
    
    // Add sender (required by mNotify)
    $payload['sender'] = $sender;

    // Include sms_type ONLY when explicitly 'otp'
    if ($sms_type === 'otp') {
        $payload['sms_type'] = 'otp';
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    // Timeouts
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    // In local dev on Windows/XAMPP, SSL CA bundle may be missing; relax verification for localhost only
    $isLocal = isset($_SERVER['HTTP_HOST']) && (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false || strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false);
    if ($isLocal) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    }

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return [
            'success' => false,
            'data' => null,
            'error' => 'cURL error: ' . $err,
            'http_code' => $httpCode ?: null,
        ];
    }

    curl_close($ch);

    $decoded = json_decode($raw, true);

    // Heuristic: consider 200-range with a decoded body as success
    $success = $httpCode >= 200 && $httpCode < 300;

    if (!$success) {
        // Log details for debugging (do not log API key)
        $safePayload = $payload;
        // Truncate message to avoid huge logs
        if (isset($safePayload['message']) && strlen($safePayload['message']) > 200) {
            $safePayload['message'] = substr($safePayload['message'], 0, 200) . '...';
        }
        error_log('[mNotify SMS] HTTP ' . $httpCode . ' Response: ' . (is_string($raw) ? substr($raw, 0, 500) : json_encode($decoded)));
        error_log('[mNotify SMS] Payload: ' . json_encode($safePayload));
        
        // Provide more specific error messages
        if ($httpCode === 401 && isset($decoded['error']) && strpos($decoded['error'], 'sender id is not registered') !== false) {
            $error = 'Sender ID "' . $sender . '" is not registered with mNotify. Please contact support@mnotify.com or call 0541509394 to register your sender ID.';
        } elseif ($httpCode === 422 && isset($decoded['errors'])) {
            $error = 'Validation error: ' . json_encode($decoded['errors']);
        } else {
            $error = 'HTTP ' . $httpCode . ' response';
        }
    } else {
        $error = null;
    }

    // Local debug log (do not enable in production)
    if ($isLocal) {
        $logDir = __DIR__ . '/../storage/logs';
        if (!is_dir($logDir)) {@mkdir($logDir, 0777, true);}    
        $logLine = sprintf("%s | http:%s | sender:%s | recipients:%s | payload:%s | resp:%s\n",
            date('Y-m-d H:i:s'),
            var_export($httpCode, true),
            $sender,
            json_encode($normalizedRecipients),
            json_encode(['message' => $payload['message'], 'is_schedule' => $payload['is_schedule']]),
            is_string($raw) ? substr($raw, 0, 500) : json_encode($decoded)
        );
        @file_put_contents($logDir . '/sms.log', $logLine, FILE_APPEND);
    }

    return [
        'success' => $success,
        'data' => $decoded !== null ? $decoded : $raw,
        'error' => $success ? null : ($error ?? 'HTTP ' . $httpCode . ' response'),
        'http_code' => $httpCode,
        'normalized_recipients' => $normalizedRecipients,
    ];
}
