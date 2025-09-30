<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'smartdustbin');
define('DB_USER', 'root');
define('DB_PASS', '');

/**
 * Get a PDO database connection
 * 
 * @return PDO A database connection instance
 * @throws PDOException If connection fails
 */
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // Log the detailed error
        $error_msg = "Database connection failed: " . $e->getMessage();
        error_log($error_msg);
        
        // For development, show detailed error
        if (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false) {
            die("<h2>Database Connection Error</h2>
                <p><strong>Error:</strong> " . $e->getMessage() . "</p>
                <p>Please verify that:</p>
                <ol>
                    <li>MySQL service is running in XAMPP</li>
                    <li>The database 'smartdustbin' exists in phpMyAdmin</li>
                    <li>The database user has correct permissions</li>
                </ol>
                <p>You can create the database by:</p>
                <ol>
                    <li>Go to <a href='http://localhost/phpmyadmin' target='_blank'>phpMyAdmin</a></li>
                    <li>Click 'New' in the left sidebar</li>
                    <li>Enter 'smartdustbin' as the database name</li>
                    <li>Click 'Create'</li>
                    <li>Refresh this page</li>
                </ol>");
        } else {
            // Production - show generic error
            die("Connection failed. Please try again later.");
        }
    }
}

/**
 * Check if a table exists in the current database
 */
function tableExists(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?");
    $stmt->execute([DB_NAME, $table]);
    $row = $stmt->fetch();
    return isset($row['c']) ? (int)$row['c'] > 0 : false;
}

/**
 * Check if a column exists in a given table
 */
function columnExists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?");
    $stmt->execute([DB_NAME, $table, $column]);
    $row = $stmt->fetch();
    return isset($row['c']) ? (int)$row['c'] > 0 : false;
}

/**
 * Initialize the database with required tables
 */
function initializeDatabase() {
    try {
        $pdo = getDBConnection();
        
        // Create users table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                role ENUM('admin', 'user') DEFAULT 'user',
                phone_number VARCHAR(20) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        // Create dustbins table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS dustbins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                location VARCHAR(255) NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
                fill_level TINYINT UNSIGNED DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        // Create notifications table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                dustbin_id INT NULL,
                user_id INT NULL,
                title VARCHAR(255) NULL,
                message TEXT NOT NULL,
                type ENUM('maintenance', 'empty') NOT NULL,
                status ENUM('pending','sent','failed') DEFAULT 'pending',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dustbin_id) REFERENCES dustbins(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        // Ensure required columns exist (for upgrades)
        try {
            // users table required columns
            if (!columnExists($pdo, 'users', 'username')) {
                $pdo->exec("ALTER TABLE users ADD COLUMN username VARCHAR(50) NOT NULL UNIQUE FIRST");
            }
            if (!columnExists($pdo, 'users', 'password')) {
                $pdo->exec("ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL AFTER username");
            }
            if (!columnExists($pdo, 'users', 'email')) {
                $pdo->exec("ALTER TABLE users ADD COLUMN email VARCHAR(100) NOT NULL UNIQUE AFTER password");
            }
            if (!columnExists($pdo, 'users', 'role')) {
                $pdo->exec("ALTER TABLE users ADD COLUMN role ENUM('admin','user') DEFAULT 'user' AFTER email");
            }
            if (!columnExists($pdo, 'users', 'phone_number')) {
                $pdo->exec("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) NULL AFTER role");
            }
        } catch (Exception $e) {
            error_log('Migration: add users.phone_number failed or already exists: ' . $e->getMessage());
        }

        // Migrate notifications table to expected schema if it pre-existed
        try {
            if (tableExists($pdo, 'notifications')) {
                if (!columnExists($pdo, 'notifications', 'user_id')) {
                    $pdo->exec("ALTER TABLE notifications ADD COLUMN user_id INT NULL AFTER dustbin_id");
                }
                if (!columnExists($pdo, 'notifications', 'title')) {
                    $pdo->exec("ALTER TABLE notifications ADD COLUMN title VARCHAR(255) NULL AFTER user_id");
                }
                if (!columnExists($pdo, 'notifications', 'status')) {
                    $pdo->exec("ALTER TABLE notifications ADD COLUMN status ENUM('pending','sent','failed') DEFAULT 'pending' AFTER type");
                }
                // Note: Changing ENUM values requires MODIFY; wrap in try to avoid fatal if already correct
                try {
                    $pdo->exec("ALTER TABLE notifications MODIFY COLUMN type ENUM('maintenance','empty') NOT NULL");
                } catch (Exception $e2) {
                    error_log('Migration: modify notifications.type enum skipped: ' . $e2->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log('Migration: notifications schema alignment encountered an issue: ' . $e->getMessage());
        }
        
        // Align dustbins table with expected schema (contact_numbers column and status enum)
        try {
            if (tableExists($pdo, 'dustbins')) {
                // Add contact_numbers column if missing
                if (!columnExists($pdo, 'dustbins', 'contact_numbers')) {
                    $pdo->exec("ALTER TABLE dustbins ADD COLUMN contact_numbers VARCHAR(255) NULL AFTER notes");
                }
                // Ensure status enum includes 'needs_emptying'
                // Wrap in try to avoid fatal if enum already includes it
                try {
                    // Attempt modify to include the new value
                    $pdo->exec("ALTER TABLE dustbins MODIFY COLUMN status ENUM('active','inactive','maintenance','needs_emptying') DEFAULT 'active'");
                } catch (Exception $e3) {
                    error_log('Migration: modify dustbins.status enum skipped: ' . $e3->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log('Migration: dustbins schema alignment encountered an issue: ' . $e->getMessage());
        }

        // Create a default admin user if none exists
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
        $result = $stmt->fetch();
        if ($result['count'] == 0) {
            $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $pdo->prepare("
                INSERT INTO users (username, password, email, role) 
                VALUES (?, ?, ?, ?)
            ")->execute(['admin', $hashedPassword, 'admin@example.com', 'admin']);
        }
        // Add some sample dustbins if none exist
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM dustbins");
        $result = $stmt->fetch();
        
        if ($result['count'] == 0) {
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
            
            try {
                $pdo->beginTransaction();
                foreach ($sampleDustbins as $dustbin) {
                    $stmt->execute($dustbin);
                }
                $pdo->commit();
                error_log("Successfully added " . count($sampleDustbins) . " sample dustbins");
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log("Error adding sample dustbins: " . $e->getMessage());
            }
        }
        
        return true;
    } catch (PDOException $e) {
        error_log("Database initialization failed: " . $e->getMessage());
        return false;
    }
}

// Initialize the database when this file is included
initializeDatabase();
