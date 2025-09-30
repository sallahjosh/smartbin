<?php
require_once 'config/database.php';

header('Content-Type: text/plain');
echo "Resetting dustbins table...\n";

try {
    $pdo = getDBConnection();
    
    // Clear existing dustbins
    $pdo->exec("TRUNCATE TABLE dustbins");
    echo "Cleared existing dustbins.\n";
    
    // Add sample dustbins
    $sampleDustbins = [
        ['Main Entrance', 6.5244, 3.3792, 'active', 35, 'Near the main gate'],
        ['Cafeteria', 6.5248, 3.3790, 'active', 75, 'Next to the food counter'],
        ['Office Area', 6.5242, 3.3788, 'active', 15, 'Near reception'],
        ['Parking Lot', 6.5246, 3.3795, 'maintenance', 95, 'Near the security post'],
        ['Garden', 6.5240, 3.3793, 'active', 60, 'Near the fountain'],
        ['Lobby', 6.5245, 3.3791, 'active', 45, 'Main building lobby'],
        ['Conference Hall', 6.5243, 3.3794, 'active', 25, 'Near the main stage'],
        ['Sports Complex', 6.5239, 3.3789, 'active', 50, 'Near the basketball court']
    ];
    
    $stmt = $pdo->prepare("
        INSERT INTO dustbins (location, latitude, longitude, status, fill_level, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $pdo->beginTransaction();
    foreach ($sampleDustbins as $dustbin) {
        $stmt->execute($dustbin);
        echo "Added dustbin: " . $dustbin[0] . "\n";
    }
    $pdo->commit();
    
    echo "\nSuccessfully added " . count($sampleDustbins) . " sample dustbins.\n";
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nDone. <a href='../dustbins/'>View Dustbins</a>";
