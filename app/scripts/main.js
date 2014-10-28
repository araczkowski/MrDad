(function(w, $) {
    $.widget('ui.mrdad', $.ui.slider, {
        _create: function() {
            this._super();
        },
        _mouseCapture: function(event) {
            if ($(event.target).is('a.ui-slider-handle')) {
                this._lastChangedValue = $(event.target.parentNode).find('.ui-slider-handle').index(event.target);
            }
            return this._super(event);
        }
    });

    /**
     * @class MrDad
     *
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
     *      @property {Array} userOptions.blocksToolbar  blocks definition for blocks toolbar blocksArray example: Array([{value: 30}, {value: 60}, {value: 120}...])
     *                                                   @TODO we are expecting soon more information (like colour etc.)about blocks from DB, that is why blocks are objects
     *      @property {String} userOptions.mode pluugin work mode: ranges or blocks
     * }
     */
    w.MrDad = function(selector, userOptions) {
        //var _self = this;
        var _slider;
        var _options = {
            min: 0,
            max: 1440,
            step: 30,
            gap: 150,
            newlength: 90,
            handleLabelDispFormat: function(steps) {
                var hours = Math.floor(Math.abs(steps) / 60);
                var minutes = Math.abs(steps) % 60;
                return ((hours < 10 && hours >= 0) ? '0' : '') + hours + ':' + ((minutes < 10 && minutes >= 0) ? '0' : '') + minutes;
            },
            stepLabelDispFormat: function(steps) {
                var hours = Math.floor(Math.abs(steps) / 60);
                return Math.abs(steps) % 60 === 0 ? ((hours < 10 && hours >= 0) ? '0' : '') + hours : '';
            },
            blocksToolbar: [{
                value: 30
            }, {
                value: 60
            }, {
                value: 120
            }],
            mode: 'ranges'

        };
        var _deletePeriodConfirm = null,
            _addPeriodConfirm = null,
            _onHandleMouseenter = null,
            _onHandleSlide = null,
            _onDeleteBlock = null,
            _onAddBlock = null,
            _onAddPeriod = null,
            _onDeletePeriod = null;

        var SELECTORS = {
            range: {
                'class': 'ui-slider-range'
            },
            handle: {
                'class': 'ui-slider-handle'
            },
            control: {
                'class': 'ui-slider-control'
            }
        };
        var _periods = [];
        var _periodIdIncrementor = 0;

        var Period = function(start, end) {
            var _self = this,
                _id,
                _abscissas,
                _indexes;

            function _init() {
                if (start >= end) {
                    throw 'Invalid arguments passed';
                }
                _id = ++_periodIdIncrementor;
                _abscissas = [start, end];
            }

            this.setIndexes = function(i) {
                _indexes = [i[0], i[1]];
            };

            this.getIndexes = function() {
                return [_indexes[0], _indexes[1]];
            };

            this.getId = function() {
                return _id;
            };

            this.setAbscissas = function(a) {
                _abscissas = [a[0], a[1]];
            };

            this.getAbscissas = function() {
                return [_abscissas[0], _abscissas[1]];
            };

            this.toPublic = function() {
                return {
                    getId: function() {
                        return _id;
                    },
                    getAbscissas: function() {
                        return _self.getAbscissas();
                    }
                };
            };

            _init();
        };

        var Utils = {
            convertToPercent: function(value) {
                return (value / (_options.max - _options.min)) * 100;
            }
        };

        function _init() {
            _mergeOptions();
            if ((_options.max - _options.min) % _options.step !== 0) {
                throw 'Slider length should be multiple to step';
            }
            _slider = $(selector);
            _initEvents();
            _build();
            _addScale();
            _createBlocksToolbar();
            _setMode(_options.mode);

        }

        function _setMode(mode) {

            if (mode === 'ranges') {

                $('.step,.empty').removeClass('empty');
                $('.planned-block-body').removeClass('planned-block-body');
                $('.planned-block-start').removeClass('planned-block-start');
                $('.planned-block-end').removeClass('planned-block-end');
                $('div.step_content span.closer').remove();
                $('div.source').hide();
                $('.ui-slider-control-plus,.ui-slider-control-minus').show();
                _options.mode = 'ranges';
                _options.disabled = false;
                _rebuild();


            } else if (mode === 'blocks') {
                $('div.source').show();
                _periods.forEach(function(period) {
                    var startId = period.getAbscissas()[0];
                    var endId = period.getAbscissas()[1];
                    var steps = Number(endId) / 30 - Number(startId) / 30;
                    for (var i = 0; i < steps; i++) {
                        var selector = '#step_' + (Number(startId) / 30 + 1 + i);
                        $(selector).addClass('empty');
                    }
                });
                _options.mode = 'blocks';
                _options.disabled = true;
                _rebuild();
                $('.ui-slider-control-plus,.ui-slider-control-minus').hide();
            }

        }

        function _addScale() {
            $(selector).parent().prepend('<div id="steps" class="steps"></div>');
            var eSteps = $('#steps');
            var nSteps = (_options.max - _options.min) / _options.step;
            for (var i = 0; nSteps > i; i++) {
                $('<div/>', {
                    'id': 'step_' + (Number(i) + 1),
                    'class': 'step',
                    'data-start': i * 30,
                    'html': '<span class="tick">' + _options.stepLabelDispFormat(i * 30) + '</span><div class="step_content"></div></div>'
                }).appendTo(eSteps);
            }
        }


        function _addBlocksToTolbar(blocksArray) {
            var eBlocks = $('#blocks');
            for (var i = 0; i < blocksArray.length; i++) {
                $('<div/>', {
                    'id': 'block' + blocksArray[i].value,
                    'class': 'draggable-block template block' + blocksArray[i].value,
                    'data-value': blocksArray[i].value,
                    'html': '<span> <i class = "fa fa-arrows handle" ></i></span>'
                }).appendTo(eBlocks);
            }
            return this;
        }

        function _createBlocksToolbar() {
            $(selector).parent().append('<div id="blocks" class="source"></div>');
            _addBlocksToTolbar(_options.blocksToolbar);
            //
            // Droppabe
            $('.steps .step').droppable({
                tolerance: 'pointer',
                revert: true,
                //hoverClass: 'highlight',
                over: function(event, div) {
                    var className;
                    //
                    $('div.step').removeClass('highlightNOK');
                    $('div.step').removeClass('highlightOK');

                    var nSteps = (div.draggable.attr('data-value') / 30);
                    var list = _getHoveredDivs($(this), div, 'step', nSteps);
                    var list2 = _getHoveredDivs($(this), div, 'empty', nSteps);
                    if (nSteps !== list2.length) {
                        className = 'highlightNOK';
                    } else {
                        className = 'highlightOK';
                    }

                    list.forEach(function(entry) {
                        entry.addClass(className);
                    });
                },
                drop: function(ev, div) {
                    $('div.step').removeClass('highlightNOK');
                    $('div.step').removeClass('highlightOK');
                    var nSteps = (div.draggable.attr('data-value') / 30);
                    var bSteps = _getHoveredDivs($(this), div, 'empty', nSteps);
                    if (bSteps.length !== nSteps) {
                        div.draggable.effect('shake', {}, 300);
                        return;
                    }
                    _addBlock(bSteps, div.draggable.attr('data-value'));
                }
            });

            //
            // Draggable
            $('div.draggable-block').draggable({
                //connectToSortable: '#top_container_for_blocks',
                appendTo: 'body',
                helper: 'clone',
                revert: 'invalid',
                //snap: '.steps .step',
                handle: 'span i.handle',
                greedy: true,
                reverting: function() {
                    $('div.step').removeClass('highlightNOK');
                    $('div.step').removeClass('highlightOK');
                },
                start: function(ev, div) {
                    div.helper.width($(this).width());
                },
                stop: function(ev, div) {
                    div.helper.width($(this).width());
                }
            });

            //
            $('div.draggable, .steps .step').disableSelection();




            // to get array with currently hovered divs
            function _getHoveredDivs(firstElement, blockDiv, className, nSteps) {
                var hoveredDivs = [];
                for (var i = 0; i < nSteps; i++) {
                    var step = Number(firstElement.attr('id').replace('step_', '')) + Number(i);
                    if ($('#step_' + step).hasClass(className)) {
                        hoveredDivs.push($('#step_' + step));
                    }
                }
                return hoveredDivs;
            }
        }

        function _addBlock(bSteps, value) {

            for (var i = 0; i < bSteps.length; i++) {
                bSteps[i].removeClass('empty');
                bSteps[i].addClass('planned-block-body');
                bSteps[i].addClass('planned-block-' + bSteps[0].attr('id'));
                if (i === 0) {
                    bSteps[i].addClass('planned-block-start');
                    bSteps[i].find('div').prepend('<span class="closer" onclick="mrdad.removeBlock(\'' + bSteps[0].attr('id') + '\')"><i class="fa fa-times"></i></span>');
                    bSteps[i].attr('data-value', value);
                }

                if (i === bSteps.length - 1) {
                    bSteps[i].addClass('planned-block-end');
                }
            }

            if (typeof(_onAddBlock) === 'function') {
                _onAddBlock();
            }
        }

        // to remove the blocks from slider
        function _removeBlock(step) {
            var selector = '.planned-block-' + step;
            $(selector).removeClass('planned-block-body').removeClass('planned-block-start').removeClass('planned-block-end').addClass('empty');
            $(selector).find($('.closer')).remove();
            $(selector).attr('data-value', '');
            if (typeof(_onDeleteBlock) === 'function') {
                _onDeleteBlock();
            }
        }




        function _initEvents() {

            _options.slide = function(event, ui) {
                //
                function checkIfArrayIsUnique(arr) {
                    var map = {}, i, size;
                    for (i = 0, size = arr.length; i < size; i++) {
                        if (map[arr[i]]) {
                            return false;
                        }
                        map[arr[i]] = true;
                    }
                    return true;
                }
                // check the minimum gap
                var values = [];
                values.push(ui.value);
                for (var i = 0; i < _periods.length; i++) {
                    var e = _periods[i].getAbscissas();
                    values.push(e[0], e[1]);
                }
                if (!checkIfArrayIsUnique(values)) {
                    return false;
                }


                var index = _slider.find('.' + SELECTORS.handle['class']).index(ui.handle);

                function onSlide() {
                    if (typeof(_onHandleSlide) === 'function') {
                        var key = _getPeriodKeyByIndex(index);
                        if (key !== -1) {
                            var edgeIndex = _isLeftHandle(index) ? 0 : 1;
                            _onHandleSlide($(ui.handle), _periods[key].toPublic(), edgeIndex);
                        }
                    }
                    return true;
                }

                if (!_validHandle(index, ui.value)) {
                    if (_isLeftHandle(index) && _isThereNextLeftHandle(index)) {
                        if (_validHandle(index - 1, ui.value)) {
                            _updateHandles([
                                [index, ui.value],
                                [index - 1, ui.value]
                            ]);
                            return onSlide();
                        }
                    }
                    if (_isRightHandle(index) && _isThereNextRightHandle(index)) {
                        if (_validHandle(index + 1, ui.value)) {
                            _updateHandles([
                                [index, ui.value],
                                [index + 1, ui.value]
                            ]);
                            return onSlide();
                        }
                    }
                    return false;
                }
                _updateHandle(index, ui.value);
                return onSlide();
            };

            _slider.on('mouseenter', '.' + SELECTORS.handle['class'], function() {
                if (typeof(_onHandleMouseenter) === 'function') {
                    var index = _slider.find('.' + SELECTORS.handle['class']).index($(this));
                    var key = _getPeriodKeyByIndex(index);
                    if (key !== -1) {
                        var edgeIndex = _isLeftHandle(index) ? 0 : 1;
                        _onHandleMouseenter($(this), _periods[key].toPublic(), edgeIndex);
                    }
                }
            });
        }

        function _mergeOptions() {
            if (_options.mode === 'blocks') {
                _options.disabled = true;
            } else {
                _options.disabled = false;
            }

            if (!userOptions) {
                return _options;
            }
            for (var optionKey in _options) {
                if (optionKey in userOptions) {
                    switch (typeof _options[optionKey]) {
                        case 'boolean':
                            _options[optionKey] = !! userOptions[optionKey];
                            break;
                        case 'number':
                            _options[optionKey] = Math.abs(userOptions[optionKey]);
                            break;
                        case 'string':
                            _options[optionKey] = '' + userOptions[optionKey];
                            break;
                        default:
                            _options[optionKey] = userOptions[optionKey];
                    }
                }
            }
            return _options;
        }

        function _toggleHandles(flag) {
            _slider.find('.' + SELECTORS.handle['class']).toggle( !! flag);
        }

        function _isLeftHandle(index) {
            return index % 2 === 0;
        }

        function _isRightHandle(index) {
            return index % 2 !== 0;
        }

        function _isThereNextLeftHandle(index) {
            var values = _slider.mrdad('option', 'values');
            if (index in values && values[index - 1] !== undefined) {
                return true;
            }
            return false;
        }

        function _isThereNextRightHandle(index) {
            var values = _slider.mrdad('option', 'values');
            if (index in values && values[index + 1] !== undefined) {
                return true;
            }
            return false;
        }

        function _getPeriodKey(periodId) {
            for (var i = 0; i < _periods.length; i++) {
                if (_periods[i] && _periods[i].getId() === periodId) {
                    return i;
                }
            }
            return -1;
        }

        function _getPeriodKeyByIndex(index) {
            for (var i = 0; i < _periods.length; i++) {
                if (_periods[i].getIndexes().indexOf(index) !== -1) {
                    return i;
                }
            }
            return -1;
        }

        function _getPeriodKeyByInnerPoint(abscissa) {
            for (var i = 0; i < _periods.length; i++) {
                var edges = _periods[i].getAbscissas();
                if (abscissa >= edges[0] && abscissa <= edges[1]) {
                    return i;
                }
            }
            return -1;
        }

        function _rangeIntersectsPeriods(start, length) {
            try {
                var midpoint = start + length / 2;
                var surrounding = _getSurroundingPoints(midpoint);
                if (start < surrounding[0] || (start + length) > surrounding[1]) {
                    return true;
                }
            } catch (e) {
                // the middle point is within a period
                return true;
            }
            return false;
        }

        /**
         * Gets surrounding handles abscissas for the outranged point
         * @param {Number} abscissa - point out of any range
         * @throws {String} message in case the point is within a range
         * @return {Array[Number, Number]}
         */
        function _getSurroundingPoints(abscissa) {
            if (_getPeriodKeyByInnerPoint(abscissa) !== -1) {
                throw 'Passed abscissa is within the period';
            }
            var leftPoint = _options.min;
            var rightPoint = _options.max;
            for (var i = 0; i < _periods.length; i++) {
                var edges = _periods[i].getAbscissas();
                if (abscissa > edges[1]) {
                    leftPoint = edges[1];
                }
                if (abscissa < edges[0] && rightPoint === _options.max) {
                    rightPoint = edges[0];
                }
            }
            return [leftPoint, rightPoint];
        }

        function _isValidParams(start, length) {
            if (start < _options.min || start >= _options.max || length < _options.step) {
                return false;
            }
            return true;
        }

        function _deletePeriod(periodId) {
            var i = _getPeriodKey(periodId);
            if (i !== -1) {

                var ret = !! _periods.splice(i, 1).length;

                if (typeof(_onDeletePeriod) === 'function') {
                    _onDeletePeriod();
                }
                return ret;
            }
            return false;
        }

        function _sanitizeValue(value) {
            value = Math.round(Math.abs(value));
            value = value - value % _options.step;
            return value;
        }

        function _addPeriod(start, length) {
            start = _sanitizeValue(start);
            length = _sanitizeValue(length);
            if (!_isValidParams(start, length)) {
                return null;
            }
            var midpoint = start + length / 2;
            if (_getPeriodKeyByInnerPoint(midpoint) !== -1) {
                return null;
            }
            if (_rangeIntersectsPeriods(start, length)) {
                var nearest = _getSurroundingPoints(midpoint);
                var shorter = ((nearest[1] - midpoint) > (midpoint - nearest[0])) ? (midpoint - nearest[0]) : (nearest[1] - midpoint);
                shorter -= _options.step;
                start = midpoint - shorter;
                length = shorter * 2;
                return _addPeriod(start, length);
            }
            try {
                var period = new Period(start, start + length);
                _periods.push(period);
                _periods.sort(function(a, b) {
                    return a.getAbscissas()[0] - b.getAbscissas()[0];
                });
                if (typeof(_onAddPeriod) === 'function') {
                    _onAddPeriod();
                }
                return period;
            } catch (e) {
                return null;
            }
        }

        function _validHandle(index, value) {
            var values = _slider.mrdad('option', 'values');
            if (index in values) {
                if (values[index - 1] !== undefined) {
                    if (value < values[index - 1] || (_isRightHandle(index) && value === values[index - 1])) {
                        return false;
                    }
                }
                if (values[index + 1] !== undefined) {
                    if (value > values[index + 1] || (_isLeftHandle(index) && value === values[index + 1])) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }

        function _updateHandle(index, value) {
            _updateHandles([
                [index, value]
            ]);
        }

        /**
         * Updates multiple handles at a time
         * @param {Array} data example: Array([[index, value],[index, value]])
         */
        function _updateHandles(data) {
            for (var i in data) {
                var index = data[i][0];
                var value = data[i][1];
                var key = _getPeriodKeyByIndex(index);
                if (key !== -1) {
                    var indexes = _periods[key].getIndexes();
                    var edges = _periods[key].getAbscissas();
                    edges[indexes.indexOf(index)] = value;
                    _periods[key].setAbscissas(edges);
                }
            }
            _build(true);
        }

        function _drawRange(periodId, edges) {
            var range = $('<div class="' + SELECTORS.range['class'] + ' ' + SELECTORS.range['class'] + '-' + periodId + '"></div>');
            _slider.append(range);
            _alignRange(periodId, edges);
        }

        function _alignRange(periodId, edges) {
            var range = _slider.find('.' + SELECTORS.range['class'] + '-' + periodId);
            range.css({
                left: (Utils.convertToPercent(edges[0] - _options.min)) + '%',
                width: Utils.convertToPercent(edges[1] - edges[0]) + '%'
            });
        }

        function _destroy() {
            _slider.mrdad('destroy');
            _slider.find('.' + SELECTORS.range['class']).remove();
        }

        function _rebuild() {
            _destroy();
            _build();
        }

        function _build(update) {
            var values = [];
            for (var i = 0; i < _periods.length; i++) {
                var edges = _periods[i].getAbscissas();
                var count = values.push(edges[0], edges[1]);
                _periods[i].setIndexes([count - 2, count - 1]);
                if (update) {
                    _alignRange(_periods[i].getId(), edges);
                } else {
                    _drawRange(_periods[i].getId(), edges);
                }
            }
            _options.values = values;
            _slider.mrdad(_options);
            if (update) {
                _alignControls();
            } else {
                _rebuildControls();
            }
            _refreshHandles();
        }

        function _rebuildControls() {
            _slider.find('.' + SELECTORS.control['claaddControlss'] + '-plus,.' + SELECTORS.control['class'] + '-minus').remove();

            var addControl = function(type, identifier) {
                var key;
                var control = $('<div class="' + SELECTORS.control['class'] + '-' + type + ' ' + SELECTORS.control['class'] + '-' + identifier + '"></div>');
                control.hide();
                control.on('mousedown', function(event) {
                    event.stopPropagation();

                    if (_options.mode === 'blocks') {
                        return;
                    }

                    if ('minus' === type) {
                        key = _getPeriodKey(identifier);
                        if (key !== -1) {
                            function deletePeriod() {
                                if (_deletePeriod(identifier)) {
                                    _rebuild();
                                }
                            }
                            if (typeof(_deletePeriodConfirm) === 'function') {
                                _deletePeriodConfirm(_periods[key].toPublic(), function(result) {
                                    if (result) {
                                        deletePeriod();
                                    }
                                });
                            } else {
                                deletePeriod();
                            }
                        }
                    } else if ('plus' === type) {
                        var start,
                            length = _options.newlength,
                            leftEdge = _options.min,
                            rightEdge = _options.max;
                        if ('base' === identifier) {
                            key = _getPeriodKeyByIndex(0);
                            if (key !== -1) {
                                rightEdge = _periods[key].getAbscissas()[0];
                            }
                        } else {
                            key = _getPeriodKey(identifier);
                            if (key !== -1) {
                                var indexes = _periods[key].getIndexes(),
                                    nextKey = _getPeriodKeyByIndex(indexes[1] + 1);
                                leftEdge = _periods[key].getAbscissas()[1];
                                if (nextKey !== -1) {
                                    rightEdge = _periods[nextKey].getAbscissas()[0];
                                }
                            }
                        }
                        if ((rightEdge - leftEdge) < length) {
                            length = rightEdge - leftEdge;
                        }
                        start = leftEdge + (rightEdge - leftEdge) / 2 - length / 2;
                        var newPeriod = _addPeriod(start, length);
                        if (newPeriod !== null) {
                            if (typeof(_addPeriodConfirm) === 'function') {
                                _addPeriodConfirm(newPeriod.toPublic(), function(result) {
                                    if (!result) {
                                        _deletePeriod(newPeriod.getId());
                                    }
                                    _rebuild();
                                });
                            } else {
                                _rebuild();
                            }
                        }
                    }
                });
                _slider.append(control);
            };

            addControl('plus', 'base');
            var count = _periods.length;
            if (count > 0) {
                for (var i = 0; i < count; i++) {
                    addControl('minus', _periods[i].getId());
                    addControl('plus', _periods[i].getId());
                }
            }
            _alignControls();
        }

        function _alignControls() {
            _slider.find('.' + SELECTORS.control['class'] + '-plus,.' + SELECTORS.control['class'] + '-minus').hide();

            var showControl = function(type, identifier, offset) {
                var control = _slider.find('.' + SELECTORS.control['class'] + '-' + type + '.' + SELECTORS.control['class'] + '-' + identifier);
                control.css({
                    left: Utils.convertToPercent(offset) + '%'
                });
                control.show();
            };

            var prevValue = _options.min;
            var prevIdentifier = 'base';
            var count = _periods.length;
            if (count > 0) {
                for (var i = 0; i < count; i++) {
                    var edges = _periods[i].getAbscissas();
                    var identifier = _periods[i].getId();
                    if ((edges[0] - prevValue) >= _options.gap) {
                        showControl('plus', prevIdentifier, (prevValue - _options.min + (edges[0] - prevValue) / 2));
                    }
                    //if ((edges[1] - edges[0]) >= _options.gap) {
                    showControl('minus', identifier, (edges[0] - _options.min + (edges[1] - edges[0]) / 2));
                    //}
                    prevValue = edges[1];
                    prevIdentifier = identifier;
                }
                if ((_options.max - prevValue) >= _options.gap) {
                    showControl('plus', prevIdentifier, (prevValue - _options.min + (_options.max - prevValue) / 2));
                }
            } else {
                showControl('plus', 'base', ((_options.max - _options.min) / 2));
            }
        }

        function _refreshHandles() {
            var handles = _slider.find('.' + SELECTORS.handle['class']);
            var values = _slider.mrdad('option', 'values');
            var prevSibling = -1;

            handles.removeClass('arrow-left arrow-right');
            for (var index in values) {


                handles.eq(index).html('<span class="handle_label">' + _options.handleLabelDispFormat(values[index]) + '</span>');

                //
                if (values[index] === prevSibling) {
                    handles.eq(index - 1).addClass('arrow-left');
                    handles.eq(index).addClass('arrow-right');
                }
                prevSibling = values[index];
            }
            _toggleHandles(values.length);
        }

        /**
         * Adds multiple periods and rebuilds the mrdad plugin
         * @param {Array} periodsArray example: Array([[0,20],[40,60]...])
         * @return {Object} self instance of MrDad class
         */
        this.addPeriods = function(periodsArray) {
            for (var i = 0; i < periodsArray.length; i++) {
                _addPeriod(periodsArray[i][0], periodsArray[i][1]);
            }
            _rebuild();
            return this;
        };
        /**
         * Adds multiple block to the slider scale
         * @param {Array} blocksArray example: Array([[0,20],[40,60]...])
         * @return {Object} self instance of MrDad class
         */
        this.addBlocks = function(blocksArray) {
            var blocksToAdd = [];
            for (var i = 0; i < blocksArray.length; i++) {
                var startStep = blocksArray[i][0];
                var value = blocksArray[i][1];
                var startId = startStep / _options.step + 1;
                var blocksNo = value / _options.step;

                for (var n = 0; n < blocksNo; n++) {
                    var step = (Number(startId) + n);
                    blocksToAdd.push($('#step_' + step));
                }
                _addBlock(blocksToAdd, value);
                blocksToAdd = [];
            }
            return this;
        };

        this.removeBlock = function(step) {
            _removeBlock(step);
        };

        this.setMode = function(mode) {
            _setMode(mode);
        };

        /**
         * Get period by id
         * @param {Number} id
         * @return {Object}
         */
        this.getPeriod = function(id) {
            var i = _getPeriodKey(id);
            if (i !== -1) {
                return _periods[i].toPublic();
            }
            return null;
        };

        /**
         * Gets all periods for this mrdad instance
         * @return {Array} of each period.toPublic() object
         */
        this.getPeriods = function() {
            var periods = [];
            for (var i = 0; i < _periods.length; i++) {
                periods.push(_periods[i].toPublic());
            }
            return periods;
        };

        /**
         * Sets callback function that can be used for block delete
         *
         * @param {Function} callbackFunction
         *      stores a callback function
         *
         * @example
         *      mrdad.setDeleteBlockCallback(function(callback));
         * @return {Object} self instance of MrDad class
         */
        this.setDeleteBlockCallback = function(callbackFunction) {
            if (typeof(callbackFunction) === 'function') {
                _onDeleteBlock = callbackFunction;
            }
            return this;
        };

        /**
         * Sets callback function that can be used for block add
         *
         * @param {Function} callbackFunction
         *      stores a callback function
         *
         * @example
         *      mrdad.setAddBlockCallback(function(callback));
         * @return {Object} self instance of MrDad class
         */
        this.setAddBlockCallback = function(callbackFunction) {
            if (typeof(callbackFunction) === 'function') {
                _onAddBlock = callbackFunction;
            }
            return this;
        };

        /**
         * Sets callback function that can be used for period delete
         *
         * @param {Function} callbackFunction
         *      stores a callback function
         *
         * @example
         *      mrdad.setDeletePeriodCallback(function(callback));
         * @return {Object} self instance of MrDad class
         */
        this.setDeletePeriodCallback = function(callbackFunction) {
            if (typeof(callbackFunction) === 'function') {
                _onDeletePeriod = callbackFunction;
            }
            return this;
        };

        /**
         * Sets callback function that can be used for period add
         *
         * @param {Function} callbackFunction
         *      stores a callback function
         *
         * @example
         *      mrdad.setAddPeriodCallback(function(callback));
         * @return {Object} self instance of MrDad class
         */
        this.setAddPeriodCallback = function(callbackFunction) {
            if (typeof(callbackFunction) === 'function') {
                _onAddPeriod = callbackFunction;
            }
            return this;
        };


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
         *      mrdad.setDeletePeriodConfirmCallback(function(period, callback) {
         *          callback(function() {
         *             return confirm('Delete period between ' + period.getAbscissas()[0] + ' and ' + period.getAbscissas()[1] + ' ?');
         *          }());
         *      });
         * @return {Object} self instance of MrDad class
         */
        this.setDeletePeriodConfirmCallback = function(confirmFunction) {
            if (typeof(confirmFunction) === 'function') {
                _deletePeriodConfirm = confirmFunction;
            }
            return this;
        };
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
         *      mrdad.setAddPeriodConfirmCallback(function(period, callback) {
         *          callback(function() {
         *             return confirm('Add period between ' + period.getAbscissas()[0] + ' and ' + period.getAbscissas()[1] + ' ?');
         *          }());
         *      });
         * @return {Object} self instance of MrDad class
         */
        this.setAddPeriodConfirmCallback = function(confirmFunction) {
            if (typeof(confirmFunction) === 'function') {
                _addPeriodConfirm = confirmFunction;
            }
            return this;
        };

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
         *      mrdad.setOnHandleMouseenterCallback(function(context, period, edgeIndex) {
         *          var handlePosition = context.offset().left;
         *          var periodId = period.getId();
         *          var handleAbscissa = period.getAbscissas()[edgeIndex];
         *          //...
         *      });
         * @return {Object} self instance of MrDad class
         */
        this.setOnHandleMouseenterCallback = function(callbackFunction) {
            if (typeof(callbackFunction) === 'function') {
                _onHandleMouseenter = callbackFunction;
            }
            return this;
        };

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
         *      mrdad.setOnHandleSlideCallback(function(context, period, edgeIndex) {
         *          var handlePosition = context.offset().left;
         *          var periodId = period.getId();
         *          var handleAbscissa = period.getAbscissas()[edgeIndex];
         *          //...
         *      });
         * @return {Object} self instance of MrDad class
         */
        this.setOnHandleSlideCallback = function(callbackFunction) {
            if (typeof(callbackFunction) === 'function') {
                _onHandleSlide = callbackFunction;
            }
            return this;
        };


        _init();
    };

})(window, jQuery);


// special functionality for IE8
$(function() {
    // to have indexOf working on an array in IE8
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(obj, start) {
            for (var i = (start || 0), j = this.length; i < j; i++) {
                if (this[i] === obj) {
                    return i;
                }
            }
            return -1;
        };
    }

    // to have jQuery forEach in IE8
    if (typeof Array.prototype.forEach !== 'function') {
        Array.prototype.forEach = function(callback) {
            for (var i = 0; i < this.length; i++) {
                callback.apply(this, [this[i], i, this]);
            }
        };
    }
});

// additional workarounds
$(function() {
    // to have info/status on revert
    // http://stackoverflow.com/questions/1853230/jquery-ui-draggable-event-status-on-revert
    $.ui.draggable.prototype._mouseStop = function(event) {
        //If we are using droppables, inform the manager about the drop
        var dropped = false;
        if ($.ui.ddmanager && !this.options.dropBehaviour) {
            dropped = $.ui.ddmanager.drop(this, event);
        }

        //if a drop comes from outside (a sortable)
        if (this.dropped) {
            dropped = this.dropped;
            this.dropped = false;
        }

        if ((this.options.revert === 'invalid' && !dropped) ||
            (this.options.revert === 'valid' && dropped) || this.options.revert === true ||
            ($.isFunction(this.options.revert) && this.options.revert.call(this.element, dropped))) {
            var self = this;
            self._trigger('reverting', event);
            $(this.helper).animate(this.originalPosition, parseInt(this.options.revertDuration, 10), function() {
                event.reverted = true;
                self._trigger('stop', event);
                self._clear();
            });
        } else {
            this._trigger('stop', event);
            this._clear();
        }

        return false;
    };
});
