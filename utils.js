var boundary = function () {
    var boundry = '---------------------------';
    boundry += Math.floor(Math.random() * 32768);
    boundry += Math.floor(Math.random() * 32768);
    boundry += Math.floor(Math.random() * 32768);
    return boundry;
};

var content = function (boundry, name, value) {
    var body = '';
    body += '--' + boundry + '\r\n' + 'Content-Disposition: form-data; name="';
    body += name;
    body += '"\r\n\r\n';
    body += value;
    return body;
};

var end = function (boundry, cont) {
    return cont + '\r\n' + '--' + boundry + '--';
};

var ajax = $.ajax;

$.ajax = function (options) {
    var headers;
    var data;
    var key;
    var boundry;
    var body = '';
    if (options.contentType === 'multipart/form-data') {
        headers = options.headers || (options.headers = {});
        if (!headers['Content-Type']) {
            data = options.data;
            boundry = boundary();
            for (key in data) {
                if (data.hasOwnProperty(key)) {
                    body += content(boundry, key, data[key]);
                }
            }
            body = end(boundry, body);
            options.data = body;
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundry;
            headers['Content-Length'] = body.length;
        }
    }
    return ajax.call($, options);
};