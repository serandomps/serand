var page = require('page');
var qs = require('querystring');
var Layout = require('./layout');

require('./utils');

var listeners = {};

var configs = {};

var serand = module.exports;

page(function (ctx, next) {
    ctx.query = qs.parse(ctx.querystring);
    next();
});

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
    var args = Array.prototype.slice.call(arguments, 2);
    o.on.forEach(function (fn) {
        fn.apply(fn, args);
    });
    o.once.forEach(function (fn) {
        fn.apply(fn, args);
    });
    o.once = [];
};

module.exports.page = function () {
    var args = Array.prototype.slice.call(arguments);
    page.apply(page, args);
};

module.exports.redirect = function (path, state) {
    setTimeout(function () {
        page(path, state);
    }, 0);
};

module.exports.reload = function () {
    console.log(window.location);
};

module.exports.boot = function (base) {
    var dep;
    var parts;
    var index;
    var name;
    var module;
    var dependencies = {};
    var comp = JSON.parse(require(base + '/component.json'));
    var deps = comp.dependencies;
    for (dep in deps) {
        if (deps.hasOwnProperty(dep)) {
            parts = dep.split('/');
            index = dep.indexOf('/');
            name = parts[1];
            module = dep.replace('/', '~') + '@' + deps[dep];
            dependencies[name] = module;
            if (parts[0] !== 'serandomps') {
                continue;
            }
            require(module);
        }
    }
    console.log(dependencies);
    return {
        base: base,
        dependencies: dependencies
    };
};

module.exports.layout = function (app) {
    return function (layout) {
        return new Layout(app.base, app.dependencies, layout);
    };
};

module.exports.current = function (path) {
    var ctx = new page.Context(window.location.pathname + window.location.search);
    if (!path) {
        return ctx;
    }
    var route = new page.Route(path);
    if (!route.match(ctx.path, ctx.params)) {
        return null;
    }
    ctx.query = qs.parse(ctx.querystring);
    return ctx;
};

module.exports.configs = configs;

module.exports.once('serand', 'ready', function () {
    page();
});

$(function () {
    $(document).on('click', '.suck', function (e) {
        e.preventDefault();
    });
});

$(window).on('storage', function (e) {
    e = e.originalEvent;
    var key = e.key;
    module.exports.emit('stored', key, module.exports.store(key));
});

module.exports.cache = function (key, val) {
    if (val) {
        sessionStorage.setItem(key, JSON.stringify(val));
        return val;
    }
    if (val === null) {
        return sessionStorage.removeItem(key);
    }
    val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
};

module.exports.store = function (key, val) {
    if (val) {
        localStorage.setItem(key, JSON.stringify(val));
        return val;
    }
    var o = localStorage.getItem(key);
    if (val === null) {
        localStorage.removeItem(key);
    }
    return o ? JSON.parse(o) : null;
};

module.exports.none = function () {

};
