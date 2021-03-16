var profile;

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


function initialize_mosaic_cards() {
    $('.picture:not(.bound)').addClass('bound').click(function() {
        if ($(this).parent().parent().hasClass("selecting") ||
            $(this).parent().parent().hasClass("selected")) {
            return;
        }

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
        if ($(this).attr("aria-pressed") == 'true') {
            $(".geo-table").hide();
        } else {
            $(".geo-table").show();
        }
    });

    $(".sharing-switch-button:not(.toggle-bound)").addClass('toggle-bound').click(function() {
        console.log("toggling sharing switch button! aria-pressed: " + $(this).attr("aria-pressed") + ", active:" + $(this).hasClass("active"));
        if ($(this).attr("aria-pressed") == 'true') {
            $(".sharing-info").hide();
        } else {
            $(".sharing-info").show();
        }
    });

    $(".all-hide-button:not(.toggle-bound)").addClass('toggle-bound').click(function() {
        console.log("toggling all hide button!");

        if ($(this).attr("direction") == 'up') {
            $(this).html("<i class='fa fa-angle-double-down'>");
            $(this).attr("direction", 'down');

            $(".hide-folder-button[showing='1']").click();
        } else {
            $(this).html("<i class='fa fa-angle-double-up'>");
            $(this).attr("direction", 'up');
            $(".hide-folder-button[showing='0']").click();
        }
    });
}

//these need to be updated when a new folder is added and the modal is updated
function intialize_move_modal_list() {
    $(".list-group-item:not(.bound,.email-list-item)").addClass("bound").click(function() {
        $(".list-group-item").removeClass("active");
        $(this).addClass("active");
        $("#move-mosaics-modal-button").removeClass("disabled");
    });
}

function initialize_folder_buttons() {
    $(".hide-folder-button:not(.bound)").addClass("bound").click(function() {
        var folder_id = $(this).attr("folder_id");

        if ($(this).attr("showing") == '1') {
            $(this).attr("showing", '0');
            $(this).html("<i class='fa fa-angle-double-down'>");
            $(".folder[folder_id='" + folder_id + "'] > .cards-container").hide();
        } else {
            $(this).attr("showing", '1');
            $(this).html("<i class='fa fa-angle-double-up'>");
            $(".folder[folder_id='" + folder_id + "'] > .cards-container").show();
        }
    });

    $(".unselect-folder-button:not(.bound)").addClass('bound').click(function () {
        var folder_id = $(this).attr("folder_id");
        $(".mosaic-card-row[folder_id='" + folder_id + "'] > .mosaic-card").each(function() {
            $(this).addClass("selecting");
            $(this).removeClass("selected");
            $(this).children(".card").removeClass("border-dark");
        });
    });

    $(".select-folder-button:not(.bound)").addClass('bound').click(function () {
        var folder_id = $(this).attr("folder_id");
        $(".mosaic-card-row[folder_id='" + folder_id + "'] > .mosaic-card").each(function() {
            if ($(this).hasClass("selecting")) {
                $(this).removeClass("selecting");
                $(this).addClass("selected");
                $(this).children(".card").addClass("border-dark");
            }
        });
    });

    $(".invert-folder-button:not(.bound)").addClass('bound').click(function () {
        var folder_id = $(this).attr("folder_id");
        $(".mosaic-card-row[folder_id='" + folder_id + "'] > .mosaic-card").each(function() {
            $(this).trigger('click');
        });
    });

}

