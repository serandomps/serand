var async = require('async');
var dust = require('dust')();

var callbacks = [];

var Layout = function (requir, layout) {
    this.sel = null;
    this.stack = [];
    this.requir = requir;
    this.layout = layout;
};

Layout.prototype.render = function (fn) {
    var stack = this.stack;
    var requir = this.requir;
    dust.renderSource(requir('./' + this.layout), {}, function (err, html) {
        var tasks = [];
        var el = $(html);
        stack.forEach(function (o) {
            tasks.push(function (fn) {
                var comp = requir(o.comp);
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