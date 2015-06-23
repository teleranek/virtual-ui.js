(function (_) {
    /**
     * Auto Scroll Class
     * This class is used to enable auto-scrolling when element is being dragged near the containing element's border
     * in Firefox
     * @param {Element} [elem] a HTML element to be scrolled
     * @param {Number} [scrollDelay] time delay for regulating scroll speed, default is 30
     * @param {Number} [step] the number of pixels in atomic scroll step, default is 1
     * @param {Number} [axisFlag] the flag to indicate available scrolling directions: x - 1, y - 2, x&&y - 3, default is 3
     * @param {Number} [scAreaWidth] the width of the are enabling scrolling when mouse is over it, default is 5
     * @class AutoScroll
     * @constructor
     */
    function AutoScroll(elem, scrollDelay, step, axisFlag, scAreaWidth) {
        this._elem = elem;
        // TODO: implement dynamic scroll speed depending on mouse position offset from element border and content size
        this._scrollDelay = scrollDelay ? scrollDelay : 30;
        this._step = step ? step : 1;
        this._axisFlag = axisFlag ? axisFlag : AutoScroll.SCROLL_AXIS_FLAG.Y | AutoScroll.SCROLL_AXIS_FLAG.X;
        this._scAreaWidth = scAreaWidth ? scAreaWidth : 5;

        this._fixupHandler('onmouseout',  this.offScrolls.bind(this));
        this._fixupHandler('ondragleave',  this.offScrolls.bind(this));
    }

    /**
     * Possible values of scroll direction along Y axis
     * @enum
     */
    AutoScroll.AUTO_SCROLL_Y = {
        OFF: 0,
        UP: 1,
        DOWN: 2
    };

    /**
     * Possible values of scroll direction along X axis
     * @enum
     */
    AutoScroll.AUTO_SCROLL_X = {
        OFF: 0,
        LEFT: 1,
        RIGHT: 2
    };

    /**
     * Possible values of the flag indication along which axis scrolling is enabled
     * @enum
     */
    AutoScroll.SCROLL_AXIS_FLAG = {
        X: 1,
        Y: 2
    };

    /**
     * A HTML element to be scrolled
     * @type {Element}
     * @private
     */
    AutoScroll.prototype._elem = null;

    /**
     * A unique interval ID returned by setInterval for repeated scrolll action
     * @private
     */
    AutoScroll.prototype._timerId = null;
    AutoScroll.prototype._scrollDelay = null;
    AutoScroll.prototype._step = null;
    AutoScroll.prototype._axisFlag = null;
    AutoScroll.prototype._scAreaWidth = 0;

    /**
     * Indicates if scrolling functionality is generally enabled at the current time moment
     * @type {Boolean}
     * @private
     */
    AutoScroll.prototype._aScrollEnabled = false;

    /**
     * Value of scroll direction along Y axis
     * @type {AutoScroll.AUTO_SCROLL_Y}
     * @private
     */
    AutoScroll.prototype._aScrollY = AutoScroll.AUTO_SCROLL_Y.OFF;

    /**
     * Value of scroll direction along X axis
     * @type {AutoScroll.AUTO_SCROLL_X}
     * @private
     */
    AutoScroll.prototype._aScrollX = AutoScroll.AUTO_SCROLL_X.OFF;

    /**
     * Enables scrolling functionality in general for the current time moment,
     * schedule checking if scroll action should take place
     */
    AutoScroll.prototype.enableAScroll = function () {
        this._aScrollEnabled = true;
        this._timerId = setInterval(this._tryScroll.bind(this), this._scrollDelay);
    };

    /**
     * Disables scrolling functionality in general for the current time moment,
     * clears scheduled scroll actions
     */
    AutoScroll.prototype.disableAScroll = function () {
        this._aScrollEnabled = false;
        if (this._timerId) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
    };

    /**
     * Analyzes such mouse event data like position, and sets the value of scroll direction
     * @param {MouseEvent} [e]
     */
    AutoScroll.prototype.takeOnOffAction = function (e) {
        if (this._aScrollEnabled) {
            // Firefox has a special behavior, and when the below check pass, this means that mouse is already out of
            // scrolled element boundaries
            if (e.layerY == e.clientY || e.layerX == e.clientX) {
                this._aScrollY = AutoScroll.AUTO_SCROLL_Y.OFF;
                this._aScrollX = AutoScroll.AUTO_SCROLL_X.OFF;
                return;
            }
            var offsetY = e.layerY;
            var offsetX = e.layerX;
            for (var elem = e.target; elem != this._elem && elem;
                elem = elem.offsetParent ? elem.offsetParent : elem.parentNode) {

                // TODO: correct the calculations for firefox for horizontal scrolling when many SPAN elements are used
                if (elem.offsetParent) {
                    offsetY += elem.offsetTop;
                    offsetX += elem.offsetLeft;
                }
            }
            if (!elem) {
                return;
            }
            offsetY -= this._elem.scrollTop;
            offsetX -= this._elem.scrollLeft;
            if (this._axisFlag & AutoScroll.SCROLL_AXIS_FLAG.Y && offsetX > 0 && offsetX < this._elem.offsetWidth) {
                if (offsetY <= this._scAreaWidth) {
                    this._aScrollY = AutoScroll.AUTO_SCROLL_Y.UP;
                } else if (offsetY >= this._elem.offsetHeight - this._scAreaWidth) {
                    this._aScrollY = AutoScroll.AUTO_SCROLL_Y.DOWN;
                } else {
                    this._aScrollY = AutoScroll.AUTO_SCROLL_Y.OFF;
                }
            }
            if (this._axisFlag & AutoScroll.SCROLL_AXIS_FLAG.X && offsetY > 0 && offsetY < this._elem.offsetHeight) {
                if (offsetX <= this._scAreaWidth) {
                    this._aScrollX = AutoScroll.AUTO_SCROLL_X.LEFT;
                } else if (offsetX >= this._elem.offsetWidth - this._scAreaWidth) {
                    this._aScrollX = AutoScroll.AUTO_SCROLL_X.RIGHT;
                } else {
                    this._aScrollX = AutoScroll.AUTO_SCROLL_X.OFF;
                }
            }
        }
    };

    /**
     * The default action to switch off all the enabled scrollings if some event occures on scrolling container
     * @param {MouseEvent} [e]
     */
    AutoScroll.prototype.offScrolls = function (e) {
        if (e.target === this._elem) {
            this._aScrollY = AutoScroll.AUTO_SCROLL_Y.OFF;
            this._aScrollX = AutoScroll.AUTO_SCROLL_X.OFF;
        }
    };

    /**
     * Makes the scroll step
     * @private
     */
    AutoScroll.prototype._tryScroll = function() {
        if (this._aScrollY !== AutoScroll.AUTO_SCROLL_Y.OFF || this._aScrollX !== AutoScroll.AUTO_SCROLL_X.OFF) {
            if (this._aScrollY) {
                var yDir = this._aScrollY == AutoScroll.AUTO_SCROLL_Y.UP ? -1 : 1;
                this._elem.scrollTop += this._step * yDir;
            }

            if (this._aScrollX) {
                var xDir = this._aScrollX == AutoScroll.AUTO_SCROLL_X.LEFT ? -1 : 1;
                this._elem.scrollLeft += this._step * xDir;
            }
        }
    };

    /**
     * Updates event handler to apply auto-scroll specific handler before any already set handler
     * @param {String} [evt] - type of mouse event for which the handler should be prepended
     * with some another auto-scroll specific handler
     * @param {Function} func - auto-scroll specific handler
     * @private
     */
    AutoScroll.prototype._fixupHandler = function (evt, func) {
        if (this._elem[evt]) {
            this._elem[evt] = function(f1, f2) {
                return function() {
                    f1.apply(this, arguments);
                    return f2.apply(this, arguments);
                };
            } (func, this._elem[evt]);
        }
        else {
            this._elem[evt] = func;
        }
    };

    _.AutoScroll = AutoScroll;
})(this);