function initialize_mosaics(responseText) {
    var response = JSON.parse(responseText);
    //console.log("initializing mosaics with response:\n" + responseText);

    if (response.err_msg) {
        display_error_modal(response.err_title, response.err_msg);
    } else {

        $("#index-content").html(response.html);
        if (typeof response.navbar != undefined) {
            $("#navbar-content").html(response.navbar);

            $('.dropdown-menu a.dropdown-toggle').on('click', function(e) {
                if (!$(this).next().hasClass('show')) {
                    $(this).parents('.dropdown-menu').first().find('.show').removeClass("show");
                }
                var $subMenu = $(this).next(".dropdown-menu");
                $subMenu.toggleClass('show');


                $(this).parents('li.nav-item.dropdown.show').on('hidden.bs.dropdown', function(e) {
                    $('.dropdown-submenu .show').removeClass("show");
                });


                return false;
            });

        }

        var server_mosaics = response.mosaics;

        for (var i in server_mosaics) {
            var mosaic = server_mosaics[i];
            console.log("adding mosaic:");

            mosaics[mosaic.identifier] = mosaic;
            console.log(mosaic);
            console.log("mosaic " + mosaic.id + " status: " + mosaic.status);
            
            if (mosaic.status === 'UPLOADED' || mosaic.status === 'TILING') {
                update_tiling_progress(mosaic);
            }
        }

        initialize_mosaic_cards();


		initialize_mosaic_dropdowns();
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

            var error_text = "";
            //if (this.files.length > 0) {
            for (var i = 0; i < this.files.length; i++) {
                var file = this.files[i];
                var filename = file.webkitRelativePath || file.fileName || file.name;

                const isImage = file['type'].split('/')[0] == 'image';

                console.log("file type: '" + file['type'] + "'");
                console.log("split[0]: " + file['type'].split('/')[0]);
                console.log("isImage: " + isImage);

                if (!filename.match(/^[a-zA-Z0-9_.-]*$/)) {
                    error_text += "The filename '" + filename + "' was malformed.<br>";
                    error_test += "<br>Filenames must only contain letters, numbers, dashes ('-'), underscores ('_') and periods.";
                } else if (!isImage) {
                    error_text += "The selected file was not an image.";

                } else {
                    start_upload(file);
                }
            }

            if (error_text != "") {
                display_error_modal("Malformed Filename", error_text);
            }
        });


        $('#add-mosaic-button').click(function(){
            $('#mosaic-file-input').trigger('click');
        });



        var mosaic_names = [];
        var mosaic_ids = [];
        var selected_emails = [];


        $("#remove-modal-button:not(.bound)").addClass('bound').click(function() {
            if ($(this).hasClass("disabled")) return;
            $(this).addClass("disabled");

            console.log(mosaic_ids);
            console.log(mosaic_names);

            var submission_data = {
                request : "REMOVE_MOSAICS",
                id_token : id_token,
                mosaic_ids : mosaic_ids,
                mosaic_names : mosaic_names
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'text',
                success : function(responseText) {
                    console.log("received response: " + responseText);
                    var response = JSON.parse(responseText);

                    $("body").css("padding-top", "50px");
                    $(".fixed-message").hide(); //remove the help message
                    end_select();
                    $('#remove-modal').modal('hide');

                    display_error_modal(response.title, response.message);

                    var removes = response.removes;
                    for (var i = 0; i < removes.length; i++) {
                        console.log(removes[i]);

                        var mosaic_id = removes[i];
                        var card_id = ".mosaic-card[mosaic_id=" + mosaic_id + "]";
                        $(card_id).remove();
                    }
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);

                },
                async: true
            });

        });


        $("#unshare-modal-user-button:not(.bound)").addClass('bound').click(function() {
            var email = $("#unshare-modal-user-email").val();
            if (email != "") {
                $("#unshare-modal-user-table").append("<tr><td>" + email + "</td></tr>");
                selected_emails.push(email);

                $("#unshare-modal-user-email").val("");

                $("#unshare-modal-button").removeClass("disabled");
            }
        });


        $("#unshare-modal-button:not(.bound)").addClass('bound').click(function() {
            if ($(this).hasClass("disabled")) return;
            $(this).addClass("disabled");

            console.log(mosaic_ids);
            console.log(mosaic_names);
            console.log(selected_emails);

            var submission_data = {
                request : "UNSHARE_MOSAICS",
                id_token : id_token,
                mosaic_ids : mosaic_ids,
                mosaic_names : mosaic_names,
                selected_emails : selected_emails
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'text',
                success : function(responseText) {
                    console.log("received response: " + responseText);
                    var response = JSON.parse(responseText);

                    $("body").css("padding-top", "50px");
                    $(".fixed-message").hide(); //remove the help message
                    end_select();
                    $('#unshare-modal').modal('hide');

                    display_error_modal(response.title, response.message);

                    var unshares = response.unshares;
                    for (var i = 0; i < unshares.length; i++) {
                        console.log(unshares[i]);

                        var mosaic_id = unshares[i].mosaic_id;
                        var row_id = "#share-row-" + mosaic_id + "-" + unshares[i].user_id;
                        $(row_id).remove();
                    }
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);

                },
                async: true
            });

        });

        $("#share-modal-user-button:not(.bound)").addClass('bound').click(function() {
            if ($(this).hasClass('disabled')) return;

            var email = $("#share-modal-user-email").val();
            if (email != "") {
                $("#share-modal-user-table").append("<tr><td>" + email + "</td></tr>");
                selected_emails.push(email);

                $("#share-modal-user-email").val("");

                $("#share-modal-button").removeClass("disabled");
            }
        });


        $("#share-modal-button:not(.bound)").addClass('bound').click(function() {
            if ($(this).hasClass("disabled")) return;
            $(this).addClass('disabled');

            console.log(mosaic_ids);
            console.log(mosaic_names);
            console.log(selected_emails);

            var submission_data = {
                request : "SHARE_MOSAICS",
                id_token : id_token,
                mosaic_ids : mosaic_ids,
                mosaic_names : mosaic_names,
                selected_emails : selected_emails
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'text',
                success : function(responseText) {
                    console.log("received response: " + responseText);
                    var response = JSON.parse(responseText);

                    $("body").css("padding-top", "50px");
                    $(".fixed-message").hide(); //remove the help message
                    end_select();
                    $('#share-modal').modal('hide');

                    display_error_modal(response.title, response.message);

                    console.log("shares:");
                    var shares = response.shares;
                    for (var i = 0; i < shares.length; i++) {
                        console.log(shares[i]);

                        var mosaic_id = shares[i].mosaic_id;
                        var table_selector = ".share-table[mosaic_id=" + mosaic_id + "]";
                        if ($(table_selector).length == 0) {
                            var new_table = "<p>You have shared these mosaics with:</p>"
                                + "<table mosaic_id='" + mosaic_id + "' class='share-table table table-condensed' style='font-size:60%; margin:16 0 0 0; vertical-align: middle;'>"
                                + "</table>";
                            $(".sharing-info[mosaic_id=" + mosaic_id + "]").html(new_table);
                        }

                        var row_id = "#share-row-" + mosaic_id + "-" + shares[i].user_id;
                        if ($(row_id).length == 0) {
                            var new_row = "<tr><td>" + shares[i].user_name + "</td><td>" + shares[i].email + "</td></tr>";
                            $(table_selector).append(new_row);
                        }
                    }
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);

                },
                async: true
            });

        });

        $("#remove-message-button:not(.bound)").addClass('bound').click(function() {
            mosaic_names = [];
            mosaic_ids = [];
            selected_emails = [];

            $(".selected").each(function() {
                mosaic_ids.push( $(this).attr("mosaic_id") );
                mosaic_names.push( $(this).attr("data-sort") );
            });

            console.log(mosaic_ids);
            console.log(mosaic_names);

            $("#remove-modal-table").html("");
            $("#remove-modal-user-table").html("");
            for (var i = 0; i < mosaic_names.length; i++) {
                var html = "<tr><td>" + mosaic_names[i] + "</td></tr>";
                console.log("appending: '" + html + "'");
                $("#remove-modal-table").append(html);

            }
            $("#remove-modal").modal();
        });

        $("#unshare-message-button:not(.bound)").addClass('bound').click(function() {
            mosaic_names = [];
            mosaic_ids = [];
            selected_emails = [];

            $(".selected").each(function() {
                mosaic_ids.push( $(this).attr("mosaic_id") );
                mosaic_names.push( $(this).attr("data-sort") );
            });

            console.log(mosaic_ids);
            console.log(mosaic_names);

            $("#unshare-modal-button").addClass("disabled");
            $("#unshare-modal-table").html("");
            $("#unshare-modal-user-table").html("");
            for (var i = 0; i < mosaic_names.length; i++) {
                var html = "<tr><td>" + mosaic_names[i] + "</td></tr>";
                console.log("appending: '" + html + "'");
                $("#unshare-modal-table").append(html);

            }
            $("#unshare-modal").modal();
        });


        $("#share-message-button:not(.bound)").addClass('bound').click(function() {
            mosaic_names = [];
            mosaic_ids = [];
            selected_emails = [];

            $(".selected").each(function() {
                mosaic_ids.push( $(this).attr("mosaic_id") );
                mosaic_names.push( $(this).attr("data-sort") );
            });

            console.log(mosaic_ids);
            console.log(mosaic_names);

            $("#share-modal-button").addClass("disabled");
            $("#share-modal-table").html("");
            $("#share-modal-user-table").html("");
            for (var i = 0; i < mosaic_names.length; i++) {
                var html = "<tr><td>" + mosaic_names[i] + "</td></tr>";
                console.log("appending: '" + html + "'");
                $("#share-modal-table").append(html);

            }
            $("#share-modal").modal();
        });

        $(".mosaic-card:not(.bound)").addClass('bound').click(function() {
            if ( !($(this).hasClass("selecting") || $(this).hasClass("selected")) ) return;

            console.log("clicked a card!");

            if ($(this).hasClass("selecting")) {
                $(this).removeClass("selecting");
                $(this).addClass("selected");
                $(this).children(".card").addClass("border-dark");

            } else if ($(this).hasClass("selected")) {
                $(this).removeClass("selected");
                $(this).addClass("selecting");
                $(this).children(".card").removeClass("border-dark");

            }
        });

        function start_select() {
            $(".mosaic-card").addClass("selecting");
            $(".unselect-folder-button").show();
            $(".select-folder-button").show();
            $(".invert-folder-button").show();

            $(".mosaic-href").each(function() {
                var href = $(this).attr("href");
                $(this).removeAttr('href');
                $(this).attr('saved_href', href);
            });
        }

        function end_select() {
            $(".unselect-folder-button").hide();
            $(".select-folder-button").hide();
            $(".invert-folder-button").hide();

            $(".mosaic-card").removeClass("selecting");
            $(".mosaic-card").removeClass("selected");
            $(".mosaic-card > .card").removeClass("border-dark");

            $(".mosaic-href").each(function() {
                var saved_href = $(this).attr("saved_href");
                $(this).removeAttr('saved_href');
                $(this).attr('href', saved_href);
            });
        }

        $(".unselect-all-button:not(.bound)").addClass('bound').click(function () {
            $(".mosaic-card").each(function() {
                $(this).addClass("selecting");
                $(this).removeClass("selected");
                $(this).children(".card").removeClass("border-dark");
            });
        });

        $(".select-all-button:not(.bound)").addClass('bound').click(function () {
            $(".mosaic-card").each(function() {
                if ($(this).hasClass("selecting")) {
                    $(this).removeClass("selecting");
                    $(this).addClass("selected");
                    $(this).children(".card").addClass("border-dark");
                }
            });
        });


        $(".invert-select-button:not(.bound)").addClass('bound').click(function () {
            $(".mosaic-card").each(function() {
                $(this).trigger('click');
            });
        });

        $(".cancel-select-button:not(.bound)").addClass('bound').click(function () {
            $("body").css("padding-top", "50px");
            $(".fixed-message").hide();
            end_select();
        });


        $(".cancel-select-button:not(.bound)").addClass('bound').click(function () {
            $("body").css("padding-top", "50px");
            $(".fixed-message").hide();
            end_select();
        });


        $(".cancel-select-button:not(.bound)").addClass('bound').click(function () {
            $("body").css("padding-top", "50px");
            $(".fixed-message").hide();
            end_select();
        });

        $("#remove-card-nav:not(.bound)").addClass('bound').click(function() {
            $("body").css("padding-top", "105px");
            $(".fixed-message").hide(); //remove otehr selects
            $("#remove-message").show();
            end_select(); //reset other selects
            start_select();
        });

        $("#unshare-card-nav:not(.bound)").addClass('bound').click(function() {
            $("body").css("padding-top", "105px");
            $(".fixed-message").hide(); //remove other selects
            $("#unshare-message").show();
            end_select(); //reset other selects
            start_select();
        });

        $("#share-card-nav:not(.bound)").addClass("bound").click(function() {
            $("body").css("padding-top", "105px");
            $(".fixed-message").hide(); //reset other selects
            $("#share-message").show();
            end_select(); //reset other selects
            start_select();
        });

        function reset_create_label() {
            $("#submit-label-share-text-input").html("");
            $("#submit-label-email-list").html("");
            $("#submit-label-name-text-input").val("");
            $("#submit-label-button").addClass("disabled");
            $("#submit-label-button").text("Create");
            $(".submit-label-select-type").removeClass("active");
            $(".submit-label-select-type").removeClass("disabled");
            create_label_type_selected = false;
        }

        function reset_modify_label() {
            $("#submit-label-share-text-input").html("");
            $("#submit-label-email-list").html("");
            $("#submit-label-name-text-input").val("");
            //$("#submit-label-button").addClass("disabled");
            $("#submit-label-button").text("Update");
            $(".submit-label-select-type").removeClass("active");
            create_label_type_selected = true;
        }


        function get_label_message_padding(email_count) {
            if (email_count <= 2) {
                return "265px";
            } else if (email_count == 3) {
                return "297px";
            } else {
                return (297 + ((email_count - 3) * 38)) + "px";
            }
        }

        function initialize_create_label_badges() {
            $(".submit-label-remove-badge:not(.bound)").addClass("bound").click(function() {
                console.log("parent:" + $(this).parent());

                $(this).parent().remove();

                var email_count = parseInt($("#submit-label-email-list").attr("email-count"));
                email_count = email_count - 1;
                $("#submit-label-email-list").attr("email-count", email_count);

                //first adds 13 to the top
                //second adds 38

                $("body").css( "padding-top", get_label_message_padding(email_count) );
            });

            $(".submit-label-access-badge:not(.bound)").addClass("bound").click(function() {
                var val = $(this).html();

                if (val == "R") {
                    val = "RW";
                } else if (val == "RW") {
                    val = "R";
                }

                $(this).html(val);
            });

        }
        
        var create_label_type_selected = false;

        $("#submit-label-name-text-input:not(.bound)").addClass("bound").keyup(function() {
            if ($(this).val() === "" || !create_label_type_selected) {
                $("#submit-label-button").addClass("disabled");
            } else {
                $("#submit-label-button").removeClass("disabled");
            }
        });

        $("#remove-label-modal-button:not(.bound)").addClass("bound").click(function() {
            var label_id = $(this).attr("label_id");
            console.log("removing label with id: " + label_id);

            var submission_data = {
                id_token : id_token,
                request : "REMOVE_LABEL",
                label_id : label_id
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'text',
                success : function(responseText) {
                    console.log("received response: " + responseText);
                    var response = JSON.parse(responseText);

                    $(".modify-label-nav[label_id=" + response.label_id + "]").remove();
                    $(".remove-label-nav[label_id=" + response.label_id + "]").remove();

                    display_success_modal(response.success_title, response.success_msg);

                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);

                },
                async: true
            });

        });

        function initialize_labels_nav() {
            $(".remove-label-nav:not(.bound)").addClass("bound").click(function() {
                $("body").css("padding-top", "50px");
                $(".fixed-message").hide();
                end_select();

                var html = "<p>Are you sure you wish to remove your access to the <b>" + $(this).attr("label_name") + "</b> label?</p>"
                    + "<p>Please note this will not delete the label, only remove your access to it, as it may have been shared with other users.</p>";

                $("#remove-label-modal-button").attr("label_id", $(this).attr("label_id"));

                $("#remove-label-modal-body").html(html);
                $("#remove-label-modal").modal();
            });


            $(".modify-label-nav:not(.bound)").addClass("bound").click(function() {
                var label_id = $(this).attr("label_id");
                var label_name = $(this).attr("label_name");
                var label_type = $(this).attr("label_type");
                var label_color = $(this).attr("label_color");

                $("#submit-label-message").attr("label_id", label_id);

                var submission_data = {
                    id_token : id_token,
                    request : "MODIFY_NAV_REQUEST",
                    label_id : label_id
                };

                $.ajax({
                    type: 'POST',
                    url: './request.php',
                    data : submission_data,
                    dataType : 'text',
                    success : function(responseText) {
                        console.log("received response: " + responseText);
                        var response = JSON.parse(responseText);

                        reset_modify_label();

                        //append all the shared emails
                        for (var i = 0; i < response.shares.length; i++) {
                            var share = response.shares[i];

                            var email = share.email;
                            var access = share.access; 
                            var new_html = 
                                "<li class='list-group-item email-list-item' style='padding:6 12 6 12;'>"
                                + "<span class='submit-label-list-email'>"
                                + email
                                + "</span>"
                                + "<span class='badge badge-danger pull-right submit-label-remove-badge' style='margin-top:6px;'>"
                                + "<i class='fa fa-times' aria-hidden='true'></i>"
                                + "</span>"
                                + "<span class='badge badge-info pull-right submit-label-access-badge' style='margin-top:6px; margin-right:6px;'>"
                                + access
                                + "</span>"
                                + "</li>";

                            $("#submit-label-email-list").append(new_html);
                        }
                        initialize_create_label_badges();

                        var email_count = response.shares.length;
                        $("#submit-label-email-list").attr("email-count", email_count);

                        $("body").css( "padding-top", get_label_message_padding(email_count) );

                        //set up the label message interface
                        $(".fixed-message").hide(); //reset other selects

                        $("#submit-label-name-text-input").val(label_name);
                        $("#submit-label-color-picker").attr("value", label_color);

                        if (label_type == "POINT") {
                            $("#submit-label-type-point").click();
                        } else if (label_type == "LINE") {
                            $("#submit-label-type-line").click();
                        } else if (label_type == "RECTANGLE") {
                            $("#submit-label-type-rectangle").click();
                        } else if (label_type == "POLYGON") {
                            $("#submit-label-type-polygon").click();
                        }
                        
                        $(".submit-label-select-type").addClass("disabled");

                        $("#submit-label-message").show();

                        end_select(); //reset other selects
                        start_select();

                        //select all the mosaics
                        var selected_mosaics = response.selected_mosaics;
                        console.log("selected_mosics.length: " + selected_mosaics.length);

                        for (var i = 0; i < selected_mosaics.length; i++) {
                            var card = $(".mosaic-card[mosaic_id=" + selected_mosaics[i] + "]");
                            card.removeClass("selecting");
                            card.addClass("selected");
                            card.children(".card").addClass("border-dark");
                        }

                    },
                    error : function(jqXHR, textStatus, errorThrown) {
                        console.log(errorThrown);

                    },
                    async: true
                });

            });
        }

        initialize_labels_nav();
         

        $("#create-label-nav:not(.bound)").addClass("bound").click(function() {
            $("body").css("padding-top", "265px");
            $(".fixed-message").hide(); //reset other selects

            $("#submit-label-message").removeAttr("label_id");

            reset_create_label();
            $("#submit-label-message").show();

            end_select(); //reset other selects
            start_select();
        });


        function add_create_label_email() {
            var email = $("#submit-label-share-text-input").val();
            var access = "R";
            var new_html = 
                "<li class='list-group-item email-list-item' style='padding:6 12 6 12;'>"
                + "<span class='submit-label-list-email'>"
                + email
                + "</span>"
                + "<span class='badge badge-danger pull-right submit-label-remove-badge' style='margin-top:6px;'>"
                + "<i class='fa fa-times' aria-hidden='true'></i>"
                + "</span>"
                + "<span class='badge badge-info pull-right submit-label-access-badge' style='margin-top:6px; margin-right:6px;'>"
                + access
                + "</span>"
                + "</li>";

            var email = $("#submit-label-share-text-input").val("");

            $("body").css("padding-top", "265px");

            $("#submit-label-email-list").append(new_html);
            initialize_create_label_badges();

            var email_count = parseInt($("#submit-label-email-list").attr("email-count"));
            email_count = email_count + 1;
            $("#submit-label-email-list").attr("email-count", email_count);

            //first adds 13 to the top
            //second adds 38

            $("body").css( "padding-top", get_label_message_padding(email_count) )
        }

        $("#submit-label-share-text-input:not(.bound)").addClass("bound").on('keyup', function(e) {
            if (e.keyCode == 13) {
                add_create_label_email();
            }
        });

        $("#submit-label-add-email-button:not(.bound)").addClass("bound").click(function() {
            add_create_label_email();
            //bind functions to access and remove badges
        });


        $(".submit-label-select-type:not(.bound)").addClass("bound").click(function() {
            if ($(this).hasClass("disabled")) return;

            $(".submit-label-select-type.active").button('toggle');
            $(this).button('toggle');
            create_label_type_selected = true;

            if ($("#submit-label-name-text-input").val() !== "") {
                $("#submit-label-button").removeClass("disabled");
            } else {
                $("#submit-label-button").addClass("disabled");
            }
        });

        $("#submit-label-button:not(.bound)").addClass("bound").click(function() {
            if ($(this).hasClass("disabled")) return;

            var name = $("#submit-label-name-text-input").val();
            var color = $("#submit-label-color-picker").val();

            var type = $(".submit-label-select-type.active").text();
            if (type === "Points") type = "POINT";
            else if (type === "Lines") type = "LINE";
            else if (type === "Rectangles") type = "RECTANGLE";
            else if (type === "Polygons") type = "POLYGON";

            var share_with = [];

            $("#submit-label-email-list .email-list-item").each(function() {
                var email = $(this).children(".submit-label-list-email").html();
                var access = $(this).children(".submit-label-access-badge").html();

                share_with.push( {email : email, access : access} );
                console.log("appending email: '" + email + "', access: '" + access + "'");

            });

            var selected_mosaics = [];

            $(".selected").each(function() {
                var id = $(this).attr("mosaic_id");
                var name = $(this).attr("data-sort");

                selected_mosaics.push({id : id, name : name});
            });


            console.log("name: " + name + ", color: " + color);
            console.log("sharing with:" + JSON.stringify(share_with));
            console.log("selected mosaics:" + JSON.stringify(selected_mosaics));

            if ($(this).text() == "Update") {
                var label_id = $("#submit-label-message").attr("label_id");

                var submission_data = {
                    id_token : id_token,
                    request : "MODIFY_LABEL",
                    label_id : label_id,
                    label_name : name,
                    label_color : color,
                    label_type : type,
                    share_with : share_with,
                    selected_mosaics : selected_mosaics
                };

                $.ajax({
                    type: 'POST',
                    url: './request.php',
                    data : submission_data,
                    dataType : 'text',
                    success : function(responseText) {
                        console.log("received response: " + responseText);
                        var response = JSON.parse(responseText);

                        $("body").css("padding-top", "50px");
                        $(".fixed-message").hide();
                        end_select();

                        if (response.err_msg) {
                            display_error_modal(response.err_title, response.err_msg);
                        } else {
                            var html =
                                "<a href='javascript:void(0);' label_id='"
                                + response.label_id
                                + "' label_type='"
                                + response.label_type
                                + "' label_name='"
                                + response.label_name
                                + "' label_color='"
                                + response.label_color
                                + "' class='modify-label-nav dropdown-item' style='margin: 0 0 0 0; background-color:rgba("
                                + response.color_r + "," + response.color_g + "," + response.color_b
                                + ",0.25); border-color:rgba("
                                + response.color_r + "," + response.color_g + "," + response.color_b
                                + ",1);' >"
                                + response.label_name
                                + "</a>";

                            $(".modify-label-nav[label_id=" + response.label_id + "]").replaceWith(html);

                            initialize_labels_nav();

                            display_success_modal(response.success_title, response.success_msg);
                        }

                    },
                    error : function(jqXHR, textStatus, errorThrown) {
                        console.log(errorThrown);

                    },
                    async: true
                });

            } else if ($(this).text() == "Create") {

                var submission_data = {
                    id_token : id_token,
                    request : "CREATE_LABEL",
                    label_name : name,
                    label_color : color,
                    label_type : type,
                    share_with : share_with,
                    selected_mosaics : selected_mosaics
                };

                $.ajax({
                    type: 'POST',
                    url: './request.php',
                    data : submission_data,
                    dataType : 'text',
                    success : function(responseText) {
                        console.log("received response: " + responseText);
                        var response = JSON.parse(responseText);

                        $("body").css("padding-top", "50px");
                        $(".fixed-message").hide();
                        end_select();

                        if (response.err_msg) {
                            display_error_modal(response.err_title, response.err_msg);
                        } else {
                            //Append the new label to the modify labels dropdown in the navbar

                            var html =
                                "<a href='javascript:void(0);' label_id='"
                                + response.label_id
                                + "' label_type='"
                                + response.label_type
                                + "' label_name='"
                                + response.label_name
                                + "' label_color='"
                                + response.label_color
                                + "' class='modify-label-nav dropdown-item' style='margin: 0 0 0 0; background-color:rgba("
                                + response.color_r + "," + response.color_g + "," + response.color_b
                                + ",0.25); border-color:rgba("
                                + response.color_r + "," + response.color_g + "," + response.color_b
                                + ",1);' >"
                                + response.label_name
                                + "</a>";

                            var remove_html =
                                "<a href='javascript:void(0);' label_id='"
                                + response.label_id
                                + "' label_type='"
                                + response.label_type
                                + "' label_name='"
                                + response.label_name
                                + "' label_color='"
                                + response.label_color
                                + "' class='remove-label-nav dropdown-item' style='margin: 0 0 0 0; background-color:rgba("
                                + response.color_r + "," + response.color_g + "," + response.color_b
                                + ",0.25); border-color:rgba("
                                + response.color_r + "," + response.color_g + "," + response.color_b
                                + ",1);' >"
                                + response.label_name
                                + "</a>";


                            console.log("appending:\n" + html);

                            if (response.label_type === "POINT")  {
                                $(".dropdown-points-labels.modify-label").append(html);
                                $(".dropdown-points-labels.remove-label").append(remove_html);
                            } else if (response.label_type === "LINE") {
                                $(".dropdown-lines-labels.modify-label").append(html);
                                $(".dropdown-lines-labels.remove-label").append(remove_html);
                            } else if (response.label_type === "RECTANGLE") {
                                $(".dropdown-rectangles-labels.modify-label").append(html);
                                $(".dropdown-rectangles-labels.remove-label").append(remove_html);
                            } else if (response.label_type === "POLYGON") {
                                $(".dropdown-polygons-labels.modify-label").append(html);
                                $(".dropdown-polygons-labels.remove-label").append(remove_html);
                            }

                            initialize_labels_nav();

                            display_success_modal(response.success_title, response.success_msg);
                        }

                    },
                    error : function(jqXHR, textStatus, errorThrown) {
                        console.log(errorThrown);

                    },
                    async: true
                });
            }


        });



        $("#create-folder-modal-button:not(.bound)").addClass("bound").click(function() {
            if ($(this).hasClass("disabled")) return;
            $(this).addClass("disabled");

            var folder_name = $.trim( $("#create-folder-name").val() );

            if (folder_name != "") {
                var submission_data = {
                    request : "CREATE_FOLDER",
                    id_token : id_token,
                    folder_name : folder_name
                };

                $.ajax({
                    type: 'POST',
                    url: './request.php',
                    data : submission_data,
                    dataType : 'text',
                    success : function(responseText) {
                        console.log("received response: " + responseText);
                        var response = JSON.parse(responseText);

                        $('#create-folder-modal').modal('hide');

                        if (response.err_msg) {
                            display_error_modal(response.err_title, response.err_msg);
                        } else {
                            $("#folder-content").prepend(response.folder_html);
                            $("#folder-content").sort_sub("div");

                            var html = "<li class='list-group-item' folder_id='" + response.folder_id + "' data-sort='" + response.folder_sort + "' data-toggle='list'>" + response.folder_name + "</li>";
                            $("#move-mosaics-list-tab").append(html);
                            $("#move-mosaics-list-tab").sort_sub("li");
                            $("#remove-folder-list-tab").append(html);
                            $("#remove-folder-list-tab").sort_sub("li");
                            intialize_move_modal_list();
                            initialize_folder_buttons();
                        }

                    },
                    error : function(jqXHR, textStatus, errorThrown) {
                        console.log(errorThrown);

                    },
                    async: true
                });


            }
        });

        $("#create-folder-nav:not(.bound)").addClass("bound").click(function() {
            $("#create-folder-modal").modal();
            $("#create-folder-modal-button").removeClass("disabled");
        });

        $("#remove-folder-modal-button:not(.bound)").addClass("bound").click(function() {
            if ($(this).hasClass("disabled")) return;
            $(this).addClass("disabled");

            var folder_id = $(".list-group-item.active").attr("folder_id");

            console.log("removeing the following folder_id: " + folder_id);

            var submission_data = {
                request : "REMOVE_FOLDER",
                id_token : id_token,
                folder_id : folder_id
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'text',
                success : function(responseText) {
                    console.log("received response: " + responseText);
                    var response = JSON.parse(responseText);

                    $('#remove-folder-modal').modal('hide');
                    $('.list-group-item').removeClass('active');

                    if (response.err_msg) {
                        display_error_modal(response.err_title, response.err_msg);
                    } else {
                        var folder_id = response.removed_folder_id;

                        $(".mosaic-card-row[folder_id='" + folder_id + "'] > .mosaic-card").each(function() {
                            $(this).appendTo(".mosaic-card-row[folder_id='-1']");
                            $(".mosaic-card-row[folder_id='-1']").sort_sub("div");
                        });

                        initialize_mosaic_cards();
                        $(".folder[folder_id='" + folder_id + "']").remove();
                        $(".list-group-item[folder_id='" + folder_id + "']").remove();
                    }

                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);

                },
                async: true
            });
        });

        $("#remove-folder-nav:not(.bound)").addClass("bound").click(function() {
            $("#remove-folder-modal").modal();
            $("#remove-folder-modal-button").removeClass("disabled");
        });


        $("#move-mosaics-nav:not(.bound)").addClass('bound').click(function() {
            $("body").css("padding-top", "105px");
            $(".fixed-message").hide(); //remove otehr selects
            $("#move-message").show();
            end_select(); //reset other selects
            start_select();
        });

        $("#move-message-button:not(.bound)").addClass('bound').click(function() {
            mosaic_names = [];
            mosaic_ids = [];
            selected_emails = [];

            $(".selected").each(function() {
                mosaic_ids.push( $(this).attr("mosaic_id") );
                mosaic_names.push( $(this).attr("data-sort") );
            });

            console.log(mosaic_ids);
            console.log(mosaic_names);

            //unselect any selected folders
            $(".list-group-item").removeClass("active");

            $("#move-mosaics-modal-button").addClass("disabled");
            $("#move-mosaics-modal-table").html("");
            for (var i = 0; i < mosaic_names.length; i++) {
                var html = "<tr><td>" + mosaic_names[i] + "</td></tr>";
                console.log("appending: '" + html + "'");
                $("#move-mosaics-modal-table").append(html);

            }
            $("#move-mosaics-modal").modal();
        });

        //remove the 'Unorganized Mosaics' folder from the remove list,
        //as it cannot be removed
        $("#remove-folder-list-tab > .list-group-item[folder_id='-1']").remove();
        intialize_move_modal_list();
        initialize_folder_buttons();


        $("#move-mosaics-modal-button:not(.bound)").addClass("bound").click(function() {
            if ($(this).hasClass('disabled')) return;
            $(this).addClass("disabled");

            var folder_id = $(".list-group-item.active").attr("folder_id");

            mosaic_names = [];
            mosaic_ids = [];
            selected_emails = [];

            $(".selected").each(function() {
                mosaic_ids.push( $(this).attr("mosaic_id") );
                mosaic_names.push( $(this).attr("data-sort") );
            });

            console.log("moving the following to folder_id: " + folder_id);
            console.log(mosaic_ids);
            console.log(mosaic_names);

            var submission_data = {
                request : "MOVE_MOSAICS",
                id_token : id_token,
                folder_id : folder_id,
                mosaic_ids : mosaic_ids,
                mosaic_names : mosaic_names
            };

            $.ajax({
                type: 'POST',
                url: './request.php',
                data : submission_data,
                dataType : 'text',
                success : function(responseText) {
                    console.log("received response: " + responseText);
                    var response = JSON.parse(responseText);

                    $("body").css("padding-top", "50px");
                    $('.list-group-item').removeClass('active');
                    $('#move-mosaics-modal').modal('hide');
                    $(".fixed-message").hide(); //remove the help message
                    end_select();

                    if (response.err_msg) {
                        display_error_modal(response.err_title, response.err_msg);
                    } else {
                        var moves = response.moves;

                        for (var i = 0; i < moves.length; i++) {
                            var mosaic_id = moves[i].mosaic_id;
                            var target_folder_id = moves[i].target_folder_id;
                            
                            console.log("moving mosaic " + mosaic_id + " to " + target_folder_id);

                            $(".mosaic-card[mosaic_id='" + mosaic_id + "']").appendTo(".mosaic-card-row[folder_id='" + target_folder_id + "']");
                            $(".mosaic-card-row[folder_id='" + target_folder_id + "']").sort_sub("div");
                        }
                        initialize_mosaic_cards();
                    }

                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown);

                },
                async: true
            });
        });
    }
}

