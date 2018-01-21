var viewer;
var overlay;

var drawn_polygons = 0;
var drawn_lines = 0;
var drawn_points = 0;

var drawing_points = false;
var drawing_lines = false;
var drawing_polygon = false;
var last_point = null;
var polygon_points = [];


var kernel_func = null;
var filter_func = null;

function display_error_modal(title, message) {
    $("#error-modal-title").html(title);
    $("#error-modal-body").html(message);
    $("#error-modal").modal();
}


// ----------
App = {
    // ----------
    init: function(tiles_url, channels, height, width) {
        console.log("initializing OSD with tiles_url: '" + tiles_url + "', channels: '" + channels + "', height: " + height + ", width: " + width);

        viewer = OpenSeadragon({
            id: 'map',
            prefixUrl: './images/',
            tileSources: [{
                "Image": {
                    "xmlns":    "http://schemas.microsoft.com/deepzoom/2008",
                    "Url": tiles_url,
                    "Format":   "png", 
                    "Overlap":  "0", 
                    "TileSize": "256",
                    "Size": {
                        "Height": height,
                        "Width":  width
                    }
                }
            }]
        });

        console.log("image channels: " + channels);
        filter_func = OpenSeadragon.Filters.RGB();

        //TODO: only needed if 4 channel image
        viewer.setFilterOptions({
            filters: {
                processors: filter_func
            }
        });


        overlay = viewer.svgOverlay();

        viewer.addHandler('canvas-click', function(event) {
            if (drawing_polygon) {
                // The canvas-click event gives us a position in web coordinates.
                var webPoint = event.position;

                // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
                var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

                // Convert from viewport coordinates to image coordinates.
                var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

                // Show the results.
                //$("#web-point").text("Web Point: " + webPoint.toString());
                $("#web-point").text("Web Point: " + webPoint.x + ", " + webPoint.y);
                $("#viewport-point").text("Viewport Point: " + viewportPoint.toString());
                $("#image-point").text("Image Point: " + imagePoint.toString());

                console.log(webPoint.toString(), viewportPoint.toString(), imagePoint.toString());
                //console.log(viewer.world.getItemAt(0).source.dimensions);

                var x = viewportPoint.x;
                var y = viewportPoint.y;
                polygon_points.push({"x": x, "y": y});

                var radius = 0.0025;

                var d3Circle = d3.select(overlay.node()).append("circle")
                    .style('fill', 'rgba(0,0,255,0.25)')
                    .attr("id", "svg-circle-" + drawn_points)
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", radius)
                    .attr("class", "svg-polygon-circle");

                drawn_points++;

                if (last_point == null) {
                    last_point = viewportPoint;
                } else {
                    var x1 = last_point.x;
                    var y1 = last_point.y;
                    var x2 = viewportPoint.x;
                    var y2 = viewportPoint.y;

                    var d3Line = d3.select(overlay.node()).append("line")
                        .style('stroke', 'rgba(0,0,255,0.75)')
                        .attr("id", "svg-polygon-line-" + drawn_lines)
                        .attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2)
                        .attr("stroke-width", 0.0005)
                        .attr("class", "svg-polygon-line")

                    drawn_lines++;
                
                    last_point = viewportPoint;
                }


                event.preventDefaultAction = true;

            } else if (drawing_points) {
                // The canvas-click event gives us a position in web coordinates.
                var webPoint = event.position;

                // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
                var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

                // Convert from viewport coordinates to image coordinates.
                var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

                // Show the results.
                //$("#web-point").text("Web Point: " + webPoint.toString());
                $("#web-point").text("Web Point: " + webPoint.x + ", " + webPoint.y);
                $("#viewport-point").text("Viewport Point: " + viewportPoint.toString());
                $("#image-point").text("Image Point: " + imagePoint.toString());

                console.log(webPoint.toString(), viewportPoint.toString(), imagePoint.toString());
                //console.log(viewer.world.getItemAt(0).source.dimensions);

                var x = viewportPoint.x;
                var y = viewportPoint.y;
                var radius = 0.005;

                var d3Circle = d3.select(overlay.node()).append("circle")
                    .style('fill', 'rgba(255,0,0,0.25)')
                    .attr("id", "svg-circle-" + drawn_points)
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", radius)
                    .attr("class", "svg-circle");

                drawn_points++;

                event.preventDefaultAction = true;

            } else if (drawing_lines) {
                // The canvas-click event gives us a position in web coordinates.
                var webPoint = event.position;

                // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
                var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

                // Convert from viewport coordinates to image coordinates.
                var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

                // Show the results.
                //$("#web-point").text("Web Point: " + webPoint.toString());
                $("#web-point").text("Web Point: " + webPoint.x + ", " + webPoint.y);
                $("#viewport-point").text("Viewport Point: " + viewportPoint.toString());
                $("#image-point").text("Image Point: " + imagePoint.toString());

                console.log(webPoint.toString(), viewportPoint.toString(), imagePoint.toString());
                //console.log(viewer.world.getItemAt(0).source.dimensions);

                if (last_point == null) {
                    last_point = viewportPoint;
                } else {
                    var x1 = last_point.x;
                    var y1 = last_point.y;
                    var x2 = viewportPoint.x;
                    var y2 = viewportPoint.y;

                    var d3Line = d3.select(overlay.node()).append("line")
                        .style('stroke', 'rgba(0,255,0,0.25)')
                        .attr("id", "svg-line-" + drawn_lines)
                        .attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2)
                        .attr("stroke-width", 0.001)
                        .attr("class", "svg-line")
                
                    drawn_lines++;
                    last_point = viewportPoint;
                }

                event.preventDefaultAction = true;
            }
        });
    }
};

