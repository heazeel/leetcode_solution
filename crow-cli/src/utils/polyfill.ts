export const doPolyfill = () => {
  if (!Array.prototype.findLastIndex) {
    Object.defineProperty(Array.prototype, 'findLastIndex', {
      value: function (predicate) {
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);
        var len = o.length >>> 0;

        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        var thisArg = arguments[1];
        var k = len - 1;

        while (k >= 0) {
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return k;
          }
          k--;
        }

        return -1;
      },
      configurable: true,
      writable: true,
    });
  }
};
