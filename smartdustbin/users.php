<?php
require_once 'config/database.php';

// Check if user is logged in and is admin
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit();
}

// Set page title
$pageTitle = 'User Management';

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
                        <i class="fas fa-users text-white fs-4"></i>
                    </div>
                </div>
                <div>
                    <h1 class="h3 mb-1 text-gradient">User Management</h1>
                    <p class="text-muted mb-0">Manage system users and their permissions</p>
                </div>
            </div>
        </div>
        <div class="col-auto">
            <button type="button" class="btn-modern btn-primary-modern" data-bs-toggle="modal" data-bs-target="#addUserModal">
                <i class="fas fa-plus"></i> Add User
            </button>
        </div>
    </div>
</div>

<!-- Modern Users Table -->
<div class="container-fluid">
    <div class="modern-card fade-in">
        <div class="modern-card-header">
            <h5 class="mb-0 text-gradient">
                <i class="fas fa-list me-2"></i>System Users
            </h5>
        </div>
        <div class="modern-card-body">
            <div class="table-responsive">
                <table class="table-modern" id="usersTable" width="100%" cellspacing="0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>admin</td>
                        <td>admin@example.com</td>
                        <td><span class="badge-modern badge-info-modern">Admin</span></td>
                        <td>2023-09-01</td>
                        <td>
                            <button class="btn-modern btn-outline-modern" style="padding: 8px 12px;"><i class="fas fa-edit"></i></button>
                            <button class="btn-modern btn-outline-modern" style="padding: 8px 12px; border-color: var(--danger); color: var(--danger);" disabled><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Add User Modal -->
<div class="modal fade" id="addUserModal" tabindex="-1" aria-labelledby="addUserModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="addUserModalLabel">Add New User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addUserForm" onsubmit="event.preventDefault(); addUser();">
                    <div class="mb-3">
                        <label for="username" class="form-label">Username</label>
                        <input type="text" class="form-control" id="username" required>
                    </div>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" class="form-control" id="email" required>
                    </div>
                    <div class="mb-3">
                        <label for="phone_number" class="form-label">Phone Number</label>
                        <input type="text" class="form-control" id="phone_number" placeholder="e.g., 0257048004">
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" class="form-control" id="password" required>
                    </div>
                    <div class="mb-3">
                        <label for="role" class="form-label">Role</label>
                        <select class="form-select" id="role" required>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="addUser()">Add User</button>
            </div>
        </div>
    </div>
</div>

<script>
async function addUser() {
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const phoneInput = document.getElementById('phone_number');
  const phone_number = phoneInput ? phoneInput.value.trim() : '';

  // Basic front-end checks
  if (!username || !email || !password || !role) {
    alert('Please fill in username, email, password, and role.');
    return;
  }

  try {
    const res = await fetch('/smartdustbin/api/users_add.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role, phone_number })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      const msg = (data && (data.message || (data.errors && data.errors.join(', ')))) || res.statusText;
      alert('Failed to add user: ' + msg);
      console.error('Add user error:', data);
      return;
    }

    alert('User created: ' + data.user.username);
    // Close modal
    const modalEl = document.getElementById('addUserModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();
    // Refresh to reflect new user (or replace with dynamic table update later)
    location.reload();
  } catch (e) {
    console.error(e);
    alert('Unexpected error while adding user. Check console for details.');
  }
}
</script>
<?php
// Include footer
require_once 'includes/footer.php';
?>
