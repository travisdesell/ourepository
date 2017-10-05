<?php

function print_navbar() {
echo "
<nav class='navbar navbar-expand-sm navbar-light bg-light'>
    <a class='navbar-brand' href='./index.php'>OURepository</a>

    <button class='navbar-toggler' type='button' data-toggle='collapse' data-target='#navbarSupportedContent' aria-controls='navbarSupportedContent' aria-expanded='false' aria-label='Toggle navigation'>
        <span class='navbar-toggler-icon'></span>
    </button>

    <div class='collapse navbar-collapse' id='navbarSupportedContent'>
        <ul class='navbar-nav mr-auto'>
<!--
            <li class='nav-item active'>
                <a class='nav-link' href='javascript:void(0)'>Home <span class='sr-only'>(current)</span></a>
            </li>
            <li class='nav-item'>
                <a class='nav-link' href='javascript:void(0)'>Link</a>
            </li>
            <li class='nav-item'>
                <a class='nav-link disabled' href='javascript:void(0)'>Disabled</a>
            </li>
-->
        </ul>

        <form id='signin-form' class='form-inline my-2 my-lg-0'>
            <div class='btn g-signin2' data-onsuccess='onSignIn'></div>
        </form>
    </div>
</nav>
";
}

?>
