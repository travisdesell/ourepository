<?php
/**
 * This is the implementation of the server side part of
 * Resumable.js client script, which sends/uploads files
 * to a server in several chunks.
 *
 * The script receives the files in a standard way as if
 * the files were uploaded using standard HTML form (multipart).
 *
 * This PHP script stores all the chunks of a file in a temporary
 * directory (`temp`) with the extension `_part<#ChunkN>`. Once all 
 * the parts have been uploaded, a final destination file is
 * being created from all the stored parts (appending one by one).
 *
 * @author Gregory Chris (http://online-php.com)
 * @email www.online.php@gmail.com
 *
 * @editor Bivek Joshi (http://www.bivekjoshi.com.np)
 * @email meetbivek@gmail.com
 */

$cwd[__FILE__] = __FILE__;
if (is_link($cwd[__FILE__])) $cwd[__FILE__] = readlink($cwd[__FILE__]);
$cwd[__FILE__] = dirname($cwd[__FILE__]);

require_once($cwd[__FILE__] . "/../db/my_query.php");
require_once($cwd[__FILE__] . "/user.php");

$upload_dir = "/mosaic_uploads";


////////////////////////////////////////////////////////////////////
// THE FUNCTIONS
////////////////////////////////////////////////////////////////////

/**
 *
 * Logging operation - to a file (upload_log.txt) and to the stdout
 * @param string $str - the logging string
 */
function _log($str) {

    // log to the output
    $log_str = date('d.m.Y').": {$str}\r\n";
    echo $log_str;

    // log to file
    if (($fp = fopen('upload_log.txt', 'a+')) !== false) {
        fputs($fp, $log_str);
        fclose($fp);
    }
}

/**
 * 
 * Delete a directory RECURSIVELY
 * @param string $dir - directory path
 * @link http://php.net/manual/en/function.rmdir.php
 */
function rrmdir($dir) {
    if (is_dir($dir)) {
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                if (filetype($dir . "/" . $object) == "dir") {
                    rrmdir($dir . "/" . $object); 
                } else {
                    unlink($dir . "/" . $object);
                }
            }
        }
        reset($objects);
        rmdir($dir);
    }
}

/**
 *
 * Check if all the parts exist, and 
 * gather all the parts of the file together
 * @param string $temp_dir - the temporary directory holding all the parts of the file
 * @param string $file_name - the original file name
 * @param string $chunkSize - each chunk size (in bytes)
 * @param string $total_size - original file size (in bytes)
 */
function createFileFromChunks($user_id, $temp_dir, $identifier, $file_name, $chunkSize, $total_size, $total_files) {
    // count all the parts of this file
    $total_files_on_server_size = 0;
    $temp_total = 0;
    foreach(scandir($temp_dir) as $file) {
        $temp_total = $total_files_on_server_size;
        $tempfilesize = filesize($temp_dir.'/'.$file);
        $total_files_on_server_size = $temp_total + $tempfilesize;
    }

    error_log("trying to create file from chunks, total_files_on_server_size: $total_files_on_server_size, total_size: $total_size");

    //check and see if mosaics already exists in the database, otherwise increase bytes_uploaded
    $query = "SELECT * FROM mosaics WHERE identifier = '$identifier'";
    error_log("$query");
    $result = query_our_db($query);

    if (mysqli_num_rows($result) > 0) {
        //entry exists
        $query = "UPDATE mosaics SET bytes_uploaded = $total_files_on_server_size WHERE identifier = '$identifier'";
        error_log("$query");
        query_our_db($query);
    } else {
        $query = "INSERT INTO mosaics SET owner_id = $user_id, filename = '$file_name', identifier = '$identifier', bytes_uploaded = $total_files_on_server_size, total_size = $total_size, status='UPLOADING'";
        error_log("$query");
        query_our_db($query);
    } 

    // check that all the parts are present
    // If the Size of all the chunks on the server is equal to the size of the file uploaded.
    if ($total_files_on_server_size >= $total_size) {
    // create the final destination file 
        error_log("writing to final destination file: '$temp_dir/../$file_name'");

        if (($fp = fopen($temp_dir.'/../'.$file_name, 'w')) !== false) {
            for ($i=1; $i<=$total_files; $i++) {
                fwrite($fp, file_get_contents($temp_dir.'/'.$file_name.'.part'.$i));
                _log('writing chunk '.$i);
            }
            fclose($fp);
        } else {
            _log('cannot create the destination file');
            return false;
        }

        error_log("removing directory: '$temp_dir'");
        // rename the temporary directory (to avoid access from other 
        // concurrent chunks uploads) and than delete it
        if (rename($temp_dir, $temp_dir.'_UNUSED')) {
            rrmdir($temp_dir.'_UNUSED');
        } else {
            rrmdir($temp_dir);
        }

        $query = "UPDATE mosaics SET status = 'UPLOADED' AND bytes_uploaded = $total_size WHERE owner_id = $user_id AND filename = '$file_name' AND identifier = '$identifier'";
        error_log("$query");
        query_our_db($query);
    }
}


