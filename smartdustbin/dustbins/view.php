<?php
require_once '../config/database.php';

// Check if user is logged in
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Get dustbin ID from URL
$dustbinId = $_GET['id'] ?? null;

if (!$dustbinId) {
    header("Location: dustbins.php");
    exit();
}

// Get database connection
$pdo = getDBConnection();

// Fetch dustbin details
$stmt = $pdo->prepare("SELECT * FROM dustbins WHERE id = ?");
$stmt->execute([$dustbinId]);
$dustbin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$dustbin) {
    header("Location: dustbins.php?error=dustbin_not_found");
    exit();
}

// Fetch notifications for this dustbin
$stmt = $pdo->prepare("
    SELECT * FROM notifications 
    WHERE dustbin_id = ? 
    ORDER BY created_at DESC 
    LIMIT 10
");
$stmt->execute([$dustbinId]);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Set page title
$pageTitle = 'Dustbin: ' . htmlspecialchars($dustbin['location']);

// Include header
require_once '../includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">
        <i class="bi bi-trash me-2"></i>
        <?php echo htmlspecialchars($dustbin['location']); ?>
    </h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <a href="dustbins.php" class="btn btn-outline-secondary me-2">
            <i class="bi bi-arrow-left me-1"></i> Back to List
        </a>
        <a href="edit_dustbin.php?id=<?php echo $dustbin['id']; ?>" class="btn btn-primary">
            <i class="bi bi-pencil me-1"></i> Edit
        </a>
    </div>
</div>

<div class="row">
    <!-- Dustbin Details -->
    <div class="col-md-6 mb-4">
        <div class="card h-100">
            <div class="card-header">
                <h5 class="mb-0">Dustbin Details</h5>
            </div>
            <div class="card-body">
                <dl class="row">
                    <dt class="col-sm-4">ID</dt>
                    <dd class="col-sm-8"><?php echo htmlspecialchars($dustbin['id']); ?></dd>
                    
                    <dt class="col-sm-4">Location</dt>
                    <dd class="col-sm-8"><?php echo htmlspecialchars($dustbin['location']); ?></dd>
                    
                    <dt class="col-sm-4">Status</dt>
                    <dd class="col-sm-8">
                        <span class="badge bg-<?php 
                            echo $dustbin['status'] === 'active' ? 'success' : 
                                 ($dustbin['status'] === 'maintenance' ? 'warning' : 'secondary'); 
                        ?>">
                            <?php echo ucfirst(htmlspecialchars($dustbin['status'])); ?>
                        </span>
                    </dd>
                    
                    <dt class="col-sm-4">Fill Level</dt>
                    <dd class="col-sm-8">
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 20px;">
                                <div class="progress-bar 
                                    <?php 
                                        if ($dustbin['fill_level'] >= 95) echo 'bg-danger';
                                        elseif ($dustbin['fill_level'] >= 80) echo 'bg-warning';
                                        else echo 'bg-success';
                                    ?>" 
                                    role="progressbar" 
                                    style="width: <?php echo $dustbin['fill_level']; ?>%" 
                                    aria-valuenow="<?php echo $dustbin['fill_level']; ?>" 
                                    aria-valuemin="0" 
                                    aria-valuemax="100">
                                    <?php echo $dustbin['fill_level']; ?>%
                                </div>
                            </div>
                        </div>
                    </dd>
                    
                    <?php if ($dustbin['latitude'] && $dustbin['longitude']): ?>
                    <dt class="col-sm-4">Coordinates</dt>
                    <dd class="col-sm-8">
                        <a href="https://www.google.com/maps?q=<?php echo $dustbin['latitude']; ?>,<?php echo $dustbin['longitude']; ?>" 
                           target="_blank" 
                           class="text-decoration-none">
                            <i class="bi bi-geo-alt-fill me-1"></i>
                            <?php echo $dustbin['latitude']; ?>, <?php echo $dustbin['longitude']; ?>
                        </a>
                    </dd>
                    <?php endif; ?>
                    
                    <dt class="col-sm-4">Last Updated</dt>
                    <dd class="col-sm-8">
                        <span data-time="<?php echo htmlspecialchars($dustbin['last_updated']); ?>">
                            <?php echo date('M d, Y H:i', strtotime($dustbin['last_updated'])); ?>
                        </span>
                    </dd>
                    
                    <dt class="col-sm-4">Created At</dt>
                    <dd class="col-sm-8">
                        <?php echo date('M d, Y', strtotime($dustbin['created_at'])); ?>
                    </dd>
                    
                    <?php if (!empty($dustbin['notes'])): ?>
                    <dt class="col-sm-4">Notes</dt>
                    <dd class="col-sm-8"><?php echo nl2br(htmlspecialchars($dustbin['notes'])); ?></dd>
                    <?php endif; ?>
                </dl>
            </div>
        </div>
    </div>
    
    <!-- Map -->
    <div class="col-md-6 mb-4">
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Location</h5>
                <?php if ($dustbin['latitude'] && $dustbin['longitude']): ?>
                    <a href="https://www.google.com/maps?q=<?php echo $dustbin['latitude']; ?>,<?php echo $dustbin['longitude']; ?>" 
                       target="_blank" 
                       class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right me-1"></i> Open in Maps
                    </a>
                <?php endif; ?>
            </div>
            <div class="card-body p-0" style="min-height: 300px;">
                <?php if ($dustbin['latitude'] && $dustbin['longitude']): ?>
                    <div id="map" style="width: 100%; height: 300px;"></div>
                <?php else: ?>
                    <div class="d-flex align-items-center justify-content-center h-100 text-muted">
                        <div class="text-center p-4">
                            <i class="bi bi-map h1"></i>
                            <p class="mt-2 mb-0">No location data available</p>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Notifications -->
<div class="card mb-4">
    <div class="card-header">
        <h5 class="mb-0">Recent Notifications</h5>
    </div>
    <div class="card-body p-0">
        <?php if (empty($notifications)): ?>
            <div class="text-center py-4 text-muted">
                <i class="bi bi-bell-slash h1 d-block mb-2"></i>
                <p class="mb-0">No notifications found for this dustbin</p>
            </div>
        <?php else: ?>
            <div class="list-group list-group-flush">
                <?php foreach ($notifications as $notification): ?>
                    <div class="list-group-item list-group-item-action">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">
                                <i class="bi bi-<?php 
                                    echo $notification['type'] === 'alert' ? 'exclamation-triangle-fill text-danger' : 
                                         ($notification['type'] === 'warning' ? 'exclamation-triangle-fill text-warning' : 'info-circle-fill text-primary'); 
                                ?> me-2"></i>
                                <?php echo htmlspecialchars(ucfirst($notification['type'])); ?>
                            </h6>
                            <small class="text-muted" data-time="<?php echo htmlspecialchars($notification['created_at']); ?>">
                                <?php echo date('M d, Y H:i', strtotime($notification['created_at'])); ?>
                            </small>
                        </div>
                        <p class="mb-1"><?php echo nl2br(htmlspecialchars($notification['message'])); ?></p>
                    </div>
                <?php endforeach; ?>
            </div>
            <div class="card-footer text-end">
                <a href="notifications.php?dustbin_id=<?php echo $dustbin['id']; ?>" class="btn btn-sm btn-outline-primary">
                    View All Notifications
                </a>
            </div>
        <?php endif; ?>
    </div>
</div>

<!-- Chart -->
<div class="card">
    <div class="card-header">
        <h5 class="mb-0">Fill Level History</h5>
    </div>
    <div class="card-body">
        <div id="fillLevelChart" style="height: 300px;"></div>
    </div>
</div>

<?php if ($dustbin['latitude'] && $dustbin['longitude']): ?>
<script>
    // Initialize map
    document.addEventListener('DOMContentLoaded', function() {
        const map = L.map('map').setView([<?php echo $dustbin['latitude']; ?>, <?php echo $dustbin['longitude']; ?>], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add marker
        L.marker([<?php echo $dustbin['latitude']; ?>, <?php echo $dustbin['longitude']; ?>])
            .addTo(map)
            .bindPopup('<?php echo addslashes($dustbin['location']); ?>')
            .openPopup();
    });
    
    // Initialize chart
    document.addEventListener('DOMContentLoaded', function() {
        const options = {
            chart: {
                type: 'line',
                height: '100%',
                animations: {
                    enabled: false
                },
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            series: [{
                name: 'Fill Level',
                data: [
                    <?php 
                        // Generate some sample data for the chart
                        $days = 7;
                        $now = time();
                        for ($i = $days; $i >= 0; $i--) {
                            $date = date('Y-m-d', strtotime("-$i days", $now));
                            $fill = max(0, min(100, $dustbin['fill_level'] + rand(-20, 20)));
                            echo "['" . date('M j', strtotime($date)) . "', $fill],";
                        }
                    ?>
                ]
            }],
            xaxis: {
                type: 'category'
            },
            yaxis: {
                min: 0,
                max: 100,
                labels: {
                    formatter: function(value) {
                        return value + '%';
                    }
                }
            },
            stroke: {
                curve: 'smooth',
                width: 3
            },
            colors: ['#4361ee'],
            tooltip: {
                y: {
                    formatter: function(value) {
                        return value + '%';
                    }
                }
            }
        };
        
        const chart = new ApexCharts(document.querySelector("#fillLevelChart"), options);
        chart.render();
    });
</script>
<?php endif; ?>

<?php
// Include footer
require_once '../includes/footer.php';
?>
