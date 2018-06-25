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
var drawn_rectangles = 0;
var drawn_points = 0;

var POINT_RADIUS = 0.005;

var drawing_points = false;
var drawing_lines = false;
var drawing_rectangles = false;
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

var selected_prediction;
var has_mark_attributes = false;
var current_prediction_type = null;
var current_mark_attributes = null;
var current_predictions = null;

function display_error_modal(title, message) {
    $("#error-modal-title").html(title);
    $("#error-modal-body").html(message);
    $("#error-modal").modal();
}

function display_success_modal(title, message) {
    $("#success-modal-title").html(title);
    $("#success-modal-body").html(message);
    $("#success-modal").modal();
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
    //console.log("viewportPoint: " + viewportPoint);

    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    //console.log("imagePoint: " + imagePoint);

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

        //console.log("result " + new_coords.y + ", " + new_coords.x + " in " + type);

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
            showNavigator:  true,
            navigatorPosition:   "BOTTOM_LEFT",
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

        /*
        viewer.addHandler('canvas-drag', function(event) {
            if (drawing_polygon || drawing_points || drawing_lines) {
                console.log("doing canvas drag!");

                var webPoint = event.position;
                console.log(event);

                var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
                var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

                console.log("image point: " + imagePoint);

                event.preventDefaultAction = true;
            }
        });

        viewer.addHandler('canvas-drag-end', function(event) {
            if (drawing_polygon || drawing_points || drawing_lines) {
                console.log("doing canvas drag end!");

                var webPoint = event.position;
                console.log(event);

                var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
                var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

                console.log("image point: " + imagePoint);

                event.preventDefaultAction = true;
            }
        });
        */

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
                        .style('stroke', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
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
                var radius = POINT_RADIUS;

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

            } else if (drawing_rectangles) {
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

                    if (x1 > x2) {
                        var tmp = x1;
                        x1 = x2;
                        x2 = tmp;
                    }

                    if (y1 > y2) {
                        var tmp = y1;
                        y1 = y2;
                        y2 = tmp;
                    }

                    var d3Rect = d3.select(overlay.node()).append("rect")
                        .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                        .attr("id", "svg-rectangle-" + drawn_rectangles)
                        .attr("x", x1)
                        .attr("y", y1)
                        .attr("width", x2 - x1)
                        .attr("height", y2 - y1)
                        .attr("x1", x1)
                        .attr("y1", y1)
                        .attr("x2", x2)
                        .attr("y2", y2)
                        .attr("stroke-width", 0.001)
                        .attr("label_id", current_label_id)
                        .attr("class", "svg-rectangle current-draw svg-item");
                
                    drawn_rectangles++;
                    last_point = null;
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

function highlight_point(point_id) {
    var point = d3.select(".svg-item[point_id='" + point_id + "']");
    var fill = point.style("fill");
    var element = $(".highlight-point-button[point_id=" + point_id + "]");

    if (element.hasClass("active")) {
        fill = fill.replace(/[\d\.]+\)$/g, '0.25)');
        point.attr("r", "0.005").style("fill", fill);
    } else {
        fill = fill.replace(/[\d\.]+\)$/g, '0.75)');
        point.attr("r", "0.015").style("fill", fill);
    }

    element.toggleClass("active");
}

function highlight_line(line_id) {
    var line = d3.select(".svg-item[line_id='" + line_id + "']");
    var stroke = line.style("stroke");
    var element = $(".highlight-line-button[line_id=" + line_id + "]");

    if (element.hasClass("active")) {
        stroke = stroke.replace(/[\d\.]+\)$/g, '0.25)');
        line.attr("stroke-width",0.001).style("stroke", stroke);
    } else {
        stroke = stroke.replace(/[\d\.]+\)$/g, '0.75)');
        line.attr("stroke-width",0.003).style("stroke", stroke);
    }

    element.toggleClass("active");
}

function highlight_rectangle(rectangle_id) {
    var rectangle = d3.select(".svg-item[rectangle_id='" + rectangle_id + "']");
    var fill = rectangle.style("fill");
    var element = $(".highlight-rectangle-button[rectangle_id=" + rectangle_id + "]");

    if (element.hasClass("active")) {
        fill = fill.replace(/[\d\.]+\)$/g, '0.25)');
        rectangle.style("fill-width",0.001).style("fill", fill);
    } else {
        fill = fill.replace(/[\d\.]+\)$/g, '0.75)');
        rectangle.style("fill-width",0.003).style("fill", fill);
    }

    element.toggleClass("active");
}

function highlight_polygon(polygon_id) {
    var polygon = d3.select(".svg-item[polygon_id='" + polygon_id + "']");
    var fill = polygon.style("fill");
    var element = $(".highlight-polygon-button[polygon_id=" + polygon_id + "]");

    if (element.hasClass("active")) {
        fill = fill.replace(/[\d\.]+\)$/g, '0.25)');
        polygon.style("fill", fill);
    } else {
        fill = fill.replace(/[\d\.]+\)$/g, '0.75)');
        polygon.style("fill", fill);
    }
    element.toggleClass("active");
}

