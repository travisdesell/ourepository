var viewer;
var overlay;

var utm_zone;

var lat_upper_left;
var lon_upper_left;
var lat_upper_right;
var lon_upper_right;
var lat_lower_left;
var lon_lower_left;
var lat_lower_right;
var lon_lower_right;

var utm_e_upper_left;
var utm_n_upper_left;
var utm_e_upper_right;
var utm_n_upper_right;
var utm_e_lower_left;
var utm_n_lower_left;
var utm_e_lower_right;
var utm_n_lower_right;

var drawn_polygons = 0;
var drawn_lines = 0;
var drawn_points = 0;

var drawing_points = false;
var drawing_lines = false;
var drawing_polygon = false;
var last_point = null;
var polygon_points = [];

var current_label_id = -1;
var current_label_name;
var current_label_type;
var current_label_color;

var kernel_func = null;
var filter_func = null;

var mosaic_width;
var mosaic_height;

function display_error_modal(title, message) {
    $("#error-modal-title").html(title);
    $("#error-modal-body").html(message);
    $("#error-modal").modal();
}

function toDegreesMinutesAndSeconds(coordinate) {
    var absolute = Math.abs(coordinate);
    var degrees = Math.floor(absolute);
    var minutesNotTruncated = (absolute - degrees) * 60;
    var minutes = Math.floor(minutesNotTruncated);
    var seconds = Number((minutesNotTruncated - minutes) * 60).toFixed(4);

    return degrees + "d" + minutes + "'" + seconds;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


function get_mark_coordinates(viewportPoint, type) {
    console.log("viewportPoint: " + viewportPoint);

    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    console.log("imagePoint: " + imagePoint);

    var pixel_y = Math.round(imagePoint.y);
    var pixel_x = Math.round(imagePoint.x);

    if (type == "pixel") return { y : pixel_y, x : pixel_x };

    var x = imagePoint.x / image_width;
    var y = imagePoint.y / image_height;

    /*
       console.log("utm_n_upper_left: " + utm_n_upper_left + ", utm_n_lower_left: " + utm_n_lower_left);
       console.log("utm_e_upper_left: " + utm_e_upper_left + ", utm_e_upper_right: " + utm_n_upper_right);
       console.log("y: " + y + ", x: " + x);
       */

    if (utm_n_upper_left != null) {
        var utm_n = utm_n_upper_left + (y * (utm_n_upper_left - utm_n_lower_left));
        var utm_e = utm_e_upper_left + (x * (utm_e_upper_left - utm_e_lower_right));

        var utm_n_text = Number(utm_n).toLocaleString('en', {maximumFractionDigits : 4, minimumFractionDigits : 4});
        var utm_e_text = Number(utm_e).toLocaleString('en', {maximumFractionDigits : 4, minimumFractionDigits : 4});

        if (type == "utm") return { y : utm_n_text, x : utm_e_text };

        //var utm = "+proj=utm +zone=32";
        var utm = "+proj=utm +zone=" + utm_zone;
        var wgs84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
        geo = proj4(utm, wgs84, [utm_e, utm_n]);
        //console.log(geo);

        var lat = toDegreesMinutesAndSeconds(geo[0]);
        var latitudeCardinal = Math.sign(geo[0]) >= 0 ? "N" : "S";

        var lon = toDegreesMinutesAndSeconds(geo[1]);
        var longitudeCardinal = Math.sign(geo[1]) >= 0 ? "E" : "W";

        var lat_text = lat + " " + latitudeCardinal;
        var lon_text = lon + " " + longitudeCardinal;

        if (type == "geo") return { y : lat_text, x : lon_text };
    }

    return { y : 0, x : 0 };
}

function set_mark_coordinates() {
    var type;

    if ($(".pixel-switch-button").hasClass("active")) {
        type = "pixel";
    } else if ($(".geo-switch-button").hasClass("active")) {
        type = "geo";
    } else if ($(".utm-switch-button").hasClass("active")) {
        type = "utm";
    } else {
        return; //should never get here
    }

    $(".pixel-pair").each(function() {
        var vy = Number($(this).attr("vy"));
        var vx = Number($(this).attr("vx"));

        var point = new OpenSeadragon.Point(vx, vy);

        var new_coords = get_mark_coordinates(point, type);

        console.log("result " + new_coords.y + ", " + new_coords.x + " in " + type);

        $(this).find(".pixel-y").text(new_coords.y);
        $(this).find(".pixel-x").text(new_coords.x);
        
    });
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
                    //"Url": tiles_url,
                    "Url": "request.php?request=TILE&id_token=" + id_token + "&mosaic_id=" + mosaic_id + "&file=" + tiles_url,
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

        viewer.addHandler('open', function() {
            var tracker = new OpenSeadragon.MouseTracker({
                element: viewer.container,
                moveHandler: function(event) {
                    var webPoint = event.position;
                    var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
                    //console.log("viewportPoint: " + viewportPoint);
                    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
                    //console.log("imagePoint: " + imagePoint);

                    //var zoom = viewer.viewport.getZoom(true);
                    //var imageZoom = viewer.viewport.viewportToImageZoom(zoom);

                    //$("#web-point").text("Web Point: " + webPoint.x + ", " + webPoint.y);
                    //$("#viewport-point").text("Viewport Point: " + viewportPoint.toString());
                    $("#pixel-y").text(Math.round(imagePoint.y));
                    $("#pixel-x").text(Math.round(imagePoint.x));

                    var x = imagePoint.x / width;
                    var y = imagePoint.y / height;

                    /*
                    console.log("utm_n_upper_left: " + utm_n_upper_left + ", utm_n_lower_left: " + utm_n_lower_left);
                    console.log("utm_e_upper_left: " + utm_e_upper_left + ", utm_e_upper_right: " + utm_n_upper_right);
                    console.log("y: " + y + ", x: " + x);
                    */
                    
                    if (utm_n_upper_left != null) {
                        var utm_n = utm_n_upper_left + (y * (utm_n_upper_left - utm_n_lower_left));
                        var utm_e = utm_e_upper_left + (x * (utm_e_upper_left - utm_e_lower_right));

                        $("#utm-n").text(Number(utm_n).toLocaleString('en', {maximumFractionDigits : 4, minimumFractionDigits : 4}));
                        $("#utm-e").text(Number(utm_e).toLocaleString('en', {maximumFractionDigits : 4, minimumFractionDigits : 4}));

                        //var utm = "+proj=utm +zone=32";
                        var utm = "+proj=utm +zone=" + utm_zone;
                        var wgs84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
                        geo = proj4(utm, wgs84, [utm_e, utm_n]);
                        //console.log(geo);

                        var lat = toDegreesMinutesAndSeconds(geo[0]);
                        var latitudeCardinal = Math.sign(geo[0]) >= 0 ? "N" : "S";

                        var lon = toDegreesMinutesAndSeconds(geo[1]);
                        var longitudeCardinal = Math.sign(geo[1]) >= 0 ? "E" : "W";

                        $("#geo-y").text(lat + " " + latitudeCardinal);
                        $("#geo-x").text(lon + " " + longitudeCardinal);
                    }
                }
            });


            tracker.setTracking(true);  

        });

        viewer.addHandler('canvas-click', function(event) {
            var color = hexToRgb(current_label_color);

            if (drawing_polygon) {
                // The canvas-click event gives us a position in web coordinates.
                var webPoint = event.position;
                console.log(event);

                // Convert that to viewport coordinates, the lingua franca of OpenSeadragon coordinates.
                var viewportPoint = viewer.viewport.pointFromPixel(webPoint);

                // Convert from viewport coordinates to image coordinates.
                var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

                // Show the results.
                //$("#web-point").text("Web Point: " + webPoint.toString());
                //$("#web-point").text("Web Point: " + webPoint.x + ", " + webPoint.y);
                //$("#viewport-point").text("Viewport Point: " + viewportPoint.toString());
                //$("#pixel-x").text(Math.round(imagePoint.x));
                //$("#pixel-y").text(Math.round(imagePoint.y));

                console.log(webPoint.toString(), viewportPoint.toString(), imagePoint.toString());
                //console.log(viewer.world.getItemAt(0).source.dimensions);

                var x = viewportPoint.x;
                var y = viewportPoint.y;
                polygon_points.push({"x": x, "y": y});

                var radius = 0.0025;


                var d3Circle = d3.select(overlay.node()).append("circle")
                    .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                    .attr("id", "svg-circle-" + drawn_points)
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", radius)
                    .attr("label_id", current_label_id)
                    .attr("class", "svg-polygon-circle current-draw svg-item");

                drawn_points++;

                if (last_point == null) {
                    last_point = viewportPoint;
                } else {
                    var x1 = last_point.x;
                    var y1 = last_point.y;
                    var x2 = viewportPoint.x;
                    var y2 = viewportPoint.y;

                    var d3Line = d3.select(overlay.node()).append("line")
                        .style('stroke', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.75)')
                        .attr("id", "svg-polygon-line-" + drawn_lines)
                        .attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2)
                        .attr("stroke-width", 0.0005)
                        .attr("label_id", current_label_id)
                        .attr("class", "svg-polygon-line current-draw svg-item");

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
                    .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                    .attr("id", "svg-circle-" + drawn_points)
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", radius)
                    .attr("label_id", current_label_id)
                    .attr("class", "svg-circle current-draw svg-item");

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
                        .style('stroke', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                        .attr("id", "svg-line-" + drawn_lines)
                        .attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2)
                        .attr("stroke-width", 0.001)
                        .attr("label_id", current_label_id)
                        .attr("class", "svg-line current-draw svg-item");
                
                    drawn_lines++;
                    last_point = viewportPoint;
                }

                event.preventDefaultAction = true;
            }
        });
    }
};

