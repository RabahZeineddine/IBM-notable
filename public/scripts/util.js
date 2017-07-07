//utilities
function createXHR() {
    if (typeof XMLHttpRequest != 'undefined') {
        return new XMLHttpRequest();
    } else {
        try {
            return new ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
            try {
                return new ActiveXObject('Microsoft.XMLHTTP');
            } catch (e) { }
        }
    }
    return null;
}
function xhrGet(url, callback, errback) {
    var xhr = new createXHR();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                errback(JSON.parse(xhr.responseText));
            }
        }
    };

    xhr.timeout = 100000;
    xhr.ontimeout = errback;
    xhr.send();
}


function xhrPost(url, data, callback, errback) {
    var xhr = new createXHR();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                errback(JSON.parse(xhr.responseText));
            }
        }
    };
    xhr.timeout = 100000;
    xhr.ontimeout = errback;
    xhr.send(JSON.stringify(data));
}


function USER_OBJECT(name, email, skills, id,editable) {
    return {
        "_id": id || generateUUID(),
        "_name": name || null,
        "_email": email || null,
        "_skills": skills || [],
        "_editable": editable || false,
        "getId": function () {
            return this._id;
        },
        "getName": function () {
            return this._name;
        },
        "setName": function (name) {
            this._name = name;
        },
        "getEmail": function () {
            return this._email;
        },
        "setEmail": function (email) {
            this._email = email;
        },
        "getSkills": function () {
            return this._skills;
        },
        "setSkills": function (skills) {
            this._skills = skills;
        },
        "addSkill": function (skill) {
            this._skills.push(skill);
        },
        "isEditable": function(){
            return this._editable;
        }
    };
}


function SKILL(tag, thumbs, id) {
    return {
        "_id": id || generateUUID(),
        "_tag": tag || null,
        "_thumbs": thumbs || {"_total":0, "_users": []},
        "getId": function () {
            return this._id;
        },
        "getTag": function () {
            return this._tag;
        },
        "setTag": function (tag) {
            this._tag = tag;
        },
        "getThumbs": function () {
            return this._thumbs;
        },
        "setThumbs": function (thumbs) {
            this._thumbs = thumbs;
        },
        "addThumb": function (user) {
            this._thumbs._total = this._thumbs._total + 1;
            this._thumbs._users.push(user);
        },
        "getThumbsTotal": function(){
            return this._thumbs._total;
        },
        "getThumbsUsers":function(){
            return this._thumbs._users;
        }
    };
}










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





function setSession(name, value) {
	if (typeof(Storage) !== "undefined") {
		// Code for localStorage/sessionStorage.
		sessionStorage.setItem(name, value);
	}
	else {
		// Sorry! No Web Storage support.. use cookie instead..
		setCookie(name, value);

	}
}


function setCookie(cname, cvalue) {
	var d = new Date();
	d.setTime(d.getTime() + (1 * 24 * 60 * 60 * 1000));
	var expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


function getSession(name) {
	if (typeof(Storage) !== "undefined") {
		// Code for localStorage/sessionStorage.
		return sessionStorage.getItem(name);
	}
	else {
		// Sorry! No Web Storage support.. use cookie instead..
		return getCookie(name);
	}
}



function sessionCheck(name) {
	
	if (typeof(Storage) !== "undefined") {
		if(sessionStorage.getItem(name)){
			return true;
		}
		return false;
		// return sessionStorage.user != null && sessionStorage.user != '' && sessionStorage.user !== "undefined";
	}
	else {
		//No storage , use cookie..
		return checkCookie(name);
	}
}



function getCookie(cname) {
	name = name + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";

}

function checkCookie(cname) {
	var username = getCookie(cname);

	if (username != "" && username != null) {
		return true;
	}
	else {
		return false;
	}
}

function deleteSession(name) {
	if (typeof(Storage) !== "undefined") {
		sessionStorage.removeItem(name);
	}
	else {
		deleteCookie(name);
	}
}

function deleteCookie(cname) {
	document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