function initialize_mark_buttons() {
    $(".highlight-point-button:not(.bound)").addClass("bound").click(function() {
        var point_id = $(this).attr("point_id");
        highlight_point(point_id);
    });

    $(".highlight-line-button:not(.bound)").addClass("bound").click(function() {
        var line_id = $(this).attr("line_id");
        highlight_line(line_id);
    });

    $(".highlight-rectangle-button:not(.bound)").addClass("bound").click(function() {
        var rectangle_id = $(this).attr("rectangle_id");
        highlight_rectangle(rectangle_id);
    });

    $(".highlight-polygon-button:not(.bound)").addClass("bound").click(function() {
        var polygon_id = $(this).attr("polygon_id");
        highlight_polygon(polygon_id);
    });


    $(".remove-point-button:not(.bound)").addClass("bound").click(function() {
        var point_id = $(this).attr("point_id");
        var label_id = $(this).parent().parent().attr("label_id");

        var submission_data = {
            request : "REMOVE_POINT",
            id_token : id_token,
            label_id : label_id,
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
        var label_id = $(this).parent().parent().attr("label_id");

        var submission_data = {
            request : "REMOVE_LINE",
            id_token : id_token,
            label_id : label_id,
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

    $(".remove-rectangle-button:not(.bound)").addClass("bound").click(function() {
        var rectangle_id = $(this).attr("rectangle_id");
        var label_id = $(this).parent().parent().attr("label_id");

        var submission_data = {
            request : "REMOVE_RECTANGLE",
            id_token : id_token,
            label_id : label_id,
            mosaic_id : mosaic_id,
            rectangle_id : rectangle_id
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

                $(".svg-item[rectangle_id='" + rectangle_id + "']").remove();
                $(".rectangle-mark[rectangle_id='" + rectangle_id + "']").remove();

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
        var label_id = $(this).parent().parent().attr("label_id");

        var submission_data = {
            request : "REMOVE_POLYGON",
            id_token : id_token,
            label_id : label_id,
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
    drawing_rectangles = false;

    polygon_points = [];
    last_point = null;

    if (current_label_type == "POLYGON") {
        $("#draw-polygon-button").text("Draw Polygon").attr("aria-pressed", "false").removeClass("active");
    } else if (current_label_type == "RECTANGLE") {
        $("#draw-rectangles-button").text("Draw Rectangles").attr("aria-pressed", "false").removeClass("active");
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
        //console.log(points[i]);

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
        //console.log(lines[i]);

        var color = hexToRgb(lines[i].color);

        var d3Line = d3.select(overlay.node()).append("line")
            .style('stroke', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
            .attr("x1", lines[i].x1)
            .attr("y1", lines[i].y1)
            .attr("x2", lines[i].x2)
            .attr("y2", lines[i].y2)
            .attr("stroke-width", 0.0005)
            .attr("label_id", lines[i].label_id)
            .attr("line_id", lines[i].line_id)
            .attr("class", "svg-line svg-item");
    }

    var rectangles = marks.rectangles;

    console.log("received rectangles!");
    for (var i = 0; i < rectangles.length; i++) {
        console.log(rectangles[i]);

        var color = hexToRgb(rectangles[i].color);

        var d3Rect = d3.select(overlay.node()).append("rect")
            .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
            .attr("x", rectangles[i].x1)
            .attr("y", rectangles[i].y1)
            .attr("width", rectangles[i].x2 - rectangles[i].x1)
            .attr("height", rectangles[i].y2 - rectangles[i].y1)
            .attr("stroke-width", 0.0005)
            .attr("label_id", rectangles[i].label_id)
            .attr("rectangle_id", rectangles[i].rectangle_id)
            .attr("class", "svg-rectangle svg-item");
    }


    var polygons = marks.polygons;

    console.log("received polygons!");
    for (var i = 0; i < polygons.length; i++) {
        //console.log(polygons[i]);

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

    $(".polygons-nav-link").click(function() {
        if ($(this).text() == "CSV") {
            $(".csv-modal").show();
            $(".shapefile-modal").hide();
        } else if ($(this).text() == "Shapefile") {
            $(".shapefile-modal").show();
            $(".csv-modal").hide();

            $("#submit-polygons-shp-alert").addClass("alert-warning");
            $("#submit-polygons-shp-alert").removeClass("alert-success");
            $("#submit-polygons-shp-alert").text("Please select a .shp, .shx and .dbf file to upload and import the polygons.");

            $("#submit-polygons-shapefile-modal-button").addClass("disabled");
        }

        $(".polygons-nav-link").removeClass("active");
        $(this).addClass("active");
    });

    $("#polygons-shapefile-upload-input").on("change", function() {
        var files = this.files;

        var err_msg = "";
        var selected_files = "";
        var valid_upload = true;
        var shp_found = false;
        var shx_found = false;
        var dbf_found = false;

        if (files.length != 3) {
            err_msg = "Please select a .shp, .shx and .dbf file to upload and import the polygons.";

        } else {
            for (var i = 0; i < files.length; i++) {
                var name = files[i].name;
                console.log("selected files[" + i + "]: " + name);

                if (i > 0) selected_files += "<br>";
                selected_files += name;

                var extension = name.substr(name.length - 4);
                if (extension === ".shp") shp_found = true;
                else if (extension === ".shx") shx_found = true;
                else if (extension === ".dbf") dbf_found = true;
                else valid_upload = false;
            }
        }

        if (!shp_found) {
            valid_upload = false;
            err_msg = "A .shp file was not selected.";
        } else if (!shx_found) {
            valid_upload = false;
            err_msg = "A .shx file was not selected.";
        } else if (!dbf_found) {
            valid_upload = false;
            err_msg = "A .dbf file was not selected.";
        }

        if (valid_upload) {
            $("#submit-polygons-shp-alert").removeClass("alert-warning");
            $("#submit-polygons-shp-alert").addClass("alert-success");
            $("#submit-polygons-shp-alert").html("Selected files are valid.<br>Selected files are:<br><br>" + selected_files);

            $("#submit-polygons-shapefile-modal-button").removeClass("disabled");
        } else {
            $("#submit-polygons-shp-alert").addClass("alert-warning");
            $("#submit-polygons-shp-alert").removeClass("alert-success");
            $("#submit-polygons-shp-alert").html("Selected files are not valid.<br>Please select a .shp, .shx and .dbf file to upload and import the polygons.<br><br>Selected files were:<br>" + selected_files);

            $("#submit-polygons-shapefile-modal-button").addClass("disabled");
        }
    });

    $("#submit-polygons-shapefile-modal-button").click(function() {
        if ($(this).hasClass("disabled")) return;

		var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
        xhr.onload = function() {
            console.log("New upload response: " + xhr.responseText);
            var response = JSON.parse(xhr.responseText);

            if (response.err_msg) {
                display_error_modal(response.err_title, response.err_msg);
                cancel_drawing();
                return;
            }

            var color = hexToRgb(current_label_color);

            var polygons = response.polygons;
            for (var i = 0; i < polygons.length; i++) {
                var polygon = polygons[i];

                console.log("drawing polygon (" + polygon.cx + ", " + polygon.cy + ", " + polygon.radius + ")");

                var d3Polygon = d3.select(overlay.node()).append("polygon")
                    .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                    .attr("id", "svg-polygon-" + drawn_polygons)
                    .attr("points", polygon.points_str)
                    .attr("stroke-width", 0.001)
                    .attr("label_id", current_label_id)
                    .attr("polygon_id", polygon.polygon_id)
                    .attr("class", "svg-polygon current-draw svg-item");

                drawn_polygons++;

                $("#marks-card").append(polygon['html']);
            }

            initialize_mark_buttons();
            set_mark_coordinates();

            $(".cancel-drawing-button").hide();
            $(".current-draw").removeClass("current-draw");
            $("#draw-polygons-button").text("Draw Polygons");

			$('#import-polygons-modal').modal('hide');
            display_success_modal("Shapefile Import Successful", "Imported " + polygons.length + " polygons from the shapefile.");

            drawing_polygons = false;
            last_polygon = null;
        };  

        var formData = new FormData();
        formData.append("id_token", id_token);
		formData.append("mosaic_id", mosaic_id);
		formData.append("label_id", current_label_id);
		formData.append("import_type", "POLYGONS");
        formData.append("request", "SHAPEFILE_UPLOAD");

		var files = document.getElementById("polygons-shapefile-upload-input").files;

		for (var i = 0; i < files.length; i++) {
			var name = files[i].name;
			console.log("appending selected files[" + i + "]: " + name);

			formData.append("files[]", files[i]);
		}

        xhr.send(formData);
    });



    $(".points-nav-link").click(function() {
        if ($(this).text() == "CSV") {
            $(".csv-modal").show();
            $(".shapefile-modal").hide();
        } else if ($(this).text() == "Shapefile") {
            $(".shapefile-modal").show();
            $(".csv-modal").hide();

            $("#submit-points-shp-alert").addClass("alert-warning");
            $("#submit-points-shp-alert").removeClass("alert-success");
            $("#submit-points-shp-alert").text("Please select a .shp, .shx and .dbf file to upload and import the points.");

            $("#submit-points-shapefile-modal-button").addClass("disabled");
        }

        $(".points-nav-link").removeClass("active");
        $(this).addClass("active");
    });

    $("#points-shapefile-upload-input").on("change", function() {
        var files = this.files;

        var err_msg = "";
        var selected_files = "";
        var valid_upload = true;
        var shp_found = false;
        var shx_found = false;
        var dbf_found = false;

        if (files.length != 3) {
            err_msg = "Please select a .shp, .shx and .dbf file to upload and import the points.";

        } else {
            for (var i = 0; i < files.length; i++) {
                var name = files[i].name;
                console.log("selected files[" + i + "]: " + name);

                if (i > 0) selected_files += "<br>";
                selected_files += name;

                var extension = name.substr(name.length - 4);
                if (extension === ".shp") shp_found = true;
                else if (extension === ".shx") shx_found = true;
                else if (extension === ".dbf") dbf_found = true;
                else valid_upload = false;
            }
        }

        if (!shp_found) {
            valid_upload = false;
            err_msg = "A .shp file was not selected.";
        } else if (!shx_found) {
            valid_upload = false;
            err_msg = "A .shx file was not selected.";
        } else if (!dbf_found) {
            valid_upload = false;
            err_msg = "A .dbf file was not selected.";
        }

        if (valid_upload) {
            $("#submit-points-shp-alert").removeClass("alert-warning");
            $("#submit-points-shp-alert").addClass("alert-success");
            $("#submit-points-shp-alert").html("Selected files are valid.<br>Selected files are:<br><br>" + selected_files);

            $("#submit-points-shapefile-modal-button").removeClass("disabled");
        } else {
            $("#submit-points-shp-alert").addClass("alert-warning");
            $("#submit-points-shp-alert").removeClass("alert-success");
            $("#submit-points-shp-alert").html("Selected files are not valid.<br>Please select a .shp, .shx and .dbf file to upload and import the points.<br><br>Selected files were:<br>" + selected_files);

            $("#submit-points-shapefile-modal-button").addClass("disabled");
        }
    });

    $("#submit-points-shapefile-modal-button").click(function() {
        if ($(this).hasClass("disabled")) return;

		var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
        xhr.onload = function() {
            console.log("New upload response: " + xhr.responseText);
            var response = JSON.parse(xhr.responseText);

            if (response.err_msg) {
                display_error_modal(response.err_title, response.err_msg);
                cancel_drawing();
                return;
            }

            var color = hexToRgb(current_label_color);

            var points = response.points;
            for (var i = 0; i < points.length; i++) {
                var point = points[i];

                console.log("drawing point (" + point.cx + ", " + point.cy + ", " + point.radius + ")");

                var d3Circle = d3.select(overlay.node()).append("circle")
                    .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                    .attr("id", "svg-circle-" + drawn_points)
                    .attr("cx", point.cx)
                    .attr("cy", point.cy)
                    .attr("r", point.radius)
                    .attr("label_id", current_label_id)
                    .attr("point_id", point.point_id)
                    .attr("class", "svg-polygon-circle current-draw svg-item");

                drawn_points++;

                $("#marks-card").append(point['html']);
            }

            initialize_mark_buttons();
            set_mark_coordinates();

            $(".cancel-drawing-button").hide();
            $(".current-draw").removeClass("current-draw");
            $("#draw-points-button").text("Draw Points");

			$('#import-points-modal').modal('hide');
            display_success_modal("Shapefile Import Successful", "Imported " + points.length + " points from the shapefile.");

            drawing_points = false;
            last_point = null;
        };  

        var formData = new FormData();
        formData.append("id_token", id_token);
		formData.append("mosaic_id", mosaic_id);
		formData.append("label_id", current_label_id);
		formData.append("import_type", "POINTS");
        formData.append("request", "SHAPEFILE_UPLOAD");

		var files = document.getElementById("points-shapefile-upload-input").files;

		for (var i = 0; i < files.length; i++) {
			var name = files[i].name;
			console.log("appending selected files[" + i + "]: " + name);

			formData.append("files[]", files[i]);
		}

        xhr.send(formData);
    });


    $(".lines-nav-link").click(function() {
        if ($(this).text() == "CSV") {
            $(".csv-modal").show();
            $(".shapefile-modal").hide();
        } else if ($(this).text() == "Shapefile") {
            $(".shapefile-modal").show();
            $(".csv-modal").hide();

            $("#submit-lines-shp-alert").addClass("alert-warning");
            $("#submit-lines-shp-alert").removeClass("alert-success");
            $("#submit-lines-shp-alert").text("Please select a .shp, .shx and .dbf file to upload and import the lines.");

            $("#submit-lines-shapefile-modal-button").addClass("disabled");
        }

        $(".lines-nav-link").removeClass("active");
        $(this).addClass("active");
    });

    $("#lines-shapefile-upload-input").on("change", function() {
        var files = this.files;

        var err_msg = "";
        var selected_files = "";
        var valid_upload = true;
        var shp_found = false;
        var shx_found = false;
        var dbf_found = false;

        if (files.length != 3) {
            err_msg = "Please select a .shp, .shx and .dbf file to upload and import the lines.";

        } else {
            for (var i = 0; i < files.length; i++) {
                var name = files[i].name;
                console.log("selected files[" + i + "]: " + name);

                if (i > 0) selected_files += "<br>";
                selected_files += name;

                var extension = name.substr(name.length - 4);
                if (extension === ".shp") shp_found = true;
                else if (extension === ".shx") shx_found = true;
                else if (extension === ".dbf") dbf_found = true;
                else valid_upload = false;
            }
        }

        if (!shp_found) {
            valid_upload = false;
            err_msg = "A .shp file was not selected.";
        } else if (!shx_found) {
            valid_upload = false;
            err_msg = "A .shx file was not selected.";
        } else if (!dbf_found) {
            valid_upload = false;
            err_msg = "A .dbf file was not selected.";
        }

        if (valid_upload) {
            $("#submit-lines-shp-alert").removeClass("alert-warning");
            $("#submit-lines-shp-alert").addClass("alert-success");
            $("#submit-lines-shp-alert").html("Selected files are valid.<br>Selected files are:<br><br>" + selected_files);

            $("#submit-lines-shapefile-modal-button").removeClass("disabled");
        } else {
            $("#submit-lines-shp-alert").addClass("alert-warning");
            $("#submit-lines-shp-alert").removeClass("alert-success");
            $("#submit-lines-shp-alert").html("Selected files are not valid.<br>Please select a .shp, .shx and .dbf file to upload and import the lines.<br><br>Selected files were:<br>" + selected_files);

            $("#submit-lines-shapefile-modal-button").addClass("disabled");
        }
    });

    $("#submit-lines-shapefile-modal-button").click(function() {
        if ($(this).hasClass("disabled")) return;

		var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
        xhr.onload = function() {
            console.log("New upload response: " + xhr.responseText);
            var response = JSON.parse(xhr.responseText);

            if (response.err_msg) {
                display_error_modal(response.err_title, response.err_msg);
                cancel_drawing();
                return;
            }

            var color = hexToRgb(current_label_color);

            var lines = response.lines;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];

                console.log("drawing line (" + line.x1 + ", " + line.y2 + ", " + line.x2 + ", " + line.y2 + ") to " + line.line_id);

                var d3Line = d3.select(overlay.node()).append("line")
                    .style('stroke', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                    .attr("id", "svg-line-" + drawn_lines)
                    .attr("x1", line.x1)
                    .attr("y1", line.y1)
                    .attr("x2", line.x2)
                    .attr("y2", line.y2)
                    .attr("stroke-width", 0.001)
                    .attr("label_id", current_label_id)
                    .attr("line_id", line.line_id)
                    .attr("class", "svg-line current-draw svg-item");

                drawn_lines++;

                $("#marks-card").append(line['html']);
            }

            initialize_mark_buttons();
            set_mark_coordinates();

            $(".cancel-drawing-button").hide();
            $(".current-draw").removeClass("current-draw");
            $("#draw-lines-button").text("Draw Lines");

			$('#import-lines-modal').modal('hide');
            display_success_modal("Shapefile Import Successful", "Imported " + lines.length + " lines from the shapefile.");

            drawing_lines = false;
            last_line = null;
        };  

        var formData = new FormData();
        formData.append("id_token", id_token);
		formData.append("mosaic_id", mosaic_id);
		formData.append("label_id", current_label_id);
        formData.append("import_type", "LINES");
        formData.append("request", "SHAPEFILE_UPLOAD");

		var files = document.getElementById("lines-shapefile-upload-input").files;

		for (var i = 0; i < files.length; i++) {
			var name = files[i].name;
			console.log("appending selected files[" + i + "]: " + name);

			formData.append("files[]", files[i]);
		}

        xhr.send(formData);
    });


    $('#import-polygons-button').click(function() {
        $("#submit-polygons-alert").removeClass("alert-success");
        $("#submit-polygons-alert").addClass("alert-warning");
        $("#submit-polygons-alert").html("No input found.");
        $("#submit-polygons-csv-modal-button").addClass("disabled");
        $("#submit-polygons-textarea").val("");
        $("#submit-polygons-textarea").attr("placeholder","123,345 243,683 913,3333\n456,789 203,2983 142,2334 514,2342");

        $('#import-polygons-modal').modal();
    });

    $('#import-polygons-modal').on('hidden.bs.modal', function () {
        $("#import-polygons-button").removeClass("active");
    });

    $('#submit-polygons-csv-modal-button:not(.bound)').addClass("bound").click(function() {
        if ($(this).hasClass("disabled")) return;

        var valid_input = true;
        var polygons = [];
        var polygon_elements = [];

        var color = hexToRgb(current_label_color);

        var points_strs = [];

        var input_polygons = [];
        var text = $("#submit-polygons-textarea").val();

        if (text.includes("\n")) {
            input_polygons = text.split("\n");
        } else {
            input_polygons.push(text);
        }

        console.log("input_polygons: " + input_polygons);

        for (var i = 0; i < input_polygons.length; i++) {
            console.log("polygons[" + i + "]: " + input_polygons[i]);

            var points_str = "";

            var vals = input_polygons[i].split(/[\s,]+/);

            if (vals.length < 4) {
                valid_input = false;
                error_msg = "polygon " + i + " did not have at least 4 integer values.";
                break;
            }

            if (vals.length % 2 == 1) {
                valid_input = false;
                error_msg = "polygon " + i + " was missing a full x,y pair.";
                break;
            }

            for (var j = 0; j < vals.length; j++) {
                if ( !(Math.floor(vals[j]) == vals[j] && $.isNumeric(vals[j])) ) {
                    error_msg =  "polygon " + i + ": value " + j + ": '" + vals[j] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                var v = vals[j] / Math.max(mosaic_width, mosaic_height);
                if (j % 2 == 1) points_str += ",";
                else if (j > 0) points_str += " ";

                points_str += v;
            }

            if (!valid_input) break;

            var d3Polygon = d3.select(overlay.node()).append("polygon")
                .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                .attr("id", "svg-polygon-" + drawn_polygons)
                .attr("points", points_str)
                .attr("stroke-width", 0.001)
                .attr("label_id", current_label_id)
                .attr("class", "svg-polygon current-draw svg-item");

            polygon_elements.push(d3Polygon);
            points_strs.push_back(points_str);

            drawn_polygons++;
        }
        console.log("polygons: " + JSON.stringify(polygons));
        console.log("points_str: " + points_str);

        var submission_data = {
            request : "CREATE_POLYGONS",
            id_token : id_token,
            mosaic_id : mosaic_id,
            label_id : current_label_id,
            points_strs : points_strs 
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

                var polygon_ids = response.polygon_ids;
                if (polygon_ids.length != polygon_elements.length) {
                    display_error_modal("Create Polygons Error", "Internal server error. Number of returned polygons is not equal to the number of saved polygons. This should never happen, please contact the administrator");
                    cancel_drawing();
                    return;
                }

                var polygon_htmls = response.polygon_htmls;
                for (var i = 0; i < polygon_htmls.length; i++) {
                    $("#marks-card").append(polygon_htmls[i]);
                }
                initialize_mark_buttons();
                set_mark_coordinates();

                for (var i = 0; i < polygon_ids.length; i++) {
                    console.log("setting mark id for polygon (" + polygons[i].x1 + ", " + polygons[i].y2 + ", " + polygons[i].x2 + ", " + polygons[i].y2 + ") to " + polygon_ids[i]);
                    polygon_elements[i].attr("polygon_id", polygon_ids[i]);
                }

                $(".cancel-drawing-button").hide();
                $(".current-draw").removeClass("current-draw");
                $("#draw-polygons-button").text("Draw Polygons");

                display_success_modal("Polygons Imported Successfully", "Successfully imported " + polygon_ids.length + " polygons.");

                drawing_polygons = false;
                last_polygon = null;
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
                cancel_drawing();
            },
            async: true
        });


    });

    $("#submit-polygons-textarea:not(.bound)").addClass("bound").keyup(function() {
        if ($(this).val() === "") {
            $("#submit-polygons-alert").removeClass("alert-success");
            $("#submit-polygons-alert").addClass("alert-warning");
            $("#submit-polygons-alert").html("No inpuit found.");

            $("#submit-polygons-csv-modal-button").addClass("disabled");
        } else {
            var valid_input = true;
            var error_msg;

            var input_polygons = $("#submit-polygons-textarea").val().split("\n");
            for (var i = 0; i < input_polygons.length; i++) {
                //console.log("polygons[" + i + "]: " + polygons[i]);

                var vals = input_polygons[i].split(/[\s,]+/);

                if (vals.length < 4) {
                    valid_input = false;
                    error_msg = "polygon " + i + " did not have at least 4 integer values.";
                    break;
                }

                if (vals.length % 2 == 1) {
                    valid_input = false;
                    error_msg = "polygon " + i + " was missing a full x,y pair.";
                    break;
                }

                for (var j = 0; j < vals.length; j++) {
                    if ( !(Math.floor(vals[j]) == vals[j] && $.isNumeric(vals[j])) ) {
                        error_msg = "polygon " + i + ": value " + j + ": '" + vals[j] + "' was not an integer.";
                        valid_input = false;
                        break;
                    }
                }

                if (!valid_input) break;
            }

            if (valid_input) {
                $("#submit-polygons-alert").removeClass("alert-warning");
                $("#submit-polygons-alert").addClass("alert-success");
                $("#submit-polygons-alert").html("Input is valid!");

                $("#submit-polygons-csv-modal-button").removeClass("disabled");
            } else {
                $("#submit-polygons-alert").removeClass("alert-success");
                $("#submit-polygons-alert").addClass("alert-warning");
                $("#submit-polygons-alert").html(error_msg);

                $("#submit-polygons-csv-modal-button").addClass("disabled");
            }
        }    
    });  




    $('#import-rectangles-button').click(function() {
        $("#submit-rectangles-alert").removeClass("alert-success");
        $("#submit-rectangles-alert").addClass("alert-warning");
        $("#submit-rectangles-alert").html("No input found.");
        $("#submit-rectangles-modal-button").addClass("disabled");
        $("#submit-rectangles-textarea").val("");
        $("#submit-rectangles-textarea").attr("placeholder","123,345,243,683\n456,789,203,2983\n678,234,2433,413");

        $('#import-rectangles-modal').modal();
    });

    $('#import-rectangles-modal').on('hidden.bs.modal', function () {
        $("#import-rectangles-button").removeClass("active");
    });

    $('#submit-rectangles-modal-button:not(.bound)').addClass("bound").click(function() {
        if ($(this).hasClass("disabled")) return;

        var valid_input = true;
        var rectangles = [];
        var rectangle_elements = [];

        var color = hexToRgb(current_label_color);

        var input_rectangles = $("#submit-rectangles-textarea").val().split("\n");
        for (var i = 0; i < input_rectangles.length; i++) {
            //console.log("rectangles[" + i + "]: " + rectangles[i]);

            var vals = input_rectangles[i].split(",");

            if (vals.length != 4) {
                valid_input = false;
                error_msg = "rectangle " + i + " did not have 4 integer values.";
                break;
            }

            if ( !(Math.floor(vals[0]) == vals[0] && $.isNumeric(vals[0])) ) {
                error_msg =  "rectangle " + i + ": first value '" + vals[0] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[1]) == vals[1] && $.isNumeric(vals[1])) ) {
                error_msg =  "rectangle " + i + ": second value '" + vals[1] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[2]) == vals[2] && $.isNumeric(vals[2])) ) {
                error_msg =  "rectangle " + i + ": third value '" + vals[2] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[3]) == vals[3] && $.isNumeric(vals[3])) ) {
                error_msg =  "rectangle " + i + ": fourth value '" + vals[3] + "' was not an integer.";
                valid_input = false;
                break;
            }

            var x1 = vals[0] / Math.max(mosaic_width, mosaic_height);
            var y1 = vals[1] / Math.max(mosaic_width, mosaic_height);
            var x2 = vals[2] / Math.max(mosaic_width, mosaic_height);
            var y2 = vals[3] / Math.max(mosaic_width, mosaic_height);

            if (x1 > x2) {
                var tmp = x1;
                x1 = x2;
                x2 = x1;
            }

            if (y1 > y2) {
                var tmp = y1;
                y1 = y2;
                y2 = y1;
            }

            rectangles.push({x1 : x1, y1 : y1, x2 : x2, y2 : y2});

            var d3Rect = d3.select(overlay.node()).append("rect")
                .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                .attr("id", "svg-rectangle-" + drawn_rectangles)
                .attr("x", x1)
                .attr("y", y1)
                .attr("width", x2 - x1)
                .attr("height", y2 - y1)
                .attr("stroke-width", 0.001)
                .attr("label_id", current_label_id)
                .attr("class", "svg-rectangle current-draw svg-item");

            rectangle_elements.push(d3Rect);

            drawn_rectangles++;
        }
        console.log("rectangles: " + JSON.stringify(rectangles));

        var submission_data = {
            request : "CREATE_RECTANGLES",
            id_token : id_token,
            mosaic_id : mosaic_id,
            label_id : current_label_id,
            rectangles : rectangles
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

                var rectangle_ids = response.rectangle_ids;
                if (rectangle_ids.length != rectangle_elements.length) {
                    display_error_modal("Create Rectangles Error", "Internal server error. Number of returned rectangles is not equal to the number of saved rectangles. This should never happen, please contact the administrator");
                    cancel_drawing();
                    return;
                }

                var rectangle_htmls = response.rectangle_htmls;
                for (var i = 0; i < rectangle_htmls.length; i++) {
                    $("#marks-card").append(rectangle_htmls[i]);
                }
                initialize_mark_buttons();
                set_mark_coordinates();

                for (var i = 0; i < rectangle_ids.length; i++) {
                    console.log("setting mark id for rectangle (" + rectangles[i].x1 + ", " + rectangles[i].y2 + ", " + rectangles[i].x2 + ", " + rectangles[i].y2 + ") to " + rectangle_ids[i]);
                    rectangle_elements[i].attr("rectangle_id", rectangle_ids[i]);
                }

                $(".cancel-drawing-button").hide();
                $(".current-draw").removeClass("current-draw");
                $("#draw-rectangles-button").text("Draw Rectangles");

                drawing_rectangles = false;
                last_rectangle = null;
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
                cancel_drawing();
            },
            async: true
        });


    });

    $("#submit-rectangles-textarea:not(.bound)").addClass("bound").keyup(function() {
        if ($(this).val() === "") {
            $("#submit-rectangles-alert").removeClass("alert-success");
            $("#submit-rectangles-alert").addClass("alert-warning");
            $("#submit-rectangles-alert").html("No inpuit found.");

            $("#submit-rectangles-modal-button").addClass("disabled");
        } else {
            var valid_input = true;
            var error_msg;

            var rectangles = $("#submit-rectangles-textarea").val().split("\n");
            for (var i = 0; i < rectangles.length; i++) {
                //console.log("rectangles[" + i + "]: " + rectangles[i]);

                var vals = rectangles[i].split(",");

                if (vals.length != 4) {
                    valid_input = false;
                    error_msg = "rectangle " + i + " did not have 4 integer values.";
                    break;
                }

                if ( !(Math.floor(vals[0]) == vals[0] && $.isNumeric(vals[0])) ) {
                    error_msg =  "rectangle " + i + ": first (x1) value '" + vals[0] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[1]) == vals[1] && $.isNumeric(vals[1])) ) {
                    error_msg =  "rectangle " + i + ": second (y1) value '" + vals[1] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[2]) == vals[2] && $.isNumeric(vals[2])) ) {
                    error_msg =  "rectangle " + i + ": third (x2) value '" + vals[2] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[3]) == vals[3] && $.isNumeric(vals[3])) ) {
                    error_msg =  "rectangle " + i + ": fourth (y2) value '" + vals[3] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

            }

            if (valid_input) {
                $("#submit-rectangles-alert").removeClass("alert-warning");
                $("#submit-rectangles-alert").addClass("alert-success");
                $("#submit-rectangles-alert").html("Input is valid!");

                $("#submit-rectangles-modal-button").removeClass("disabled");
            } else {
                $("#submit-rectangles-alert").removeClass("alert-success");
                $("#submit-rectangles-alert").addClass("alert-warning");
                $("#submit-rectangles-alert").html(error_msg);

                $("#submit-rectangles-modal-button").addClass("disabled");
            }
        }    
    });  



    $('#import-lines-button').click(function() {
        $("#submit-lines-csv-alert").removeClass("alert-success");
        $("#submit-lines-csv-alert").addClass("alert-warning");
        $("#submit-lines-csv-alert").html("No input found.");
        $("#submit-lines-csv-modal-button").addClass("disabled");
        $("#submit-lines-textarea").val("");
        $("#submit-lines-textarea").attr("placeholder","123,345,243,683\n456,789,203,2983\n678,234,2433,413");

        $('#import-lines-modal').modal();

    });

    $('#import-lines-modal').on('hidden.bs.modal', function () {
        $("#import-lines-button").removeClass("active");
    });

    $('#submit-lines-csv-modal-button:not(.bound)').addClass("bound").click(function() {
        if ($(this).hasClass("disabled")) return;

        var valid_input = true;
        var lines = [];
        var line_elements = [];

        var color = hexToRgb(current_label_color);

        var input_lines = $("#submit-lines-textarea").val().split("\n");
        for (var i = 0; i < input_lines.length; i++) {
            //console.log("lines[" + i + "]: " + lines[i]);

            var vals = input_lines[i].split(",");

            if (vals.length != 4) {
                valid_input = false;
                error_msg = "line " + i + " did not have 4 integer values.";
                break;
            }

            if ( !(Math.floor(vals[0]) == vals[0] && $.isNumeric(vals[0])) ) {
                error_msg =  "line " + i + ": first value '" + vals[0] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[1]) == vals[1] && $.isNumeric(vals[1])) ) {
                error_msg =  "line " + i + ": second value '" + vals[1] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[2]) == vals[2] && $.isNumeric(vals[2])) ) {
                error_msg =  "line " + i + ": third value '" + vals[2] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[3]) == vals[3] && $.isNumeric(vals[3])) ) {
                error_msg =  "line " + i + ": fourth value '" + vals[3] + "' was not an integer.";
                valid_input = false;
                break;
            }

            var x1 = vals[0] / Math.max(mosaic_width, mosaic_height);
            var y1 = vals[1] / Math.max(mosaic_width, mosaic_height);
            var x2 = vals[2] / Math.max(mosaic_width, mosaic_height);
            var y2 = vals[3] / Math.max(mosaic_width, mosaic_height);

            lines.push({x1 : x1, y1 : y1, x2 : x2, y2 : y2});

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

            line_elements.push(d3Line);

            drawn_lines++;
        }
        console.log("lines: " + JSON.stringify(lines));

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
                set_mark_coordinates();

                for (var i = 0; i < line_ids.length; i++) {
                    console.log("setting mark id for line (" + lines[i].x1 + ", " + lines[i].y2 + ", " + lines[i].x2 + ", " + lines[i].y2 + ") to " + line_ids[i]);
                    line_elements[i].attr("line_id", line_ids[i]);
                }

                $(".cancel-drawing-button").hide();
                $(".current-draw").removeClass("current-draw");
                $("#draw-lines-button").text("Draw Lines");

                display_success_modal("Lines Imported Successfully", "Successfully imported " + line_ids.length + " lines.");

                drawing_lines = false;
                last_line = null;
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
                cancel_drawing();
            },
            async: true
        });


    });

    $("#submit-lines-textarea:not(.bound)").addClass("bound").keyup(function() {
        if ($(this).val() === "") {
            $("#submit-lines-csv-alert").removeClass("alert-success");
            $("#submit-lines-csv-alert").addClass("alert-warning");
            $("#submit-lines-csv-alert").html("No inpuit found.");

            $("#submit-lines-csv-modal-button").addClass("disabled");
        } else {
            var valid_input = true;
            var error_msg;

            var lines = $("#submit-lines-textarea").val().split("\n");
            for (var i = 0; i < lines.length; i++) {
                //console.log("lines[" + i + "]: " + lines[i]);

                var vals = lines[i].split(",");

                if (vals.length != 4) {
                    valid_input = false;
                    error_msg = "line " + i + " did not have 4 integer values.";
                    break;
                }

                if ( !(Math.floor(vals[0]) == vals[0] && $.isNumeric(vals[0])) ) {
                    error_msg =  "line " + i + ": first (x1) value '" + vals[0] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[1]) == vals[1] && $.isNumeric(vals[1])) ) {
                    error_msg =  "line " + i + ": second (y1) value '" + vals[1] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[2]) == vals[2] && $.isNumeric(vals[2])) ) {
                    error_msg =  "line " + i + ": third (x2) value '" + vals[2] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[3]) == vals[3] && $.isNumeric(vals[3])) ) {
                    error_msg =  "line " + i + ": fourth (y2) value '" + vals[3] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

            }

            if (valid_input) {
                $("#submit-lines-csv-alert").removeClass("alert-warning");
                $("#submit-lines-csv-alert").addClass("alert-success");
                $("#submit-lines-csv-alert").html("Input is valid!");

                $("#submit-lines-csv-modal-button").removeClass("disabled");
            } else {
                $("#submit-lines-csv-alert").removeClass("alert-success");
                $("#submit-lines-csv-alert").addClass("alert-warning");
                $("#submit-lines-csv-alert").html(error_msg);

                $("#submit-lines-csv-modal-button").addClass("disabled");
            }
        }    
    });  


    $('#import-points-button').click(function() {
        $("#submit-points-alert").removeClass("alert-success");
        $("#submit-points-alert").addClass("alert-warning");
        $("#submit-points-alert").html("No input found.");
        $("#submit-points-csv-modal-button").addClass("disabled");
        $("#submit-points-textarea").val("");
        $("#submit-points-textarea").attr("placeholder","123,345\n456,789\n678,234");

        $('#import-points-modal').modal();

    });

    $('#import-points-modal').on('hidden.bs.modal', function () {
        $("#import-points-button").removeClass("active");
    });

    $('#submit-points-csv-modal-button:not(.bound)').addClass("bound").click(function() {
        if ($(this).hasClass("disabled")) return;

        var valid_input = true;
        var points = [];
        var point_elements = [];

        var color = hexToRgb(current_label_color);

        var lines = $("#submit-points-textarea").val().split("\n");
        for (var i = 0; i < lines.length; i++) {
            //console.log("lines[" + i + "]: " + lines[i]);

            var vals = lines[i].split(",");

            if (vals.length != 2) {
                valid_input = false;
                error_msg = "line " + i + " did not have two integer values.";
                break;
            }

            if ( !(Math.floor(vals[0]) == vals[0] && $.isNumeric(vals[0])) ) {
                error_msg =  "line " + i + ": first value '" + vals[0] + "' was not an integer.";
                valid_input = false;
                break;
            }

            if ( !(Math.floor(vals[1]) == vals[1] && $.isNumeric(vals[1])) ) {
                error_msg =  "line " + i + ": second value '" + vals[1] + "' was not an integer.";
                valid_input = false;
                break;
            }
            var cx = vals[0] / Math.max(mosaic_width, mosaic_height);
            var cy = vals[1] / Math.max(mosaic_width, mosaic_height);
            var radius = POINT_RADIUS;

            points.push({cx : cx, cy : cy, radius : radius});

            var d3Circle = d3.select(overlay.node()).append("circle")
                .style('fill', 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.25)')
                .attr("id", "svg-circle-" + drawn_points)
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", radius)
                .attr("label_id", current_label_id)
                .attr("class", "svg-circle current-draw svg-item");

            point_elements.push(d3Circle);

            drawn_points++;
        }
        console.log("points: " + JSON.stringify(points));

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
                set_mark_coordinates();

                for (var i = 0; i < point_ids.length; i++) {
                    console.log("setting mark id for point (" + points[i].cx + ", " + points[i].cy + ", " + points[i].radius + ") to " + point_ids[i]);
                    point_elements[i].attr("point_id", point_ids[i]);
                }

                $(".cancel-drawing-button").hide();
                $(".current-draw").removeClass("current-draw");
                $("#draw-points-button").text("Draw Points");

                display_success_modal("Points Imported Successfully", "Successfully imported " + point_ids.length + " points.");

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


    });

    $("#submit-points-textarea:not(.bound)").addClass("bound").keyup(function() {
        if ($(this).val() === "") {
            $("#submit-points-alert").removeClass("alert-success");
            $("#submit-points-alert").addClass("alert-warning");
            $("#submit-points-alert").html("No inpuit found.");

            $("#submit-points-csv-modal-button").addClass("disabled");
        } else {
            var valid_input = true;
            var error_msg;

            var lines = $("#submit-points-textarea").val().split("\n");
            for (var i = 0; i < lines.length; i++) {
                //console.log("lines[" + i + "]: " + lines[i]);

                var vals = lines[i].split(",");

                if (vals.length != 2) {
                    valid_input = false;
                    error_msg = "line " + i + " did not have two integer values.";
                    break;
                }

                if ( !(Math.floor(vals[0]) == vals[0] && $.isNumeric(vals[0])) ) {
                    error_msg =  "line " + i + ": first value '" + vals[0] + "' was not an integer.";
                    valid_input = false;
                    break;
                }

                if ( !(Math.floor(vals[1]) == vals[1] && $.isNumeric(vals[1])) ) {
                    error_msg =  "line " + i + ": second value '" + vals[1] + "' was not an integer.";
                    valid_input = false;
                    break;
                }
            }

            if (valid_input) {
                $("#submit-points-alert").removeClass("alert-warning");
                $("#submit-points-alert").addClass("alert-success");
                $("#submit-points-alert").html("Input is valid!");

                $("#submit-points-csv-modal-button").removeClass("disabled");
            } else {
                $("#submit-points-alert").removeClass("alert-success");
                $("#submit-points-alert").addClass("alert-warning");
                $("#submit-points-alert").html(error_msg);

                $("#submit-points-csv-modal-button").addClass("disabled");
            }
        }    
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
                    set_mark_coordinates();

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
                    set_mark_coordinates();

                    for (var i = 0; i < line_ids.length; i++) {
                        console.log("setting mark id for line (" + lines[i].x1 + ", " + lines[i].y2 + ", " + lines[i].x2 + ", " + lines[i].y2 + ") to " + line_ids[i]);
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

    $('#draw-rectangles-button').click(function() {
        if ($(this).attr("aria-pressed") === "false") {
            $(".cancel-drawing-button").show();
            $(this).text("Save Rectangles");

            drawing_points = false;
            drawing_polygon = false;
            drawing_rectangles = true;

            last_point = null;
        } else {
            //drawing finished

            var rectangles = [];
            var rectangle_elements = [];
            $(".current-draw").each(function() {
                rectangle_elements.push($(this));

                var x1 = $(this).attr("x1");
                var x2 = $(this).attr("x2");
                var y1 = $(this).attr("y1");
                var y2 = $(this).attr("y2");

                console.log("rectangle: " + x1 + ", " + x2 + ", " + y1 + ", " + y2);

                rectangles.push({
                    x1 : x1,
                    x2 : x2,
                    y1 : y1,
                    y2 : y2
                });

            });

            //console.log(rectangles);
            //console.log(rectangle_elements);

            var submission_data = {
                request : "CREATE_RECTANGLES",
                id_token : id_token,
                mosaic_id : mosaic_id,
                label_id : current_label_id,
                rectangles : rectangles
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

                    var rectangle_ids = response.rectangle_ids;
                    if (rectangle_ids.length != rectangle_elements.length) {
                        display_error_modal("Create Rectangles Error", "Internal server error. Number of returned rectangles is not equal to the number of saved rectangles. This should never happen, please contact the administrator");
                        cancel_drawing();
                        return;
                    }

                    var rectangle_htmls = response.rectangle_htmls;
                    for (var i = 0; i < rectangle_htmls.length; i++) {
                        $("#marks-card").append(rectangle_htmls[i]);
                    }
                    initialize_mark_buttons();
                    set_mark_coordinates();

                    for (var i = 0; i < rectangle_ids.length; i++) {
                        console.log("setting mark id for rectangle (" + rectangles[i].x1 + ", " + rectangles[i].y2 + ", " + rectangles[i].x2 + ", " + rectangles[i].y2 + ") to " + rectangle_ids[i]);
                        rectangle_elements[i].attr("rectangle_id", rectangle_ids[i]);
                    }

                    $(".cancel-drawing-button").hide();
                    $(".current-draw").removeClass("current-draw");
                    $("#draw-rectangles-button").text("Draw Rectangles");

                    drawing_rectangles = false;
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
            //TODO: no ajax query if polygon_points.length == 0
            //probably should do the same for lines and points

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
                    var d3polygon = d3.select(overlay.node()).append("polygon")
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
                    set_mark_coordinates();

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

    console.log("SETTING BRAND TO: " + response.mosaic_name);
    $("a#brand").text(response.mosaic_name);

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

    mosaic_height = response.height;
    mosaic_width = response.width;

    initialize_openseadragon(response.mosaic_url, response.channels, response.height, response.width, response.marks);

    initialize_mark_buttons();

    function highlight_prediction() {
        if (current_predictions == null) return;

        var prediction = current_predictions[selected_prediction];

        if (current_prediction_type == "LINE") {
            highlight_line(prediction.mark_id, false);
        } else if (current_prediction_type == "POINT") {
            highlight_point(prediction.mark_id, false);
        }
    }

    function unhighlight_prediction() {
        if (current_predictions == null) return;

        var prediction = current_predictions[selected_prediction];

        if (current_prediction_type == "LINE") {
            highlight_line(prediction.mark_id, true);
        } else if (current_prediction_type == "POINT") {
            highlight_point(prediction.mark_id, true);
        }
    }


    function display_prediction() {
        console.log("displaying prediction: " + selected_prediction);

        var prediction = current_predictions[selected_prediction];

        console.log("prediction.mark_id: " + prediction.mark_id);

        var mark_attributes = current_mark_attributes[prediction.mark_id];
        console.log(mark_attributes);

        console.log("current_prediction_type: '" + current_prediction_type + "'");

        if (current_prediction_type == "LINE") {
            $("#prediction-line-img").attr("src", "./jobs/" + prediction.owner_id + "/" + prediction.job_id + "/line_" + prediction.mosaic_id + "_" + prediction.label_id + "_" + prediction.mark_id + ".png");

        } else if (current_prediction_type == "POINT") {
            var filename = "./jobs/" + prediction.owner_id + "/" + prediction.job_id + "/point_" + prediction.mosaic_id + "_" + prediction.label_id + "_" + prediction.mark_id;

            $("#prediction-point-img-original").attr("src", filename + "_original.png");
            $("#prediction-point-img-merged").attr("src", filename + "_merged.png");
            $("#prediction-point-img-predictions").attr("src", filename + "_predictions.png");
        }

        var likelihood = parseFloat(100.0 - (prediction.prediction * 100)).toFixed(2);

        $("#prediction-likelihood").html("<b>Damage Likelihood: " + likelihood + "%</b>");

        var attribute_html = "<div class='d-flex flex-column bd-highlight mb-3'>";
        for (var i = 0; i < mark_attributes.length; i++) {
            attribute_html += "<div class='p-1 bd-highlight'>" + mark_attributes[i].attribute_key + " : " + mark_attributes[i].attribute_value + "</div>";
        }
        attribute_html += "</div>";

        $("#prediction-attributes").html(attribute_html);

        if (current_prediction_type == "LINE") {
            console.log("prediction.x1: " + prediction.x1 + ", prediction.y1: " + prediction.y1 + ", prediction.x2: " + prediction.x2 + ", prediction.y2: " + prediction.y2);

            var x = Math.min(prediction.x1, prediction.x2);
            var width = Math.abs(prediction.x1 - prediction.x2);
            var y = Math.min(prediction.y1, prediction.y2);
            var height = Math.abs(prediction.y1 - prediction.y2);

            console.log("x: " + x  + ", y: " + y + ", width: " + width + ", height: " + height);
            viewer.viewport.fitBoundsWithConstraints(new OpenSeadragon.Rect(x, y, width, height));
        } else if (current_prediction_type == "POINT") {
            var cx = parseFloat(prediction.cx);
            var cy = parseFloat(prediction.cy);

            console.log("cx: " + cx + ", cy: " + cy);
            viewer.viewport.fitBoundsWithConstraints(new OpenSeadragon.Rect(cx - 0.01, cy - 0.01, 0.01, 0.01));
        }
    }

    $("#right-prediction-image-button").click(function() {
        unhighlight_prediction();

        selected_prediction = selected_prediction + 1;
        if (selected_prediction >= current_predictions.length) selected_prediction = 0;

        display_prediction();
        highlight_prediction();
    });

    $("#left-prediction-image-button").click(function() {
        unhighlight_prediction();

        selected_prediction = selected_prediction - 1;
        if (selected_prediction < 0) selected_prediction = current_predictions.length - 1;

        display_prediction();
        highlight_prediction();
    });

    $(".close-predictions-nav").click(function() {
        unhighlight_prediction();
        selected_prediction = 0;
        current_predictions = null;
        current_mark_attributes = null;
        current_prediction_type = null;
        $("#prediction-inspector").hide();
        $("#prediction-attributes").hide();
        $("#map-div").addClass("col-sm-10");
        $("#map-div").removeClass("col-sm-7");
        $(".toggle-attributes-nav").hide();
    });

    $(".toggle-attributes-nav").click(function() {
        if (has_mark_attributes == true) {
            if ($("#prediction-attributes").css('display') == 'none') {
                $("#prediction-attributes").show();
                $("#map-div").removeClass("col-sm-10");
                $("#map-div").addClass("col-sm-7");
            } else {
                $("#prediction-attributes").hide();
                $("#map-div").addClass("col-sm-10");
                $("#map-div").removeClass("col-sm-7");
            }
        }
    });


    $(".prediction-nav").click(function() {
        var type = $(this).attr("job_id");
        var job_id = $(this).attr("job_id");
        var label_id = $(this).attr("label_id");
        var label_type = $(this).attr("label_type");

        var submission_data = {
            request : "GET_PREDICTIONS",
            id_token : id_token,
            job_id : job_id,
            label_id : label_id,
            mosaic_id : mosaic_id
        };

        $.ajax({
            type: 'POST',
            url: './request.php',
            data : submission_data,
            dataType : 'json',
            success : function(response) {
                console.log("received response: ");
                console.log(response);

                unhighlight_prediction();

                has_mark_attributes = response.has_mark_attributes;
                current_prediction_type = label_type;
                selected_prediction = 0;
                current_predictions = response.predictions;
                current_mark_attributes = response.mark_attributes;

                if (!$(".label-list-item[label_id=" + label_id + "]").hasClass("active")) {
                    $(".label-list-item[label_id=" + label_id + "]").click();
                }

                $("#prediction-inspector").show();
                if (has_mark_attributes == true) {
                    $("#prediction-attributes").show();
                    $("#map-div").removeClass("col-sm-10");
                    $("#map-div").addClass("col-sm-7");
                    $(".toggle-attributes-nav").show();
                } else {
                    $("#prediction-attributes").hide();
                    $("#map-div").addClass("col-sm-10");
                    $("#map-div").removeClass("col-sm-7");
                    $(".toggle-attributes-nav").hide();
                }

                display_prediction(selected_prediction);
                highlight_prediction();

                if (label_type == "LINE") {
                    $("#prediction-point-div").hide();
                    $("#prediction-line-div").show();
                } else if (label_type == "POINT") {
                    $("#prediction-line-div").hide();
                    $("#prediction-point-div").show();
                }
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                display_error_modal(textStatus, errorThrown);
            },
            async: true
        });
    });

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
                filters : {
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
        $("#rectangle-marking").hide();
        $("#lines-marking").hide();
        $("#points-marking").hide();

        $(".point-mark").hide();
        $(".line-mark").hide();
        $(".rectangle-mark").hide();
        $(".polygon-mark").hide();

        if (current_label_type == 'POLYGON') {
            $("#polygon-marking").show();
            $(".polygon-mark[label_id='" + current_label_id + "']").show();
        } else if (current_label_type == 'RECTANGLE') {
            $("#rectangle-marking").show();
            $(".rectangle-mark[label_id='" + current_label_id + "']").show();
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
            //client_id: '899820780374-k8v4ou4ii34nc82e2uu0cqad88k6blpa.apps.googleusercontent.com',
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

