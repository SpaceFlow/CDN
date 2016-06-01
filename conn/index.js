var config = require('../config')
var sql = require('../sql')
var file = require('../file')
var fs = require('fs')
var mime = require("mime");
var md5File = require("md5-file");

exports.deleteFile = function (file) {
    sql.safeSQL(function (err) {
        if (!err) {
            sql.sqlConnection.query("DELETE FROM ?? WHERE filename = ?", [config.mysql_table, file])
        }

    })
}

exports.download = function (url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb);  // close() is async, call cb after close completes.
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
}

exports.moveFile = function (file, target) {

}

exports.upload = function (req, res) {
    if (req.files.fileUpload == undefined) {
        res.write(JSON.stringify({
            "err": "NO_FILE_PROVIDED"
        }));
        res.end();
        return undefined;
    }
    //console.log(req); - pls dont kill console
    if (!req.files) {
        res.write(JSON.stringify({
            "err": "NO_FILE_PROVIDED"
        }));
        res.end();
        return undefined;
    }
    //console.log(req.files);
    if (config.filterMime) {
        if (config.filterMime.indexOf(req.files.fileUpload.mimetype) == -1) {
            res.write(JSON.stringify({
                "err": "INVALID_FORMAT"
            }));
            res.end();
            return undefined;
        }
    }
    // generate new filename
    file.randomString(function (randomStr) {
        var newFilename = randomStr + "." + mime.extension(req.files.fileUpload.mimetype);
        // limit upload filename to 255 chars
        if (req.files.fileUpload.name.length >= 255) { //That will NEVER happen, since the max file name length is 255 for Linux/ext4 and Windows/NTFS
            req.files.fileUpload.name.length = req.files.fileUpload.name.length.substr(0, 255);
        }
        // move file from cache to local Webserver file location

        req.files.fileUpload.mv(config.uploadDir + newFilename, function (err) {
            if (err) {
                console.log("Err: " + err);
            } else {
                file.checkMD5(md5File.sync(config.uploadDir + newFilename), function (state, File) {
                    if (state) {
                        res.end(JSON.stringify({
                            "cdnFilename": File[0].filename,
                            "mimetype": File[0].mime,
                            "activeCDN": File[0].activecdn
                        }));
                    } else {

                        sql.safeSQL(function (err) {
                            if (!err) {
                                sql.sqlConnection.query("INSERT INTO ?? (filename, orgfilename, activecdn, hashmd5, mime) VALUES (?, ?, ?, ?, ?)", [config.mysql_table, newFilename, req.files.fileUpload.name, config.webservClusterDomainName, md5File.sync(config.uploadDir + newFilename), req.files.fileUpload.mimetype],
                                    function (err, rows, fields) {
                                        if (!err) {
                                            //Wait for SQL Results, before sending Awnser back!

                                            res.end(JSON.stringify({
                                                "cdnFilename": newFilename,
                                                "mimetype": req.files.fileUpload.mimetype,
                                                "activeCDN": config.webservClusterDomainName
                                            }));
                                        } else {
                                            res.end(JSON.stringify({
                                                "err": "INTERNAL_ERROR"
                                            }));
                                        }
                                    })
                            }

                        })

                    }
                })


            }

        })
    })
}

exports.loadFile = function (req, res) {
    sql.safeSQL(function (err) {
        if (!err) {
            if (req.params.id) {
                sql.sqlConnection.query("SELECT id, activecdn, mime, orgfilename, filename FROM ?? WHERE filename = ?", [config.mysql_table, req.params.id], function (err, results, fields) {
                    if (!err) {
                        if (results[0] !== undefined) {
                            if (results[0].activecdn.indexOf(config.webservClusterDomainName) !== -1) {


                                //Check if file is on local file
                                fs.access(config.webservDataDir + "/" + results[0].filename, fs.F_OK, function (err) {
                                    if (!err) {
                                        res.writeHead(200, { 'Content-Type': results[0].mime });
                                        console.log("Sending local file...");
                                        res.end(fs.readFileSync(config.webservDataDir + "/" + results[0].filename), 'binary');
                                    } else {
                                        console.log("The File isnt on the local disk. A verry bad sign")
                                        deleteFile(results[0].filename)
                                        res.writeHead(404)
                                        res.write("INTERNAL_ERROR")
                                        res.end()
                                    }

                                });


                            } else {
                                console.log("Downloading remote file...");
                                var downloadCDN = "";
                                if (results[0].activecdn.indexOf(",") !== -1) {
                                    downloadCDN = results[0].activecdn;
                                } else {
                                    downloadCDN = results[0].activecdn.split(",")[0];
                                }
                                download("http://" + downloadCDN + ".cdn.spaceflow.io" + req.path, config.webservDataDir +
                                    req.path, function (err) {
                                        sql.sqlConnection.query("UPDATE " + config.mysql_table + " SET activecdn = CONCAT(activecdn, '," +
                                            config.webservClusterDomainName + "') WHERE id=" + mysql.escape(results[0].id) + ";");
                                        res.download(config.webservDataDir + "/" + results[0].filename, results[0].orgfilename);
                                    })
                            }
                        } else {
                            res.writeHead(404, { 'Location': "404.jpeg" });
                            res.end();
                        }
                    } else {
                        res.writeHead(404);
                        res.write("INTERNAL ERROR")
                        res.end();
                    }
                });
            } else {
                res.writeHead(404, { 'Location': "404.jpeg" });
                res.end();
            }
        } else {
            console.log("SQL Offline")
            res.end("INTERNAL ERROR")
        }
    })


}
