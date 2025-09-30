<?php
require_once '../config/database.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate input
    $firstName = filter_input(INPUT_POST, 'first_name', FILTER_SANITIZE_STRING);
    $lastName = filter_input(INPUT_POST, 'last_name', FILTER_SANITIZE_STRING);
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'];
    $confirmPassword = $_POST['confirm_password'];
    
    // Simple validation
    $errors = [];
    
    if (strlen($password) < 8) {
        $errors[] = "Password must be at least 8 characters long";
    }
    
    if ($password !== $confirmPassword) {
        $errors[] = "Passwords do not match";
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Invalid email format";
    }
    
    try {
        $pdo = getDBConnection();
        
        // Check if email already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->rowCount() > 0) {
            $errors[] = "Email already registered";
        }
        
        if (empty($errors)) {
            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            // Insert new user
            $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$firstName, $lastName, $email, $hashedPassword]);
            
            // Get the new user's ID
            $userId = $pdo->lastInsertId();
            
            // Log the user in
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $firstName . ' ' . $lastName;
            $_SESSION['email'] = $email;
            
            // Set success message
            $_SESSION['success'] = "Registration successful! Welcome to Smart Dustbin Monitoring System.";
            
            // Redirect to dashboard
            header("Location: ../dashboard.php");
            exit();
        } else {
            // Store errors in session and redirect back
            $_SESSION['register_errors'] = $errors;
            header("Location: ../index.php#register");
            exit();
        }
        
    } catch (PDOException $e) {
        $_SESSION['error'] = "Database error: " . $e->getMessage();
        header("Location: ../index.php#register");
        exit();
    }
} else {
    // If not a POST request, redirect to home
    header("Location: ../index.php");
    exit();
}
