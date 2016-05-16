module.exports = {
    webServerPort: 3000,
    uploadServerPort: 3005,
    tmpPath: "tmp/",
    uploadDir: "files/",
    webservDataDir: "files", // no trailing slash
    rngStringLength: 5,
    rngStringChars: "abcdefghijklmnopqrstuvwxyz1234567890",
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