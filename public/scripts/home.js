var USER = {};

function authenticateUser() {

    if (sessionCheck('IBM_NOTABLE_USER')) {
        USER = JSON.parse(getSession('IBM_NOTABLE_USER'));
        loadUsers();
    } else {
        alert('Usuário não autorizado');
        window.location.href = '/';
    }
}

authenticateUser();

function logout() {
    deleteSession('IBM_NOTABLE_USER');
}


var newSkills = [];

function newEvent(event) {
    if (event.which === 13 || event.keyCode === 13) {
        var skills_input = document.getElementById('skills_input');
        if (skills_input != null && skills_input.value != '') {
            var add_skill = document.getElementById('add_skill');
            var skills = skills_input.value.trim().split(' ').map(function (skill) { return skill.split('_').join(' ') });
            var skills_str = '';
            for (var skill of skills) {
                var skill_object = new SKILL(skill);
                if (JSON.stringify(newSkills).indexOf('"' + skill_object.getTag() + '"') == -1 || newSkills.length == 0) {
                    newSkills.push(skill_object);
                    var tooltip = (skill_object.getTag().length > 7) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill_object.getTag() + '"' : '"';
                    skills_str += '<div class="chip transparent full_width ' + tooltip + ' id="skill_' + skill_object.getId() + '" ><span class="chip_tag truncate">' + skill_object.getTag() + '</span><div class="icons-holder"><i class="material-icons md-18 remove_icon" onclick="removeNewSkill(\'' + skill_object.getId() + '\')">close</i></div></div>';
                }
            }
            add_skill.innerHTML += skills_str;
            skills_input.value = '';
            $('.tooltipped').tooltip({ delay: 50 });

        }
    }
}


function removeNewSkill(id) {
    var skill = document.getElementById('skill_' + id);
    if (skill != null) {
        newSkills = newSkills.filter(function (skill) {
            return skill.getId() != id;
        });
        skill.remove()
    };
}


function addUser() {
    var name_input = document.getElementById('name_input');
    if (name_input != null && name_input.value != '') {
        var email_input = document.getElementById('email_input');
        if (email_input != null && email_input.value != '') {
            if (newSkills.length > 0) {

                var user = new USER_OBJECT(name_input.value, email_input.value, newSkills);
                xhrPost('/addUser', user, function (response) {
                    $('#addModal').modal('close');
                    newSkills = [];
                    loadUsers();
                }, function (err) {
                    alert('Um erro ocorreu, por favor tente novamente!');
                });
            } else {
                alert('Favor cadaster pelo menos um skill');
            }
        } else {
            alert('Favor informe um email.');
        }
    } else {
        alert('Favor informe um nome.');
    }
}


