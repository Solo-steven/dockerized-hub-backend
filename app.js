var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var expressValidator = require("express-validator");
var session = require("express-session");
var basicAuth = require('basic-auth');
var db = require("./model/db");
var cache = require("./helper/cache");
var redis = cache.redis;
var userCacheKey = cache.userCacheKey;
var flash = require("express-flash");
var compression = require("compression");
var cookieParser = require("cookie-parser");
var helmet = require("helmet");
var config = require("./config");
const cors = require("cors");

app.use(cors({
    credentials: true,
    origin: config.cors
}));
app.use(helmet());
app.use(flash());
app.use(expressValidator());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser("secretString"));
app.use(session({
    cookie: {
        maxAge: 1000 * 60 * 60 * 12 * 2 * 30 // 一個月時間
    },
    secret: "secret",
    saveUninitialized: true,
    resave: true
}));

app.use(function (req, res, next) {
    if (req.cookies.isLogin) {
        redis.get(userCacheKey(req.cookies.id), function (err, result) {
            if (false) {
                req.user = JSON.parse(result);
                next();
            } else {
                db.FindbyColumn("user",  ['id', 'name', 'department', 'email', 'grade', 'fb_id'], {
                    'check_key': req.cookies.id
                }, function (user) {
                    user = user[0];
                    redis.set(userCacheKey(req.cookies.id), JSON.stringify(user));
                    req.user = user;
                    next();
                });
            }
        });
    } else {
        next();
    }
});

//Route
app.use("/course", require("./routes/course")); // get "/"時交給routes course
app.use("/post", require("./routes/post")); // get "/post"時交給routes post處理
app.use("/user", require("./routes/user")); // get "/user"時交給routes user處理
app.use("/schedule", require("./routes/schedule")); // get "/schedule"時交給routes schedule
app.use("/course_rate", require("./routes/course_rate")); // get "/course_rate"時交給routes course_rate
app.use("/bot", require("./routes/bot").router);

app.use("/admin", function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Input User&Password');
        return res.sendStatus(401);
    }
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }
    if (user.name === config.basicAuth.username && user.pass === config.basicAuth.pw) {
        return next();
    } else {
        return unauthorized(res);
    }
}, require("./routes/admin"));


setInterval(() => require("./script"), 1000 * 60 * 10); // 更新心得數
app.listen(process.env.PORT || 3000); //監聽3000port
console.log(`running on port ${process.env.PORT || 3000}`);