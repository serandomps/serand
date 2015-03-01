var async = require('async');
var dust = require('dust')();

var callbacks = [];

var Layout = function (base, dependencies, layout) {
    this.sel = null;
    this.stack = [];
    this.base = base;
    this.dependencies = dependencies;
    this.layout = layout;
};

Layout.prototype.render = function (fn) {
    var layout = this;
    var stack = layout.stack;
    dust.renderSource(require(layout.base + '/' + layout.layout + '.html'), {}, function (err, html) {
        var tasks = [];
        var el = $(html);
        stack.forEach(function (o) {
            tasks.push(function (fn) {
                var comp = require(layout.dependencies[o.comp]);
                var area = $(o.sel, el);
                comp($('<div class="sandbox"></div>').appendTo(area), fn, o.opts);
            });
        });
        async.parallel(tasks, function (err, results) {
            callbacks.forEach(function (callback) {
                callback();
            });
            callbacks = results;
            $('#content').html(el);
            if (fn) {
                fn(err, results);
            }
        });
    });
    return this;
};

Layout.prototype.area = function (sel) {
    this.sel = sel;
    return this;
};

Layout.prototype.add = function (comp, opts) {
    this.stack.push({
        sel: this.sel,
        comp: comp,
        opts: opts
    });
    return this;
};

module.exports = Layout;