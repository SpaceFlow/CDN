var sql = require('../sql')
var config = require('../config')

exports.checkMD5 = function (md5, callback) {
    sql.safeSQL(function (err) {
        if (!err) {
            sql.sqlConnection.query("SELECT * FROM ?? WHERE hashmd5 = ?", [config.mysql_table, md5], function (err, result, rows) {
                if (result.length == 1) {
                    callback(true, result)
                } else {
                    callback(false)
                }
            })
        }
    })

}
function randomInt(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    }

exports.randomString = function (callback) {
    var buildStr = "";
    for (i = 0; i < config.rngStringLength; i++) { //Due to the fact, that we already have a config var, lets use it
        buildStr += config.rngStringChars[randomInt(0, config.rngStringChars.length - 1)];
    }
    sql.safeSQL(function (err) {
        if (!err) {
            sql.sqlConnection.query("SELECT * FROM ?? WHERE filename = ?", [config.mysql_table, buildStr], function (err, results, fields) { //Although it is more likely, to win the lottery jackpot TWO times in a ROW, but hey: We must bear that in mind ^^
                if (!err) {
                    if (!(results.length > 0)) {
                        callback(buildStr)
                    } else {
                        console.log("Lotto?!")
                        randomString(callback)
                    }
                } else {
                    console.log(err)
                }
            })


        }
    })


}