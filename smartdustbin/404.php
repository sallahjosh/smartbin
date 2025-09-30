<?php
// Set the 404 status code
http_response_code(404);

// Set page title
$pageTitle = 'Page Not Found';

// Include header
require_once 'includes/header.php';
?>

<div class="container mt-5">
    <div class="row justify-content-center">
        <div class="col-md-8 text-center">
            <div class="error-template">
                <h1>Oops!</h1>
                <h2>404 Not Found</h2>
                <div class="error-details">
                    Sorry, the page you are looking for could not be found.
                </div>
                <div class="error-actions mt-4">
                    <a href="/smartdurstbin_php/" class="btn btn-primary btn-lg">
                        <i class="bi bi-house-door-fill"></i> Take Me Home
                    </a>
                    <a href="mailto:support@smartdustbin.com" class="btn btn-outline-secondary btn-lg">
                        <i class="bi bi-envelope-fill"></i> Contact Support
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.error-template {
    padding: 40px 15px;
    text-align: center;
}
.error-actions {
    margin-top: 15px;
    margin-bottom: 15px;
}
.error-actions .btn {
    margin-right: 10px;
}
</style>

<?php
// Include footer
require_once 'includes/footer.php';
?>
