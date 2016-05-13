var cluster = require('cluster');
var config = require("config.js");
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
        for (i = 0; i == length; i++) {
            buildStr += config.rngStringChars[randomInt(0, config.rngStringChars.length - 1)];
        }
        return buildStr;
    }
    var express = require('express');
    var fileUpload = require('express-fileupload');
    var mysql = require("mysql");
    var sqlconnection = mysql.connect({
        host: config.mysql_host,
        user: config.mysql_user,
        database: config.mysql_database,
        password: config.mysql_password
    });
    var app = express();
    app.use(fileUpload());
    app.post('/upload', function (req, res) {
        console.log(req);
        if (!req.files) {
            res.write("No File Upload");
            return undefined;
        }
        console.log(req.files);
        if (config.filterMime) {
            if (config.filterMime.indexOf(req.files.uploadFile.mimetype) == -1) {
                return undefined;
            }
        }
        req.files.uploadFile.mv(config.filePath + req.files.uploadFile.name);
        sqlconnection.query("INSERT INTO " + mysql.escape(config.mysql_table) + " (filename, onlinepath, localpath, mime) VALUES (" +
            mysql.escape(req.files.uploadFile.name) + ", " +
                mysql.escape()
        )
    });

    // Bind to a port
    app.listen(3000);
    console.log('Worker %d running!', cluster.worker.id);

}