var page = require('page');
var qs = require('querystring');
var Layout = require('./layout');

var listeners = [];

var layout;

var configs = {
    'cdn-images': 'http://d11gtukpy8w5r2.cloudfront.net/'
};

var event = function (channel, event) {
    channel = listeners[channel] || (listeners[channel] = {});
    return channel[event] || (channel[event] = {on: [], once: []});
};

/**
 * Registers an event listner for the specified channel
 * @param ch channel name
 * @param e event name
 * @param fn event callback
 */
module.exports.on = function (ch, e, fn) {
    event(ch, e).on.push(fn);
};

module.exports.once = function (ch, e, fn) {
    event(ch, e).once.push(fn);
};

module.exports.off = function (ch, e, fn) {
    var arr = event(ch, e);
    var idx = arr.on.indexOf(fn);
    if (idx !== -1) {
        arr.on.splice(idx, 1);
    }
    idx = arr.once.indexOf(fn);
    if (idx !== -1) {
        arr.once.splice(idx, 1);
    }
};

/**
 * Emits the specified event on the specified channel
 * @param ch channel name
 * @param e event name
 * @param data event data
 */
module.exports.emit = function (ch, e, data) {
    var o = event(ch, e);
    o.on.forEach(function (fn) {
        fn(data);
    });
    o.once.forEach(function (fn) {
        fn(data);
    });
    o.once = [];
};

module.exports.page = function (path, fn) {
    page(path, (fn ? function (ctx) {
        exports.emit('boot', 'page', ctx);
        fn(ctx);
    } : null));
};

module.exports.redirect = function (path) {
    setTimeout(function () {
        page(path);
    }, 0);
};

module.exports.reload = function () {
    console.log(window.location);
};

module.exports.layout = function (requir) {
    return function (layout) {
        var ly = new Layout(requir, layout);
        exports.emit('boot', 'layout', ly);
        return ly;
    };
};

module.exports.init = function (requir) {
    var comps = JSON.parse(requir('./component.json'));
    if (comps.serand) {
        comps.serand.forEach(function (comp) {
            requir(comp);
        });
    }
    /*var dep;
     var deps = comps.dependencies;
     for (dep in deps) {
     if (deps.hasOwnProperty(dep)) {
     console.log(dep);
     requir(dep);
     }
     }*/
};

module.exports.current = function (path) {
    var ctx = new page.Context(window.location.pathname + window.location.search);
    var route = new page.Route(path);
    if (!route.match(ctx.path, ctx.params)) {
        return null;
    }
    ctx.query = qs.parse(ctx.querystring);
    return ctx;
};

module.exports.configs = configs;