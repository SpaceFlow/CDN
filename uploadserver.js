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
    function randomInt(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }
    function randomString() {
        var buildStr = "";
        for (i = 0; i < config.rngStringLength; i++) { //Due to the fact, that we already have a config var, lets use it
            buildStr += config.rngStringChars[randomInt(0, config.rngStringChars.length - 1)];
        }
        sqlConnection.query("SELECT id FROM ? WHERE filename LIKE ?", [config.mysql_table, buildStr], function (err, results, fields) { //Although it is more likely, to win the lottery jackpot TWO times in a ROW, but hey: We must bear that in mind ^^
            if (!err) {
                if (results.length != 1) {
                    return buildStr;
                } else {
                    return randomString()
                }
            }
        })

    }
    var express = require('express');
    var fileUpload = require('express-fileupload');
    var mime = require("mime");
    var mysql = require("mysql");
    var md5File = require("md5-file");
    var sqlconnection = mysql.createConnection({
        host: config.mysql_host,
        user: config.mysql_user,
        database: config.mysql_database,
        password: config.mysql_password
    });
    var app = express();
    app.use(fileUpload());
    app.use(function (req, res, next) {

        // Website you wish to allow to connect
        res.setHeader('Access-Control-Allow-Origin', 'http://sharepic.moe');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Key, Cache-Control');
        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        // Pass to next layer of middleware
        next();
    });
    app.get("/upload", function (req, res) {
        res.end(JSON.stringify({
            "error": "no get service"
        }))
    });
    app.post('/upload', function (req, res) {

        if (req.files.fileUpload == undefined) {
            res.write(JSON.stringify({
                "err": "NO_FILE_PROVIDED"
            }));
            res.end();
            return undefined;
        }
        console.log(req);
        if (!req.files) {
            res.write(JSON.stringify({
                "err": "NO_FILE_PROVIDED"
            }));
            res.end();
            return undefined;
        }
        console.log(req.files);
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
        var newFilename = randomString() + "." + mime.extension(req.files.fileUpload.mimetype);
        // limit upload filename to 255 chars
        if (req.files.fileUpload.name.length >= 255) { //That will NEVER happen, since the max file name length is 255 for Linux/ext4 and Windows/NTFS
            req.files.fileUpload.name.length = req.files.fileUpload.name.length.substr(0, 255);
        }
        // move file from cache to local Webserver file location
        req.files.fileUpload.mv(config.uploadDir + newFilename, function (err) {
            if(err){
                 console.log("Err: " + err);
            }
           
        });
        sqlConnection.query("INSERT INTO ? (filename, orgfilename, activecdn, hashmd5, mime) VALUES (?, ?, ?, ?, ?)", [config.mysql_table, newFilename, req.files.fileUpload.name, config.webservClusterDomainName, md5File(config.uploadDir + newFilename), req.files.fileUpload.mimetype],
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

    });

    // Bind to a port
    app.listen(config.uploadServerPort);
    console.log('Worker %d running!', cluster.worker.id);

}
