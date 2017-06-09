function chipObject(tag, id, thumbs) {
    return {
        "_tag": tag || null,
        "_id": id || null,
        "_thumbs": thumbs || 0,
        "setTag": function (tag) {
            this._tag = tag;
        },
        "setId": function (id) {
            this._id = id;
        },
        "addThumb": function (thumb) {
            // alert(this.getThumbs());
            this._thumbs = 1 + thumb
        },
        "getTag": function () {
            return this._tag;
        },
        "getId": function () {
            return this._id;
        },
        "getThumbs": function () {
            return this._thumbs;
        }
    }
}




function stringTreatment(str) {
    return str.replace(/<(?:.|\n)*?>/gm, '').trim();
}


var newSkills = [];

function newEvent(event) {

    if (event.which === 13 || event.keyCode === 13) {
        var skillsLength = newSkills.length;
        var input = document.getElementById('skills');
        var skill = new chipObject();
        skill.setTag(stringTreatment(input.value));
        if (JSON.stringify(newSkills).indexOf(JSON.stringify(skill)) == -1 || skillsLength == 0) {
            newSkills.push(skill);
        }
        if (input != null && input.value != '' && skillsLength + 1 == newSkills.length) {
            var div = document.getElementById('addTags');
            var chip = '<div  class="chip transparent"><span>' + skill._tag + '</span><i class="material-icons close-btn md-18" onclick="deleteLocalSkill(this);">close</i></div>';
            div.innerHTML += chip;
            input.value = '';

        } else {
            //Error for adding the same chip
        }
    }

}

function deleteLocalSkill(child) {
    var chip = new chipObject();
    var chipElement = child.parentElement;
    chip.setTag(chipElement.firstChild.innerHTML);
    var skillsLength = newSkills.length;
    var pos = 0;
    for(var s in newSkills){
        if(newSkills[s]._tag.localeCompare(chip._tag)==0){
           
            pos = s;
        }
    }
    
    newSkills.splice(pos,1);

    var div = document.getElementById('addTags');
    var chips = '';
    newSkills.forEach(function(skill){
        chips += '<div  class="chip transparent"><span>' + skill._tag + '</span><i class="material-icons close-btn md-18" onclick="deleteLocalSkill(this);">close</i></div>';
    });
    div.innerHTML = chips;
}


function addUser() {
    var name_input = document.getElementById('name_input');
    var name = stringTreatment(name_input.value);
    if (name != null && name != '') {
        if (newSkills.length > 0) {
            var user = {
                name: name,
                skills: newSkills
            }

            
            xhrPost('/addUser', user, function (response) {
                document.getElementById('addTags').innerHTML = '';
                newSkills = [];
                name_input.value = '';
                document.getElementById('skills').value = '';
                loadUsers();
            }, function (err) {
                alert('error');
            });
        } else {
            alert('adicione skills por favor!');
        }
    } else {
        alert('Informe o nome por favor!');
    }
}




function deleteSkill(child) {

    var chip = new chipObject();
    var chipElement = child.parentElement;
    chip.setId(chipElement.getAttribute('id'));
    var tr = chipElement.parentElement.parentElement.parentElement;
    var userName = tr.firstChild.firstChild.innerHTML;

    var user = {
        name: userName,
        skill: chip
    }

    var close_icon = document.getElementById('close_'+chip.getId());
    showLoading('close_'+chip.getId(),'small');
    xhrPost('/deleteSkill', user, function (response) {
        if (!response.error) {
            alert('Skill removed successfully!');
            // chipElement.remove();
            loadUsers();
        }
    }, function (err) {
        alert('An error occurred');
    })
}