function initialize_labels() {
    $(".label-list-item:not(.bound)").addClass("bound").click(function() {
        if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            $(this).css("background-color", "#fff");
            $(this).css("border-color", 'rgba(0,0,0,0.125)');
            $(this).css("color", "#495057")

            var label_id = $(this).attr("label_id");
            var label_name = $(this).attr("label_name");

            if (label_name != $("#mark-label-select").val()) {
                $(".svg-item[label_id='" + label_id + "']").hide();
            }
        } else {
            $(this).addClass("active");

            //var color = $(this).attr("label_color");
            //$(this).css("background-color", color);

            var color = hexToRgb($(this).attr("label_color"));
            $(this).css("background-color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)');
            $(this).css("border-color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)');
            //$(this).css("color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)');
            $(this).css("color", "#495057")

            var label_id = $(this).attr("label_id");
            $(".svg-item[label_id='" + label_id + "']").show();
        }

    });
}

function initialize_mark_buttons() {
    $(".highlight-point-button:not(.bound)").addClass("bound").click(function() {
        var point_id = $(this).attr("point_id");
        var point = d3.select(".svg-item[point_id='" + point_id + "']");
        var fill = point.style("fill");

        if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            fill = fill.replace(/[\d\.]+\)$/g, '0.25)');
            point.attr("r", "0.005").style("fill", fill);
        } else {
            $(this).addClass("active");
            fill = fill.replace(/[\d\.]+\)$/g, '0.75)');
            point.attr("r", "0.015").style("fill", fill);
        }
    });

    $(".highlight-line-button:not(.bound)").addClass("bound").click(function() {
        var line_id = $(this).attr("line_id");
        var line = d3.select(".svg-item[line_id='" + line_id + "']");
        var stroke = line.style("stroke");

        if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            stroke = stroke.replace(/[\d\.]+\)$/g, '0.25)');
            line.attr("stroke-width",0.001).style("stroke", stroke);
        } else {
            $(this).addClass("active");
            stroke = stroke.replace(/[\d\.]+\)$/g, '0.75)');
            line.attr("stroke-width",0.003).style("stroke", stroke);
        }
    });

    $(".highlight-polygon-button:not(.bound)").addClass("bound").click(function() {
        var polygon_id = $(this).attr("polygon_id");
        var polygon = d3.select(".svg-item[polygon_id='" + polygon_id + "']");
        var fill = polygon.style("fill");

        if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            fill = fill.replace(/[\d\.]+\)$/g, '0.25)');
            polygon.style("fill", fill);
        } else {
            $(this).addClass("active");
            fill = fill.replace(/[\d\.]+\)$/g, '0.75)');
            polygon.style("fill", fill);
        }
    });


    $(".remove-point-button:not(.bound)").addClass("bound").click(function() {
        var point_id = $(this).attr("point_id");

        var submission_data = {
            request : "REMOVE_POINT",
            id_token : id_token,
            mosaic_id : mosaic_id,
            point_id : point_id
        };

        $.ajax({
            type: 'POST',
            url: './request.php',
            data : submission_data,
            dataType : 'json',
            success : function(response) {
                console.log("received response: ");
                console.log(response);

                if (response.err_msg) {
                    display_error_modal(response.err_title, response.err_msg);
                    cancel_drawing();
                    return;
                }

                $(".svg-item[point_id='" + point_id + "']").remove();
                $(".point-mark[point_id='" + point_id + "']").remove();

            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
            },
            async: true
        });
    });

    $(".remove-line-button:not(.bound)").addClass("bound").click(function() {
        var line_id = $(this).attr("line_id");

        var submission_data = {
            request : "REMOVE_LINE",
            id_token : id_token,
            mosaic_id : mosaic_id,
            line_id : line_id
        };

        $.ajax({
            type: 'POST',
            url: './request.php',
            data : submission_data,
            dataType : 'json',
            success : function(response) {
                console.log("received response: ");
                console.log(response);

                if (response.err_msg) {
                    display_error_modal(response.err_title, response.err_msg);
                    cancel_drawing();
                    return;
                }

                $(".svg-item[line_id='" + line_id + "']").remove();
                $(".line-mark[line_id='" + line_id + "']").remove();

            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
            },
            async: true
        });
    });

    $(".remove-polygon-button:not(.bound)").addClass("bound").click(function() {
        var polygon_id = $(this).attr("polygon_id");

        var submission_data = {
            request : "REMOVE_POLYGON",
            id_token : id_token,
            mosaic_id : mosaic_id,
            polygon_id : polygon_id
        };

        $.ajax({
            type: 'POST',
            url: './request.php',
            data : submission_data,
            dataType : 'json',
            success : function(response) {
                console.log("received response: ");
                console.log(response);

                if (response.err_msg) {
                    display_error_modal(response.err_title, response.err_msg);
                    cancel_drawing();
                    return;
                }

                $(".svg-item[polygon_id='" + polygon_id + "']").remove();
                $(".polygon-mark[polygon_id='" + polygon_id + "']").remove();

            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
            },
            async: true
        });
    });

}

