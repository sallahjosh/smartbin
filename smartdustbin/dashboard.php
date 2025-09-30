<?php
session_start();

// Debug: Show session data
echo "<!-- Dashboard Debug - Session Data: ";
print_r($_SESSION);
echo " -->\n";

// Check if user is logged in, if not redirect to login page
if (!isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}

// Get user role for permission checks
$userRole = $_SESSION['role'] ?? 'user';
$isAdmin = ($userRole === 'admin');

require_once 'config/database.php';

// Check if user exists (in case user was deleted but session still exists)
try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, email FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        // User not found, destroy session and redirect
        session_destroy();
        $_SESSION['error'] = 'User account not found';
        header("Location: index.php");
        exit();
    }
    
    // Update session with latest user data
    $_SESSION['username'] = $user['first_name'] . ' ' . $user['last_name'];
    $_SESSION['email'] = $user['email'];
    
} catch (PDOException $e) {
    $_SESSION['error'] = 'Database error. Please try again later.';
    header("Location: index.php");
    exit();
}

// Get database connection
$pdo = getDBConnection();

// Fetch dustbins data
try {
    $stmt = $pdo->query("SELECT * FROM dustbins ORDER BY last_updated DESC");
    $dustbins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate statistics
    $totalDustbins = count($dustbins);
    $activeDustbins = 0;
    $warningDustbins = 0;
    $fullDustbins = 0;
    $emptyDustbins = 0;
    $mediumDustbins = 0;
    $lowDustbins = 0;
    $highDustbins = 0;
    
    foreach ($dustbins as $dustbin) {
        if ($dustbin['status'] === 'active') {
            $activeDustbins++;
        }
        if ($dustbin['fill_level'] >= 80) {
            $warningDustbins++;
        }
        if ($dustbin['fill_level'] >= 95) {
            $fullDustbins++;
        }
        
        // For charts
        if ($dustbin['fill_level'] == 0) $emptyDustbins++;
        elseif ($dustbin['fill_level'] < 40) $lowDustbins++;
        elseif ($dustbin['fill_level'] < 80) $mediumDustbins++;
        else $highDustbins++;
    }
    
    // Get recent notifications
    $stmt = $pdo->query("
        SELECT n.*, d.location as dustbin_location 
        FROM notifications n 
        LEFT JOIN dustbins d ON n.dustbin_id = d.id 
        ORDER BY n.created_at DESC 
        LIMIT 5
    ");
    
    $recentNotifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch(PDOException $e) {
    $dustbins = [];
    $recentNotifications = [];
    $totalDustbins = 0;
    $activeDustbins = 0;
    $warningDustbins = 0;
    $fullDustbins = 0;
    $emptyDustbins = 0;
    $mediumDustbins = 0;
    $lowDustbins = 0;
    $highDustbins = 0;
}

// Set page title
$pageTitle = 'Dashboard';

// Include header
require_once 'includes/header.php';
?>
<?php
// Set page title if not already set
if (!isset($pageTitle)) {
    $pageTitle = 'Smart Dustbin Monitoring';
}
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Smart Dustbin Monitoring System - Real-time monitoring and analytics for smart dustbins">
    <meta name="author" content="SmartDustbin Team">
    <title><?php echo htmlspecialchars($pageTitle); ?> - Smart Dustbin Monitoring</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/smartdustbin/assets/images/favicon.ico">
    
    <!-- CSS Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin="">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/smartdustbin/assets/css/styles.css">
    <link rel="stylesheet" href="/smartdustbin/assets/css/modern-ui.css">
    
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Improved Custom Styles -->
    <style>
        /* Base Styles */
        :root {
            --primary: #4361ee;
            --primary-light: #e7ebfd;
            --secondary: #6c757d;
            --success: #28a745;
            --warning: #ffc107;
            --danger: #dc3545;
            --light: #f8f9fa;
            --dark: #212529;
            --border-color: #dee2e6;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f5f7ff;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            min-height: 100vh;
        }
        
        .main-content {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            margin: 15px;
            padding: 20px;
        }
        
        /* Header Styles */
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px 25px;
            border-radius: 8px;
            margin: 0 0 25px 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-bottom: 2px solid var(--primary-light);
        }
        
        .page-title h1 {
            font-size: 1.75rem;
            margin: 0;
            color: var(--dark);
        }
        
        .page-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        /* Card Styles */
        .card {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 20px;
            background-color: #fff;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .card:hover {
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
        }
        
        .card-header {
            background-color: var(--primary);
            color: white;
            font-weight: 600;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            padding: 12px 15px;
            border-radius: 8px 8px 0 0;
        }
        
        .card-body {
            padding: 20px;
        }
        
        /* Stats Cards */
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: #fff;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card i {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .stat-card h3 {
            font-size: 1.8rem;
            margin: 10px 0;
            color: var(--dark);
        }
        
        .stat-card p {
            margin: 0;
            color: var(--secondary);
        }
        
        /* Button Styles */
        .btn {
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        
        .btn-outline-secondary {
            border-color: var(--border-color);
            color: var(--secondary);
        }
        
        .btn-outline-secondary:hover {
            background-color: #f8f9fa;
            border-color: #adb5bd;
        }
        
        .btn-primary {
            background-color: var(--primary);
            border-color: var(--primary);
        }
        
        .btn-primary:hover {
            background-color: #3a56d4;
            border-color: #3a56d4;
        }
        
        /* Dropdown Menus */
        .dropdown-menu {
            border: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
            min-width: 12rem;
        }
        
        .dropdown-item {
            padding: 0.5rem 1.25rem;
            color: var(--dark);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .dropdown-item i {
            width: 20px;
            text-align: center;
        }
        
        .dropdown-item:hover {
            background-color: #f8f9fa;
            color: var(--primary);
        }
        
        .dropdown-divider {
            border-top: 1px solid var(--border-color);
            margin: 0.5rem 0;
        }
        
        /* Responsive Adjustments */
        @media (max-width: 768px) {
            .page-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            
            .page-actions {
                width: 100%;
                justify-content: space-between;
            }
            
            .stats-container {
                grid-template-columns: 1fr;
            }
        }
        :root {
            --primary: #4361ee;
            --primary-light: #e7ebfd;
            --secondary: #6c757d;
            --success: #28a745;
            --warning: #ffc107;
            --danger: #dc3545;
            --light: #f8f9fa;
            --dark: #212529;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f5f7ff;
            color: #333;
            line-height: 1.6;
        }
        
        .card {
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            margin-bottom: 20px;
            background-color: #fff;
        }
        
        .card-header {
            background-color: var(--primary);
            color: white;
            font-weight: 600;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            padding: 12px 15px;
        }
        
        .card-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%);
            transform: translateX(-100%);
            transition: transform 0.6s ease;
        }
        
        .card:hover .card-header::before {
            transform: translateX(100%);
        }
        
        .stat-card {
            border-left: 4px solid var(--primary);
            transition: all 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        .stat-card .card-body {
            padding: 20px;
        }
        
        .stat-card i {
            font-size: 2.5rem;
            margin-bottom: 15px;
            color: var(--primary);
            background: rgba(67, 97, 238, 0.1);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .stat-card h3 {
            font-size: 1.8rem;
            font-weight: 700;
            margin: 10px 0 5px;
            color: var(--dark);
        }
        
        .stat-card p {
            color: #6c757d;
            margin: 0;
            font-size: 0.9rem;
        }
        
        .btn-primary {
            background: var(--gradient);
            border: none;
            padding: 8px 20px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(67, 97, 238, 0.3);
        }
        
        .btn-outline-secondary {
            border-color: #dee2e6;
            color: #6c757d;
            transition: all 0.3s ease;
        }
        
        .btn-outline-secondary:hover {
            background-color: #f8f9fa;
            border-color: #adb5bd;
            color: #495057;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }
        
        .table {
            margin-bottom: 0;
        }
        
        .table thead th {
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
            color: #6c757d;
        }
        
        .table tbody tr {
            transition: all 0.2s ease;
        }
        
        .table tbody tr:hover {
            background-color: rgba(67, 97, 238, 0.05);
            transform: translateX(5px);
        }
        
        .badge {
            padding: 6px 10px;
            font-weight: 500;
            border-radius: 4px;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .progress {
            height: 10px;
            border-radius: 5px;
            background-color: #e9ecef;
            overflow: visible;
        }
        
        .progress-bar {
            border-radius: 5px;
            position: relative;
            overflow: visible;
            transition: width 1s ease-in-out;
        }
        
        .progress-bar::after {
            content: attr(aria-valuenow) "%";
            position: absolute;
            right: -25px;
            top: -25px;
            background: #fff;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 600;
            color: #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        /* Calendar Styling */
        #calendar {
            background: #fff;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .fc .fc-toolbar-title {
            font-weight: 600;
            color: var(--dark);
        }
        
        .fc .fc-button {
            background-color: #fff;
            border: 1px solid #dee2e6;
            color: #6c757d;
            text-transform: capitalize;
            transition: all 0.3s ease;
        }
        
        .fc .fc-button-active, 
        .fc .fc-button:active, 
        .fc .fc-button:focus, 
        .fc .fc-button:hover {
            background: var(--gradient);
            border-color: var(--primary);
            color: #fff;
            box-shadow: none;
        }
        
        .fc .fc-daygrid-day-number {
            color: #6c757d;
            font-weight: 500;
        }
        
        /* Responsive Adjustments */
        @media (max-width: 768px) {
            .main-content {
                margin: 10px;
                padding: 15px;
            }
            
            .stat-card {
                margin-bottom: 15px;
            }
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--primary);
            border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: var(--primary-dark);
        }
    </style>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #4361ee;
            --secondary-color: #3f37c9;
            --success-color: #4cc9f0;
            --info-color: #4895ef;
            --warning-color: #f72585;
            --danger-color: #7209b7;
            --light-color: #f8f9fa;
            --dark-color: #212529;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: #f5f7fb;
            color: #2c3e50;
            overflow-x: hidden;
        }
        
        /* Main content area */
        .main-content {
            margin-left: 0;
            padding: 2rem;
            transition: all 0.3s;
            min-height: 100vh;
            max-width: 100%;
            width: 100%;
            background-color: #f8f9fa;
        }
        
        /* Card styling */
        .card {
            border: none;
            border-radius: 0.75rem;
            box-shadow: 0 0.125rem 0.75rem rgba(0, 0, 0, 0.05);
            margin-bottom: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
        }
        
        .card-header {
            background-color: #fff;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            font-weight: 600;
            padding: 1.25rem 1.5rem;
            border-radius: 0.75rem 0.75rem 0 0 !important;
        }
        
        .card-body {
            padding: 1.5rem;
        }
        
        .stat-card {
            border-left: 4px solid #4e73df;
            padding: 1rem;
            height: 100%;
        }
        
        .stat-card.primary {
            border-left-color: #4e73df;
        }
        
        .stat-card.success {
            border-left-color: #1cc88a;
        }
        
        .stat-card.warning {
            border-left-color: #f6c23e;
        }
        
        .stat-card.danger {
            border-left-color: #e74a3b;
        }
        
        .stat-card .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            color: #5a5c69;
        }
        
        .stat-card .stat-label {
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
            color: #858796;
            margin-bottom: 0.5rem;
        }
        
        .stat-card .stat-icon {
            font-size: 2rem;
            color: #dddfeb;
        }
        
        /* Responsive adjustments */
        @media (max-width: 991.98px) {
            .main-content {
                margin-left: 0;
                padding-top: 60px;
            }
            
            .sidebar {
                margin-left: -250px;
                position: fixed;
                z-index: 1040;
                height: 100%;
            }
            
            .sidebar.show {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>

    <!-- Main Content -->
    <main class="main-content">
        <div class="page-header">
            <div class="page-title">
                <h1>Smart Dustbin Dashboard</h1>
                <p class="mb-0 text-muted">
                    <i class="fas fa-user-circle me-1"></i> Welcome back, <?php echo htmlspecialchars($_SESSION['username'] ?? 'Admin'); ?>
                </p>
            </div>
            <div class="page-actions">
                <!-- Calendar Dropdown -->
                <div class="dropdown me-2">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="calendarDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-calendar me-1"></i> This Week
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="calendarDropdown">
                        <li><a class="dropdown-item" href="#"><i class="far fa-calendar me-2"></i>Today</a></li>
                        <li><a class="dropdown-item" href="#"><i class="far fa-calendar-alt me-2"></i>This Week</a></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-calendar-week me-2"></i>This Month</a></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-calendar-alt me-2"></i>Custom Range</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-cog me-2"></i>Settings</a></li>
                    </ul>
                </div>
                
                <!-- Export Dropdown -->
                <div class="dropdown me-2">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="exportDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-file-export me-1"></i> Export
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="exportDropdown">
                        <li><a class="dropdown-item" href="#"><i class="far fa-file-pdf me-2"></i>Export as PDF</a></li>
                        <li><a class="dropdown-item" href="#"><i class="far fa-file-excel me-2"></i>Export as Excel</a></li>
                        <li><a class="dropdown-item" href="#"><i class="far fa-file-csv me-2"></i>Export as CSV</a></li>
                        <li><a class="dropdown-item" href="#"><i class="far fa-file-image me-2"></i>Export as Image</a></li>
                    </ul>
                </div>
                
                <!-- Print Dropdown -->
                <div class="dropdown">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="printDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-print me-1"></i> Print
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="printDropdown">
                        <li><a class="dropdown-item" href="#" onclick="window.print()"><i class="fas fa-print me-2"></i>Print Dashboard</a></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-file-alt me-2"></i>Print Summary</a></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-table me-2"></i>Print Table</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-cog me-2"></i>Print Settings</a></li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Modern Stats Cards -->
        <div class="row mb-4">
            <!-- Total Dustbins -->
            <div class="col-xl-3 col-lg-6 col-md-6 mb-4">
                <div class="stats-card-modern fade-in">
                    <div class="stats-icon bg-gradient-primary text-white">
                        <i class="fas fa-trash-alt"></i>
                    </div>
                    <div class="stats-value"><?php echo $totalDustbins; ?></div>
                    <div class="stats-label">Total Dustbins</div>
                </div>
            </div>
            
            <!-- Active Dustbins -->
            <div class="col-xl-3 col-lg-6 col-md-6 mb-4">
                <div class="stats-card-modern fade-in" style="animation-delay: 0.1s;">
                    <div class="stats-icon bg-gradient-success text-white">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stats-value"><?php echo $activeDustbins; ?></div>
                    <div class="stats-label">Active</div>
                </div>
            </div>
            
            <!-- Warning Dustbins -->
            <div class="col-xl-3 col-lg-6 col-md-6 mb-4">
                <div class="stats-card-modern fade-in" style="animation-delay: 0.2s;">
                    <div class="stats-icon bg-gradient-warning text-white">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stats-value"><?php echo $warningDustbins; ?></div>
                    <div class="stats-label">Need Attention</div>
                </div>
            </div>
            
            <!-- Full Dustbins -->
            <div class="col-xl-3 col-lg-6 col-md-6 mb-4">
                <div class="stats-card-modern fade-in" style="animation-delay: 0.3s;">
                    <div class="stats-icon bg-gradient-danger text-white">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="stats-value"><?php echo $fullDustbins; ?></div>
                    <div class="stats-label">Full</div>
                </div>
            </div>
        </div>

        <!-- Modern Charts Row -->
        <div class="row mb-4">
            <!-- Fill Level Chart -->
            <div class="col-xl-6 col-lg-6 mb-4">
                <div class="modern-card slide-in-left">
                    <div class="modern-card-header">
                        <h5 class="mb-0 text-gradient">
                            <i class="fas fa-chart-pie me-2"></i>Fill Level Distribution
                        </h5>
                    </div>
                    <div class="modern-card-body">
                        <div id="fillLevelChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Status Chart -->
            <div class="col-xl-6 col-lg-6 mb-4">
                <div class="modern-card slide-in-right">
                    <div class="modern-card-header">
                        <h5 class="mb-0 text-gradient">
                            <i class="fas fa-chart-donut me-2"></i>Dustbin Status
                        </h5>
                    </div>
                    <div class="modern-card-body">
                        <div id="statusChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modern Calendar and Map Row -->
        <div class="row mb-4">
            <!-- Calendar -->
            <div class="col-xl-6 col-lg-12 mb-4">
                <div class="calendar-container-modern fade-in">
                    <h5 class="mb-4 text-gradient">
                        <i class="fas fa-calendar-alt me-2"></i>Maintenance Calendar
                    </h5>
                    <div id="calendar"></div>
                </div>
            </div>
            
            <!-- Map -->
            <div class="col-xl-6 col-lg-12 mb-4">
                <div class="map-container-modern fade-in">
                    <div class="modern-card-header">
                        <h5 class="mb-0 text-gradient">
                            <i class="fas fa-map-marker-alt me-2"></i>Dustbins Map
                        </h5>
                        <small class="text-muted">South La, Accra Location</small>
                    </div>
                    <div id="map"></div>
                </div>
            </div>
        </div>
        
    </main>

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Initialize Dropdowns -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize all dropdowns
        var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
        var dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
            return new bootstrap.Dropdown(dropdownToggleEl);
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.matches('.dropdown-toggle') && !e.target.closest('.dropdown-menu')) {
                var dropdowns = document.querySelectorAll('.dropdown-menu.show');
                dropdowns.forEach(function(dropdown) {
                    dropdown.classList.remove('show');
                });
            }
        });
    });
    </script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    
    <!-- FullCalendar CSS -->
    <link href='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.css' rel='stylesheet' />
    
    <!-- FullCalendar JS -->
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@5.11.3/main.min.js'></script>
    
    <!-- Custom JavaScript -->
    <script>

        document.addEventListener('DOMContentLoaded', function() {

            // Initialize FullCalendar
            var calendarEl = document.getElementById('calendar');
            var calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                events: [
                    // Sample events - replace with actual data from your database
                    {
                        title: 'Maintenance Check',
                        start: new Date(),
                        end: new Date(new Date().setDate(new Date().getDate() + 1)),
                        backgroundColor: '#4361ee',
                        borderColor: '#3a56d4'
                    },
                    {
                        title: 'Sensor Calibration',
                        start: new Date(new Date().setDate(new Date().getDate() + 3)),
                        end: new Date(new Date().setDate(new Date().getDate() + 4)),
                        backgroundColor: '#4cc9f0',
                        borderColor: '#3aa8d4'
                    },
                    {
                        title: 'Monthly Report',
                        start: new Date(new Date().setDate(new Date().getDate() + 7)),
                        backgroundColor: '#7209b6',
                        borderColor: '#5e0798'
                    }
                ],
                eventClick: function(info) {
                    // Handle event click
                    alert('Event: ' + info.event.title + '\n' +
                          'Start: ' + info.event.start.toLocaleString() + '\n' +
                          (info.event.end ? 'End: ' + info.event.end.toLocaleString() : ''));
                },
                dateClick: function(info) {
                    // Handle date click
                    var dateStr = info.dateStr;
                    var title = prompt('Enter event title:');
                    if (title) {
                        calendar.addEvent({
                            title: title,
                            start: info.dateStr,
                            allDay: true,
                            backgroundColor: '#4caf50',
                            borderColor: '#3d8b40'
                        });
                        showAlert('Event added successfully', 'success');
                    }
                },
                editable: true,
                selectable: true,
                selectMirror: true,
                dayMaxEvents: true,
                height: 600
            });
            
            calendar.render();
            
            // Show alert function
            function showAlert(message, type) {
                var alertHtml = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
                    message +
                    '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                    '</div>';
                
                $('.container-fluid').prepend(alertHtml);
                
                // Auto-remove alert after 5 seconds
                setTimeout(function() {
                    $('.alert').alert('close');
                }, 5000);
            }
            // Initialize tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
            
            // Initialize Fill Level Chart
            const fillLevelChart = new ApexCharts(document.querySelector("#fillLevelChart"), {
                chart: {
                    type: 'donut',
                    height: '100%',
                    toolbar: {
                        show: false
                    }
                },
                series: [
                    <?php echo $emptyDustbins; ?>, 
                    <?php echo $lowDustbins; ?>, 
                    <?php echo $mediumDustbins; ?>, 
                    <?php echo $highDustbins; ?>
                ],
                labels: ['Empty (0%)', 'Low (1-39%)', 'Medium (40-79%)', 'High (80-100%)'],
                colors: ['#28a745', '#20c997', '#ffc107', '#fd7e14'],
                legend: {
                    position: 'bottom'
                },
                plotOptions: {
                    pie: {
                        donut: {
                            labels: {
                                show: true,
                                total: {
                                    show: true,
                                    label: 'Total',
                                    formatter: function (w) {
                                        return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                                    }
                                }
                            }
                        }
                    }
                },
                tooltip: {
                    y: {
                        formatter: function(value) {
                            return value + ' dustbin' + (value !== 1 ? 's' : '');
                        }
                    }
                }
            });
            
            fillLevelChart.render();
            
            // Initialize Status Chart
            const statusChart = new ApexCharts(document.querySelector("#statusChart"), {
                chart: {
                    type: 'pie',
                    height: '100%',
                    toolbar: {
                        show: false
                    }
                },
                series: [
                    <?php 
                        $active = 0;
                        $inactive = 0;
                        $maintenance = 0;
                        
                        foreach ($dustbins as $dustbin) {
                            if ($dustbin['status'] === 'active') $active++;
                            elseif ($dustbin['status'] === 'inactive') $inactive++;
                            else $maintenance++;
                        }
                        
                        echo "$active, $inactive, $maintenance";
                    ?>
                ],
                labels: ['Active', 'Inactive', 'Maintenance'],
                colors: ['#28a745', '#6c757d', '#ffc107'],
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    y: {
                        formatter: function(value) {
                            return value + ' dustbin' + (value !== 1 ? 's' : '');
                        }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val, opts) {
                        const total = opts.series.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((opts.series[opts.seriesIndex] / total) * 100);
                        return percentage + '%';
                    }
                }
            });
            
            statusChart.render();
            
            // Initialize Map - Centered on South La, Accra coordinates
            const map = L.map('map').setView([5.6037, -0.1870], 16);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Prepare a collection to track all map markers/layers we add
            const mapLayers = [];

            // Highlight: All Souls Baptist Church Library marker (draggable for precise placement)
            // Initial coords for South La, Accra location
            const libraryLatLng = [5.6037, -0.1870];
            const libraryIcon = L.icon({
                iconUrl: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
                iconSize: [36, 58],
                iconAnchor: [18, 58],
                popupAnchor: [0, -58]
            });
            const libraryMarker = L.marker(libraryLatLng, {
                icon: libraryIcon,
                draggable: true,
                title: 'Library – All Souls Baptist Church (drag to exact location)'
            }).addTo(map);
            function libraryPopup(latlng) {
                return `<b>Library – All Souls Baptist Church</b><br>South La, Accra<br><small>Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}</small><br><em>Drag the red marker to fine-tune.</em>`;
            }
            libraryMarker.bindPopup(libraryPopup(libraryMarker.getLatLng())).openPopup();
            libraryMarker.on('dragend', () => {
                const pos = libraryMarker.getLatLng();
                libraryMarker.setPopupContent(libraryPopup(pos)).openPopup();
            });
            mapLayers.push(libraryMarker);
            
            // Add markers for each dustbin
            <?php foreach ($dustbins as $dustbin): ?>
                <?php if (!empty($dustbin['latitude']) && !empty($dustbin['longitude'])): ?>
                    const marker<?php echo $dustbin['id']; ?> = L.marker([
                        <?php echo $dustbin['latitude']; ?>, 
                        <?php echo $dustbin['longitude']; ?>
                    ]).addTo(map);
                    
                    marker<?php echo $dustbin['id']; ?>.bindPopup(`
                        <b><?php echo addslashes($dustbin['location']); ?></b><br>
                        Status: <?php echo ucfirst($dustbin['status']); ?><br>
                        Fill Level: <?php echo $dustbin['fill_level']; ?>%
                    `);
                    mapLayers.push(marker<?php echo $dustbin['id']; ?>);
                <?php endif; ?>
            <?php endforeach; ?>
            
            // Fit map bounds to show all markers including the Library
            if (mapLayers.length > 0) {
                const group = L.featureGroup(mapLayers);
                map.fitBounds(group.getBounds().pad(0.1));
                // Also ensure library is emphasized by opening its popup after fit
                libraryMarker.openPopup();
            } else {
                // Fallback: ensure library is visible
                map.setView(libraryLatLng, 17);
            }
        });
    </script>
</body>
</html>