function loadUsers() {
    showLoading('show_users', 'big');
    xhrPost('/getUsers', USER, function (response) {
        if (!response.error) {
            USER = response.logged_user;
            setSession('IBM_NOTABLE_USER', JSON.stringify(USER));
            document.getElementById('options').innerHTML = '';
            if (response.isAdmin == true) {
                document.getElementById('options').innerHTML = '<a class="btn waves-effect waves-light blue" href="#addModal">Adicionar</a'; // Add option for admin.
            } else if (response.isRegistered == false) {
                document.getElementById('name_input').value = USER.fullName;
                document.getElementById('email_input').value = USER.email;
                document.getElementById('options').innerHTML = '<a class="btn waves-effect waves-light blue" href="#addModal">Cadastre-se</a'; // Add option for admin.
            }
            var show_users = document.getElementById('show_users');

            var info_str = '<table class=" col m10 offset-m1 bordered highlight"><thead><tr><th>Nome</th><th>Email</th><th>Skills</th></tr></thead><tbody id="tbody">';
            var users = response.users;

            users = users.map(function (user) {
                return new USER_OBJECT(user._name, user._email, user._skills.map(function (skill) {
                    return new SKILL(skill._tag, skill._thumbs, skill._id)
                }), user._id, user.editable)
            });

            users.forEach(function (user) {
                info_str += '<tr><td class="name" id="name_' + user.getId() + '">' + user.getName() + '</td><td class="email">' + user.getEmail() + '</td><td class="chips-holder" id="skills_' + user.getId() + '">';
                user.getSkills().forEach(function (skill) {
                    var icons = '';
                    var usrToolTip = (skill.getThumbsUsers().length > 0) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill.getThumbsUsers().map(function (user) { return '@' + user }).join('<br>') + '"' : '"';
                    if (response.isAdmin == true && user.getId() != USER._id) {
                        icons = '<i class="material-icons md-18 thumb_up_icon" onclick="thumbUp(\'' + user.getId() + '\',\'' + skill.getId() + '\')">thumb_up</i><span class="badge-custom ' + usrToolTip + ' id="badge_' + skill.getId() + '">' + skill.getThumbsTotal() + '</span>' + '<a href="#deleteModal" onclick="removeSkill(\'' + user.getId() + '\',\'' + skill.getId() + '\')" id="remove_icon_a"><i class="material-icons md-18 remove_icon">close</i></a>';
                    } else
                        if (user.isEditable()) {
                            icons = '<span class="badge-custom ' + usrToolTip + ' id="badge_' + skill.getId() + '" >' + skill.getThumbsTotal() + '</span>' + '<a href="#deleteModal" onclick="removeSkill(\'' + user.getId() + '\',\'' + skill.getId() + '\')" id="remove_icon_a"><i class="material-icons md-18 remove_icon">close</i></a>';
                        } else {
                            icons = '<i class="material-icons md-18 thumb_up_icon" onclick="thumbUp(\'' + user.getId() + '\',\'' + skill.getId() + '\')">thumb_up</i><span class="badge-custom ' + usrToolTip + ' id="badge_' + skill.getId() + '">' + skill.getThumbsTotal() + '</span>';
                        }

                    var tooltip = (skill.getTag().length > 13) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill.getTag() + '"' : '"';
                    info_str += '<div class="chip transparent full_width" id="' + skill.getId() + '"  ><span class="chip_tag truncate ' + tooltip + ' id="tag_' + skill.getId() + '">' + skill.getTag() + '</span><div class="icons-holder">' + icons + '</div></div>';
                })
                info_str += (user.isEditable()) ? '</td><td><i class="material-icons right edit_icon" onclick="editModal(\'' + user.getId() + '\')">edit</i></td></tr>' : '</td><td></td></tr>';
            });
            info_str += '</tbody></table>';
            show_users.className = show_users.className.replace(/centralized/g, '');
            show_users.innerHTML = info_str;
            $('.tooltipped').tooltip({ delay: 50, html: true });
        }
        // fixChipWidth();
    }, function (err) {
        alert('Um erro ocorreu , tente novamente!');
    })


}

var localEditSkills = [];

function editModal(user_id) {
    xhrGet('/getUser?id=' + user_id, function (data) {
        if (!data.error) {
            var skills = data.user._skills.map(function (skill) { return new SKILL(skill._tag, skill._thumbs, skill._id) });
            var user = new USER_OBJECT(data.user._name, data.user._email, skills, data.user._id);

            localEditSkills = skills;  // save skills for add/remove 
            document.getElementById('name_input_edit').value = user.getName();
            document.getElementById('email_input_edit').value = user.getEmail();
            document.getElementById('email_input_edit').setAttribute('data-id', user.getId());
            var add_skill_edit = document.getElementById('add_skill_edit');
            var skills_str = '';
            for (var skill of skills) {
                var tooltip = (skill.getTag().length > 13) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill.getTag() + '"' : '"';
                skills_str += '<div class="chip transparent full_width " id="skill_' + skill.getId() + '" ><span class="chip_tag truncate ' + tooltip + '>' + skill.getTag() + '</span><div class="icons-holder"><i class="material-icons md-18 remove_icon" onclick="removeEditSkillDb(\'' + user.getId() + '\',\'' + skill.getId() + '\')">close</i></div></div>';
            }
            add_skill_edit.innerHTML = skills_str;
            $('.tooltipped').tooltip({ delay: 50 });
        } else {
            alert('Um erro ocorreu, tente novamente!');
        }
    }, function (err) {
        alert('Um erro ocorreu, tente novamente!')
    });
    $('#editModal').modal('open');
}



