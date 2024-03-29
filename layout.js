var dust = require('dust')();
var themes = require('themes');
var watcher = require('watcher');

var cleaners = [];

var Layout = function (app, layout) {
    this.sel = null;
    this.stack = [];
    this.app = app
    this.layout = layout;
};

Layout.prototype.render = function (ctx, next) {
    var layout = this;
    var app = layout.app;
    var stack = layout.stack;
    var done = function (err) {
        if (err) {
            return next(err);
        }
        watcher.emit('page', 'ready');
    };
    dust.renderSource(require(app.self + '/layouts/' + layout.layout + '.html'), {}, function (err, html) {
        if (err) {
            return done(err);
        }
        var tasks = [];
        var el = $(html);
        var counter = 0;
        stack.forEach(function (o) {
            tasks.push(function (done) {
                var err;
                var comp = require(app.dependencies[o.comp] || app.self);
                var area = $(o.sel, el);
                var block = o.block ? comp[o.block] : comp;
                if (!block) {
                    err = new Error('No block found with the name \'' + (o.block || comp) + '\'');
                    console.error(err);
                    return done(err);
                }
                var id = o.comp + (o.block ? '-' + o.block : '') + '-' + counter++;
                var css = 'sandbox-' + o.comp;
                if (o.block) {
                    css += ' sandbox-' + o.comp + '-' + o.block;
                }
                block(ctx, {
                    id: id,
                    sandbox: $('<div class="sandbox ' + css + '"></div>').appendTo(area)
                }, o.opts || {}, done);
            });
        });
        async.parallel(tasks, function (err, results) {
            if (err) {
                return done(err);
            }
            themes.clean(function (err) {
                if (err) {
                    return done(err);
                }
                cleaners.forEach(function (clean) {
                    clean();
                });
                cleaners = [];
                var html = $('html');
                var content = html.find('#content');
                content.show().html(el);
                var state = ctx.state;
                if (!state.backed) {
                    html.scrollTop(0);
                }
                state.backed = true;
                ctx.save();
                results.forEach(function (result) {
                    if (typeof result === 'function') {
                        return cleaners.push(result);
                    }
                    cleaners.push(result.clean);
                    var ready = result.ready;
                    if (!ready) {
                        return;
                    }
                    return ready();
                });
                done(null, results);
            });
        });
    });
    return this;
};

Layout.prototype.area = function (sel) {
    this.sel = sel;
    return this;
};

Layout.prototype.add = function (block, opts) {
    var parts = block.split(':');
    this.stack.push({
        sel: this.sel,
        comp: parts[0],
        block: parts[1],
        opts: opts
    });
    return this;
};

module.exports = Layout;
