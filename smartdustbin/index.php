<?php
session_start();

// Check if user is logged in
$isLoggedIn = isset($_SESSION['user_id']);

// If user is already logged in, redirect to dashboard
if ($isLoggedIn) {
    header("Location: dashboard.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Dustbin Monitoring System</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Modern UI CSS -->
    <link rel="stylesheet" href="/smartdustbin/assets/css/modern-ui.css">
    <style>
        :root {
            --primary: #2e7d32;
            --primary-light: #e8f5e9;
            --primary-dark: #1b5e20;
            --secondary: #455a64;
            --light: #f5f7fa;
            --dark: #263238;
            --accent: #ffa000;
        }
        
        body {
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);
            color: var(--dark);
            line-height: 1.6;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        .hero-section {
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(59, 130, 246, 0.8)), 
                        url('assets/images/backgroundimg.jpg');
            background-size: cover;
            background-position: center;
            padding: 120px 0;
            position: relative;
            overflow: hidden;
            color: white;
            text-align: center;
        }
        
        .hero-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .auth-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 2rem auto;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 1;
        }
        
        .auth-header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            position: relative;
        }
        
        .auth-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
        }
        
        .auth-body {
            padding: 2.5rem;
            position: relative;
            z-index: 1;
        }
        
        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 0.25rem rgba(46, 125, 50, 0.25);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            border: none;
            border-radius: 10px;
            padding: 12px 24px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }
        
        
        .feature-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2.5rem;
            margin: 1.5rem 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
            height: 100%;
        }
        
        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .feature-icon {
            font-size: 2.5rem;
            color: var(--primary);
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
        <div class="container">
            <a class="navbar-brand fw-bold text-primary" href="index.php">
                <i class="fas fa-trash-alt me-2"></i>SmartDustbin
            </a>
            <div class="ms-auto">
                <a href="login.php" class="btn btn-outline-primary me-2">Login</a>
                <a href="auth/register.php" class="btn btn-primary">Register</a>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Register Modal -->
    <div class="modal fade" id="registerModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Create Account</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form action="auth/register.php" method="POST">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="first_name" class="form-label small">First Name</label>
                                <input type="text" class="form-control form-control-sm" id="first_name" name="first_name" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="last_name" class="form-label small">Last Name</label>
                                <input type="text" class="form-control form-control-sm" id="last_name" name="last_name" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="reg_email" class="form-label small">Email</label>
                            <input type="email" class="form-control form-control-sm" id="reg_email" name="email" required>
                        </div>
                        <div class="mb-3">
                            <label for="reg_password" class="form-label small">Password</label>
                            <input type="password" class="form-control form-control-sm" id="reg_password" name="password" required>
                        </div>
                        <div class="mb-3">
                            <label for="confirm_password" class="form-label small">Confirm Password</label>
                            <input type="password" class="form-control form-control-sm" id="confirm_password" name="confirm_password" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Create Account</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Offcanvas Login/Register Panel -->
    <div class="offcanvas offcanvas-start" tabindex="-1" id="authOffcanvas" aria-labelledby="authOffcanvasLabel">
        <div class="offcanvas-header bg-primary text-white">
            <h5 class="offcanvas-title" id="authOffcanvasLabel">Welcome</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body p-0">
            <ul class="nav nav-pills nav-fill" id="authTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active w-100" id="login-tab" data-bs-toggle="pill" data-bs-target="#login" type="button" role="tab" aria-controls="login" aria-selected="true">
                        <i class="fas fa-sign-in-alt me-2"></i>Login
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link w-100" id="register-tab" data-bs-toggle="pill" data-bs-target="#register" type="button" role="tab" aria-controls="register" aria-selected="false" tabindex="-1">
                        <i class="fas fa-user-plus me-2"></i>Register
                    </button>
                </li>
            </ul>
            
            <div class="tab-content p-3" id="authTabsContent">
                <!-- Login Form -->
                <div class="tab-pane fade show active" id="login" role="tabpanel" aria-labelledby="login-tab">
                    <form action="auth/login.php" method="POST" class="mt-3">
                        <div class="mb-3">
                            <label for="login-email" class="form-label">Email address</label>
                            <input type="email" class="form-control form-control-sm" id="login-email" name="email" required>
                        </div>
                        <div class="mb-3">
                            <label for="login-password" class="form-label">Password</label>
                            <input type="password" class="form-control form-control-sm" id="login-password" name="password" required>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary btn-sm">Login</button>
                        </div>
                        <div class="text-center mt-2">
                            <a href="#" class="text-decoration-none small">Forgot password?</a>
                        </div>
                    </form>
                </div>
                
                <!-- Register Form -->
                <div class="tab-pane fade" id="register" role="tabpanel" aria-labelledby="register-tab">
                    <form action="auth/register.php" method="POST" class="mt-3">
                        <div class="row g-2">
                            <div class="col-6">
                                <label for="first-name" class="form-label small">First Name</label>
                                <input type="text" class="form-control form-control-sm" id="first-name" name="first_name" required>
                            </div>
                            <div class="col-6">
                                <label for="last-name" class="form-label small">Last Name</label>
                                <input type="text" class="form-control form-control-sm" id="last-name" name="last_name" required>
                            </div>
                        </div>
                        <div class="mb-2">
                            <label for="register-email" class="form-label small">Email address</label>
                            <input type="email" class="form-control form-control-sm" id="register-email" name="email" required>
                        </div>
                        <div class="mb-2">
                            <label for="register-password" class="form-label small">Password</label>
                            <input type="password" class="form-control form-control-sm" id="register-password" name="password" required>
                        </div>
                        <div class="mb-2">
                            <label for="confirm-password" class="form-label small">Confirm Password</label>
                            <input type="password" class="form-control form-control-sm" id="confirm-password" name="confirm_password" required>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="terms" required>
                            <label class="form-check-label small" for="terms">
                                I agree to the <a href="#" class="text-decoration-none">Terms</a> & <a href="#" class="text-decoration-none">Privacy</a>
                            </label>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary btn-sm">Create Account</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Hero Section with Background -->
    <section class="hero-section text-center position-relative overflow-hidden" style="padding: 150px 0;">
        <div class="container position-relative py-5">
            <div class="hero-logo mb-3">
                <i class="fas fa-trash-alt fa-4x text-white mb-3"></i>
            </div>
            <h1 class="display-4 fw-bold mb-3 text-white">Smart Dustbin Monitoring System</h1>
            <p class="lead text-white-50 mb-4">Efficient waste management for a cleaner environment</p>
            <?php if (isset($_SESSION['user_id'])): ?>
                <a href="dashboard.php" class="btn btn-primary btn-lg">
                    <i class="fas fa-tachometer-alt me-2"></i>Go to Dashboard
                </a>
            <?php endif; ?>
        </div>
    </section>

    <!-- Main Content -->
    <div class="container">
        <!-- Features Section -->
        <section id="features" class="py-5">
            <div class="container">
                <div class="text-center mb-5">
                    <h2 class="fw-bold display-5">Why Choose Our Solution?</h2>
                    <p class="text-muted lead">Smart waste management for a sustainable future</p>
                    <div class="divider mx-auto bg-primary" style="width: 80px; height: 4px; border-radius: 2px;"></div>
                </div>
                <div class="row g-4">
                    <div class="col-md-4">
                        <div class="feature-card p-4 h-100 rounded-3 shadow-sm bg-white text-center">
                            <div class="icon-wrapper mb-4 p-3 rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px; background-color: rgba(46, 125, 50, 0.1);">
                                <i class="fas fa-chart-line fa-3x text-primary"></i>
                            </div>
                            <h4 class="mb-3">Real-time Monitoring</h4>
                            <p class="text-muted">Monitor your dustbins in real-time with our advanced tracking system. Get instant updates on fill levels and collection schedules.</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="feature-card p-4 h-100 rounded-3 shadow-sm bg-white text-center">
                            <div class="icon-wrapper mb-4 p-3 rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px; background-color: rgba(46, 125, 50, 0.1);">
                                <i class="fas fa-bell fa-3x text-primary"></i>
                            </div>
                            <h4 class="mb-3">Smart Alerts</h4>
                            <p class="text-muted">Receive instant notifications when dustbins need attention, ensuring timely collection and maintenance.</p>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="feature-card p-4 h-100 rounded-3 shadow-sm bg-white text-center">
                            <div class="icon-wrapper mb-4 p-3 rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px; background-color: rgba(46, 125, 50, 0.1);">
                                <i class="fas fa-chart-pie fa-3x text-primary"></i>
                            </div>
                            <h4 class="mb-3">Analytics Dashboard</h4>
                            <p class="text-muted">Gain valuable insights with our comprehensive waste collection analytics and reporting tools.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Additional Features Section -->
        <section class="py-5 bg-light rounded-3 my-5">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-lg-6 mb-4 mb-lg-0">
                        <img src="https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" alt="Smart Dustbin" class="img-fluid rounded-3 shadow">
                    </div>
                    <div class="col-lg-6 ps-lg-5">
                        <h2 class="fw-bold mb-4">Smart Waste Management Made Simple</h2>
                        <p class="lead text-muted mb-4">Our intelligent system helps cities and businesses optimize their waste collection processes, reduce costs, and contribute to a cleaner environment.</p>
                        <div class="d-flex mb-3">
                            <div class="me-4">
                                <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                            </div>
                            <div>
                                <h5 class="mb-1">Efficient Collection Routes</h5>
                                <p class="text-muted mb-0">Optimized routes based on real-time data to reduce fuel consumption and emissions.</p>
                            </div>
                        </div>
                        <div class="d-flex mb-3">
                            <div class="me-4">
                                <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                            </div>
                            <div>
                                <h5 class="mb-1">Cost Savings</h5>
                                <p class="text-muted mb-0">Reduce operational costs with data-driven waste collection strategies.</p>
                            </div>
                        </div>
                        <div class="d-flex">
                            <div class="me-4">
                                <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
                            </div>
                            <div>
                                <h5 class="mb-1">Environmental Impact</h5>
                                <p class="text-muted mb-0">Contribute to a sustainable future with efficient waste management practices.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Call to Action -->
    <section class="py-5 bg-primary text-white text-center">
        <div class="container">
            <h2 class="display-5 fw-bold mb-4">Ready to Transform Your Waste Management?</h2>
            <p class="lead mb-4">Join hundreds of satisfied customers who trust our smart waste management solutions.</p>
            <?php if (!isset($_SESSION['user_id'])): ?>
                <button class="btn btn-light btn-lg px-5" data-bs-toggle="offcanvas" data-bs-target="#authOffcanvas" aria-controls="authOffcanvas">
                    Get Started Now <i class="fas fa-arrow-right ms-2"></i>
                </button>
            <?php else: ?>
                <a href="dashboard.php" class="btn btn-light btn-lg px-5">
                    Go to Dashboard <i class="fas fa-arrow-right ms-2"></i>
                </a>
            <?php endif; ?>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-dark text-white py-5">
        <div class="container">
            <div class="row g-4">
                <div class="col-md-4">
                    <h5 class="mb-3">Smart Dustbin Monitoring</h5>
                    <p class="text-white-50">Revolutionizing waste management with smart technology for a cleaner, greener environment.</p>
                </div>
                <div class="col-md-4">
                    <h5 class="mb-3">Quick Links</h5>
                    <ul class="list-unstyled">
                        <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Home</a></li>
                        <li class="mb-2"><a href="#features" class="text-white-50 text-decoration-none">Features</a></li>
                        <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">About Us</a></li>
                        <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Contact</a></li>
                    </ul>
                </div>
                <div class="col-md-4">
                    <h5 class="mb-3">Contact Us</h5>
                    <ul class="list-unstyled text-white-50">
                        <li class="mb-2"><i class="fas fa-envelope me-2"></i> info@smartdustbin.com</li>
                        <li class="mb-2"><i class="fas fa-phone me-2"></i> +1 234 567 890</li>
                        <li class="mb-2"><i class="fas fa-map-marker-alt me-2"></i> Accra Katapor</li>
                    </ul>
                </div>
            </div>
            <hr class="my-4 bg-secondary">
            <div class="text-center">
            <p class="mb-0">&copy; <?php echo date('Y'); ?> Smart Dustbin Monitoring System. All rights reserved.</p>
        </div>
    </footer>

    <!-- Additional CSS -->
    <style>
        /* Hero Section */
        .hero-section {
            background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), 
                        url('assets/images/backgroundimg.jpg');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            padding: 100px 0;
            position: relative;
        }
        
        .hero-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            opacity: 0.9;
        }
        
        /* Auth Container */
        .auth-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .auth-tabs .nav-link {
            border: none;
            border-radius: 0;
            padding: 15px 20px;
            font-weight: 500;
            color: var(--secondary);
        }
        
        .auth-tabs .nav-link.active {
            background: var(--primary);
            color: white;
        }
        
        /* Feature Cards */
        .feature-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1) !important;
        }
        
        .feature-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--primary-light);
            border-radius: 50%;
        }
        
        /* Buttons */
        .btn-primary {
            background-color: var(--primary);
            border-color: var(--primary);
            padding: 10px 25px;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background-color: var(--primary-dark);
            border-color: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(46, 125, 50, 0.3);
        }
        
        /* Form Elements */
        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 0.25rem rgba(46, 125, 50, 0.25);
        }
        
        /* Divider */
        .divider {
            width: 60px;
            height: 3px;
            margin: 15px auto;
        }
    </style>
    
    <!-- Bootstrap JS and dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JS for animations -->
    <script>
        // Add animation to features on scroll
        document.addEventListener('DOMContentLoaded', function() {
            const features = document.querySelectorAll('.feature-card');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, { threshold: 0.1 });
            
            features.forEach(feature => {
                feature.style.opacity = '0';
                feature.style.transform = 'translateY(20px)';
                feature.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(feature);
            });
        });
    </script>
    <script>
        // Simple form validation
        document.addEventListener('DOMContentLoaded', function() {
            // Password match validation
            const registerForm = document.querySelector('form[action="auth/register.php"]');
            if (registerForm) {
                registerForm.addEventListener('submit', function(e) {
                    const password = document.getElementById('register-password').value;
                    const confirmPassword = document.getElementById('confirm-password').value;
                    
                    if (password !== confirmPassword) {
                        e.preventDefault();
                        alert('Passwords do not match!');
                    }
                });
            }
        });
    </script>
</body>
</html>
