function chip() {
    return {
        "_tag": null,
        "_id": null,
        "_thumbs": 0,
        "setTag": function (tag) {
            this._tag = tag;
        },
        "setId": function (id) {
            this._id = id;
        },
        "addThumb": function () {
            this._thumbs += 1;
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