function newEditEvent(event) {
    if (event.which === 13 || event.keyCode === 13) {
        var skills_input_edit = document.getElementById('skills_input_edit');
        if (skills_input_edit != null && skills_input_edit.value != '') {
            var skills_input_edit = document.getElementById('skills_input_edit');
            var skills = skills_input_edit.value.trim().split(' ').map(function (skill) { return skill.split('_').join(' ') });
            var skills_str = '';
            for (var skill of skills) {
                var skill_object = new SKILL(skill);
                if (JSON.stringify(localEditSkills).indexOf('"' + skill_object.getTag() + '"') == -1 || localEditSkills.length == 0) {
                    localEditSkills.push(skill_object);
                    var tooltip = (skill_object.getTag().length > 13) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill_object.getTag() + '"' : '"';
                    skills_str += '<div class="chip transparent full_width " id="skill_' + skill_object.getId() + '" ><span class="chip_tag truncate ' + tooltip + '>' + skill_object.getTag() + '</span><div class="icons-holder"><i class="material-icons md-18 remove_icon" onclick="removeEditSkill(\'' + skill_object.getId() + '\')">close</i></div></div>';
                }
            }
            add_skill_edit.innerHTML += skills_str;
            skills_input_edit.value = '';
            $('.tooltipped').tooltip({ delay: 50 });

        }
    }
}
function removeEditSkill(id) {
    var skill = document.getElementById('skill_' + id);
    if (skill != null) {
        localEditSkills = localEditSkills.filter(function (skill) {
            return skill.getId() != id;
        });
        skill.remove()
    };
}


function removeEditSkillDb(user_id, skill_id) {

    var skill_span = document.getElementById('modal_remove_skill_edit');
    skill_span.innerHTML = document.getElementById('tag_' + skill_id).innerHTML;
    skill_span.setAttribute('data-id', skill_id);
    var name_span = document.getElementById('modal_remove_name_edit');
    name_span.innerHTML = document.getElementById('name_' + user_id).innerHTML;
    name_span.setAttribute('data-id', user_id);
    $('#deleteEditModal').modal('open');
}


function removeSkill(user_id, skill_id) {
    var skill_span = document.getElementById('modal_remove_skill');
    skill_span.innerHTML = document.getElementById('tag_' + skill_id).innerHTML;
    skill_span.setAttribute('data-id', skill_id);
    var name_span = document.getElementById('modal_remove_name');
    name_span.innerHTML = document.getElementById('name_' + user_id).innerHTML;
    name_span.setAttribute('data-id', user_id);
    $('#deleteModal').modal('open');
}


function deleteSkill() {
    var user_id = document.getElementById('modal_remove_name').getAttribute('data-id');
    var skill_id = document.getElementById('modal_remove_skill').getAttribute('data-id');
    showLoading('remove_btn', 'small');
    xhrPost('/deleteSkill', { user_id: user_id, skill_id: skill_id }, function (response) {
        if (!response.error) {
            document.getElementById(skill_id).remove();
            document.getElementById('remove_btn').innerHTML = 'Remover';
            $('#deleteModal').modal('close');
        }
    }, function (err) {
        alert('Um erro ocorreu , tente novamente! ');
    })
}
function deleteEditSkill() {
    var user_id = document.getElementById('modal_remove_name_edit').getAttribute('data-id');
    var skill_id = document.getElementById('modal_remove_skill_edit').getAttribute('data-id');
    showLoading('remove_btn_edit', 'small');
    xhrPost('/deleteSkill', { user_id: user_id, skill_id: skill_id }, function (response) {
        if (!response.error) {
            removeEditSkill(skill_id);
            document.getElementById('remove_btn_edit').innerHTML = 'Remover';
            $('#deleteEditModal').modal('close');
        }
    }, function (err) {
        alert('Um erro ocorreu , tente novamente! ');
    })
}




function thumbUp(user_id, skill_id) {
    var badge = document.getElementById('badge_' + skill_id);
    var current_thumbs = badge.innerHTML;
    showLoading('badge_' + skill_id, 'small');
    var user = JSON.parse(getSession('IBM_NOTABLE_USER'));
    var data = {
        user_id: user_id,
        skill_id: skill_id,
        user: user
    }

    xhrPost('/thumbUp', data, function (response) {
        if (!response.error) {
            stopLoading('badge_' + skill_id, response.thumbs, 'thumbs');
            orderSkills(user_id);
        } else {
            alert(response.description);
            stopLoading('badge_' + skill_id, response.thumbs, 'thumbs');


        }
    }, function (err) {
        alert('Um erro ocorreu, tente novamente!', JSON.stringify(err));
        stopLoading('badge_' + skill_id, current_thumbs);
    })
}


