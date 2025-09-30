<?php
require_once 'config/database.php';

// Check if user is logged in
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Fetch dustbins data
$dustbins = [];
try {
    $pdo = getDBConnection();
    $stmt = $pdo->query("SELECT id, location, latitude, longitude, status, fill_level FROM dustbins");
    $dustbins = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $error = "Error fetching dustbins: " . $e->getMessage();
}

// Set page title
$pageTitle = 'Analytics';

// Include header
require_once 'includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Analytics</h1>
</div>

<div class="row">
    <div class="col-md-6 mb-4">
        <div class="card shadow h-100">
            <div class="card-header py-3">
                <h6 class="m-0 font-weight-bold">Dustbin Status Distribution</h6>
            </div>
            <div class="card-body position-relative" style="height: 300px;">
                <div class="chart-container" style="position: relative; height: 100%; width: 100%;">
                    <canvas id="pieChart" style="display: block; width: 100%; height: 100%;"></canvas>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-6 mb-4">
        <div class="card shadow h-100">
            <div class="card-header py-3">
                <h6 class="m-0 font-weight-bold">Monthly Fill Level Trend</h6>
            </div>
            <div class="card-body position-relative" style="height: 300px;">
                <div class="chart-container" style="position: relative; height: 100%; width: 100%;">
                    <canvas id="lineChart" style="display: block; width: 100%; height: 100%;"></canvas>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
// Initialize charts when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Pie Chart - Status Distribution
    const pieCtx = document.getElementById('pieChart');
    pieCtx.height = 300;
    const pieChart = new Chart(pieCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Empty', 'Partially Full', 'Full', 'Maintenance'],
            datasets: [{
                data: [
                    <?php 
                    $counts = ['empty' => 0, 'partial' => 0, 'full' => 0, 'maintenance' => 0];
                    foreach ($dustbins as $dustbin) {
                        if ($dustbin['status'] === 'empty') $counts['empty']++;
                        elseif ($dustbin['status'] === 'partial') $counts['partial']++;
                        elseif ($dustbin['status'] === 'full') $counts['full']++;
                        elseif ($dustbin['status'] === 'maintenance') $counts['maintenance']++;
                    }
                    echo $counts['empty'] . ', ' . $counts['partial'] . ', ' . $counts['full'] . ', ' . $counts['maintenance'];
                    ?>
                ],
                backgroundColor: [
                    '#28a745', // Empty - green
                    '#ffc107', // Partial - yellow
                    '#dc3545', // Full - red
                    '#6c757d'  // Maintenance - gray
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            responsiveAnimationDuration: 0,
            animation: {
                duration: 1000,
                onComplete: function() {
                    this.options.animation.onComplete = null;
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Line Chart - Fill Level Trend
    const lineCtx = document.getElementById('lineChart');
    lineCtx.height = 300;
    const lineChart = new Chart(lineCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Average Fill Level %',
                data: [42, 45, 48, 51, 55, 60, 65, 62, 58, 53, 48, 44],
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#4361ee',
                pointBorderColor: '#fff',
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#4361ee',
                pointHoverBorderColor: '#fff',
                pointHitRadius: 10,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            responsiveAnimationDuration: 0,
            animation: {
                duration: 1000,
                onComplete: function() {
                    this.options.animation.onComplete = null;
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Fill Level %',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            elements: {
                line: {
                    borderJoinStyle: 'round'
                }
            }
        }
    });
});
</script>

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>

<?php
// Include footer
require_once 'includes/footer.php';
?>
