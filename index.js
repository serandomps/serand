var page = require('page');

var listeners = [];

var layout;

var event = function (channel, event) {
    channel = listeners[channel] || (listeners[channel] = {});
    return channel[event] || (channel[event] = []);
};

/**
 * Registers an event listner for the specified channel
 * @param ch channel name
 * @param e event name
 * @param fn event callback
 */
module.exports.on = function (ch, e, fn) {
    event(ch, e).push(fn);
};

module.exports.off = function (ch, e, fn) {
    var arr = event(ch, e);
    var idx = arr.indexOf(fn);
    if (idx === -1) {
        return;
    }
    arr.splice(idx, 1);
};

/**
 * Emits the specified event on the specified channel
 * @param ch channel name
 * @param e event name
 * @param data event data
 */
module.exports.emit = function (ch, e, data) {
    event(ch, e).forEach(function (fn) {
        fn(data);
    });
};