// ----------
function initialize_openseadragon(tiles_url, channels, height, width) {
    console.log("initializing app!");

    if ($("#map").length == 0) {
        //The map was not actually loaded and the div does not exist.
        //do not initialize openseadragon.
        return;
    }
    
    App.init(tiles_url, channels, height, width);

    console.log("AFTER INIT!");

    $('#points-button').click(function() {
        $('.svg-circle').toggle();
    });


    $('#lines-button').click(function() {
        $('.svg-line').toggle();
    });

    $('#polygons-button').click(function() {
        $('.svg-polygon').toggle();
    });


    $('#draw-lines-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(this).text("Stop Drawing");

            drawing_lines = true;
            last_point = null;
        } else {
            $(this).text("Draw Lines");

            drawing_lines = false;
            last_point = null;
        }
    });

    $('#draw-points-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(this).text("Stop Drawing");

            drawing_points = true;
            drawing_polygon = false;
            drawing_lines = false;
        } else {
            $(this).text("Draw Points");

            drawing_points = false;
        }
    });

    $('#draw-polygon-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(this).text("Close Polygon");

            drawing_polygon = true;
            last_point = null;
        } else {
            $(this).text("Draw Polygon");

            var points_str = "";
            for (var i = 0; i < polygon_points.length; i++) {
                if (i != 0) points_str += " ";
                points_str += polygon_points[i].x + "," + polygon_points[i].y;
            }

            console.log(points_str);

            var d3Polygon = d3.select(overlay.node()).append("polygon")
                .style('fill', 'rgba(0,0,255,0.25)')
                .attr("id", "svg-polygon-" + drawn_polygons)
                .attr("points", points_str)
                .attr("stroke-width", 0.001)
                .attr("class", "svg-polygon")

            drawn_polygons++;

            $(".svg-polygon-line").remove();
            $(".svg-polygon-circle").remove();

            polygon_points = [];

            drawing_polygon = false;
            last_point = null;
        }
    });
}

var initialized_mosaic = false;

