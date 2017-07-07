
var USER = JSON.parse(document.getElementById('user').value);
USER.permissions = '';
function checkBlueGroup() {

    xhrPost('/auth',USER,function(response){
        
    })
    var authenticated = false;
    for (var group of USER.blueGroups) {
        if (group.name === "IBM Notable Admin") {
            (USER.permissions == '') ? USER.permissions = 'admin' : USER.permissions += ',admin';
            authenticated = true;
        }
        if (group.name === "IBM Notable") {
            (USER.permissions == '') ? USER.permissions = 'viewer' : USER.permissions += ',viewer';
            authenticated = true;
        }
    }
    if (authenticated) {
        console.log('Authenticated');
        setSession('IBM_NOTABLE_USER', JSON.stringify(USER));
        window.location.href = '/home';
    } else {
        deleteSession('IBM_NOTABLE_USER');
        alert('Usuario não autorizado!')
        window.location.href = '/';
    }
}


checkBlueGroup();
