<?php
require_once '../config/database.php';

// Check if user is logged in
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit();
}

// Get user role for permission checks
$userRole = $_SESSION['role'] ?? 'user';
$isAdmin = ($userRole === 'admin');

// Get database connection
$pdo = getDBConnection();

// Handle delete request
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $dustbinId = $data['id'] ?? null;
    
    if ($dustbinId) {
        try {
            $stmt = $pdo->prepare("DELETE FROM dustbins WHERE id = ?");
            $stmt->execute([$dustbinId]);
            
            if ($stmt->rowCount() > 0) {
                header('Content-Type: application/json');
                echo json_encode(['success' => true]);
                exit();
            }
        } catch (PDOException $e) {
            error_log("Error deleting dustbin: " . $e->getMessage());
        }
    }
    
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Failed to delete dustbin']);
    exit();
}

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
    
} catch(PDOException $e) {
    $error = "Error fetching data: " . $e->getMessage();
}

// Set page title
$pageTitle = 'Manage Dustbins';

// Include header
require_once '../includes/header.php';
?>

<!-- Modern Page Header -->
<div class="container-fluid py-4">
    <div class="row align-items-center mb-4">
        <div class="col">
            <div class="d-flex align-items-center">
                <div class="me-3">
                    <div class="bg-gradient-primary rounded-circle p-3">
                        <i class="fas fa-trash-alt text-white fs-4"></i>
                    </div>
                </div>
                <div>
                    <h1 class="h3 mb-1 text-gradient">Manage Dustbins</h1>
                    <p class="text-muted mb-0">Monitor and manage all your smart dustbins in one place</p>
                </div>
            </div>
        </div>
        <div class="col-auto">
            <div class="d-flex gap-2">
                <?php if ($isAdmin): ?>
                <a href="add.php" class="btn-modern btn-primary-modern">
                    <i class="fas fa-plus"></i> Add Dustbin
                </a>
                <?php endif; ?>
                <a href="../dashboard.php" class="btn-modern btn-outline-modern">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Modern Alerts -->
<div class="container-fluid">
    <?php if (isset($_GET['created'])): ?>
        <div class="alert-modern alert-success-modern fade-in">
            <i class="fas fa-check-circle"></i>
            <span>Dustbin created successfully!</span>
        </div>
    <?php endif; ?>

    <?php if (isset($_GET['updated'])): ?>
        <div class="alert-modern alert-info-modern fade-in">
            <i class="fas fa-info-circle"></i>
            <span>Dustbin updated successfully!</span>
        </div>
    <?php endif; ?>
</div>

<!-- Modern Stats Cards -->
<div class="container-fluid">
    <div class="row mb-4">
        <!-- Total Dustbins -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="stats-card-modern fade-in">
                <div class="stats-icon bg-gradient-primary text-white">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <div class="stats-value"><?php echo $totalDustbins; ?></div>
                <div class="stats-label">Total Dustbins</div>
            </div>
        </div>

        <!-- Active Dustbins -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="stats-card-modern fade-in" style="animation-delay: 0.1s;">
                <div class="stats-icon bg-gradient-success text-white">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stats-value"><?php echo $activeDustbins; ?></div>
                <div class="stats-label">Active Dustbins</div>
            </div>
        </div>

        <!-- Warning Dustbins -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="stats-card-modern fade-in" style="animation-delay: 0.2s;">
                <div class="stats-icon bg-gradient-warning text-white">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stats-value"><?php echo $warningDustbins; ?></div>
                <div class="stats-label">Need Attention</div>
            </div>
        </div>

        <!-- Full Dustbins -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="stats-card-modern fade-in" style="animation-delay: 0.3s;">
                <div class="stats-icon bg-gradient-danger text-white">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="stats-value"><?php echo $fullDustbins; ?></div>
                <div class="stats-label">Full Dustbins</div>
            </div>
        </div>
    </div>
</div>
</div>