var initialized_mosaics = false;

function onSignIn(googleUser) {
    // profile = googleUser.getBasicProfile();
    // id_token = googleUser.getAuthResponse().id_token;
    // console.log("set id token: " + id_token);

    // console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    // console.log('Name: ' + profile.getName());
    // console.log('Image URL: ' + profile.getImageUrl());
    // console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
    id_token = "user"
    initialized_mosaics = true;
    serverRequest("INDEX", initialize_mosaics);

    //$("#signin-form").append("<a href='javascript:void(0)' id='signout-button' class='btn btn-outline-success my-2 my-sm-0' onclick='signOut();'>Sign out</a>");
}

function signOut() {
    // var auth2 = gapi.auth2.getAuthInstance();

    // auth2.signOut().then(function () {
    //     console.log('User signed out.');

    //     window.location.href = "./";
    // });
}

function initialize_splash(responseText) {
    console.log("response was: " + responseText);

    var response = JSON.parse(responseText);

    $("#index-content").html(response.html);
}

function serverRequest(requestType, responseFunction) {
    console.log("doing server request with id token: " + id_token);
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

    // gapi.load('auth2', function() {
    //     gapi.auth2.init({
    //         client_id: CLIENT_ID
    //     }).then(function(){
    //         auth2 = gapi.auth2.getAuthInstance();
    //         //console.log("SIGNED IN?" + auth2.isSignedIn.get()); //now this always returns correctly        

    //         if (auth2.isSignedIn.get()) {
    //             id_token = auth2.currentUser.get().getAuthResponse().id_token;
    //             console.log("set id token: " + id_token);

    //             if (!initialized_mosaics) {
    //                 serverRequest("INDEX", initialize_mosaics);
    //             }
    //         } else {
    //             id_token = 'NONE';
    //             serverRequest("INDEX", initialize_splash);
    //         }
    //     });
    // });


    // setTimeout(login, 5 * 60 * 1000);  //1 minutes
    id_token = "user"
    if (!initialized_mosaics) {
        serverRequest("INDEX", initialize_mosaics);
    }
}

$(document).ready(function() {
    login();
});
