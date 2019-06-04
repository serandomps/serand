var page = require('page');
var qs = require('querystring');
var utils = require('utils');
var Layout = require('./layout');
var themes = require('themes');
var store = require('store');

require('./utils');

var listeners = {};

var configs = {};

var caches = {
    page: {}
};

var states = {};

var event = function (channel, event) {
    channel = listeners[channel] || (listeners[channel] = {});
    return channel[event] || (channel[event] = {on: [], once: []});
};

/**
 * Registers an event listner for the specified channel
 * @param ch channel name
 * @param e event name
 * @param done event callback
 */
module.exports.on = function (ch, e, done) {
    event(ch, e).on.push(done);
};

module.exports.once = function (ch, e, done) {
    event(ch, e).once.push(done);
};

module.exports.off = function (ch, e, done) {
    var arr = event(ch, e);
    var idx = arr.on.indexOf(done);
    if (idx !== -1) {
        arr.on.splice(idx, 1);
    }
    idx = arr.once.indexOf(done);
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
    o.on.forEach(function (done) {
        done.apply(done, args);
    });
    o.once.forEach(function (done) {
        done.apply(done, args);
    });
    o.once = [];
};

var ready = false;
var pending = [];

module.exports.on('user', 'ready', function (tk) {
    console.log('user ready', tk)
    sera.token = tk;
    sera.user = tk && tk.user;
    ready = true;
    if (!pending.length) {
        return;
    }
    pending.forEach(function (fn) {
        fn();
    });
});

module.exports.on('user', 'logged in', function (tk) {
    console.log('user logged in', tk)
    sera.token = tk;
    sera.user = tk.user;
});

module.exports.on('user', 'logged out', function () {
    console.log('user logged out')
    delete sera.token;
    delete sera.user;
});

page(function (ctx, next) {
    caches.page = {
        ctx: ctx
    };
    next();
});

page(function (ctx, next) {
    ctx.query = qs.parse(ctx.querystring);
    next();
});

page(function (ctx, next) {
    if (sera.token) {
        ctx.token = sera.token;
        ctx.user = sera.token.user;
        return next();
    }
    if (ready) {
        return next();
    }
    pending.push(function () {
        if (!sera.token) {
            return next();
        }
        ctx.token = sera.token;
        ctx.user = sera.token.user;
        next();
    });
});

page(function (ctx, next) {
    var id = ctx.query.from;
    if (!id) {
        return next();
    }
    var from = store.cache(id, null);
    if (!from) {
        return next();
    }
    ctx.from = from;
    next();
});

module.exports.page = function () {
    var args = Array.prototype.slice.call(arguments);
    page.apply(page, args);
};

module.exports.redirect = function (path, query, state, from) {
    setTimeout(function () {
        var ctx = caches.page.ctx;
        var to = ctx.query.from;
        query = query || {};
        if (to) {
            window.location.href = utils.query(to, query);
            return;
        }
        var id;
        var url;
        if (from) {
            id = utils.id();
            store.cache(id, from);
            url = utils.url();
            url = utils.query(url, {to: id});
            query.from = url;
        }
        path = utils.resolve(utils.query(path, query));
        if (!/(http(s?)):\/\//gi.test(path)) {
            return page(path, state);
        }
        var current = utils.url();
        var index = current.indexOf('://') + 3;
        var origin = current.substring(0, current.substring(index).indexOf('/') + index);
        if (path.indexOf(origin) === 0) {
            return page(path, state);
        }
        window.location.href = path;
    }, 0);
};

module.exports.reload = function () {
    window.location.reload(true)
};

var App = function (dependencies, options) {
    this.options = options;
    this.self = options.self;
    this.from = options.from;
    this.dependencies = dependencies;
    this.serand = module.exports;
};

module.exports.app = function (options) {
    var dep;
    var parts;
    var index;
    var name;
    var module;
    var dependencies = {};
    var comp = JSON.parse(require(options.self + '/component.json'));
    var deps = comp.dependencies;
    for (dep in deps) {
        if (deps.hasOwnProperty(dep)) {
            parts = dep.split('/');
            index = dep.indexOf('/');
            name = parts[1];
            module = dep.replace('/', '~') + '@' + deps[dep];
            dependencies[name] = module;
            if (parts[0] !== options.from) {
                continue;
            }
            require(module);
        }
    }
    return new App(dependencies, options);
};

module.exports.layout = function (app) {
    return function (layout) {
        return new Layout(app, layout);
    };
};

module.exports.blocks = function (block, action, elem, o, done) {
    themes.blocks(block, action, elem, o, done);
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

exports.cached = function (type, id, run, done) {
    utils.sync(type + '-' + id, function (did) {
        var cache = caches[type] || (caches[type] = {});
        var args = cache[id];
        if (args) {
            return did.apply(null, args);
        }
        run(function () {
            var args = Array.prototype.slice.call(arguments);
            cache[id] = args;
            did.apply(null, args);
        });
    }, done);
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
