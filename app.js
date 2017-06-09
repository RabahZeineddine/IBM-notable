/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    fs = require('fs');

var app = express();

var db;

var cloudant;



var dbCredentials = {
    dbName: 'ibm_notable'
};

var bodyParser = require('body-parser');
// var methodOverride = require('method-override');
// var logger = require('morgan');
// var errorHandler = require('errorhandler');
// var multipart = require('connect-multiparty')
// var multipartMiddleware = multipart();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
// app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
// app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));
app.use('/scripts', express.static(path.join(__dirname, '/views/scripts')));



function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else { //When running locally, the VCAP_SERVICES will not be set


        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function (err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);


    //Check if registered notes document exists!
    db.get('UsersSkills', {
        revs_info: true
    }, function (err, doc) {
        if (err) {
            console.log("UsersSkills document doesn't exist. creating a new one..");
            db.insert({
                "users": []
            }, 'UsersSkills', function (err, doc) {
                if (err) {
                    console.log('An error ocurred while creating UsersSkills document..');
                } else {
                    console.log('UsersSkills document created successfully!');
                }
            });

        } else {
            console.log('UsersSkills document already exists!');
        }
    });
}

initDBConnection();

app.get('/', routes.index);


app.post('/addUser', function (req, res) {
    console.log('addUser method invoked..');
    res.setHeader('Content-Type', 'application/json');

    var newUser = req.body || null;

    if (newUser != null) {
        db.get('UsersSkills', {
            revs_info: true
        }, function (err, doc) {
            if (err) {
                res.status(500).json({ error: true, message: "Internal server error ", statusCode: 500 });
            } else {
                var users = doc.users;
                var exists = false;
                var position = 0;
                var id = 0;
                for (var user in users) {
                    if (users[user].name.toLowerCase().localeCompare(newUser.name.toLowerCase()) == 0) {
                        exists = true;
                        position = user;
                        break;
                    }
                }
                if (!exists) {
                    newUser.skills = newUser.skills.filter(function (skill) { skill._id = generateUUID(); return skill });
                    newUser.name = newUser.name.substring(0,1).toUpperCase() +  newUser.name.substring(1).toLowerCase();
                    users.push(newUser);
                } else {
                    var existedUser = users[position];
                    newUser.skills = newUser.skills.filter(function (skill) {
                        for (var s in existedUser.skills) {
                            if (existedUser.skills[s]._tag == skill._tag) {
                                return false;
                            }
                        }
                        return true;
                    });
                    newUser.skills = newUser.skills.map(function (skill) { skill._id = generateUUID(); return skill });
                    if (newUser.skills.length > 0) {
                        newUser.skills.forEach(function (skill) {
                            existedUser.skills.push(skill);
                        });
                    }
                    users[position] = existedUser;
                }
                doc.users = users;
                db.insert(doc, doc.id, function (err, doc) {
                    if (err) {
                        res.status(500).json({ error: true, message: "Internal server error ", statusCode: 500 });
                    } else {
                        res.status(200).json({ error: false, message: (!exists)?"User added successfully":"Skills added successfully to the user", statusCode: 200 });
                    }
                });

            }
        });


    } else {
        res.status(400).json({ error: true, message: "Can't insert null user", statusCode: 400 });
    }

    
});


app.get('/users',function(req,res){
    res.setHeader('Content-Type', 'application/json');
    db.get('UsersSkills',{
        revs_info: true
    },function(err,doc){
        if(err){
            res.status(500).json({ error: true, message: "Internal server error", statusCode: 500 });
        }else{
            var users = doc.users;
            res.status(200).json(users);
        }
    });
});



app.post('/thumbUp',function(req,res){
    console.log('thumbup mehtod invoked..');
    res.setHeader('Content-Type','application/json');

    var user = req.body;
    

    db.get('UsersSkills',{
        revs_info: true
    },function(err,doc){
        if(err){
            res.status(500).json({ error: true, message: "Internal server error", statusCode: 500 });
        }else{
            var users = doc.users;
            var exists = false;
            var position = 0;
            for(var u in users){
                if(users[u].name.localeCompare(user.name)==0){
                    exists = true;
                    position = u;
                    break;
                }
            }
            if(exists){
                exists = false
                for(var s in users[position].skills){
                    if(users[position].skills[s]._id.localeCompare(user.skill._id)==0){
                        exists = true;
                        users[position].skills[s]._thumbs = user.skill._thumbs;
                        break;
                    }
                }
                if(exists){
                    doc.users = users;
                    db.insert(doc,doc.id,function(err,doc){
                        if(err){
                            res.status(500).json({ error: true, message: "Internal server error", statusCode: 500 });
                        }else{
                            res.status(200).json({ error: false, message: "thumb up counted successfully", statusCode: 200 });
                        }
                    })
                }
            }else{
                res.status(404).json({ error: true, message: "User not found", statusCode: 404 });
            }
        }
    })
});


app.post('/deleteSkill',function(req,res){
    console.log('Delete skill method invoked..');
    var  user = req.body;
res.setHeader('Content-Type','application/json');
    db.get('UsersSkills',{
        revs_info:true
    },function(err,doc){
            if(err){
                res.status(500).json({ error: true, message: "Internal server error", statusCode: 500 });
            }else{
                var users = doc.users;
                var exists = false;
                for(var u in users){
                    if(users[u].name.localeCompare(user.name)==0){

                        for(var s in users[u].skills){
                            if(users[u].skills[s]._id.localeCompare(user.skill._id)==0){
                                exists = true;
                                
                                if(users[u].skills.length>1){
                                    users[u].skills.splice(s,1)
                                }else{
                                    users[u].skills = [];
                                }
                                 
                                 if(users[u].skills.length==0) users.splice(u,1);
                                
                                break;
                            }
                        }
                    }
                }
                if(exists){
                    doc.users = users;
                    db.insert(doc,doc.id,function(err,doc){
                        if(err){
                            res.status(500).json({ error: true, message: "Internal server error", statusCode: 500 });
                        }else{
                            res.status(200).json({ error: false, message: "Deleted successffully", statusCode: 200 });
                        }
                    })
                }
            }
    })


});

// app.post('')


function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}


http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});
