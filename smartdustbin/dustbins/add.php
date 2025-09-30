<?php
require_once '../config/database.php';

// Check if user is logged in
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Get form data
        $location = $_POST['location'] ?? '';
        $status = $_POST['status'] ?? 'active';
        $fillLevel = isset($_POST['fill_level']) ? (int)$_POST['fill_level'] : 0;
        $latitude = !empty($_POST['latitude']) ? (float)$_POST['latitude'] : null;
        $longitude = !empty($_POST['longitude']) ? (float)$_POST['longitude'] : null;
        $notes = $_POST['notes'] ?? '';
        
        // Validate required fields
        if (empty($location)) {
            throw new Exception('Location is required');
        }
        
        // Insert new dustbin into database
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            INSERT INTO dustbins (location, status, fill_level, latitude, longitude, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $location,
            $status,
            $fillLevel,
            $latitude,
            $longitude,
            $notes
        ]);
        
        // Get the ID of the newly created dustbin
        $dustbinId = $pdo->lastInsertId();
        
        // Redirect to view page with success message
        header("Location: view_dustbin.php?id=$dustbinId&created=1");
        exit();
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// Set page title
$pageTitle = 'Add New Dustbin';

// Include header
require_once '../includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">
        <i class="bi bi-plus-circle me-2"></i>
        Add New Dustbin
    </h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <a href="dustbins.php" class="btn btn-outline-secondary me-2">
            <i class="bi bi-arrow-left me-1"></i> Back to List
        </a>
    </div>
</div>

<div class="row">
    <div class="col-md-8 mx-auto">
        <div class="card">
            <div class="card-body">
                <?php if (isset($error)): ?>
                    <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                
                <form id="addDustbinForm" method="POST" action="" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label for="location" class="form-label">Location Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="location" name="location" required>
                        <div class="invalid-feedback">
                            Please provide a location name.
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="status" class="form-label">Status <span class="text-danger">*</span></label>
                            <select class="form-select" id="status" name="status" required>
                                <option value="active" selected>Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="fill_level" class="form-label">Fill Level (%) <span class="text-danger">*</span></label>
                            <input type="number" class="form-control" id="fill_level" name="fill_level" 
                                   min="0" max="100" value="0" required>
                            <div class="invalid-feedback">
                                Please provide a fill level between 0 and 100.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="latitude" class="form-label">Latitude</label>
                            <input type="number" step="any" class="form-control" id="latitude" name="latitude">
                            <div class="form-text">Leave blank to use current location</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="longitude" class="form-label">Longitude</label>
                            <input type="number" step="any" class="form-control" id="longitude" name="longitude">
                            <button type="button" id="getLocationBtn" class="btn btn-sm btn-outline-secondary mt-1">
                                <i class="bi bi-geo-alt"></i> Use Current Location
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes</label>
                        <textarea class="form-control" id="notes" name="notes" rows="3"></textarea>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="dustbins.php" class="btn btn-outline-secondary me-md-2">
                            <i class="bi bi-x-circle me-1"></i> Cancel
                        </a>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-save me-1"></i> Add Dustbin
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Map for location selection -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Location on Map</h5>
            </div>
            <div class="card-body p-0" style="height: 400px;">
                <div id="map" style="width: 100%; height: 100%;"></div>
            </div>
        </div>
    </div>
</div>

<script>
    // Form validation
    (function () {
        'use strict'
        
        // Fetch all the forms we want to apply custom Bootstrap validation styles to
        var forms = document.querySelectorAll('.needs-validation')
        
        // Loop over them and prevent submission
        Array.prototype.slice.call(forms).forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                
                form.classList.add('was-validated')
            }, false)
        })
    })()
    
    // Initialize map
    document.addEventListener('DOMContentLoaded', function() {
        const defaultLat = 5.6037;  // Default to Accra, Ghana
        const defaultLng = -0.1870;
        
        const map = L.map('map').setView([defaultLat, defaultLng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        let marker;
        
        // Add click event to update marker position
        map.on('click', function(e) {
            const { lat, lng } = e.latlng;
            updateMarkerPosition(lat, lng);
        });
        
        // Handle current location button
        document.getElementById('getLocationBtn').addEventListener('click', function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const { latitude, longitude } = position.coords;
                        updateMarkerPosition(latitude, longitude);
                        map.setView([latitude, longitude], 15);
                    },
                    function(error) {
                        alert('Unable to retrieve your location. Please enter coordinates manually.');
                        console.error('Geolocation error:', error);
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser. Please enter coordinates manually.');
            }
        });
        
        // Update marker position and form fields
        function updateMarkerPosition(lat, lng) {
            // Remove existing marker if any
            if (marker) {
                map.removeLayer(marker);
            }
            
            // Add new marker
            marker = L.marker([lat, lng], {
                draggable: true
            }).addTo(map);
            
            // Update form fields
            document.getElementById('latitude').value = lat.toFixed(6);
            document.getElementById('longitude').value = lng.toFixed(6);
            
            // Update marker position on drag
            marker.on('dragend', function(e) {
                const { lat, lng } = e.target.getLatLng();
                document.getElementById('latitude').value = lat.toFixed(6);
                document.getElementById('longitude').value = lng.toFixed(6);
            });
        }
        
        // Update marker when coordinates are manually changed
        const updateMarkerFromInputs = () => {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                updateMarkerPosition(lat, lng);
                map.setView([lat, lng], 15);
            }
        };
        
        document.getElementById('latitude').addEventListener('change', updateMarkerFromInputs);
        document.getElementById('longitude').addEventListener('change', updateMarkerFromInputs);
    });
</script>

<?php
// Include footer
require_once 'includes/footer.php';
?>
