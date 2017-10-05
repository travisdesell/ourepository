<?php

echo "
<html>
<head>
    <title>Mayville UAS Imagery</title>

    <!-- Latest compiled and minified CSS -->
    <link rel='stylesheet' href='//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css'>

    <!-- jQuery (required by Bootstrap's JavaScript plugins) -->
    <script src='https://ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.min.js'></script>

    <!-- Latest compiled and minified JavaScript -->
    <script src='//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js'></script>

    <!-- Core CSS file -->
    <link rel='stylesheet' href='./PhotoSwipe/dist/photoswipe.css'> 

    <!-- Skin CSS file (styling of UI - buttons, caption, etc.)
    In the folder of skin CSS file there are also:
    - .png and .svg icons sprite, 
    - preloader.gif (for browsers that do not support CSS animations) -->
    <link rel='stylesheet' href='./PhotoSwipe/dist/default-skin/default-skin.css'> 

    <!-- Core JS file -->
    <script src='./PhotoSwipe/dist/photoswipe.min.js'></script> 

    <!-- UI JS file -->
    <script src='./PhotoSwipe/dist/photoswipe-ui-default.min.js'></script> 

    <link rel='stylesheet' href='./gallery.css'>
    <script src='./gallery.js'></script>

    <style>
    body { padding-top: 70px; }
    </style>
</head>
<body>
";

echo "
<nav class='navbar navbar-default navbar-fixed-top'>
    <div class='container-fluid'>
        <form class='navbar-form navbar-right'>
            <button type='button' class='btn btn-default pull-right' id='help-button' data-toggle='modal' data-target='#help-modal'>Under Construction</button>
        </form>
    </div>
</nav>";


echo "
<div class='row'>
<div class='well'>
<div class='container'>

<div class='my-gallery' itemscope itemtype='http://schema.org/ImageGallery'>
";

$files = scandir("./extracted_lines");

foreach ($files as $file) {
    if (strlen($file) <= 4) continue;
    //echo "substr($file, -4): " . substr($file, -4) . "\n";

    if (substr($file, -4) != ".png") continue;

    //echo "substr($file, -7, 3): " . substr($file, -7, 3) . "\n";
    if (substr($file, -7, 3) == "_sm") continue;

    $file_sm = substr($file, 0, -4) . "_sm.png";

    list($width, $height, $type, $attr) = getimagesize("./extracted_lines/$file");

    echo "
    <figure itemprop='associatedMedia' itemscope itemtype='http://schema.org/ImageObject'>
        <a href='./extracted_lines/$file' itemprop='contentUrl' data-size='$width" . "x" . "$height'>
            <img src='./extracted_lines/$file_sm' itemprop='thumbnail' alt='Image description' />
        </a>
        <figcaption itemprop='caption description'>Image caption</figcaption>
    </figure>";
}

echo"
</div>

</div> <!-- container -->
</div> <!-- row -->
</div> <!-- well -->
";

echo "
<!-- Root element of PhotoSwipe. Must have class pswp. -->
<div class='pswp' tabindex='-1' role='dialog' aria-hidden='true'>

    <!-- Background of PhotoSwipe. 
         It's a separate element as animating opacity is faster than rgba(). -->
    <div class='pswp__bg'></div>

    <!-- Slides wrapper with overflow:hidden. -->
    <div class='pswp__scroll-wrap'>

        <!-- Container that holds slides. 
            PhotoSwipe keeps only 3 of them in the DOM to save memory.
            Don't modify these 3 pswp__item elements, data is added later on. -->
        <div class='pswp__container'>
            <div class='pswp__item'></div>
            <div class='pswp__item'></div>
            <div class='pswp__item'></div>
        </div>

        <!-- Default (PhotoSwipeUI_Default) interface on top of sliding area. Can be changed. -->
        <div class='pswp__ui pswp__ui--hidden'>

            <div class='pswp__top-bar'>

                <!--  Controls are self-explanatory. Order can be changed. -->

                <div class='pswp__counter'></div>

                <button class='pswp__button pswp__button--close' title='Close (Esc)'></button>

                <button class='pswp__button pswp__button--share' title='Share'></button>

                <button class='pswp__button pswp__button--fs' title='Toggle fullscreen'></button>

                <button class='pswp__button pswp__button--zoom' title='Zoom in/out'></button>

                <!-- Preloader demo http://codepen.io/dimsemenov/pen/yyBWoR -->
                <!-- element will get class pswp__preloader--active when preloader is running -->
                <div class='pswp__preloader'>
                    <div class='pswp__preloader__icn'>
                      <div class='pswp__preloader__cut'>
                        <div class='pswp__preloader__donut'></div>
                      </div>
                    </div>
                </div>
            </div>

            <div class='pswp__share-modal pswp__share-modal--hidden pswp__single-tap'>
                <div class='pswp__share-tooltip'></div> 
            </div>

            <button class='pswp__button pswp__button--arrow--left' title='Previous (arrow left)'>
            </button>

            <button class='pswp__button pswp__button--arrow--right' title='Next (arrow right)'>
            </button>

            <div class='pswp__caption'>
                <div class='pswp__caption__center'></div>
            </div>

        </div>

    </div>

</div>

</body>

</html>
";


?>
