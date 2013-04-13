// configure this section for your env
var md_prefix = __dirname + '/md/',
    view_prefix = __dirname + '/views/',
    html_prefix = __dirname + '/html/',
    log_prefix = __dirname + '/log/',
    static_resource_prefix = __dirname + '/resource/',
    errdocs_prefix = __dirname + '/resouce/errdocs/'
    file404 = errdocs_prefix + '404.html',
    file500 = errdocs_prefix + '500.html',
    logfile = log_prefix + 'default.log',
    encoding = 'UTF-8',
    port = '3000',
    sitetitle = 'default_page';

// Load Modules
var express = require('express'),
    md = require('node-markdown').Markdown,
    fs = require('fs'),
    Log = require('log'),
    logstream = fs.createWriteStream(logfile),
    logger = new Log(Log.INFO, logstream),
    app = express();

app.configure(function () {
    app.set('views', view_prefix);
    app.set('view engine', 'ejs');
    app.use(express.static(static_resource_prefix));
});

function getDirsInfo(path) {
    var ls = fs.readdirSync(path),
        filetypes = [];
    for (var i = 0; i < ls.length; i ++) {
        filetypes.push([ls[i], fs.statSync(path + '/' + ls[i]).isFile()]);
    }
    console.log(filetypes);
    return filetypes;
}

app.get('/md/', function (req, res) {
    // show file lists
    res.render('list', {list: getDirsInfo(md_prefix), title: sitetitle, tree: ""});
});

app.get('/md/:filename', function (req, res) {
    var path = md_prefix + req.params.filename,
        html_path = html_prefix + req.params.filename + '.html';

    if (!fs.existsSync(path)) {
        logger.info("404 Not Found: " + path);
        res.status(404).sendfile(file404);
        return;
    }
    if (fs.statSync(__dirname + '/md/' + req.params.filename).isDirectory()) {
        console.log("directory");
        fs.readdir(path, function (err, data) {
            var dirs = req.params.filename.split("/").splice(0,1);
            res.render('list', {list: getDirsInfo(path), title: sitetitle, tree: req.params.filename + '/'});
        });
    }
    fs.exists(html_path, function (exists) {
        if (exists && fs.statSync(html_path).mtime < fs.statSync(path).mtime) {
            logger.info("file is older.recompile.");
        }
        else if (exists) {
            fs.readFile(html_path, {encoding: encoding}, function (err, data) {
                if (err) {
                    logger.error("Could not read file: " + html_path);
                    res.send("error");
                    return;
                }
                res.render('mdviewer', {title:req.params.filename, data: data.toString('base64')});
            });
            return;
        }
        fs.readFile(path, {encoding: encoding}, function (err, data) {
            if (err) {
                logger.info("500 Internal Server Error");
                logger.error("find the " + path + ". but could not read.");
                res.status(500).sendfile(file500);
                return;
            }
            var html = md(data);
            res.send(html);
            fs.writeFile(html_path, html, function (err) {
                if (err) {
                    logger.warning("could not write cache to " + html_path);
                }
            });
        });
    });
});

app.get('/download/:filename', function (req, res) {
    var path = md_prefix + req.params.filename;
    fs.exists(path, function (exists) {
        if (!exists) {
            res.status(404).sendfile(file404);
            return;
        }
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-disposition': 'attachment; filename="' + req.params.filename + '"',
            'Content-Length': fs.statSync(path).size
        });
        res.sendfile(path);
    });
});

app.get('/create', function (req, res) {
});

app.put('/create/:filename', function (req, res) {
});

app.listen(port);