function cancel_drawing() {
    $(".current-draw").remove();
    $(".cancel-drawing-button").hide();

    drawing_points = false;
    drawing_polygon = false;
    drawing_lines = false;

    polygon_points = [];
    last_point = null;

    if (current_label_type == "POLYGON") {
        $("#draw-polygon-button").text("Draw Polygon").attr("aria-pressed", "false").removeClass("active");
    } else if (current_label_type == "LINE") {
        $("#draw-lines-button").text("Draw Lines").attr("aria-pressed", "false").removeClass("active");
    } else if (current_label_type == "POINT") {
        $("#draw-points-button").text("Draw Points").attr("aria-pressed", "false").removeClass("active");
    }
}

// ----------
function initialize_openseadragon(tiles_url, channels, height, width, marks) {
    console.log("initializing app!");
    image_width = width;
    image_height = height;

    if ($("#map").length == 0) {
        //The map was not actually loaded and the div does not exist.
        //do not initialize openseadragon.
        return;
    }
    
    App.init(tiles_url, channels, height, width);

    console.log("AFTER INIT!");

    var points = marks.points;

    console.log("received points!");
    for (var i = 0; i < points.length; i++) {
        console.log(points[i]);

        var color = hexToRgb(points[i].color);

        var d3Circle = d3.select(overlay.node()).append("circle")
            .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
            .attr("cx", points[i].cx)
            .attr("cy", points[i].cy)
            .attr("r", points[i].radius)
            .attr("label_id", points[i].label_id)
            .attr("point_id", points[i].point_id)
            .attr("class", "svg-circle svg-item");
    }

    var lines = marks.lines;

    console.log("received lines!");
    for (var i = 0; i < lines.length; i++) {
        console.log(lines[i]);

        var color = hexToRgb(lines[i].color);

        var d3Line = d3.select(overlay.node()).append("line")
            .style('stroke', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.75)')
            .attr("x1", lines[i].x1)
            .attr("y1", lines[i].y1)
            .attr("x2", lines[i].x2)
            .attr("y2", lines[i].y2)
            .attr("stroke-width", 0.0005)
            .attr("label_id", lines[i].label_id)
            .attr("line_id", lines[i].line_id)
            .attr("class", "svg-line svg-item");
    }

    var polygons = marks.polygons;

    console.log("received polygons!");
    for (var i = 0; i < polygons.length; i++) {
        console.log(polygons[i]);

        var color = hexToRgb(polygons[i].color);

        var d3Polygon = d3.select(overlay.node()).append("polygon")
            .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
            .attr("points", polygons[i].points_str)
            .attr("stroke-width", 0.001)
            .attr("label_id", polygons[i].label_id)
            .attr("polygon_id", polygons[i].polygon_id)
            .attr("class", "svg-polygon svg-item");
    }

    //everything starts as hidden initially
    $(".svg-item").hide();


    initialize_labels();

    $(".cancel-drawing-button").click(function() {
        cancel_drawing();
    });

    $('#draw-points-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(".cancel-drawing-button").show();
            $(this).text("Save Points");

            drawing_points = true;
            drawing_polygon = false;
            drawing_lines = false;
        } else {
            //drawing finished

            var points = [];
            var point_elements = [];
            $(".current-draw").each(function() {
                point_elements.push($(this));

                var cx = $(this).attr("cx");
                var cy = $(this).attr("cy");
                var radius = $(this).attr("r");

                console.log("point: " + cx + ", " + cy + ", " + radius);

                points.push({
                    cx : cx,
                    cy : cy,
                    radius : radius
                });

            });

            //console.log(points);
            //console.log(point_elements);

            var submission_data = {
                request : "CREATE_POINTS",
                id_token : id_token,
                mosaic_id : mosaic_id,
                label_id : current_label_id,
                points : points
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'json',
                success : function(response) {
                    console.log("received response: ");
                    console.log(response);
                    //var response = JSON.parse(responseText);

                    if (response.err_msg) {
                        display_error_modal(response.err_title, response.err_msg);
                        cancel_drawing();
                        return;
                    }

                    var point_ids = response.point_ids;
                    if (point_ids.length != point_elements.length) {
                        display_error_modal("Create Points Error", "Internal server error. Number of returned points is not equal to the number of saved points. This should never happen, please contact the administrator");
                        cancel_drawing();
                        return;
                    }

                    var point_htmls = response.point_htmls;
                    for (var i = 0; i < point_htmls.length; i++) {
                        $("#marks-card").append(point_htmls[i]);
                    }
                    initialize_mark_buttons();

                    for (var i = 0; i < point_ids.length; i++) {
                        console.log("setting mark id for point (" + points[i].cx + ", " + points[i].cy + ", " + points[i].radius + ") to " + point_ids[i]);
                        point_elements[i].attr("point_id", point_ids[i]);
                    }

                    $(".cancel-drawing-button").hide();
                    $(".current-draw").removeClass("current-draw");
                    $("#draw-points-button").text("Draw Points");

                    drawing_points = false;
                    last_point = null;
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                    display_error_modal(textStatus, errorThrown);
                    cancel_drawing();
                },
                async: true
            });

        }
    });

    $('#draw-lines-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(".cancel-drawing-button").show();
            $(this).text("Save Lines");

            drawing_points = false;
            drawing_polygon = false;
            drawing_lines = true;

            last_point = null;
        } else {
            //drawing finished

            var lines = [];
            var line_elements = [];
            $(".current-draw").each(function() {
                line_elements.push($(this));

                var x1 = $(this).attr("x1");
                var x2 = $(this).attr("x2");
                var y1 = $(this).attr("y1");
                var y2 = $(this).attr("y2");

                console.log("line: " + x1 + ", " + x2 + ", " + y1 + ", " + y2);

                lines.push({
                    x1 : x1,
                    x2 : x2,
                    y1 : y1,
                    y2 : y2
                });

            });

            //console.log(lines);
            //console.log(line_elements);

            var submission_data = {
                request : "CREATE_LINES",
                id_token : id_token,
                mosaic_id : mosaic_id,
                label_id : current_label_id,
                lines : lines
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'json',
                success : function(response) {
                    console.log("received response: ");
                    console.log(response);
                    //var response = JSON.parse(responseText);

                    if (response.err_msg) {
                        display_error_modal(response.err_title, response.err_msg);
                        cancel_drawing();
                        return;
                    }

                    var line_ids = response.line_ids;
                    if (line_ids.length != line_elements.length) {
                        display_error_modal("Create Points Error", "Internal server error. Number of returned lines is not equal to the number of saved lines. This should never happen, please contact the administrator");
                        cancel_drawing();
                        return;
                    }

                    var line_htmls = response.line_htmls;
                    for (var i = 0; i < line_htmls.length; i++) {
                        $("#marks-card").append(line_htmls[i]);
                    }
                    initialize_mark_buttons();

                    for (var i = 0; i < line_ids.length; i++) {
                        console.log("setting mark id for line (" + lines[i].cx + ", " + lines[i].cy + ", " + lines[i].radius + ") to " + line_ids[i]);
                        line_elements[i].attr("line_id", line_ids[i]);
                    }

                    $(".cancel-drawing-button").hide();
                    $(".current-draw").removeClass("current-draw");
                    $("#draw-lines-button").text("Draw Lines");

                    drawing_lines = false;
                    last_point = null;
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                    display_error_modal(textStatus, errorThrown);
                    cancel_drawing();
                },
                async: true
            });

        }
    });

    $('#draw-polygon-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(".cancel-drawing-button").show();
            $(this).text("Save Polygon");

            drawing_points = false;
            drawing_lines = false;
            drawing_polygon = true;
            last_point = null;
        } else {

            var points_str = "";
            for (var i = 0; i < polygon_points.length; i++) {
                if (i != 0) points_str += " ";
                points_str += polygon_points[i].x + "," + polygon_points[i].y;
            }

            console.log("points_str: " + points_str);

            //console.log(polygons);
            //console.log(polygon_elements);

            var submission_data = {
                request : "CREATE_POLYGON",
                id_token : id_token,
                mosaic_id : mosaic_id,
                label_id : current_label_id,
                points_str : points_str
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'json',
                success : function(response) {
                    console.log("received response: ");
                    console.log(response);
                    //var response = JSON.parse(responseText);

                    if (response.err_msg) {
                        display_error_modal(response.err_title, response.err_msg);
                        cancel_drawing();
                        return;
                    }

                    var polygon_id = response.polygon_id;
                    var points_str = response.points_str;

                    $(".cancel-drawing-button").hide();
                    $(".current-draw").removeClass("current-draw");
                    $("#draw-polygon-button").text("Draw Polygon");

                    var color = hexToRgb(current_label_color);
                    var d3Polygon = d3.select(overlay.node()).append("polygon")
                        .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                        .attr("points", points_str)
                        .attr("stroke-width", 0.001)
                        .attr("label_id", current_label_id)
                        .attr("polygon_id", polygon_id)
                        .attr("class", "svg-polygon svg-item");

                    $(".svg-polygon-line").remove();
                    $(".svg-polygon-circle").remove();

                    var polygon_html = response.polygon_html;
                    $("#marks-card").append(polygon_html);
                    initialize_mark_buttons();

                    polygon_points = [];

                    drawing_polygon = false;
                    last_point = null;
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);
                    display_error_modal(textStatus, errorThrown);
                    cancel_drawing();
                },
                async: true
            });

        }
    });
}

