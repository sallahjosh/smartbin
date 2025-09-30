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
        
        // Update dustbin in database
        $stmt = $pdo->prepare("
            UPDATE dustbins 
            SET location = ?, 
                status = ?, 
                fill_level = ?, 
                latitude = ?, 
                longitude = ?, 
                notes = ?,
                last_updated = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        
        $stmt->execute([
            $location,
            $status,
            $fillLevel,
            $latitude,
            $longitude,
            $notes,
            $dustbinId
        ]);
        
        // Redirect to view page with success message
        header("Location: view_dustbin.php?id=$dustbinId&updated=1");
        exit();
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// Fetch dustbin details
$stmt = $pdo->prepare("SELECT * FROM dustbins WHERE id = ?");
$stmt->execute([$dustbinId]);
$dustbin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$dustbin) {
    header("Location: dustbins.php?error=dustbin_not_found");
    exit();
}

// Set page title
$pageTitle = 'Edit Dustbin: ' . htmlspecialchars($dustbin['location']);

// Include header
require_once '../includes/header.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">
        <i class="bi bi-pencil-square me-2"></i>
        Edit Dustbin
    </h1>
    <div class="btn-toolbar mb-2 mb-md-0">
        <a href="view_dustbin.php?id=<?php echo $dustbin['id']; ?>" class="btn btn-outline-secondary me-2">
            <i class="bi bi-x-circle me-1"></i> Cancel
        </a>
        <button type="submit" form="editDustbinForm" class="btn btn-primary">
            <i class="bi bi-save me-1"></i> Save Changes
        </button>
    </div>
</div>

<div class="row">
    <div class="col-md-8 mx-auto">
        <div class="card">
            <div class="card-body">
                <?php if (isset($error)): ?>
                    <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                
                <form id="editDustbinForm" method="POST" action="" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label for="location" class="form-label">Location Name</label>
                        <input type="text" class="form-control" id="location" name="location" 
                               value="<?php echo htmlspecialchars($dustbin['location']); ?>" required>
                        <div class="invalid-feedback">
                            Please provide a location name.
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="status" class="form-label">Status</label>
                            <select class="form-select" id="status" name="status" required>
                                <option value="active" <?php echo $dustbin['status'] === 'active' ? 'selected' : ''; ?>>Active</option>
                                <option value="inactive" <?php echo $dustbin['status'] === 'inactive' ? 'selected' : ''; ?>>Inactive</option>
                                <option value="maintenance" <?php echo $dustbin['status'] === 'maintenance' ? 'selected' : ''; ?>>Maintenance</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="fill_level" class="form-label">Fill Level (%)</label>
                            <input type="number" class="form-control" id="fill_level" name="fill_level" 
                                   min="0" max="100" value="<?php echo (int)$dustbin['fill_level']; ?>" required>
                            <div class="invalid-feedback">
                                Please provide a fill level between 0 and 100.
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="latitude" class="form-label">Latitude</label>
                            <input type="number" step="any" class="form-control" id="latitude" name="latitude" 
                                   value="<?php echo $dustbin['latitude'] !== null ? htmlspecialchars($dustbin['latitude']) : ''; ?>">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="longitude" class="form-label">Longitude</label>
                            <input type="number" step="any" class="form-control" id="longitude" name="longitude" 
                                   value="<?php echo $dustbin['longitude'] !== null ? htmlspecialchars($dustbin['longitude']) : ''; ?>">
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="maps_link" class="form-label">Paste Google Maps link</label>
                        <input type="text" class="form-control" id="maps_link" placeholder="Paste a Google Maps URL (e.g., https://maps.google.com/...)">
                        <div class="form-text">We will extract coordinates automatically from most Google Maps links.</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="notes" class="form-label">Notes</label>
                        <textarea class="form-control" id="notes" name="notes" rows="3"><?php echo htmlspecialchars($dustbin['notes'] ?? ''); ?></textarea>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="view_dustbin.php?id=<?php echo $dustbin['id']; ?>" class="btn btn-outline-secondary me-md-2">
                            <i class="bi bi-x-circle me-1"></i> Cancel
                        </a>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-save me-1"></i> Save Changes
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
        const defaultLat = <?php echo $dustbin['latitude'] ?: '5.6037'; ?>;  // Default to Accra, Ghana
        const defaultLng = <?php echo $dustbin['longitude'] ?: '-0.1870'; ?>;
        
        const map = L.map('map').setView([defaultLat, defaultLng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        let marker;
        
        // Add marker if coordinates exist
        if (<?php echo $dustbin['latitude'] ? 'true' : 'false'; ?>) {
            marker = L.marker([defaultLat, defaultLng], {
                draggable: true
            }).addTo(map);
            
            // Update form fields when marker is dragged
            marker.on('dragend', function(e) {
                const { lat, lng } = e.target.getLatLng();
                document.getElementById('latitude').value = lat.toFixed(6);
                document.getElementById('longitude').value = lng.toFixed(6);
            });
        }
        
        // Add click event to update marker position
        map.on('click', function(e) {
            const { lat, lng } = e.latlng;
            
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
        });
        
        // Update marker when coordinates are manually changed
        const updateMarkerFromInputs = () => {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                if (marker) {
                    marker.setLatLng([lat, lng]);
                } else {
                    marker = L.marker([lat, lng], {
                        draggable: true
                    }).addTo(map);
                    
                    marker.on('dragend', function(e) {
                        const { lat, lng } = e.target.getLatLng();
                        document.getElementById('latitude').value = lat.toFixed(6);
                        document.getElementById('longitude').value = lng.toFixed(6);
                    });
                }
                
                map.setView([lat, lng], 15);
            }
        };
        
        // Helper: extract coordinates from various Google Maps URL formats
        const extractCoords = (url) => {
            if (!url) return null;
            try {
                const decoded = decodeURIComponent(url.trim());
                // 1) @lat,lng,zoom
                let m = decoded.match(/@\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
                if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
                // 2) q=lat,lng
                m = decoded.match(/[?&]q=\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
                // 3) !3dLAT and !2dLNG (embed links often include these; order may vary)
                const mLat = decoded.match(/!3d\s*(-?\d+\.\d+)/);
                const mLng = decoded.match(/!2d\s*(-?\d+\.\d+)/);
                if (mLat && mLng) return { lat: parseFloat(mLat[1]), lng: parseFloat(mLng[1]) };
                // 4) Plain "lat,lng" anywhere in the string
                m = decoded.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
                if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
            } catch (e) {
                // ignore
            }
            return null;
        };
        
        // Wire up the Maps link input to auto-fill coordinates
        const mapsLinkInput = document.getElementById('maps_link');
        if (mapsLinkInput) {
            const handleLink = () => {
                const coords = extractCoords(mapsLinkInput.value);
                if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                    document.getElementById('latitude').value = coords.lat.toFixed(6);
                    document.getElementById('longitude').value = coords.lng.toFixed(6);
                    updateMarkerFromInputs();
                }
            };
            mapsLinkInput.addEventListener('change', handleLink);
            mapsLinkInput.addEventListener('paste', () => setTimeout(handleLink, 0));
            mapsLinkInput.addEventListener('blur', handleLink);
        }
        
        document.getElementById('latitude').addEventListener('change', updateMarkerFromInputs);
        document.getElementById('longitude').addEventListener('change', updateMarkerFromInputs);
    });
</script>

<?php
// Include footer
require_once '../includes/footer.php';
?>
