

var saml2 = require('saml2-js');
// var Saml2js = require('saml2js');
var fs = require('fs');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var express = require('express');
var cfenv = require('cfenv');


var saml2fj = require('saml2fj');

// create a new express server
var path = require('path');
var app = express();
var http = require('http');
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));
app.use('/scripts', express.static(path.join(__dirname, '/views/scripts')));

var url = 'https://ibm-notable.mybluemix.net';

// Create service provider 
var sp_options = {
  entity_id: url + "/metadata.xml",
  private_key: fs.readFileSync("cert/key.pem").toString(),
  certificate: fs.readFileSync("cert/cert.pem").toString(),
  assert_endpoint: url + "/auth"
};
var sp = new saml2.ServiceProvider(sp_options);

var idp_options = {
  sso_login_url: "https://w3id.alpha.sso.ibm.com/auth/sps/samlidp/saml20/logininitial?RequestBinding=HTTPPost&PartnerId=https://ibm-notable.mybluemix.net/metadata.xml&NameIdFormat=email&Target=https://ibm-notable.mybluemix.net/auth ",
  certificates: fs.readFileSync("cert/w3id.sso.ibm.com").toString()
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------ 

// Endpoint to retrieve metadata 
app.get("/metadata.xml", function (req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function (req, res) {

  sp.create_login_request_url(idp, {}, function (err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    console.log(login_url);
    res.redirect(login_url);
  });
  // res.render('auth.html', { user: { fullName: 'Eduardo Petecof', email: "epetecof@br.ibm.com", blueGroups: [{ name: "IBM Notable Admin" }] } });
});


// Assert endpoint for when login completes
app.post("/assert", function (req, res) {
  
  var options = { request_body: req };
  var response = req.body.SAMLResponse || req.body.SAMLRequest;
  
   saml2FJ.toFiltredJSON(repsonse,function(data){
        if(response.error != true){
          res.render('auth.html', { user: response });
        }else{
          res.send('An error occured! '+response.description);
        }
    });
  
});

// app.post('/assert',function(req,res){
//   res.send('caiu no lugar errado! :( ');
// })


app.get('/', function (req, res) {
  res.render('index.html');
})


app.get('/Home', function (req, res) {
  res.render('home.html');
});


var db, cloudant;
var dbCredentials = {
  dbName: "ibm_notable_dev"
}

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
  db.get('Users', {
    revs_info: true
  }, function (err, doc) {
    if (err) {
      console.log("Users document doesn't exist. creating a new one..");
      db.insert({
        "users": []
      }, 'Users', function (err, doc) {
        if (err) {
          console.log('An error ocurred while creating UsersSkills document..');
        } else {
          console.log('Users document created successfully!');
        }
      });

    } else {
      console.log('Users document already exists!');
    }
  });
}

initDBConnection();


app.post('/addUser', function (req, res) {
  var user = req.body;
  console.log('/Add user method invoked../')
  console.log(JSON.stringify(user));
  res.setHeader('Context-Type', 'application/json');
  db.get('Users', {
    revs_info: true
  }, function (err, doc) {
    if (err) {
      res.status(500).json({ error: true, statusCode: 500, description: "Internal server error " });
    } else {
      if (user != null) {
        var users = doc.users;
        var exists = false;
        var position = -1;
        for (u in users) {
          if (users[u]._email.localeCompare(user._email) == 0) {
            exists = true;
            position = u;
            break;
          }
        }

        if (!exists) {
          user._name = user._name.split(' ').map(function (subname) {
            return subname.substring(0, 1).toUpperCase() + subname.substring(1).toLowerCase();
          }).join(' ');
          if(user['_editable'] != null ) delete user['_editable'];
          users.push(user);
        } else {

          var existedUser = users[position];
          user._skills = user._skills.filter(function (skill) {
            for (var s in existedUser._skills) {
              if (existedUser._skills[s]._tag == skill._tag) {
                return false;
              }
            }
            return true;
          });

          if (user._skills.length > 0) {
            user._skills.forEach(function (skill) {
              existedUser._skills.push(skill);
            });
          }
          users[position] = existedUser;

        }
        users = users.sort(function (user1, user2) { return user1._name.split(' ')[0] > user2._name.split(' ')[0] }); // Sort by firstname  sort this on adding new user or editing      
        doc.users = users;
        db.insert(doc, doc.id, function (err, doc) {
          if (err) {
            res.status(500).json({ error: true, message: "Internal server error ", statusCode: 500 });
          } else {
            res.status(200).json({ error: false, message: (!exists) ? "User added successfully" : "Skills added successfully to the user", statusCode: 200 });
          }
        });
      } else {
        res.status(400).json({ error: true, statusCode: 400, description: "Cannot add a null user " });
      }
    }
  });
});


app.post('/editUser', function (req, res) {
  var user = req.body;
  res.setHeader('Content-Type', 'application/json');
  console.log('/edit user method invoked../');
  console.log('Received data: '+JSON.stringify(user));
  db.get('Users', {
    revs_info: true
  }, function (err, doc) {
    if (err) {
      res.status(500).json({ error: true, description: "Internal server error ", statusCode: 500 });
    } else {
      var users = doc.users;
      var exists = false;
      var position = - 1;
      for (var u in users) {
        if (users[u]._email == user._email) {
          exists = true;
          position = u;
          var U_Skills = user._skills.filter(function (skill) {
            for (var s in users[u]._skills) {
              if (users[u]._skills[s]._tag == skill._tag) {
                return false;
              }
            }
            return true;
          });
          user._skills = users[u]._skills;
          U_Skills.forEach(function (skill) { user._skills.push(skill) });
          break;
        }

      }
      if (exists && position != -1) {
        doc.users[position] = user;
        db.insert(doc, doc.id, function (err, doc) {
          if (err) {
            res.status(500).json({ error: true, description: "Internal server error ", statusCode: 500 });
          } else {
            res.status(200).json({ error: false, description: "User updated", statusCode: 200 });
          }
        })
      } else {
        res.status(404).json({ error: true, description: "User not found ", statusCode: 404 });
      }
    }
  });
});


app.post('/getUsers', function (req, res) {
  var response = {
    isRegistered: false,
    isAdmin: false
  };
  var user = req.body;
  console.log(JSON.stringify(user));
  res.setHeader('Context-Type', 'application/json');
  db.get('Users', {
    revs_info: true
  }, function (err, doc) {
    if (err) {
      res.status(500).json({ error: true, message: "Internal server error ", statusCode: 500 });
    } else {
      var users = doc.users;
      // users = users.sort(function (user1, user2) { return user1._name.split(' ')[0] > user2._name.split(' ')[0] }); // Sort by firstname  sort this on adding new user or editing 
      var logged_user;
      for (var u in users) {
        // users[u]._skills = users[u]._skills.sort(function (skill1, skill2) { return skill1._thumbs._total < skill2._thumbs._total }); // Sort it on thumbs up.
        users[u]['editable'] = true;
        if (users[u]._email != user.email && user.permissions.indexOf('admin') == -1) {
          users[u]['editable'] = false;
        } else if (users[u]._email == user.email) {
          response.isRegistered = true;
          user['_id'] = users[u]._id;
          if (user.permissions.indexOf('viewer') != -1) {
            users[u]['editable'] = true;
          }
          if (user.permissions.indexOf('admin') != -1) {
            response.isAdmin = true;
          }
          var user_found = users.splice(u, 1);
          users.unshift(user_found[0]);
        } else {
          //
        }
      }
      response['users'] = users;
      response['logged_user'] = user;
      console.log(JSON.stringify(response));
      res.status(200).json(response);
    }
  });
});


// app.get('/searchSkills',function(req,res){
//   var text = req.query.text;
//   res.setHeader('Content-Type', 'application/json');
//   db.get('Users',{
//     revs_info: true
//   },function(err,doc){
//     if(err){
//       res.status(500).json({error:true,description: "Internal server error", statusCode: 500});
//     }else{
//       var 
//       var users = doc.users;
//     }
//   })
// });


app.post('/thumbUp', function (req, res) {
  console.log('/thumbUp method invoked../')
  var data = req.body;
  res.setHeader('Content-Type', 'application/json');
  if (data.user_id == null || data.user_id == '' || data.skill_id == null || data.skill_id == '' || data.user == null || data.user == '') {
    console.log('Bad request error')
    res.status(400).json({ error: true, description: "Bad request" });
  } else {
    db.get('Users', {
      revs_info: true
    }, function (err, doc) {
      if (err) {
        console.log('Error on getting document');
        res.status(500).json({ error: true, description: "Internal server error", statusCode: 500 });
      } else {
        var exists = false;
        var thumbs = 0;
        var thumbed = false;
        var users = doc.users;
        var user = data.user;
        for (var u in users) {
          if (users[u]._id == data.user_id) {
            console.log('User found');
            for (var s in users[u]._skills) {
              if (users[u]._skills[s]._id == data.skill_id) {
                console.log('skill found')
                var logon = user.email.split('@')[0];
                exists = true;
                if (JSON.stringify(users[u]._skills[s]._thumbs._users).indexOf(logon) == -1) {
                  users[u]._skills[s]._thumbs._total += 1;
                  users[u]._skills[s]._thumbs._users.push(user.email.split('@')[0]);
                  thumbs = users[u]._skills[s]._thumbs;
                  users[u]._skills = users[u]._skills.sort(function (skill1, skill2) { return skill1._thumbs._total < skill2._thumbs._total }); // Sort it on thumbs up.
                  
                } else {
                  thumbs = users[u]._skills[s]._thumbs;
                  thumbed = true;
                }
                break;
              }
            }
            break;
          }
        }
        if (exists && thumbs != 0 && thumbed == false) {
          doc.users = users;
          db.insert(doc, doc.id, function (err, doc) {
            if (err) {
              console.log('Internal server error');
              res.status(500).json({ error: true, description: "Internal server error", statusCode: 500 });
            } else {
              res.status(200).json({ thumbs: thumbs, error: false });
            }
          });
        } else if (thumbed) {
          // console.log('Skill not found');
          res.status(200).json({ error: true, description: "Already thumbed" , thumbs: thumbs });
        } else {
          console.log('Skill not found');
          res.status(404).json({ error: true, description: "Skill not found" });
        }
      }
    });
  }
});


app.post('/deleteSkill', function (req, res) {
  console.log('remove skill method invoked');
  res.setHeader('Content-Type', 'application/json');
  var data = req.body;
  if (data.user_id == null || data.user_id == '' || data.skill_id == null || data.skill_id == '') {
    res.status(400).json({ error: true, description: "Bad request", statusCode: 400 });
  } else {
    db.get('Users', {
      revs_info: true
    }, function (err, doc) {
      if (err) {
        res.status(400).json({ error: true, description: "Internal server error", statusCode: 500 });
      } else {
        var users = doc.users;
        var exists = false;
        for (var u in users) {
          if (users[u]._id == data.user_id) {
            for (var s in users[u]._skills) {
              if (users[u]._skills[s]._id == data.skill_id) {
                exists = true;
                users[u]._skills.splice(s, 1);
                break;
              }
            }
            break;
          }
        }
        if (!exists) {
          res.status(404).json({ error: true, description: "Skill not found", statusCode: 404 });
        } else {
          doc.users = users;
          db.insert(doc, doc.id, function (err, doc) {
            if (err) {
              res.status(500).json({ error: true, description: "Internal server error", statusCode: 500 });
            } else {
              res.status(200).json({ error: false, description: "Removed successfully", statusCode: 200 });
            }
          });
        }

      }
    });
  }

})


app.get('/getUser', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var user_id = req.query.id;
  db.get('Users', {
    revs_info: true
  }, function (err, doc) {
    if (err) {
      res.status(500).json({ error: true, description: "Internal server error", statusCode: 500 });
    } else {
      var users = doc.users;
      var user = null;
      var exists = false;
      for (var u in users) {
        if (users[u]._id == user_id) {
          exists = true;
          user = users[u];
          break;
        }
      }
      if (exists && user != null) {
        res.status(200).json({ error: false, description: "User found", statusCode: 200, user: user });
      } else {
        res.status(404).json({ error: false, description: "User not found", statusCode: 404 });
      }
    }
  })
});



function sortSkills(skills) {
  var max;
  for (var i = 0; i < skills.length - 1; i++) {
    max = i;
    for (var j = i + 1; j < skills.length; j++) {
      if (skills[j]._thumbs > skills[max]._thumbs) {
        max = j;
      }
    }
    if (max != i) {
      var aux = skills[max];
      skills[max] = skills[i];
      skills[i] = aux;
    }
  }
  return skills;
}

// start server on the specified port and binding host
http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
  // print a message when the server starts listening
  console.log("server starting on " + app.get('port'));
});
