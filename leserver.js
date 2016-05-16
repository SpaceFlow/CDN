var cluster = require('cluster');
var config = require("./config.js");
if (cluster.isMaster) {
    //fork dis shit
    var cpuCount = require('os').cpus().length;
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    // Worker Code
    function randomInt (low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }
    function randomString(length) {
        var buildStr = "";
        for (i = 0; i < length; i++) {
            buildStr += config.rngStringChars[randomInt(0, config.rngStringChars.length - 1)];
        }
        return buildStr;
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

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Key');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
    });
    app.get("/upload", function(req, res) {
        res.end(JSON.stringify({
            "error": "no get service"
        }))
    });
    app.post('/upload', function (req, res) {
        res.header('Access-Control-Allow-Origin', 'http://sharepic.moe');
        if (req.files.fileUpload == undefined) {
            return undefined;
        }
        console.log(req);
        if (!req.files) {
            res.write(JSON.stringify({
                "err": "NO_FILE_PROVIDED"
            }));
            return undefined;
        }
        console.log(req.files);
        if (config.filterMime) {
            if (config.filterMime.indexOf(req.files.fileUpload.mimetype) == -1) {
                return undefined;
            }
        }
        // generate new filename
        var newFilename = randomString(20) + "." + mime.extension(req.files.fileUpload.mimetype);
        // limit upload filename to 265 chars
        if (req.files.fileUpload.name.length >= 256) {
            req.files.fileUpload.name.length = req.files.fileUpload.name.length.substr(0, 255);
        }
        // move file from cache to local Webserver file location
        req.files.fileUpload.mv(config.uploadDir + newFilename, function (err) {
            console.log("Err: " + err);
        });
        var sql = "INSERT INTO " + config.mysql_table + " (filename, orgfilename, activecdn, hashmd5, mime) VALUES (" +
            mysql.escape(newFilename) + ", " +
            mysql.escape(req.files.fileUpload.name) + ", " +
            mysql.escape(config.webservClusterDomainName) + ", " +
            mysql.escape(md5File(config.uploadDir + newFilename)) + ", " +
            mysql.escape(req.files.fileUpload.mimetype) + ");";
        console.log(sql);
        sqlconnection.query(sql);
        res.end(JSON.stringify({
            "cdnFilename": newFilename,
            "mimetype": req.files.fileUpload.mimetype,
            "activeCDN": config.webservClusterDomainName
        }));
    });

    // Bind to a port
    app.listen(config.uploadServerPort);
    console.log('Worker %d running!', cluster.worker.id);

}
