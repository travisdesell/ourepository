<?php

function print_header($additional_css, $additional_js) {
    echo "
<html>
<head>
    <title>Open UAS Repository</title>

    <link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/css/bootstrap.min.css' integrity='sha384-Zug+QiDoJOrZ5t4lssLdxGhVrurbmBWopoEl+M6BdEfwnCJZtKxi1KgxUyJq13dy' crossorigin='anonymous'>

    <link rel='stylesheet' href='./css/font-awesome.min.css'>

    <script src='https://code.jquery.com/jquery-3.2.1.min.js' integrity='sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=' crossorigin='anonymous'></script>

    <script src='https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js' integrity='sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q' crossorigin='anonymous'></script>
    <script src='https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/js/bootstrap.min.js' integrity='sha384-a5N7Y/aK3qNeh15eJKGWxsqtnX/wWdSZSKp+81YjTmS15nvnvxKHuzaWwXHDli+4' crossorigin='anonymous'></script>

    <script src='https://apis.google.com/js/platform.js' async defer></script>
    <meta name='google-signin-client_id' content='913778561877-7vmnbjvuc9c2g3c3qejgckjdtdivg9n1.apps.googleusercontent.com'>
";


    foreach ($additional_css as $css) {
        echo $css . "\n";
    }

    foreach ($additional_js as $js) {
        echo $js . "\n";
    }

echo "</head>";

}

?>
