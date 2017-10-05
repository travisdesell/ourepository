var profile;
var id_token;

function initialize_mosaic(responseText) {
    console.log("received initialize mosaic response: " + responseText);
    $("#index-content").html(responseText);

    $("#back-to-projects").click(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_projects(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=INDEX');
    });

    $("#back-to-mosaics").click(function() {
        var project_id = $(this).attr('project_id');
        console.log("going back to mosaics with project_id: " + project_id);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_mosaics(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=MOSAICS&project_id=' + project_id);
    });


    //TODO: need to grab these from JSON isntead of text
    initialize_openseadragon("./mosaics/Mayville_7cm-0x1_files/", 10000, 25000);
}

function initialize_mosaics(responseText) {
    console.log("received initialize mosaics response: " + responseText);
    $("#index-content").html(responseText);

    $("#back-to-projects").click(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_projects(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=INDEX');
    });

    $(".mosaic-link").click(function() {
        var project_id = $(this).attr('project_id');
        var mosaic_id = $(this).attr('mosaic_id');

        console.log("clicked mosaic link with project id: " + project_id + " and a mosaic id: " + mosaic_id);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_mosaic(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=MOSAIC&project_id=' + project_id + '&mosaic_id=' + mosaic_id);
    });

    var r = new Resumable({
        target: 'resumable_upload.php'
    });

    r.assignBrowse(document.getElementById('add-mosaic-button'));

    r.on('fileSuccess', function(file){
        console.debug('fileSuccess',file);
    });

    r.on('fileProgress', function(file){
        //console.log("PROGRESS!");
        console.debug('fileProgress', file);
        console.log("progress: " + (r.progress() * 100.0));

        var file_token = file.uniqueIdentifier;
        $("#progress-bar-" + file_token).attr("aria-valuenow", r.progress() * 100.0);
        $("#progress-bar-" + file_token).attr("style", "width: " + r.progress() * 100.0 + "%");
    });

    r.on('fileAdded', function(file, event){
        r.upload();
        console.debug('fileAdded', event);

        var file_token = file.uniqueIdentifier;
        var progress_text = "<div class='progress'> <div id='progress-bar-" + file_token + "' class='progress-bar' role='progressbar' aria-valuenow='0' aria-valuemin='0' aria-valuemax='100'></div> </div>";

        $("#uploads-div").append(progress_text);
    });

    r.on('filesAdded', function(array){
        r.upload();
        console.debug('filesAdded', array);
    });

    r.on('fileRetry', function(file){
        console.debug('fileRetry', file);
    });

    r.on('fileError', function(file, message){
        console.debug('fileError', file, message);
    });

    r.on('uploadStart', function(){
        console.debug('uploadStart');
    });

    r.on('complete', function(){
        console.debug('complete');
    });

    r.on('progress', function(){
        console.debug('progress');
    });

    r.on('error', function(message, file){
        console.debug('error', message, file);
    });

    r.on('pause', function(){
        console.debug('pause');
    });

    r.on('cancel', function(){
        console.debug('cancel');
    });
}


function initialize_projects(responseText) {
    $("#index-content").html(responseText);

    $(".project-link").click(function() {
        var project_id = $(this).attr('project-id');

        console.log("clicked project link with project id: " + project_id);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_mosaics(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=MOSAICS&project_id=' + project_id);
    });

    $("#add-project-button").click(function() {
        console.log("clicked add project button!!");

        console.log("adding project with text: '" + $("#inputProjectName").val() + "'");
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_projects(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=ADDPROJECT&project_name=' + $("#inputProjectName").val());

        return false;
    });
}

function onSignIn(googleUser) {
    profile = googleUser.getBasicProfile();
    id_token = googleUser.getAuthResponse().id_token;

    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://digitalag.org/our/request.php');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        initialize_projects(xhr.responseText);
    };
    xhr.send('id_token=' + id_token + '&request=INDEX');

    $("#signin-form").append("<a href='javascript:void(0)' id='signout-button' class='btn btn-outline-success my-2 my-sm-0' onclick='signOut();'>Sign out</a>");
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        console.log('User signed out.');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://digitalag.org/our/request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            console.log('Signed in as: ' + xhr.responseText);
            $("#index-content").html(xhr.responseText);
        };
        xhr.send('id_token=NONE&request=INDEX');
        $("#signout-button").remove();
    });
}

$(document).ready(function() {
    console.log("initializing index!");

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://digitalag.org/our/request.php');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function() {
        initialize_projects(xhr.responseText);
    };
    xhr.send('id_token=NONE&request=INDEX');

    $('#addProjectModel').on('shown.bs.modal', function () {
        $('#projectNameTextbox').focus()
    })

});