<!-- Modern Dustbin List -->
<div class="container-fluid">
    <div class="modern-card">
        <div class="modern-card-header">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0 text-gradient">
                    <i class="fas fa-list me-2"></i>Dustbins List
                </h5>
                <div class="d-flex gap-2">
                    <?php if ($isAdmin): ?>
                    <button type="button" class="btn-modern btn-warning-modern" id="bulkMaintenanceBtn" disabled>
                        <i class="fas fa-tools"></i> Request Maintenance
                    </button>
                    <button type="button" class="btn-modern btn-danger-modern" id="bulkEmptyBtn" disabled>
                        <i class="fas fa-trash-alt"></i> Request Emptying
                    </button>
                    <a href="add.php" class="btn-modern btn-primary-modern">
                        <i class="fas fa-plus"></i> Add Dustbin
                    </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <div class="modern-card-body">
            <?php if (empty($dustbins)): ?>
                <div class="alert-modern alert-info-modern">
                    <i class="fas fa-info-circle"></i>
                    <span>No dustbins found. Add your first dustbin to get started!</span>
                </div>
            <?php else: ?>
                <div class="table-responsive">
                    <table id="dustbinsTable" class="table-modern">
                    <thead>
                        <tr>
                            <?php if ($isAdmin): ?>
                            <th>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="selectAllDustbins">
                                </div>
                            </th>
                            <?php endif; ?>
                            <th>ID</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Fill Level</th>
                            <?php if ($isAdmin): ?>
                            <th>Contact Numbers</th>
                            <?php endif; ?>
                            <th>Last Updated</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($dustbins as $dustbin): ?>
                            <tr>
                                <?php if ($isAdmin): ?>
                                <td>
                                    <div class="form-check">
                                        <input class="form-check-input dustbin-checkbox" type="checkbox" value="<?php echo $dustbin['id']; ?>">
                                    </div>
                                </td>
                                <?php endif; ?>
                                <td><?php echo $dustbin['id']; ?></td>
                                <td>
                                    <a href="view.php?id=<?php echo $dustbin['id']; ?>">
                                        <?php echo htmlspecialchars($dustbin['location']); ?>
                                    </a>
                                </td>
                                <td>
                                    <span class="badge bg-<?php 
                                        echo $dustbin['status'] === 'active' ? 'success' : 
                                             ($dustbin['status'] === 'inactive' ? 'secondary' : 
                                             ($dustbin['status'] === 'maintenance' ? 'warning' : 'danger')); 
                                    ?>">
                                        <?php echo ucfirst(str_replace('_', ' ', $dustbin['status'])); ?>
                                    </span>
                                </td>
                                <td>
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
                                </td>
                                <?php if ($isAdmin): ?>
                                <td>
                                    <?php if (!empty($dustbin['contact_numbers'])): ?>
                                        <?php 
                                        $contacts = array_map('trim', explode(',', $dustbin['contact_numbers']));
                                        $displayContacts = array_slice($contacts, 0, 2); // Show first 2 contacts
                                        ?>
                                        <div class="text-muted small">
                                            <?php foreach ($displayContacts as $contact): ?>
                                                <div><?php echo htmlspecialchars($contact); ?></div>
                                            <?php endforeach; ?>
                                            <?php if (count($contacts) > 2): ?>
                                                <div class="text-muted">+<?php echo count($contacts) - 2; ?> more</div>
                                            <?php endif; ?>
                                        </div>
                                    <?php else: ?>
                                        <span class="text-muted small">Default contacts</span>
                                    <?php endif; ?>
                                </td>
                                <?php endif; ?>
                                <td data-time="<?php echo htmlspecialchars($dustbin['last_updated']); ?>">
                                    <?php echo date('M j, Y g:i A', strtotime($dustbin['last_updated'])); ?>
                                </td>
                                <td>
                                    <div class="d-flex gap-1" role="group">
                                        <button type="button" class="btn-modern btn-warning-modern btn-maintenance" data-id="<?php echo $dustbin['id']; ?>" title="Request Maintenance">
                                            <i class="fas fa-tools"></i>
                                        </button>
                                        <button type="button" class="btn-modern btn-danger-modern btn-empty" data-id="<?php echo $dustbin['id']; ?>" title="Request Emptying">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                        <?php if ($isAdmin): ?>
                                        <a href="edit.php?id=<?php echo $dustbin['id']; ?>" class="btn-modern btn-outline-modern" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </a>
                                        <button class="btn-modern btn-outline-modern delete-dustbin" data-id="<?php echo $dustbin['id']; ?>" title="Delete" style="border-color: var(--danger); color: var(--danger);">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<!-- JavaScript for Dustbin Management -->
