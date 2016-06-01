var mysql = require('mysql')
var config = require('../config')

var sqlConnection = mysql.createConnection({
        host: config.mysql_host,
        user: config.mysql_user,
        database: config.mysql_database,
        password: config.mysql_password
    });
    
    exports.sqlConnection = sqlConnection;
    
    exports.safeSQL = function(callback){
        if(sqlConnection.state != "disconnected"){
            callback()
        }else{
            sqlConnection.connect(function(err){
                if(!err){
                    callback()
                }else{
                    callback(true)
                }
            })
        }
    }
    
    sqlConnection.on('error', function(){
        console.log("SQL DISCONNECT OR OTHER ERROR")
    })