function orderSkills(user_id) {

    var div = document.getElementById('skills_' + user_id);
    var skills = div.children;
    var localSkills = [];
    for (var s in skills) {
        if (typeof skills[s] === 'object' && skills[s] != null) {
            var tag = skills[s].firstChild.innerHTML;
            var skill_id = skills[s].getAttribute('id');
            var badge = document.getElementById('badge_' + skill_id);
            var tooltip = badge.getAttribute('data-tooltip');

            var thumbs = {
                "_total": parseInt(badge.innerHTML),
                "_users": (tooltip != null) ? tooltip.replace(/@/g, '').trim().split('<br>') : []
            }
            // alert(JSON.stringify(thumbs));
            var skill = new SKILL(tag, thumbs, skill_id);
            localSkills.push(skill);
        }
    }
    localSkills = sortSkills(localSkills);
    var str = '';
    USER = JSON.parse(getSession('IBM_NOTABLE_USER'));
    // var editable = (USER._id == user_id )?true:false;
    var admin = (USER.permissions.indexOf('admin') != -1) ? true : false;
    $('.tooltipped').tooltip('remove');
    localSkills.forEach(function (skill) {
        var icons = '';
        var usrToolTip = (skill.getThumbsUsers().length > 0) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill.getThumbsUsers().map(function (user) { return '@' + user }).join('<br>') + '"' : '"';
        if (admin) {
            icons = '<i class="material-icons md-18 thumb_up_icon" onclick="thumbUp(\'' + user_id + '\',\'' + skill.getId() + '\')">thumb_up</i><span class="badge-custom ' + usrToolTip + ' id="badge_' + skill.getId() + '">' + skill.getThumbsTotal() + '</span>' + '<a href="#deleteModal" onclick="removeSkill(\'' + user_id + '\',\'' + skill.getId() + '\')" id="remove_icon_a"><i class="material-icons md-18 remove_icon">close</i></a>';
        } else
        // if (editable) {
        // icons = '<span class="badge-custom ' + usrToolTip + ' id="badge_' + skill.getId() + '" >' + skill.getThumbsTotal() + '</span>' + '<a href="#deleteModal" onclick="removeSkill(\'' + user_id  + '\',\'' + skill.getId() + '\')" id="remove_icon_a"><i class="material-icons md-18 remove_icon">close</i></a>';
        // } else {
        {
            icons = '<i class="material-icons md-18 thumb_up_icon" onclick="thumbUp(\'' + user_id + '\',\'' + skill.getId() + '\')">thumb_up</i><span class="badge-custom ' + usrToolTip + ' id="badge_' + skill.getId() + '">' + skill.getThumbsTotal() + '</span>';
        }

        var tooltip = (skill.getTag().length > 13) ? 'tooltipped" data-position="top" data-delay="50" data-tooltip="' + skill.getTag() + '"' : '"';
        str += '<div class="chip transparent full_width" id="' + skill.getId() + '"  ><span class="chip_tag truncate ' + tooltip + ' id="tag_' + skill.getId() + '">' + skill.getTag() + '</span><div class="icons-holder">' + icons + '</div></div>';

    })
    div.innerHTML = str;

    $('.tooltipped').tooltip({ delay: 50, html: true });
}

function editUser() {
    var name_input = document.getElementById('name_input_edit');
    if (name_input != null && name_input.value != '') {
        var email_input = document.getElementById('email_input_edit');
        if (email_input != null && email_input.value != '') {
            if (localEditSkills.length > 0) {

                var user = new USER_OBJECT(name_input.value, email_input.value, localEditSkills, email_input.getAttribute('data-id'));
                xhrPost('/editUser', user, function (response) {
                    $('#editModal').modal('close');
                    loadUsers();
                }, function (err) {

                    alert('Um erro ocorreu, por favor tente novamente!');
                });
            } else {
                alert('Favor cadaster pelo menos um skill');
            }
        } else {
            alert('Favor informe um email.');
        }
    } else {
        alert('Favor informe um nome.');
    }
}



function fixChipWidth() {
    var show_users = document.getElementById('show_users');
    var table_rows = show_users.firstChild.childNodes[1].childNodes;
    var max_width = 0;
    table_rows.forEach(function (tr) {
        tr.childNodes[2].childNodes.forEach(function (chip) {
            max_width = (max_width < chip.offsetWidth) ? chip.offsetWidth : max_width;
        })
    });
    var style = document.getElementsByTagName('style')[0];
    if (style == null) {
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = '.full_width { width: ' + max_width + 'px !important; }';

        document.getElementsByTagName('head')[0].appendChild(style);
    } else {
        style.innerHTML = '.full_width { width: ' + max_width + 'px !important; }';
    }

}