////////////////////////////////////////////////////////////////////
// THE SCRIPT
////////////////////////////////////////////////////////////////////

//modifications to make sure the user is logged in
//TODO: spit out an error page if the user is not logged in
$id_token = $_GET['id_token'];
$user_id = get_user_id($id_token);

error_log("request method: " . $_SERVER['REQUEST_METHOD']);

$msg = "";
foreach ($_GET as $key => $value) {
    if ($key == "id_token") continue;
    $msg .= " $key: '$value'";
}
//error_log("$msg");
http_response_code(500);
echo "blahblabhalbhalbhlbha";
exit();

//check if request is GET and the requested chunk exists or not. this makes testChunks work
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if(!(isset($_GET['resumableIdentifier']) && trim($_GET['resumableIdentifier'])!='')){
        $_GET['resumableIdentifier']='';
    }

    $temp_dir = $upload_dir . '/' . $user_id . '/' .$_GET['resumableIdentifier'];
    if(!(isset($_GET['resumableFilename']) && trim($_GET['resumableFilename'])!='')){
        $_GET['resumableFilename']='';
    }

    if(!(isset($_GET['resumableChunkNumber']) && trim($_GET['resumableChunkNumber'])!='')){
        $_GET['resumableChunkNumber']='';
    }

    $chunk_file = $temp_dir.'/'.$_GET['resumableFilename'].'.part'.$_GET['resumableChunkNumber'];
    if (file_exists($chunk_file)) {
        error_log("chunk file '$chunk_file' already exists! sending OK");
        header("HTTP/1.0 200 Ok");
    } else {
        error_log("chunk file '$chunk_file' does not exist! sending 404");
        header("HTTP/1.0 404 Not Found");
    }
}

// loop through files and move the chunks to a temporarily created directory
if (!empty($_FILES)) foreach ($_FILES as $file) {
    error_log("working with file: " . json_encode($file));

    // check the error status
    if ($file['error'] != 0) {
        _log('error '.$file['error'].' in file '.$_POST['resumableFilename']);
        continue;
    }

    // init the destination file (format <filename.ext>.part<#chunk>
    // the file is stored in a temporary directory
    if(isset($_POST['resumableIdentifier']) && trim($_POST['resumableIdentifier'])!=''){
        $temp_dir = $upload_dir . '/'  . $user_id . '/' . $_POST['resumableIdentifier'];
    }
    $dest_file = $temp_dir . '/' . $_POST['resumableFilename'] . '.part' . $_POST['resumableChunkNumber'];

    // create the temporary directory
    if (!is_dir($temp_dir)) {
        mkdir($temp_dir, 0777, true);
    }

    error_log("moving uploaded file: '" . $file['tmp_name'] . " to '$dest_file'");

    // move the temporary file
    if (!move_uploaded_file($file['tmp_name'], $dest_file)) {
        _log('Error saving (move_uploaded_file) chunk '.$_POST['resumableChunkNumber'].' for file '.$_POST['resumableFilename']);
    } else {
        // check if all the parts present, and create the final destination file
        createFileFromChunks($user_id, $temp_dir, $_POST['resumableIdentifier'], $_POST['resumableFilename'],$_POST['resumableChunkSize'], $_POST['resumableTotalSize'],$_POST['resumableTotalChunks']);
    }
}
