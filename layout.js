var async = require('async');
var dust = require('dust')();

var cleaners = [];

var Layout = function (base, dependencies, layout) {
    this.sel = null;
    this.stack = [];
    this.base = base;
    this.dependencies = dependencies;
    this.layout = layout;
};

Layout.prototype.render = function (done) {
    var layout = this;
    var stack = layout.stack;
    done = done || function (err) {
      if (err) {
          return console.error(err);
      }
    };
    dust.renderSource(require(layout.base + '/' + layout.layout + '.html'), {}, function (err, html) {
        if (err) {
            return done(err);
        }
        var tasks = [];
        var el = $(html);
        stack.forEach(function (o) {
            tasks.push(function (done) {
                var comp = require(layout.dependencies[o.comp]);
                var area = $(o.sel, el);
                comp($('<div class="sandbox ' + o.comp + '"></div>').appendTo(area), o.opts, done);
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