function sortSkills(skills) {
    return skills.sort(function (skill1, skill2) { return skill1._thumbs._total < skill2._thumbs._total }); // Sort it on thumbs up.

}

function showLoading(id, size) {
    var div = document.getElementById(id);
    div.innerHTML = '<div class="preloader-wrapper ' + size + ' active"><div class="spinner-layer spinner-blue">' +
        '<div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch">' +
        '<div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div>' +
        '</div></div>' +
        '<div class="spinner-layer spinner-red"><div class="circle-clipper left"><div class="circle"></div>' +
        '</div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right">' +
        '<div class="circle"></div></div></div>' +
        '<div class="spinner-layer spinner-yellow"><div class="circle-clipper left"><div class="circle"></div>' +
        '</div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right">' +
        '<div class="circle"></div></div></div>' +

        '<div class="spinner-layer spinner-green"><div class="circle-clipper left"><div class="circle"></div>' +
        '</div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right">' +
        '<div class="circle"></div></div></div></div>';
}
function stopLoading(id, value, action) {

    var div = document.getElementById(id);
    if (action == 'thumbs') {
        div.setAttribute('data-tooltip', value._users.map(function (user) { return '@' + user }).join('<br>'));
    }
    div.innerHTML = '' + (value != null) ? value._total : '';
}

function searchPressed(element){
    alert(element.value);
       var hidden_trs = document.getElementsByClassName('hide');
        for (var tr of hidden_trs) {
            tr.className = tr.className.replace(/hide/g, '');
        }
}

function search(element) {
    var text = element.value;
    if(text == '' || text.length == 0){
        document.getElementById('tbody').innerHTML = document.getElementById('tbody').innerHTML.replace(/hide/g,'');
    }
    if (text != null && text.length > 0) {
        var chips_holder = document.getElementsByClassName('chips-holder');
        var hidden_trs = document.getElementsByClassName('hide');
        for (var tr of hidden_trs) {
            tr.className = tr.className.replace(/hide/g, '');
        }
        for (var chip_holder of chips_holder) {
            var exists = false;
            for (var chip of chip_holder.childNodes) {
                var tag = chip.firstChild.innerHTML;
                if (tag.toLowerCase().indexOf(text.toLowerCase()) != -1) {
                    exists = true;
                }
            }
            if (exists == false) {
                chip_holder.parentNode.className += ' hide';
            }
        }

    } else {
      
    }
}


$(document).ready(function () {
    $('.modal').modal({
        complete: function () {
            //Reset Modal on close
            document.getElementById('name_input').value = '';
            document.getElementById('email_input').value = '';
            document.getElementById('skills_input').value = '';
            document.getElementById('add_skill').innerHTML = '';
        } // Callback for Modal close
    });
    $('.tooltipped').tooltip({ delay: 50 });


    var data = {
        "PaaS": null,
        "WATSON_API": null,
        "IOT": null,
        "Devops": null,
        "Docker": null,
        "Java": null,
        "Node.js": null,
        "NODE-RED": null,
        "Python": null,
        "DATA_REPOSITORIES_(Dashdb,Cloudant,Compose,BigInsights)": null,
        "DATA_SCIENCE_EXPERIENCE_(DSX,Machine_Learning)": null,
        "SPARK": null,
        "DATA_INTEGRATION_(Data_Connect,_Gov_Catalog,Lift)": null,
        "ANALYTICS_TOOLS_(Cognos,Watson_Anaytics)": null,
        "ECM_Cloud_&_BOX_(não_Bluemix)": null,
        "PLANNING_ANALYTICS_CLOUD_(não_Bluemix)": null,

    };

    $('#skills_input_edit.autocomplete').autocomplete({
        data: data,
        limit: 20, // The max amount of results that can be shown at once. Default: Infinity.
        onAutocomplete: function (val) {
            // Callback function when value is autcompleted.
        },
        minLength: 1, // The minimum length of the input for the autocomplete to start. Default: 1.
    });
    $('#search_input.autocomplete').autocomplete({
        data: data,
        limit: 20, // The max amount of results that can be shown at once. Default: Infinity.
        onAutocomplete: function (val) {
            // Callback function when value is autcompleted.
            search(document.getElementById('search_input'));
        },
        minLength: 1, // The minimum length of the input for the autocomplete to start. Default: 1.
    });
});