<script>
// Function to get contact numbers for a dustbin
async function getContactNumbers(dustbinId) {
    try {
        const response = await fetch(`/smartdustbin/api/get_contacts.php?id=${dustbinId}`);
        const result = await response.json();
        return result.success ? result.contacts : [];
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return [];
    }
}

// Function to send notification with enhanced messaging
async function sendNotification(dustbinIds, type) {
    try {
        console.log('Sending notification for dustbin IDs:', dustbinIds, 'Type:', type);
        showAlert(`Sending ${type} request...`, 'info');
        
        // Get dustbin details for better messaging
        const dustbinId = Array.isArray(dustbinIds) ? dustbinIds[0] : dustbinIds;
        const contacts = await getContactNumbers(dustbinId);
        
        const response = await fetch('/smartdustbin/api/send_notification.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dustbin_id: dustbinId,
                type: type
            })
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result && result.success) {
            const contactInfo = contacts.length > 0 ? ` to ${contacts.length} contact(s)` : '';
            showAlert(`Successfully sent ${type} request${contactInfo} for dustbin ID ${dustbinId}`, 'success');
            // Don't reload immediately, let user see the success message
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } else {
            const serverMsg = result && result.message ? result.message : 'Failed to send notification';
            throw new Error(serverMsg);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(`Error: ${error.message}`, 'danger');
    } finally {
        // No-op for now; placeholder to re-enable buttons if we add disabling
    }
}

// Show alert message (robust insertion with fallbacks)
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Try common containers in order
    const containerFluid = document.querySelector('.container-fluid');
    const mainContent = document.querySelector('.main-content');
    const target = containerFluid || mainContent || document.body;
    
    if (target.firstChild) {
        target.insertBefore(alertDiv, target.firstChild);
    } else {
        target.appendChild(alertDiv);
    }

    // Auto-remove the alert after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

