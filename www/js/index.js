var profile;
var id_token;

function initialize_mosaic(responseText) {
    console.log("received initialize mosaic response: " + responseText);
    var response = JSON.parse(responseText);

    $("#index-content").html(response.html);

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
    initialize_openseadragon(response.mosaic_url, response.height, response.width);
}

function display_error_modal(title, message) {
    $("#error-modal-title").html(title);
    $("#error-modal-body").html(message);
    $("#error-modal").modal();
}

function initialize_mosaics(responseText) {
    var response = JSON.parse(responseText);
    console.log("initializing mosaics with response:\n" + responseText);

    if (response.err_msg) {
        display_error_modal(response.err_title, response.err_msg);
    } else {

        $("#index-content").html(response.html);

        var server_mosaics = response.mosaics;
        for (var i in server_mosaics) {
            var mosaic = server_mosaics[i];
            mosaics[mosaic.identifier] = mosaic;
            console.log(mosaic);
            console.log("mosaic " + mosaic.id + " status: " + mosaic.status);
            
            if (mosaic.status === 'UPLOADED' || mosaic.status === 'TILING') {
                update_tiling_progress(mosaic);
            }
        }

        $(".picture").click(function() {
            var identifier = $(this).attr("identifier");
            //console.log("identifier: " + identifier);
            $("#preview-modal-" + identifier)[0].style.display = "block";
        });

        $(".close-preview").click(function() {
            var identifier = $(this).attr("identifier");
            //console.log("identifier: " + identifier);
            $("#preview-modal-" + identifier)[0].style.display = "none";
        });

        $(".preview-modal").click(function() {
            var identifier = $(this).attr("identifier");
            //console.log("identifier: " + identifier);
            $("#preview-modal-" + identifier)[0].style.display = "none";
        });

        $(".utm-switch-button").click(function() {
            $(".utm-table").show();
            $(".geo-table").hide();
        });

        $(".geo-switch-button").click(function() {
            $(".utm-table").hide();
            $(".geo-table").show();
        });


		initialize_mosaic_dropdowns(id_token);
        $("#confirm-delete-button").click(function(){
            var md5_hash = $(this).attr("md5_hash");
            var mosaic_id = $(this).attr("mosaic_id");
            var identifier = $(this).attr("identifier");

            serverRequest("DELETE_MOSAIC&md5_hash=" + md5_hash + "&mosaic_id=" + mosaic_id, function(responseText) {
                console.log("received response from delete: " + responseText);
                var response = JSON.parse(responseText);

                $(this).attr("md5_hash", "");
                $(this).attr("mosaic_id", "");
                $(this).attr("identifier", "");

                if (response.err_msg) {
                    display_error_modal(response.err_title, response.err_msg);
                    return;
                }
                console.log("deleting row with identifier: " + identifier);

                $("#uploading-mosaic-row-" + identifier).remove();
                $("#finished-mosaic-card-" + identifier).remove();
            });
        });

        $(".mosaic-link").click(function() {
            var project_id = $(this).attr('project_id');
            var mosaic_id = $(this).attr('mosaic_id');

            console.log("clicked mosaic link with project id: " + project_id + " and a mosaic id: " + mosaic_id);

            var xhr = new XMLHttpRequest();
            xhr.open('POST', './request.php');
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onload = function() {
                initialize_mosaic(xhr.responseText);
            };
            xhr.send('id_token=' + id_token + '&request=MOSAIC&project_id=' + project_id + '&mosaic_id=' + mosaic_id);
        });

        $('#mosaic-file-input').change(function(){
            //console.log("number files selected: " + $(this).files.length);
            console.log( this.files );

			if (this.files.length > 0) {
 				var file = this.files[0];
                var filename = file.webkitRelativePath || file.fileName || file.name;

                if (!filename.match(/^[a-zA-Z0-9_.-]*$/)) {
                    display_error_modal("Malformed Filename", "The filename was malformed. Filenames must only contain letters, numbers, dashes ('-'), underscores ('_') and periods.");
                } else {
                    start_upload(file, id_token);
                }
			}
        });

        $('#add-mosaic-button').click(function(){
            $('#mosaic-file-input').trigger('click');
        });

    }
}

var initialized_mosaics = false;

function onSignIn(googleUser) {
    profile = googleUser.getBasicProfile();
    id_token = googleUser.getAuthResponse().id_token;

    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.

    initialized_mosaics = true;
    serverRequest("INDEX", initialize_mosaics);

    $("#signin-form").append("<a href='javascript:void(0)' id='signout-button' class='btn btn-outline-success my-2 my-sm-0' onclick='signOut();'>Sign out</a>");
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();

    auth2.signOut().then(function () {
        console.log('User signed out.');

        id_token = 'NONE';
        serverRequest("INDEX", initialize_splash);
        $("#signout-button").remove();
    });
}

function initialize_splash(responseText) {
    $("#index-content").html(responseText);
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
                if (!initialized_mosaics) {
                    serverRequest("INDEX", initialize_mosaics);
                }
            } else {
                id_token = 'NONE';
                serverRequest("INDEX", initialize_splash);
            }
        });
    });


    setTimeout(login, 5 * 60 * 1000);  //1 minutes
}

$(document).ready(function() {
    console.log("initializing index!");

    login();
});
