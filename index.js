var page = require('page');
var qs = require('querystring');
var utils = require('utils');
var Layout = require('./layout');
var themes = require('themes');
var store = require('store');

require('./utils');

require('./most-visible');

var configs = {};

var caches = {
    page: {}
};

var ready = false;
var pending = [];

utils.on('user', 'ready', function (tk) {
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

utils.on('user', 'logged in', function (tk) {
    console.log('user logged in', tk)
    sera.token = tk;
    sera.user = tk.user;
});

utils.on('user', 'logged out', function () {
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

page(function (ctx, next) {
    var state = ctx.state;
    var delay = state._ && state._.delay;
    utils.loading(delay);
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

module.exports.reload = function (force) {
    if (force) {
        return window.location.reload(true);
    }
    var self = utils.url();
    module.exports.redirect(self);
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

module.exports.path = function () {
    var location = window.location;
    return location.pathname + location.search + (location.hash || '');
};

module.exports.configs = configs;

utils.once('serand', 'ready', function () {
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
    utils.emit('stored', key, module.exports.store(key));
});

$(window).on('scroll', function () {
    var el = $(window);
    var winHeight = el.height();
    var winWidth = el.width();
    var scrollTop = el.scrollTop();
    var docHeight = $(document).height();
    var isBottom = (scrollTop + winHeight === docHeight);
    utils.emit('serand', 'scrolled', {
        docHeight: docHeight,
        winHeight: winHeight,
        winWidth: winWidth,
        scrollTop: scrollTop,
        at: Date.now()
    });
    if (isBottom) {
        utils.emit('serand', 'scrolled down');
    }
    if (scrollTop === 0) {
        utils.emit('serand', 'scrolled up');
    }
});

utils.on('serand', 'scroll top', function () {
    $(window).scrollTop(0);
});

utils.on('serand', 'scroll bottom', function () {
    $(window).scrollTop($(document).height() - $(window).height() - 1);
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

module.exports.pack = function (o, container, suffix) {
    if (!container) {
        return o;
    }
    o = utils.clone(o);
    var _ = o._ || (o._ = {});
    _.container = suffix ? (container.id + '-' + suffix) : container.id;
    _.sandbox = container.sandbox;
    _.parent = container.parent;
    return o;
};