$(document).ready(function() {
    console.log('Document ready - initializing dustbin management');
    
    // Handle dustbin selection
    const selectAllCheckbox = document.getElementById('selectAllDustbins');
    const dustbinCheckboxes = document.querySelectorAll('.dustbin-checkbox');
    const bulkMaintenanceBtn = document.getElementById('bulkMaintenanceBtn');
    const bulkEmptyBtn = document.getElementById('bulkEmptyBtn');
    
    console.log('Found elements:', {
        selectAllCheckbox: !!selectAllCheckbox,
        dustbinCheckboxes: dustbinCheckboxes.length,
        bulkMaintenanceBtn: !!bulkMaintenanceBtn,
        bulkEmptyBtn: !!bulkEmptyBtn
    });

    // Toggle select all checkboxes
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            dustbinCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            updateBulkActionButtons();
        });
    }

    // Update bulk action buttons state based on selection
    function updateBulkActionButtons() {
        const selectedCount = document.querySelectorAll('.dustbin-checkbox:checked').length;
        if (bulkMaintenanceBtn) bulkMaintenanceBtn.disabled = selectedCount === 0;
        if (bulkEmptyBtn) bulkEmptyBtn.disabled = selectedCount === 0;
    }

    // Add event listeners to individual checkboxes
    dustbinCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionButtons);
    });

    // Handle bulk maintenance button click
    if (bulkMaintenanceBtn) {
        bulkMaintenanceBtn.addEventListener('click', function() {
            const selectedDustbins = Array.from(document.querySelectorAll('.dustbin-checkbox:checked'))
                .map(checkbox => checkbox.value);
            
            if (selectedDustbins.length > 0) {
                if (confirm(`Request maintenance for ${selectedDustbins.length} selected dustbin(s)?`)) {
                    sendNotification(selectedDustbins, 'maintenance');
                }
            }
        });
    }

    // Handle bulk empty button click
    if (bulkEmptyBtn) {
        bulkEmptyBtn.addEventListener('click', function() {
            const selectedDustbins = Array.from(document.querySelectorAll('.dustbin-checkbox:checked'))
                .map(checkbox => checkbox.value);
            
            if (selectedDustbins.length > 0) {
                if (confirm(`Request emptying for ${selectedDustbins.length} selected dustbin(s)?`)) {
                    sendNotification(selectedDustbins, 'empty');
                }
            }
        });
    }

    // Delegated handler for maintenance button
    $(document).on('click', '.btn-maintenance', async function(e) {
        e.preventDefault();
        const dustbinId = $(this).attr('data-id');
        console.log('Maintenance button clicked for ID:', dustbinId);
        const contacts = await getContactNumbers(dustbinId);
        const contactInfo = contacts.length > 0 ? `\n\nThis will send a message to ${contacts.length} contact(s): ${contacts.join(', ')}` : '';
        if (confirm(`Request maintenance for Dustbin ID ${dustbinId}?${contactInfo}`)) {
            sendNotification([dustbinId], 'maintenance');
        }
    });
    
    // Test: Add a simple click test to verify buttons are working
    setTimeout(() => {
        const testButtons = document.querySelectorAll('.btn-maintenance, .btn-empty');
        console.log('Test: Found', testButtons.length, 'action buttons on page');
        testButtons.forEach((btn, i) => {
            console.log(`Test: Button ${i + 1} - Class: ${btn.className}, Data-id: ${btn.getAttribute('data-id')}`);
        });
    }, 1000);

    // Delegated handler for empty button
    $(document).on('click', '.btn-empty', async function(e) {
        e.preventDefault();
        const dustbinId = $(this).attr('data-id');
        console.log('Empty button clicked for ID:', dustbinId);
        const contacts = await getContactNumbers(dustbinId);
        const contactInfo = contacts.length > 0 ? `\n\nThis will send a message to ${contacts.length} contact(s): ${contacts.join(', ')}` : '';
        if (confirm(`Request emptying for Dustbin ID ${dustbinId}?${contactInfo}`)) {
            sendNotification([dustbinId], 'empty');
        }
    });

    // Initialize DataTable once
    var table = $('#dustbinsTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'copyHtml5',
                className: 'btn btn-sm btn-outline-secondary',
                text: '<i class="bi bi-clipboard me-1"></i> Copy',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4] // Exclude actions column
                }
            },
            {
                extend: 'excelHtml5',
                className: 'btn btn-sm btn-outline-success',
                text: '<i class="bi bi-file-excel me-1"></i> Excel',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4]
                }
            },
            {
                extend: 'pdfHtml5',
                className: 'btn btn-sm btn-outline-danger',
                text: '<i class="bi bi-file-pdf me-1"></i> PDF',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4]
                }
            },
            {
                extend: 'print',
                className: 'btn btn-sm btn-outline-info',
                text: '<i class="bi bi-printer me-1"></i> Print',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4]
                },
                customize: function (win) {
                    $(win.document.body).css('font-size', '10pt');
                    $(win.document.body).find('table').addClass('compact').css('font-size', 'inherit');
                    $(win.document.body).find('h1').text('Dustbins List - ' + new Date().toLocaleDateString());
                }
            }
        ],
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']],
        order: [[0, 'desc']],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search dustbins...",
            paginate: {
                previous: '<i class="bi bi-chevron-left"></i>',
                next: '<i class="bi bi-chevron-right"></i>'
            }
        },
        initComplete: function() {
            $('.dataTables_wrapper .btn').removeClass('btn-secondary');
        }
    });
    
    // Add margin between buttons
    $('.dt-buttons').addClass('mb-3');
    
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Handle delete buttons
    $('#dustbinsTable').on('click', '.delete-dustbin', function() {
        var dustbinId = $(this).data('id');
        var dustbinName = $(this).data('name');
        
        if (confirm('Are you sure you want to delete "' + dustbinName + '"?')) {
            var row = $(this).closest('tr');
            
            $.ajax({
                url: 'delete.php',
                type: 'POST',
                data: { id: dustbinId },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        table.row(row).remove().draw(false);
                        showAlert('Dustbin deleted successfully', 'success');
                    } else {
                        showAlert(response.message || 'Failed to delete dustbin', 'danger');
                    }
                },
                error: function() {
                    showAlert('An error occurred while deleting the dustbin', 'danger');
                }
            });
        }
    });
});
</script>

<?php
// Include footer
require_once '../includes/footer.php';
?>
