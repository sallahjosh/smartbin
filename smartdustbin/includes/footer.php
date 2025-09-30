    </main>

    <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Custom JavaScript -->
    <script>
        // Toggle sidebar on mobile
        document.addEventListener('DOMContentLoaded', function() {
            const sidebarToggle = document.getElementById('sidebarToggle');
            const sidebar = document.querySelector('.sidebar');
            
            if (sidebarToggle && sidebar) {
                sidebarToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('show');
                });
            }
            
            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(event) {
                const isClickInside = sidebar.contains(event.target) || 
                                    (sidebarToggle && sidebarToggle.contains(event.target));
                
                if (!isClickInside && window.innerWidth <= 991.98) {
                    sidebar.classList.remove('show');
                }
            });
            
            // Initialize tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
            
            // Handle delete buttons
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const itemType = this.getAttribute('data-type') || 'item';
                    const itemId = this.getAttribute('data-id');
                    const itemName = this.getAttribute('data-name') || '';
                    const deleteUrl = this.getAttribute('data-delete-url');
                    
                    if (confirm(`Are you sure you want to delete ${itemName ? `"${itemName}"` : 'this ' + itemType}?`)) {
                        fetch(deleteUrl, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success message
                                showAlert('success', `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully`);
                                
                                // Remove the row from the table or reload the page
                                const row = this.closest('tr');
                                if (row) {
                                    row.remove();
                                } else {
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 1500);
                                }
                            } else {
                                throw new Error(data.message || 'Failed to delete ' + itemType);
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            showAlert('danger', `Error deleting ${itemType}: ${error.message}`);
                        });
                    }
                });
            });
        });
        
        // Show alert message
        function showAlert(type, message) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            alertDiv.role = 'alert';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            const container = document.querySelector('.main-content');
            if (container) {
                container.insertBefore(alertDiv, container.firstChild);
                
                // Auto-remove alert after 5 seconds
                setTimeout(() => {
                    const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
                    if (alert) {
                        alert.close();
                    }
                }, 5000);
            }
        }
        
        // Format date to relative time (e.g., "2 hours ago")
        function formatRelativeTime(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) {
                return 'just now';
            }
            
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) {
                return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
            }
            
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) {
                return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
            }
            
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 30) {
                return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
            }
            
            return date.toLocaleDateString();
        }
        
        // Update relative times on the page
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('[data-time]').forEach(element => {
                const timeString = element.getAttribute('data-time');
                if (timeString) {
                    element.textContent = formatRelativeTime(timeString);
                    element.title = new Date(timeString).toLocaleString();
                }
            });
            
            // Update relative times every minute
            setInterval(() => {
                document.querySelectorAll('[data-time]').forEach(element => {
                    const timeString = element.getAttribute('data-time');
                    if (timeString) {
                        element.textContent = formatRelativeTime(timeString);
                    }
                });
            }, 60000);
        });
    </script>
</body>
</html>