function initialize_mosaic(responseText) {
    initialized_mosaic = true;
    console.log("received initialize mosaic response: " + responseText);
    var response = JSON.parse(responseText);

    $("#index-content").html(response.html);
    if (typeof response.navbar != undefined) {
        console.log("SETTING NAVBAR CONTENT");
        $("#navbar-content").html(response.navbar);
    }

    $("#back-to-projects").click(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_mosaics(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=INDEX');
    });

    $("#back-to-mosaics").click(function() {
        var project_id = $(this).attr('project_id');
        console.log("going back to mosaics with project_id: " + project_id);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_mosaics(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=MOSAICS&project_id=' + project_id);
    });


    //TODO: need to grab these from JSON isntead of text
    initialize_openseadragon(response.mosaic_url, response.channels, response.height, response.width);


    $(".kernel-nav").click(function() {
        var kernel = $(this).attr("kernel");
        console.log("clicked kernel nav with kernel : '" + kernel + "', active? " + $(this).hasClass("active"));

        if ($(this).hasClass("active")) {
            kernel_func = null;
            $(this).removeClass("active");
        } else {
            $(".kernel-nav").removeClass("active");
            $(this).addClass("active");

            if (kernel == 'EDGE1') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                         1,  2,  1,
                         0,  0,  0,
                        -1, -2, -1]);

            } else if (kernel == 'EDGE2') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                        -1,  0, 1,
                        -2,  0, 2,
                        -1,  0, 1]);

            } else if (kernel == 'EDGE3') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                        -1, -1, -1,
                        -1,  8, -1,
                        -1, -1, -1]);

            } else if (kernel == 'SHARPEN') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                        0, -1,  0,
                        -1,  5, -1,
                        0, -1,  0]);

            }
        }

        var processors = [];
        if (filter_func != null) processors.push(filter_func);
        if (kernel_func != null) processors.push(kernel_func);

        console.log("processors.length: " + processors.length);

        if (processors.length > 0) {
            viewer.setFilterOptions({
                filters: {
                    processors: processors
                },
                loadMode: 'sync'
            });
        }
    });

    $(".filter-nav").click(function() {
        var filter = $(this).attr("filter");
        console.log("clicked filter nav with filter: '" + filter + "'");

        $(".filter-nav").removeClass("active");
        $(this).addClass("active");


        if (filter == 'RGB') {
            filter_func = OpenSeadragon.Filters.RGB();
        } else if (filter == 'NIR') {
            filter_func = OpenSeadragon.Filters.NIR();
        } else if (filter == 'CNIR') {
            filter_func = OpenSeadragon.Filters.CNIR();
        } else if (filter == 'NDVI') {
            filter_func = OpenSeadragon.Filters.NDVI();
        } else if (filter == 'CNDVI') {
            filter_func = OpenSeadragon.Filters.CNDVI();
        } else if (filter == 'VARI') {
            filter_func = OpenSeadragon.Filters.VARI();
        } else if (filter == 'TGI') {
            filter_func = OpenSeadragon.Filters.TGI();
        }

        var processors = [];
        if (filter_func != null) processors.push(filter_func);
        if (kernel_func != null) processors.push(kernel_func);

        if (processors.length > 0) {
            viewer.setFilterOptions({
                filters: {
                    processors: processors
                },
                loadMode: 'sync'
            });
        }

    });
}

function initialize_splash(responseText) {
    var response = JSON.parse(responseText);

    if (response.err_msg) {
        display_error_modal(response.err_title, response.err_msg);
    } else {
        $("#index-content").html(response.html);

        if (typeof response.navbar != undefined) {
            console.log("SETTING NAVBAR CONTENT");
            $("#navbar-content").html(response.navbar);
        }
    }
}

function serverRequest(requestType, responseFunction) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', './request.php');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        responseFunction(xhr.responseText);
    };
    xhr.send('id_token=' + id_token + '&request=' + requestType);
}

function onSignIn(googleUser) {
    profile = googleUser.getBasicProfile();
    id_token = googleUser.getAuthResponse().id_token;

    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.

    initialized_mosaic = true;
    serverRequest("MOSAIC&mosaic_id=" + mosaic_id, initialize_mosaic);

    //$("#signin-form").append("<a href='javascript:void(0)' id='signout-button' class='btn btn-outline-success my-2 my-sm-0' onclick='signOut();'>Sign out</a>");
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();

    auth2.signOut().then(function () {
        console.log('User signed out.');

        window.location.href = "./";
    });
}


function login() {
    console.log("login keep alive!");

    gapi.load('auth2', function() {
        gapi.auth2.init({
            client_id: '913778561877-7vmnbjvuc9c2g3c3qejgckjdtdivg9n1.apps.googleusercontent.com',
        }).then(function(){
            auth2 = gapi.auth2.getAuthInstance();
            //console.log("SIGNED IN?" + auth2.isSignedIn.get()); //now this always returns correctly        

            if (auth2.isSignedIn.get()) {
                id_token = auth2.currentUser.get().getAuthResponse().id_token;
                if (!initialized_mosaic) {
                    //mosaic_id is set in mosaic.php from $_GET
                    if (!initialized_mosaic) {
                        serverRequest("MOSAIC&mosaic_id=" + mosaic_id, initialize_mosaic);
                    }
                }
            } else {
                id_token = 'NONE';
                //mosaic_id is set in mosaic.php from $_GET
                serverRequest("MOSAIC&mosaic_id=" + mosaic_id, initialize_splash);
            }
        });
    });


    setTimeout(login, 5 * 60 * 1000);  //1 minutes
}

$(document).ready(function() {
    console.log("initializing index!");

    login();
});

