// Shim requestIdleCallback for browsers that do not support it
// The shim is from Paul Lewis, and can be found here:
// https://developers.google.com/web/updates/2015/08/using-requestidlecallback

const root = (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global) ||
    (typeof window === 'object' && window.window === window && window);

export const requestIdleCallback =
    (root.requestIdleCallback ||
    function requestIdleCallback(cb) {
        console.log('Using requestIdleCallback shim');
        const start = Date.now();
        return setTimeout(() => {
            cb({
                didTimeout: false,
                timeRemaining() {
                    return Math.max(0, 50 - (Date.now() - start));
                },
            });
        }, 1);
    }).bind(root);

export const cancelIdleCallback =
    (root.cancelIdleCallback ||
    function cancelIdleCallback(id) {
        clearTimeout(id);
    }).bind(root);

