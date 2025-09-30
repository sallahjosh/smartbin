<?php
session_start();

// Redirect if already logged in
if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}

$error = '';

// Include database configuration
require_once __DIR__ . '/config/database.php';

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    try {
        $pdo = getDBConnection();
        
        // Check if user exists with the provided email
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            // Login successful
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['first_name'] = $user['first_name'];
            $_SESSION['last_name'] = $user['last_name'];
            $_SESSION['email'] = $user['email'];
            // Default to admin role since the column doesn't exist
            $_SESSION['role'] = 'admin'; 
            
            // Redirect to dashboard
            header("Location: index.php");
            exit();
        } else {
            $error = 'Invalid email or password';
        }
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        $error = 'An error occurred during login. Please try again.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Smart Dustbin Monitoring System - Login">
    <meta name="author" content="SmartDustbin Team">
    <title>Login - Smart Dustbin Monitoring</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/smartdurstbin_php/assets/images/favicon.ico">
    
    <!-- CSS Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body {
            height: 100vh;
            display: flex;
            align-items: center;
            background-color: #f5f5f5;
        }
        .login-container {
            max-width: 400px;
            width: 100%;
            padding: 15px;
            margin: auto;
        }
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        }
        .card-header {
            background-color: #4361ee;
            color: white;
            text-align: center;
            padding: 1.5rem;
            border-radius: 10px 10px 0 0 !important;
        }
        .card-body {
            padding: 2rem;
        }
        .form-control:focus {
            border-color: #4361ee;
            box-shadow: 0 0 0 0.2rem rgba(67, 97, 238, 0.25);
        }
        .btn-primary {
            background-color: #4361ee;
            border: none;
            padding: 0.5rem 1.5rem;
        }
        .btn-primary:hover {
            background-color: #3a56d4;
        }
        .login-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
            display: block;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="card">
            <div class="card-header">
                <img src="/smartdurstbin_php/assets/images/logo.png" alt="Logo" class="login-logo" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0MzYxZWUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS10cmFzaC0yIj48cGF0aCBkPSJNMyA2aDgiLz48cGF0aCBkPSJNMTkgNm0tMTQgMGEyIDIgMCAxIDAgNCAwIDIgMiAwIDAgMC00IDBaIi8+PHBhdGggZD0ibTE3IDktMy4zNDYgMy42OTJhMiAycCAwIDAgMS0yLjkzNC4wMzRMMi43IDkuNyYyLS45LjQtMS45LTEuMy0yLjJzLTEuOC0uMi0yLjQuNS0uOSAxLjgtLjIgMi42bDQuNTcgNy41MjJhMiAyIDAgMCAwIDEuNzUgMS4wM0gxNmEyIDIgMCAwIDAgMS44LTIuODNsLTMuNS01Ljk2NCIvPjxwYXRoIGQ9Im0yIDIybDMtMTMiLz48cGF0aCBkPSJtMTIgMTkgNiAzIi8+PC9zdmc+'">
                <h4 class="mb-0">Smart Dustbin Monitoring</h4>
                <p class="mb-0">Sign in to your account</p>
            </div>
            <div class="card-body">
                <?php if ($error): ?>
                    <div class="alert alert-danger"><?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                
                <form method="POST" action="" class="needs-validation" novalidate>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email address</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-envelope"></i></span>
                            <input type="email" class="form-control" id="email" name="email" required 
                                   value="admin@example.com"
                                   placeholder="Enter your email">
                            <div class="invalid-feedback">
                                Please enter a valid email address.
                            </div>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label for="password" class="form-label">Password</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-lock"></i></span>
                            <input type="password" class="form-control" id="password" name="password" required
                                   placeholder="Enter your password">
                            <button class="btn btn-outline-secondary toggle-password" type="button">
                                <i class="fas fa-eye"></i>
                            </button>
                            <div class="invalid-feedback">
                                Please enter your password.
                            </div>
                        </div>
                    </div>
                    <div class="d-grid mb-3">
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-sign-in-alt me-2"></i> Sign In
                        </button>
                    </div>
                    <div class="text-center">
                        <small class="text-muted">
                            <strong>Default login:</strong> admin@example.com / admin123
                        </small>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- JavaScript Libraries -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
    // Form validation
    (function () {
        'use strict'
        
        // Fetch all the forms we want to apply custom Bootstrap validation styles to
        var forms = document.querySelectorAll('.needs-validation')
        
        // Loop over them and prevent submission
        Array.prototype.slice.call(forms)
            .forEach(function (form) {
                form.addEventListener('submit', function (event) {
                    if (!form.checkValidity()) {
                        event.preventDefault()
                        event.stopPropagation()
                    }
                    
                    form.classList.add('was-validated')
                }, false)
            })
    })()
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(function(button) {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Auto-hide alerts after 5 seconds
    setTimeout(function() {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(function(alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);
    </script>
</body>
</html>
