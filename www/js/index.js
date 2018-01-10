var profile;
var id_token;

function display_error_modal(title, message) {
    $("#error-modal-title").html(title);
    $("#error-modal-body").html(message);
    $("#error-modal").modal();
}

function initialize_mosaic_cards() {
    $('.picture:not(.bound)').addClass('bound').click(function() {
        var identifier = $(this).attr("identifier");
        //console.log("identifier: " + identifier);
        $("#preview-modal-" + identifier)[0].style.display = "block";
    });

    $(".close-preview:not(.bound)").addClass('bound').click(function() {
        var identifier = $(this).attr("identifier");
        //console.log("identifier: " + identifier);
        $("#preview-modal-" + identifier)[0].style.display = "none";
    });

    $(".preview-modal:not(.bound)").addClass('bound').click(function() {
        var identifier = $(this).attr("identifier");
        //console.log("identifier: " + identifier);
        $("#preview-modal-" + identifier)[0].style.display = "none";
    });

    $(".utm-switch-button:not(.toggle-bound)").addClass('toggle-bound').click(function() {
        console.log("toggling UTM switch button! aria-pressed: " + $(this).attr("aria-pressed") + ", active:" + $(this).hasClass("active"));
        if ($(this).attr("aria-pressed") == 'true') {
            $(".utm-table").hide();
        } else {
            $(".utm-table").show();
        }
    });

    $(".geo-switch-button:not(.toggle-bound)").addClass('toggle-bound').click(function() {
        console.log("toggling GEO switch button! aria-pressed: " + $(this).attr("aria-pressed") + ", active:" + $(this).hasClass("active"));
        //$(".utm-table").hide();
        //$(".geo-table").show();
        if ($(this).attr("aria-pressed") == 'true') {
            $(".geo-table").hide();
        } else {
            $(".geo-table").show();
        }
    });
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

        initialize_mosaic_cards();


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
