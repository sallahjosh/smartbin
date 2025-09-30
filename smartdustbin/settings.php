<?php
require_once 'config/database.php';

// Check if user is logged in and is admin
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit();
}

// Set page title
$pageTitle = 'System Settings';

// Include header
require_once 'includes/header.php';
?>

<!-- Modern Page Header -->
<div class="container-fluid py-4">
    <div class="row align-items-center mb-4">
        <div class="col">
            <div class="d-flex align-items-center">
                <div class="me-3">
                    <div class="bg-gradient-primary rounded-circle p-3">
                        <i class="fas fa-cog text-white fs-4"></i>
                    </div>
                </div>
                <div>
                    <h1 class="h3 mb-1 text-gradient">System Settings</h1>
                    <p class="text-muted mb-0">Configure your smart dustbin monitoring system</p>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modern Settings Cards -->
<div class="container-fluid">
    <div class="row">
        <div class="col-md-6 mb-4">
            <div class="modern-card fade-in">
                <div class="modern-card-header">
                    <h5 class="mb-0 text-gradient">
                        <i class="fas fa-sliders-h me-2"></i>Application Settings
                    </h5>
                </div>
                <div class="modern-card-body">
                    <form id="appSettingsForm" class="form-modern">
                        <div class="form-group-modern">
                            <label for="siteName" class="form-label-modern">Site Name</label>
                            <input type="text" class="form-control-modern" id="siteName" value="Smart Dustbin Monitoring">
                        </div>
                        <div class="form-group-modern">
                            <label for="itemsPerPage" class="form-label-modern">Items Per Page</label>
                            <select class="form-control-modern" id="itemsPerPage">
                                <option value="10">10</option>
                                <option value="25" selected>25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        <div class="form-group-modern">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="maintenanceMode">
                                <label class="form-check-label" for="maintenanceMode">Maintenance Mode</label>
                            </div>
                        </div>
                        <button type="submit" class="btn-modern btn-primary-modern">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </form>
                </div>
            </div>
        </div>
        
        <div class="col-md-6 mb-4">
            <div class="modern-card fade-in" style="animation-delay: 0.1s;">
                <div class="modern-card-header">
                    <h5 class="mb-0 text-gradient">
                        <i class="fas fa-bell me-2"></i>Notification Settings
                    </h5>
                </div>
                <div class="modern-card-body">
                    <form id="notificationSettingsForm" class="form-modern">
                        <div class="form-group-modern">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="emailNotifications" checked>
                                <label class="form-check-label" for="emailNotifications">Enable Email Notifications</label>
                            </div>
                        </div>
                        <div class="form-group-modern">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="browserNotifications" checked>
                                <label class="form-check-label" for="browserNotifications">Enable Browser Notifications</label>
                            </div>
                        </div>
                        <div class="form-group-modern">
                            <label for="notificationEmail" class="form-label-modern">Notification Email</label>
                            <input type="email" class="form-control-modern" id="notificationEmail" value="admin@example.com">
                        </div>
                        <button type="submit" class="btn-modern btn-primary-modern">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row mt-4">
    <div class="col-12">
        <div class="card shadow">
            <div class="card-header py-3">
                <h6 class="m-0 font-weight-bold text-danger">Danger Zone</h6>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6>Reset All Data</h6>
                        <p class="mb-0 text-muted">This will delete all dustbins and related data. This action cannot be undone.</p>
                    </div>
                    <button class="btn btn-outline-danger" onclick="if(confirm('Are you sure you want to reset all data? This cannot be undone!')) { alert('This feature is not yet implemented.'); }">
                        Reset All Data
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<?php
// Include footer
require_once 'includes/footer.php';
?>
