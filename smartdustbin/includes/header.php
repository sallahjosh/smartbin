<?php
// Start the session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in, if not redirect to login page
if (!isset($_SESSION['user_id'])) {
    header("Location: /smartdustbin/login.php");
    exit();
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
    <title><?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) : 'Smart Dustbin Monitoring'; ?></title>
    
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
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    
    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css"/>
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.bootstrap5.min.css"/>
    
    <!-- DataTables JS -->
    <script type="text/javascript" src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.bootstrap5.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>
    
    <!-- Custom JavaScript -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const closeSidebar = document.getElementById('closeSidebar');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        const mainContent = document.querySelector('.main-content');
        
        // Toggle sidebar on button click
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.innerWidth >= 768) {
                    // Toggle collapsed state on desktop
                    document.body.classList.toggle('sidebar-collapsed');
                    // Save preference to localStorage
                    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
                    localStorage.setItem('sidebarCollapsed', isCollapsed);
                } else {
                    // Toggle open state on mobile
                    document.body.classList.toggle('sidebar-open');
                }
            });
        }
        
        // Close sidebar when clicking the close button
        if (closeSidebar) {
            closeSidebar.addEventListener('click', function() {
                if (window.innerWidth >= 768) {
                    document.body.classList.add('sidebar-collapsed');
                } else {
                    document.body.classList.remove('sidebar-open');
                }
            });
        }
        
        // Close sidebar when clicking on overlay (mobile)
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                document.body.classList.remove('sidebar-open');
            });
        }
        
        // Close sidebar when clicking on a nav link (works on all screen sizes)
        const navLinks = document.querySelectorAll('.sidebar .nav-link, .sidebar .dropdown-item');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Close sidebar on mobile
                if (window.innerWidth < 768) {
                    document.body.classList.remove('sidebar-open');
                }
                // On desktop, collapse the sidebar if it's not already collapsed
                else if (!document.body.classList.contains('sidebar-collapsed')) {
                    document.body.classList.add('sidebar-collapsed');
                    localStorage.setItem('sidebarCollapsed', 'true');
                }
            });
        });
        
        // Load saved sidebar state
        if (localStorage.getItem('sidebarCollapsed') === 'true' && window.innerWidth >= 768) {
            document.body.classList.add('sidebar-collapsed');
        }
        
        // Handle window resize
        function handleResize() {
            if (window.innerWidth >= 768) {
                // On desktop, make sure sidebar is visible (unless explicitly collapsed)
                document.body.classList.remove('sidebar-open');
                if (localStorage.getItem('sidebarCollapsed') === 'true') {
                    document.body.classList.add('sidebar-collapsed');
                } else {
                    document.body.classList.remove('sidebar-collapsed');
                }
            } else {
                // On mobile, always hide the sidebar by default
                document.body.classList.remove('sidebar-collapsed');
            }
        }
        
        // Add resize event listener
        window.addEventListener('resize', handleResize);
        
        // Initialize on load
        handleResize();
    });
    </script>
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/smartdustbin/assets/css/styles.css">
    <link rel="stylesheet" href="/smartdustbin/assets/css/modern-ui.css">
    <link rel="stylesheet" href="/smartdustbin/assets/css/dashboard.css">
    
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
        
        /* Sidebar styling */
        .sidebar {
            min-height: 100vh;
            background: linear-gradient(180deg, #1a237e 0%, #0d47a1 100%);
            color: #fff;
            transition: all 0.3s;
            box-shadow: 4px 0 6px -1px rgba(0, 0, 0, 0.1), 2px 0 4px -1px rgba(0, 0, 0, 0.06);
            position: fixed;
            width: 250px;
            z-index: 1000;
        }
        
        .sidebar .nav-link {
            color: rgba(255, 255, 255, 0.8);
            border-radius: 0.375rem;
            margin: 0.25rem 0.5rem;
            padding: 0.5rem 1rem;
            transition: all 0.2s;
        }
        
        .sidebar .nav-link:hover, .sidebar .nav-link.active {
            background-color: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        
        .sidebar .nav-link i {
            width: 1.5rem;
            text-align: center;
            margin-right: 0.5rem;
        }
        
        /* Main content area */
        .main-content {
            margin-left: 250px;
            padding: 20px;
            transition: all 0.3s;
            min-height: 100vh;
        }
        
        /* Card styling */
        .card {
            border: none;
            border-radius: 0.5rem;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
            margin-bottom: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
        }
        
        .card-header {
            background-color: #fff;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            font-weight: 600;
            padding: 1rem 1.25rem;
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
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
    </style>
</head>
<body>
    <!-- Sidebar Toggle Button (Visible on all screens) -->
    <button class="sidebar-toggle d-none d-md-block" id="sidebarToggle">
        <i class="bi bi-list"></i>
    </button>

    <?php include __DIR__ . '/sidebar.php'; ?>

    <!-- Main Content -->
    <main class="main-content">
        <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4 d-md-none">
            <div class="container-fluid">
                <button class="btn btn-link" type="button" id="sidebarToggle">
                    <i class="bi bi-list"></i>
                </button>
                <span class="navbar-brand mx-auto">Smart Dustbin</span>
                <div class="dropdown">
                    <button class="btn btn-link text-dark" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-person-circle"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                        <li><a class="dropdown-item" href="#">Profile</a></li>
                        <li><a class="dropdown-item" href="/smartdustbin/logout.php">Logout</a></li>
                    </ul>
                </div>
            </div>
        </nav>
