var cluster = require('cluster');
var config = require("./config.js");
if (cluster.isMaster) {
    //fork dis shit
    var cpuCount = require('os').cpus().length;
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
    cluster.on('exit', function (worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    // Worker Code
    var express = require('express');
    var fs = require("fs");
    var http = require('http');
    var mysql = require("mysql");
    var app = express();

    //Init SQL


    //Some functions
    var download = function (url, dest, cb) {
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
    };
    var sqlConnection = mysql.createConnection({
        host: config.mysql_host,
        user: config.mysql_user,
        database: config.mysql_database,
        password: config.mysql_password
    });
    function deleteFile(file) {
        if (sqlConnection.state != "disconnected") {
            sqlConnection.query("DELETE FROM ?? WHERE filename = ?", [config.mysql_table, file])
        }

    }


    sqlConnection.connect(function (err) {
        if (!err) {
            app.get("*", function (req, res) {
                if (req.path !== "/") {
                    //Check if SQL is Down
                    if (sqlConnection.state != "disconnected") {
                        sqlConnection.query("SELECT id, activecdn, mime, orgfilename, filename FROM ?? WHERE filename = ?", [config.mysql_table, req.path.substr(1)], function (err, results, fields) {
                            if (!err) {
                                if (results[0] !== undefined) {
                                    if (results[0].activecdn.indexOf(config.webservClusterDomainName) !== -1) {
                                        res.writeHead(200, { 'Content-Type': results[0].mime });

                                        //Check if file is on local file
                                        fs.access(config.webservDataDir + "/" + results[0].filename, fs.F_OK, function (err) {
                                            if (!err) {
                                                console.log("Sending local file...");
                                                res.end(fs.readFileSync(config.webservDataDir + "/" + results[0].filename), 'binary');
                                            } else {
                                                console.log("The File isnt on the local disk. A verry bad sign")
                                                deleteFile(results[0].filename)
                                                res.end(404)
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
                                                sqlConnection.query("UPDATE " + config.mysql_table + " SET activecdn = CONCAT(activecdn, '," +
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
                        console.log("SQL Offline")
                        res.end("INTERNAL ERROR")
                    }


                } else {
                    res.writeHead(404, { 'Location': "404.jpeg" });
                    res.end();
                }
            });
        }else{
            console.log(err)
        }
    })
    //Magic beginns here


    // Bind to a port
    app.listen(config.webServerPort);
    console.log('Worker %d running!', cluster.worker.id);

}
