MultiRange & DragAndDrop (MrDad)
===================

Extends jquery-ui slider widget to include multiple ranges and combine it with the blocks drag & drop interaction.

Live example at jsFiddle http://jsfiddle.net/araczkowski/et4dmz1w/embedded/result/

TODO
===========================

***integration with APEX (plugin)***


How To Start (to develop the plugin)
===========================

**NPM**
```javascript
npm install
```

**Bower**
```javascript
bower install
```

**Grunt**
```javascript
grunt serve
```


MrDad class constructor
===========================
**MrDad**
```javascript
/**
 * @class MrDad
 * @constructor
 * @param {String} selector jQuery selector
 * @param {Object} userOptions (optional) Custom options object that overrides default
 * {
 *      @property {Number} userOptions.min Slider minimum value
 *      @property {Number} userOptions.max Slider maximum value
 *      @property {Number} userOptions.step Slider sliding step
 *      @property {Number} userOptions.gap Minimum gap between handles when add/remove range controls are visible
 *      @property {Number} userOptions.newlength Default length for newly created range. Will be adjusted between surrounding handles if not fitted
 *      @property {Object} userOptions.handleLabelDispFormat mrdad handle label format default hh24:mi
 *      @property {Object} userOptions.stepLabelDispFormat mrdad step Label format default hh24
 *      @property {Array} userOptions.blocksToolbar  blocks definition for blocks toolbar blocksArray example: Array([{value: 30}, {value: 60}, {value: 120}...]) (we are expecting soon more information (like colour etc.)about blocks from DB, that is why blocks are objects)
 *      @property {String} userOptions.mode pluugin work mode: ranges or blocks
 * }
 */

window.MrDad = function(selector, userOptions) {}
```


MrDad class interface
=========================


**addPeriods**
```javascript
/**
 * Adds multiple periods and rebuilds the MrDad slider
 * @param {Array} periodsArray example: Array([[660, 90],[990, 120]...])
 * @return {Object} self instance of am.MrDad class
 */

MrDad.addPeriods = function(periodsArray) {}
```

**addBlocks**
```javascript
/**
 * Adds multiple block to the slider scale
 * @param {Array} blocksArray example: Array([[660, 30],[990, 60]...])
 * @return {Object} self instance of MrDad class
 */

MrDad.addBlocks = function(periodsArray) {}
```




MrDad class interface continuation
=========================
=
**getPeriod**
```javascript
/**
 * Get period by id
 * @param {Number} id
 * @return {Object}
 */

MrDad.getPeriod = function(id) {}
```

=
**getPeriods**
```javascript
/**
 * Gets all periods for this MrDad instance
 * @return {Array} of each period.toPublic() object
 */

MrDad.getPeriods = function() {}
```

=
**setDeletePeriodConfirmCallback**
```javascript
/**
 * Sets callback function that can be used for period delete confirmation window
 *
 * @param {Function} confirmFunction
 *      stores a callback function
 *      function args:
 *          1. period - instance of current period.toPublic() object to be passed to confirmation window
 *          2. callback result flag of boolean
 *
 * @example
 *      MrDad.setDeletePeriodConfirmCallback(function(period, callback) {
 *          callback(function() {
 *             return confirm('Delete period between ' + period.getAbscissas()[0] + ' and ' + period.getAbscissas()[1] + ' ?');
 *          }());
 *      });
 * @return {Object} self instance of MrDad class
 */

MrDad.setDeletePeriodConfirmCallback = function(confirmFunction) {}
```

=
**setAddPeriodConfirmCallback**
```javascript
/**
 * Sets callback function that can be used for period add confirmation window
 *
 * @param {Function} confirmFunction
 *      stores a callback function
 *      function args:
 *          1. period - instance of new period.toPublic() object that can be confirmed or rejected
 *          2. callback result flag of boolean
 *
 * @example
 *      MrDad.setAddPeriodConfirmCallback(function(period, callback) {
 *          callback(function() {
 *             return confirm('Add period between ' + period.getAbscissas()[0] + ' and ' + period.getAbscissas()[1] + ' ?');
 *          }());
 *      });
 * @return {Object} self instance of MrDad class
 */

MrDad.setAddPeriodConfirmCallback = function(confirmFunction) {}
```

=
**setOnHandleMouseenterCallback**
```javascript
/**
 * Sets callback function for handle's mouseenter event
 *
 * @param {Function} callbackFunction
 *      stores a callback function
 *      function args:
 *          1. context - jQuery object of hovered handle
 *          2. period - instance of period.toPublic() object that is linked to hovered handle
 *          3. edgeIndex - integer number[0-1] indicating left or right handle triggered
 *
 * @example
 *      MrDad.setOnHandleMouseenterCallback(function(context, period, edgeIndex) {
 *          var handlePosition = context.offset().left;
 *          var periodId = period.getId();
 *          var handleAbscissa = period.getAbscissas()[edgeIndex];
 *          //...
 *      });
 * @return {Object} self instance of MrDad class
 */

MrDad.setOnHandleMouseenterCallback = function(callbackFunction) {}
```

=
**setOnHandleSlideCallback**
```javascript
/**
 * Sets callback function for handle's slide event
 *
 * @param {Function} callbackFunction
 *      stores a callback function
 *      function args:
 *          1. context - jQuery object of slided handle
 *          2. period - instance of period.toPublic() object that is linked to slided handle
 *          3. edgeIndex - integer number[0-1] indicating left or right handle triggered
 *
 * @example
 *      MrDad.setOnHandleSlideCallback(function(context, period, edgeIndex) {
 *          var handlePosition = context.offset().left;
 *          var periodId = period.getId();
 *          var handleAbscissa = period.getAbscissas()[edgeIndex];
 *          //...
 *      });
 * @return {Object} self instance of MrDad class
 */

MrDad.setOnHandleSlideCallback = function(callbackFunction) {}
```


=========================




