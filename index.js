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
        setTimeout(function () {
            cluster.fork();
        }, 300)

    });
} else {
    //API SERVER CODE
    var express = require('express');
    var fileUpload = require('express-fileupload');
    var conn = require('./conn')

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
        conn.upload(req, res)


    })
    app.get("/file/:id", function (req, res) {
        conn.loadFile(req, res)
    })
    // Bind to a port
    app.listen(config.webServerPort);
    console.log('Worker %d running!', cluster.worker.id);



}