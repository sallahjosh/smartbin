<?php
// Get current page for active state
$current_page = basename($_SERVER['PHP_SELF']);
$is_admin = isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
?>
<!-- Sidebar Overlay (for mobile) -->
<div class="sidebar-overlay"></div>

<!-- Sidebar -->
<div class="sidebar col-md-3 col-lg-2 d-md-block">
    <div class="position-sticky pt-3">
        <div class="d-flex justify-content-between align-items-center px-3 mb-4">
            <div class="text-center w-100">
                <h4 class="text-white mb-0">Smart Dustbin</h4>
                <p class="text-white-50 small mb-0">Monitoring System</p>
            </div>
            <button class="btn btn-link text-white d-md-none" id="closeSidebar">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <ul class="nav flex-column">
            <?php 
            $pages = [
                'index.php' => ['Dashboard', 'bi-speedometer2'],
                'dustbins/index.php' => ['Dustbins', 'bi-trash'],
                'analytics.php' => ['Analytics', 'bi-graph-up']
            ];
            
            // Admin only pages
            if ($is_admin) {
                $pages['users.php'] = ['Users', 'bi-people'];
                $pages['settings.php'] = ['Settings', 'bi-gear'];
            }
            
            // Generate navigation items
            foreach ($pages as $url => $page) {
                $is_active = ($current_page === $url || strpos($current_page, basename($url)) === 0);
                echo '<li class="nav-item">';
                echo '<a class="nav-link' . ($is_active ? ' active' : '') . '" href="/smartdustbin/' . $url . '">';
                echo '<i class="bi ' . $page[1] . '"></i> ' . $page[0];
                echo '</a></li>';
            }
            ?>
            <li class="nav-item mt-4">
                <a class="nav-link text-danger" href="/smartdustbin/logout.php">
                    <i class="bi bi-box-arrow-right"></i> Logout
                </a>
            </li>
        </ul>
    </div>
</div>
