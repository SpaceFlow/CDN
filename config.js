module.exports = {
    webServerPort: 3000,
    uploadServerPort: 3005,
    tmpPath: "tmp/",
    uploadDir: "files/",
    webservDataDir: "files", // no trailing slash
    rngStringLength: 10,
    rngStringChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", //Think huge guys, BASE64, 1152921504606846976 possibilities
    homeDir: __dirname,
    webservClusterDomainName: "mun-ger",
    filterMime: false,
    acceptMimes: [
        "image/png",
        "image/jpeg",
        "image/bmp",
        "image/gif",
        "image/tiff",
        "image/x-icon"
    ],
    mysql_database: "sf",
    mysql_table: "cdn",
    mysql_host: "localhost",
    mysql_user: "root",
    mysql_password: ""
};