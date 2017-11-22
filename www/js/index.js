var profile;
var id_token;

function initialize_mosaic(responseText) {
    var response = JSON.parse(responseText);

    //console.log("received initialize mosaic response: " + responseText);
    $("#index-content").html(response.html);

    $("#back-to-projects").click(function() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
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


function initialize_projects(responseText) {
    var response = JSON.parse(responseText);
    //console.log("initializing projects with response:\n" + responseText);
    $("#index-content").html(response.html);

    $(".project-link").click(function() {
        var project_id = $(this).attr('project-id');

        console.log("clicked project link with project id: " + project_id);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', './request.php');
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
        xhr.open('POST', './request.php');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function() {
            initialize_projects(xhr.responseText);
        };
        xhr.send('id_token=' + id_token + '&request=ADDPROJECT&project_name=' + $("#inputProjectName").val());

        return false;
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

    var r = new Resumable({
        target: 'resumable_upload.php?id_token=' + id_token
    });

    r.assignBrowse(document.getElementById('add-mosaic-button'));

    $('#pause-upload-button').click(function(){
        if ($(this).attr('state') === 'play') {
            $(this).attr('state', 'pause');
            $('.uploading-mosaic').removeClass('progress-bar-animated');

            $(this).find('.fa').removeClass('fa-pause').addClass('fa-play');
            r.pause();
        } else {
            $(this).attr('state', 'play');
            $('.uploading-mosaic').addClass('progress-bar-animated');

            $(this).find('.fa').removeClass('fa-play').addClass('fa-pause');
            r.upload();
        }
    });


    r.on('fileSuccess', function(file){
        console.debug('fileSuccess',file);
        var file_token = file.uniqueIdentifier;
        console.log("file progress for '" + file_token + "': " + (file.progress() * 100.0));

        $("#progress-bar-" + file_token).attr("aria-valuenow", file.progress() * 100.0);
        $("#progress-bar-" + file_token).attr("style", "width: " + file.progress() * 100.0 + "%");
        $("#progress-bar-" + file_token).text(Number(file.progress() * 100.0).toFixed(2) + "%");
        $("#progress-bar-" + file_token).addClass("bg-success");
        $("#progress-bar-" + file_token).removeClass("progress-bar-animated");
        $("#progress-bar-text-" + file_token).html(Number(Number(file.progress() * file.size / 1024).toFixed(0)).toLocaleString() + "/" + Number((file.size / 1024).toFixed(0)).toLocaleString() + "kB (" + Number(file.progress() * 100.0).toFixed(2) + "%)");
    });

    r.on('fileProgress', function(file){
        //console.log("PROGRESS!");
        console.debug('fileProgress', file);
        var file_token = file.uniqueIdentifier;
        console.log("file progress for '" + file_token + "': " + (file.progress() * 100.0));

        $("#progress-bar-" + file_token).attr("aria-valuenow", file.progress() * 100.0);
        $("#progress-bar-" + file_token).attr("style", "width: " + file.progress() * 100.0 + "%");
        $("#progress-bar-" + file_token).text(Number(file.progress() * 100.0).toFixed(2) + "%");
        $("#progress-bar-text-" + file_token).html(Number(Number(file.progress() * file.size / 1024).toFixed(0)).toLocaleString() + "/" + Number((file.size / 1024).toFixed(0)).toLocaleString() + "kB (" + Number(file.progress() * 100.0).toFixed(2) + "%)");
    });

    r.on('fileAdded', function(file, event){
        if ($('#pause-upload-button').attr('state') === 'pause') {
            $('.uploading-mosaic').removeClass('progress-bar-animated');
        } else {
            $('#pause-upload-button').attr('state', 'play');
            $('.uploading-mosaic').addClass('progress-bar-animated');

            $('#pause-upload-button').find('.fa').removeClass('fa-play').addClass('fa-pause');
            r.upload();
        }
        console.debug('fileAdded', event);

        var file_token = file.uniqueIdentifier;
        var progress_text = "<tr>"
            + "<td style='width:35%; vertical-align: middle;'>" + file.relativePath + "</td>"
            + "<td style='width:35%; vertical-align: middle;'><div class='progress'> <div id='progress-bar-" + file_token + "' class='progress-bar progress-bar-striped progress-bar-animated' role='progressbar' aria-valuenow='0' aria-valuemin='0' aria-valuemax='100' style='width:0.00%'></div></div></td>"
            + "<td style='vertical-align: middle;'><div id='progress-bar-text-" + file_token + "'>0/" + (Number(file.size / 1024).toFixed(0)).toLocaleString() + "kB (0.00%)</div></td>"
            + "</tr>";

        console.log("appending progress text to mosaics table!");
        if ($("#progress-bar-" + file_token).length == 0) {
            $("#mosaics-table").append(progress_text);
        }


        $('#pause-upload-button').show();
    });

    /*
    r.on('filesAdded', function(array){
        r.upload();
        console.debug('filesAdded', array);
    });
    */

    r.on('fileRetry', function(file){
        console.debug('fileRetry', file);
    });

    r.on('fileError', function(file, message){
        console.debug('fileError', file, message);
        //r.pause();
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
        //r.pause();
    });

    r.on('pause', function(){
        console.debug('pause');
    });

    r.on('cancel', function(){
        console.debug('cancel');
    });
}

function onSignIn(googleUser) {
    profile = googleUser.getBasicProfile();
    id_token = googleUser.getAuthResponse().id_token;

    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.

    serverRequest("INDEX", initialize_projects);

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

$(document).ready(function() {
    console.log("initializing index!");

    gapi.load('auth2', function() {
        gapi.auth2.init({
            client_id: '913778561877-7vmnbjvuc9c2g3c3qejgckjdtdivg9n1.apps.googleusercontent.com',
        }).then(function(){
            auth2 = gapi.auth2.getAuthInstance();
            //console.log("SIGNED IN?" + auth2.isSignedIn.get()); //now this always returns correctly        

            if (auth2.isSignedIn.get()) {
                id_token = auth2.currentUser.get().getAuthResponse().id_token;
                serverRequest("INDEX", initialize_projects);
            } else {
                id_token = 'NONE';
                serverRequest("INDEX", initialize_splash);
            }
        });
    });
});
