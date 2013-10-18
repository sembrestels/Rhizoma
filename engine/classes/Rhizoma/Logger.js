var _ = require('underscore');

/**
 * WARNING: API IN FLUX. DO NOT USE DIRECTLY.
 *
 * Use the rhizoma_* versions instead.
 * 
 * @param {Rhizoma_PluginHooksService} hooks Hooks service
 *
 * @private
 * @since      1.9.0
 */
function Rhizoma_Logger(hooks) {

    /**
     * @property {Number} _level The logging level
     * @protected
     */
    this._level = this.ERROR;

    /**
     * @property {Boolean} _display Display to user?
     * @protected
     */
    this._display = false;

    /**
     * @property {Rhizoma_PluginHooksService} _hooks
     * @protected
     */
    this._hooks = hooks;
}


Rhizoma_Logger.prototype = {

    /** @static */
    OFF: 0,
    /** @static */
    ERROR: 400,
    /** @static */
    WARNING: 300,
    /** @static */
    NOTICE: 250,
    /** @static */
    INFO: 200,

    /**
     * @static
     */
    _levels: {
        0: 'OFF',
        200: 'INFO',
        250: 'NOTICE',
        300: 'WARNING',
        400: 'ERROR',
    },

    /**
     * Set the logging level
     *
     * @param {Number} level The logging level
     */
    setLevel: function(level) {
        if (typeof level === 'string') {
            var levelStringsToInts = _.invert(this._levels);
            level = levelStringsToInts[level];
        }
        this._level = level;
    },

    /**
     * Get the current logging level
     * 
     * @return {Number}
     */
    getLevel: function() {
        return this._level;
    },

    /**
     * Set whether the logging should be displayed to the user
     *
     * Whether data is actually displayed to the user depends on this setting
     * and other factors such as whether we are generating a JavaScript or CSS
     * file.
     *
     * @param {Boolean} display Whether to display logging
     */
    setDisplay: function(display) {
        this._display = display;
    },

    /**
     * Add a message to the log
     *
     * @param {String} message The message to log
     * @param {Number}    level   The logging level
     * @return {Boolean} Whether the messages was logged
     */
    log: function(message, level) {
        level = level || this.NOTICE;
        if (this._level == this.OFF || level < this._level) {
            return false;
        }

        if (!_.has(this._levels, level)) {
            return false;
        }

        var levelString = this._levels[level];

        // notices and below never displayed to user
        var display = this._display && level > this.NOTICE;

        this._process(levelString + ": " + message, display, level);

        return true;
    },

    /**
     * Log message at the ERROR level
     *
     * @param {String} message The message to log
     * @return {Boolean}
     */
    error: function(message) {
        return this.log(message, this.ERROR);
    },

    /**
     * Log message at the WARNING level
     *
     * @param {String} message The message to log
     * @return {Boolean}
     */
    warn: function(message) {
        return this.log(message, this.WARNING);
    },

    /**
     * Log message at the NOTICE level
     *
     * @param {String} message The message to log
     * @return {Boolean}
     */
    notice: function(message) {
        return this.log(message, this.NOTICE);
    },

    /**
     * Log message at the INFO level
     *
     * @param {String} message The message to log
     * @return {Boolean}
     */
    info: function(message) {
        return this.log(message, this.INFO);
    },

    /**
     * Dump data to log or screen
     *
     * @param data    The data to log
     * @param {Boolean}  display Whether to include this in the HTML page
     */
    dump: function(data, display) {
        if (display !== false) {
            display = true;
        }
        this._process(data, display, this.ERROR);
    },

    /**
     * Process logging data
     *
     * @param            data    The data to process
     * @param {Boolean}  display Whether to display the data to the user. Otherwise log it.
     * @param {Number}   level   The logging level for this data
     * 
     * @protected
     */
    _process: function(data, display, level) {
        var CONFIG = require('../../settings');

        // plugin can return false to stop the default logging method
        var params = {
            'level': level,
            'msg': data,
            'display': display,
            'to_screen': display
        };

        // @todo Uncomment when hooks implemented
        //if (!this.hooks.trigger('debug', 'log', params, true)) {
        //    return;
        //}

        // Do not want to write to screen before page creation has started.
        // This is not fool-proof but probably fixes 95% of the cases when logging
        // results in data sent to the browser before the page is begun.
        if (typeof CONFIG.pagesetupdone === 'undefined') {
            display = false;
        }

        // Do not want to write to JS or CSS pages
        // @todo Uncomment when contexts implemented
        //if (rhizoma_in_context('js') || rhizoma_in_context('css')) {
        //    display = false;
        //}

        //if (display) {
            // @todo Uncomment when views implemented
            //echo '<pre>';
            //print_r(data);
            //echo '</pre>';
        //} else {
            console.log(data);
        //}
    }
};

// Shortcuts
Rhizoma_Logger.OFF = Rhizoma_Logger.prototype.OFF;
Rhizoma_Logger.ERROR = Rhizoma_Logger.prototype.ERROR;
Rhizoma_Logger.WARNING = Rhizoma_Logger.prototype.WARNING;
Rhizoma_Logger.NOTICE = Rhizoma_Logger.prototype.NOTICE;
Rhizoma_Logger.INFO = Rhizoma_Logger.prototype.INFO;

module.exports = Rhizoma_Logger;