function thumbUp(child) {

    var chip = new chipObject();

    var chipElement = child.parentElement;
    chip.setId(chipElement.getAttribute('id'));

    chip.setTag(document.getElementById('chip_' + chip.getId()).innerHTML);
    chip.addThumb(parseInt(chipElement.getAttribute('data-thumbs')));
    


    var bagde = document.getElementById('custom-badge_' + chip.getId());
    bagde.className = '';

    showLoading('custom-badge_' + chip.getId(),'small');

    var tr = chipElement.parentElement.parentElement.parentElement;
    var userName = tr.firstChild.firstChild.innerHTML;

    var user = {
        name: userName,
        skill: chip
    }


    xhrPost('/thumbUp', user, function (response) {
        stopLoading('custom-badge_' + chip.getId());
        if (!response.error) {
            bagde.className = "badge-custom";
            bagde.innerHTML = chip.getThumbs();
            chipElement.setAttribute('data-thumbs', chip.getThumbs());
        } else {
            bagde.innerHTML =   chipElement.getAttribute('data-thumbs');
            alert('An error ocurred!');
        }
    }, function (err) {
        bagde.innerHTML =   chipElement.getAttribute('data-thumbs');
        alert('An error occured');
    });




}




function loadUsers() {

    showLoading('showUsers','big');
    xhrGet('/users', function (response) {
        var users = response;
        users = users.map(function (user) {
            user.skills.map(function (skill) {
                return new chipObject(skill._tag, skill._id, skill._thumbs);
            });
            return user;
        });
        showUsers(users);
    }, function (err) {
        alert('error');
    })
}

loadUsers();

function showUsers(users) {
    var div = document.getElementById('showUsers');
    if (users.length > 0) {
        var str = '<table><thead><tr><th>Membros</th><th>Skills<span id="helper">(você pode clicar no <i class="material-icons md-18 " style="color:#c6c6c6; margin: 0 5px; ">thumb_up</i> pra confirmar os skills de seus colegas)</span></th></tr></thead><tbody>';
        for (var user in users) {
            str += '<tr><td><div>' + users[user].name + '</div></td>' +
                '<td><div class="fixed-skills" id="skills_' + users[user].name + '">';
            for (var skill in users[user].skills) {
                str += '<div  class="chip transparent "  id="' + users[user].skills[skill]._id + '" data-thumbs="' + users[user].skills[skill]._thumbs + '" ><span id="chip_' + users[user].skills[skill]._id + '">' + users[user].skills[skill]._tag + '</span><i class=" material-icons md-18 thumb_up " onclick="thumbUp(this)">thumb_up</i><span class="badge-custom" id="custom-badge_' + users[user].skills[skill]._id + '">' + users[user].skills[skill]._thumbs + '</span><i class="material-icons close-btn md-18" id="close_'+users[user].skills[skill]._id+'" onclick="deleteSkill(this)" >close</i></div>';
            }
            str += '</div></td>' + 
                '</tr>';
        }
        str += '</tbody></table>';
        div.innerHTML = str;
        
    } else {
        div.innerHTML = "Não há nenhum membro cadastrado!";
    }
}









function showLoading(id,size){
    var div =document.getElementById(id);

    div.innerHTML = '<div class="preloader-wrapper '+size+' active"><div class="spinner-layer spinner-blue">'+
        '<div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch">'+
        '<div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div>'+
        '</div></div>'+
      '<div class="spinner-layer spinner-red"><div class="circle-clipper left"><div class="circle"></div>'+
    '</div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right">'+
    '<div class="circle"></div></div></div>'+
      '<div class="spinner-layer spinner-yellow"><div class="circle-clipper left"><div class="circle"></div>'+
    '</div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right">'+
    '<div class="circle"></div></div></div>'+

      '<div class="spinner-layer spinner-green"><div class="circle-clipper left"><div class="circle"></div>'+
    '</div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right">'+
    '<div class="circle"></div></div></div></div>';
}
function stopLoading(id){
    var div = document.getElementById(id);
    div.innerHTML = '';
}

$(document).ready(function () {
    $(".button-collapse").sideNav();
    $('.chips').material_chip();
    $('.tooltipped').tooltip({ delay: 50 });



});