var initialized_mosaic = false;

function initialize_mosaic(responseText) {
    initialized_mosaic = true;
    console.log("received initialize mosaic response: " + responseText);
    var response = JSON.parse(responseText);

    var mosaic_info = response.mosaic_info;
    console.log(mosaic_info);
    utm_zone = mosaic_info.utm_zone;

    lat_upper_left = Number(mosaic_info.lat_upper_left);
    lon_upper_left = Number(mosaic_info.lon_upper_left);
    lat_upper_right = Number(mosaic_info.lat_upper_right);
    lon_upper_right = Number(mosaic_info.lon_upper_right);
    lat_lower_left = Number(mosaic_info.lat_lower_left);
    lon_lower_left = Number(mosaic_info.lon_lower_left);
    lat_lower_right = Number(mosaic_info.lat_lower_right);
    lon_lower_right = Number(mosaic_info.lon_lower_right);

    utm_e_upper_left = Number(mosaic_info.utm_e_upper_left);
    utm_n_upper_left = Number(mosaic_info.utm_n_upper_left);
    utm_e_upper_right = Number(mosaic_info.utm_e_upper_right);
    utm_n_upper_right = Number(mosaic_info.utm_n_upper_right);
    utm_e_lower_left = Number(mosaic_info.utm_e_lower_left);
    utm_n_lower_left = Number(mosaic_info.utm_n_lower_left);
    utm_e_lower_right = Number(mosaic_info.utm_e_lower_right);
    utm_n_lower_right = Number(mosaic_info.utm_n_lower_right);


    $("#index-content").html(response.html);
    if (typeof response.navbar != undefined) {
        console.log("SETTING NAVBAR CONTENT");
        $("#navbar-content").html(response.navbar);
    }

    initialize_openseadragon(response.mosaic_url, response.channels, response.height, response.width, response.marks);

    initialize_mark_buttons();

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
                         1,  0, -1,
                         0,  0,  0,
                        -1,  0,  1]);

            } else if (kernel == 'EDGE2') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                         0,  1,  0,
                         1, -4,  1,
                         0,  1,  0]);

            } else if (kernel == 'EDGE3') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                        -1, -1, -1,
                        -1,  8, -1,
                        -1, -1, -1]);

            } else if (kernel == 'SOBEL-Y') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                         1,  2,  1,
                         0,  0,  0,
                        -1, -2, -1]);

            } else if (kernel == 'SOBEL-X') {
                kernel_func = OpenSeadragon.Filters.CONVOLUTION([
                        -1,  0, 1,
                        -2,  0, 2,
                        -1,  0, 1]);

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

    $(".pixel-switch-button").click(function() {
        $(".table-pixel").show();
        $(".table-geo").hide();
        $(".table-utm").hide();

        $(".pixel-switch-button").addClass("active").addClass("btn-secondary").removeClass("btn-outline-secondary");
        $(".geo-switch-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $(".utm-switch-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");

        set_mark_coordinates();
    });

    $(".geo-switch-button").click(function() {
        $(".table-pixel").hide();
        $(".table-geo").show();
        $(".table-utm").hide();

        $(".pixel-switch-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $(".geo-switch-button").addClass("active").addClass("btn-secondary").removeClass("btn-outline-secondary");
        $(".utm-switch-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");

        set_mark_coordinates();
    });

    $(".utm-switch-button").click(function() {
        $(".table-pixel").hide();
        $(".table-geo").hide();
        $(".table-utm").show();

        $(".pixel-switch-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $(".geo-switch-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $(".utm-switch-button").addClass("active").addClass("btn-secondary").removeClass("btn-outline-secondary");

        set_mark_coordinates();
    });

    $(".create-label-nav").click(function() {
        $("#create-label-modal-button").addClass("disabled");
        $(".label-type-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $("#create-label-modal").modal();
    });

    $(".label-type-button").click(function() {
        $(".label-type-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $(this).addClass("active").addClass("btn-secondary").removeClass("btn-outline-secondary");

        var val = $.trim( $("#label-name-text-input").val() );
        if (val != "") {
            $("#create-label-modal-button").removeClass("disabled");
        } else {
            $("#create-label-modal-button").addClass("disabled");
        }
    });

    $("#label-name-text-input").on("propertychange change click keyup input paste", function() {
        var val = $.trim( $(this).val() );

        if (val != "" && $(".label-type-button.active").length ) {
            $("#create-label-modal-button").removeClass("disabled");
        } else {
            $("#create-label-modal-button").addClass("disabled");
        }
    });

    $("#create-label-modal-button").click(function() {
        if ($(this).hasClass("disabled")) return;
        $(this).addClass("disabled");

        var name = $.trim( $("#label-name-text-input").val() );
        var type = $(".label-type-button.active").text().toUpperCase().slice(0,-1);
        var color = $("#html5colorpicker").val();

        console.log("name: '" + name + "'");
        console.log("type: '" + type + "'");
        console.log("color: '" + color + "'");

        var submission_data = {
            request : "CREATE_LABEL",
            id_token : id_token,
            mosaic_id : mosaic_id,
            label_name : name,
            label_type : type,
            label_color : color
        };

        $.ajax({
            type: 'POST',
            url: './request.php',
            data : submission_data,
            dataType : 'text',
            success : function(responseText) {
                console.log("received response: " + responseText);
                var response = JSON.parse(responseText);

                $("#create-label-modal").modal('hide');

                if (response.err_msg) {
                    display_error_modal(response.err_title, response.err_msg);
                } else {
                    var label_id = response.label_id;
                    var label_name = response.label_name;
                    var label_type = response.label_type;
                    var label_color = response.label_color;

                    $("#labels-card").show();

                    var list_html = "<a href='javascript:void(0);' label_id='" + label_id + "' label_type='" + label_type + "' label_name='" + label_name + "' label_color='" + label_color + "' class='label-list-item list-group-item list-group-item-action' style='margin: 0 -1 0 -1;' >" + label_name + "</a>";
                    $("#labels-card > .list-group").append(list_html);

                    var option_html = "<option label_id='" + label_id + "' label_type='" + label_type + "' label_name='" + label_name + "' label_color='" + label_color + "'>" + label_name + "</option>";
                    $("#mark-label-select").append(option_html);
                    initialize_labels();
                }

            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);

            },
            async: true
        });
    });

    $(".remove-label-nav").click(function() {
        $("#remove-label-modal-button").addClass("disabled");

        var buttons_html = "";

        $(".label-list-item").each(function() {
            var label_id = $(this).attr("label_id");
            var label_name = $(this).attr("label_name");
            var label_color = $(this).attr("label_color");

            buttons_html += "<button type='button' label_id='" + label_id + "' label_name='" + label_name + "' label_color='" + label_color + "' class='remove-label-group-button label-type-button btn btn-small btn-outline-secondary' data-toggle='button' aria-pressed='false'>" + label_name + "</button>";
        });
        $("#remove-modal-button-group").html(buttons_html);

        //initialize the buttons
        $(".remove-label-group-button:not(.bound)").addClass("bound").click(function() {
            $(".remove-label-group-button").removeClass("active");
            $(this).addClass("active");
            $("#remove-label-modal-button").removeClass("disabled");

            $(".remove-label-group-button").css("background-color", "#fff");
            $(".remove-label-group-button").css("border-color", 'rgba(0,0,0,0.125)');
            $(".remove-label-group-button").css("color", "#495057")

            var color = hexToRgb($(this).attr("label_color"));
            $(this).css("background-color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)');
            $(this).css("border-color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)');
            $(this).css("color", "#495057")
        });

        $(".remove-label-group-button").hover(function() {
            var color = hexToRgb($(this).attr("label_color"));
            $(this).css("background-color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)');
            $(this).css("border-color", 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',1)');
            $(this).css("color", "#495057")
        }, function() {
            if (!$(this).hasClass("active")) {
                $(this).css("background-color", "#fff");
                $(this).css("border-color", 'rgba(0,0,0,0.125)');
                $(this).css("color", "#495057")
            }
        });

        $(".remove-label-group-button").removeClass("active").removeClass("btn-secondary").addClass("btn-outline-secondary");
        $("#remove-label-modal").modal();
    });

    $("#remove-label-modal-button").click(function() {
        if ($(this).hasClass("disabled")) return;

        var label_id = $(".remove-label-group-button.active").attr("label_id");
        var label_name = $(".remove-label-group-button.active").attr("label_name");
        console.log("removing label with id: " + label_id);

        var submission_data = {
            request : "REMOVE_LABEL",
            id_token : id_token,
            mosaic_id : mosaic_id,
            label_id : label_id,
            label_name : label_name
        };

        $.ajax({
            type: 'POST',
            url: './request.php',
            data : submission_data,
            dataType : 'text',
            success : function(responseText) {
                console.log("received response: " + responseText);
                var response = JSON.parse(responseText);

                $("#remove-label-modal").modal('hide');

                if (response.err_msg) {
                    display_error_modal(response.err_title, response.err_msg);
                } else {
                    var label_id = response.label_id;
                    var label_name = response.label_name;

                    $(".line-mark[label_id='" + label_id + "']").remove();
                    $(".point-mark[label_id='" + label_id + "']").remove();
                    $(".polygon-mark[label_id='" + label_id + "']").remove();

                    $(".svg-item[label_id='" + label_id + "']").remove();
                    $(".label-list-item[label_id='" + label_id + "']").remove();

                    if ($("#mark-label-select").val() == label_name) {
                        cancel_drawing();
                        $("#polygon-marking").hide();
                        $("#lines-marking").hide();
                        $("#points-marking").hide();
                    }
                    $("#mark-label-select > option[label_id='" + label_id + "']").remove();
                }

            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);

            },
            async: true
        });
    });


    $("#mark-label-select").change(function() {
        var label_name = this.value;
        console.log("changed mark-label-select to: " + label_name);

        var option = $("#mark-label-select > option[label_name='" + label_name + "']");

        previous_label_id = current_label_id;

        current_label_id = option.attr("label_id");
        current_label_name = option.attr("label_name");
        current_label_type = option.attr("label_type");
        current_label_color = option.attr("label_color");

        console.log("selected label " + current_label_id + ", '" + current_label_name + "', " + current_label_type + ", " + current_label_color);

        $("#polygon-marking").hide();
        $("#lines-marking").hide();
        $("#points-marking").hide();

        $(".point-mark").hide();
        $(".line-mark").hide();
        $(".polygon-mark").hide();

        if (current_label_type == 'POLYGON') {
            $("#polygon-marking").show();
            $(".polygon-mark[label_id='" + current_label_id + "']").show();
        } else if (current_label_type == 'LINE') {
            $("#lines-marking").show();
            $(".line-mark[label_id='" + current_label_id + "']").show();
        } else if (current_label_type == 'POINT') {
            $("#points-marking").show();
            $(".point-mark[label_id='" + current_label_id + "']").show();
        }
        cancel_drawing();
        $(".cancel-drawing-button").hide();

        console.log("previous label id: " + previous_label_id);
        //was the previous select also selected for viewing, if not hide it's elements
        if ( !$(".label-list-item[label_id=" + previous_label_id + "]").hasClass("active") ) {
            $(".svg-item[label_id='" + previous_label_id + "']").hide();
        }

        //show elements for this label
        $(".svg-item[label_id='" + current_label_id + "']").show();

        set_mark_coordinates();
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

