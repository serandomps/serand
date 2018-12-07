var async = require('async');
var dust = require('dust')();

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
    };
    dust.renderSource(require(app.self + '/layouts/' + layout.layout + '.html'), {}, function (err, html) {
        if (err) {
            return done(err);
        }
        var tasks = [];
        var el = $(html);
        var id = 0;
        stack.forEach(function (o) {
            tasks.push(function (done) {
                var comp = require(app.dependencies[o.comp]);
                var area = $(o.sel, el);
                comp(ctx, {
                    id: o.comp + '-' + id++,
                    sandbox: $('<div class="sandbox ' + o.comp + '"></div>').appendTo(area)
                }, o.opts, done);
            });
        });
        async.parallel(tasks, function (err, results) {
            if (err) {
                return done(err);
            }
            cleaners.forEach(function (clean) {
                clean();
            });
            cleaners = [];
            $('#content').html(el);
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
