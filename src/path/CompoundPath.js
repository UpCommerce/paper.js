/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CompoundPath
 *
 * @class A compound path is a complex path that is made up of one or more
 * simple sub-paths. It can have the `nonzero` fill rule, or the `evenodd` rule
 * applied. Both rules use mathematical equations to determine if any region is
 * outside or inside the final shape. The `evenodd` rule is more predictable:
 * Every other region within a such a compound path is a hole, regardless of
 * path direction.
 *
 * All the paths in a compound path take on the style of the compound path and
 * can be accessed through its {@link Item#children} list.
 *
 * @extends PathItem
 */
var CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
    _class: 'CompoundPath',
    _serializeFields: {
        children: []
    },
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See #getPathData() below.
    beans: true,

    /**
     * Creates a new compound path item and places it in the active layer.
     *
     * @param {Path[]} [paths] the paths to place within the compound path
     *
     * @example {@paperscript}
     * // Create a circle shaped path with a hole in it:
     * var circle = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 30
     * });
     *
     * var innerCircle = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 10
     * });
     *
     * var compoundPath = new CompoundPath([circle, innerCircle]);
     * compoundPath.fillColor = 'red';
     *
     * // Move the inner circle 5pt to the right:
     * compoundPath.children[1].position.x += 5;
     */
    /**
     * Creates a new compound path item from an object description and places it
     * at the top of the active layer.
     *
     * @name CompoundPath#initialize
     * @param {Object} object an object containing properties to be set on the
     *     path
     * @return {CompoundPath} the newly created path
     *
     * @example {@paperscript}
     * var path = new CompoundPath({
     *     children: [
     *         new Path.Circle({
     *             center: new Point(50, 50),
     *             radius: 30
     *         }),
     *         new Path.Circle({
     *             center: new Point(50, 50),
     *             radius: 10
     *         })
     *     ],
     *     fillColor: 'black',
     *     selected: true
     * });
     */
    /**
     * Creates a new compound path item from SVG path-data and places it at the
     * top of the active layer.
     *
     * @name CompoundPath#initialize
     * @param {String} pathData the SVG path-data that describes the geometry
     * of this path
     * @return {CompoundPath} the newly created path
     *
     * @example {@paperscript}
     * var pathData = 'M20,50c0,-16.56854 13.43146,-30 30,-30c16.56854,0 30,13.43146 30,30c0,16.56854 -13.43146,30 -30,30c-16.56854,0 -30,-13.43146 -30,-30z M50,60c5.52285,0 10,-4.47715 10,-10c0,-5.52285 -4.47715,-10 -10,-10c-5.52285,0 -10,4.47715 -10,10c0,5.52285 4.47715,10 10,10z';
     * var path = new CompoundPath(pathData);
     * path.fillColor = 'black';
     */
    initialize: function CompoundPath(arg) {
        // CompoundPath has children and supports named children.
        this._children = [];
        this._namedChildren = {};
        this._fillImage = null;
        this._loaded = false;
        this._fillImageSettings = null;
        if (!this._initialize(arg)) {
            if (typeof arg === 'string') {
                this.setPathData(arg);
            } else {
                this.addChildren(Array.isArray(arg) ? arg : arguments);
            }
        }
    },

    getLoaded: function () {
        return this._loaded;
    },

    setLoaded: function (loaded) {
        this._loaded = loaded;
    },

    getFillImage: function () {
        return this._fillImage ? this._fillImage.src : null;
    },

    setFillImage: function (url) {
        var that = this;

        if (!url && that._fillImage) {
            that._loaded = true;
            that._fillImage = null;
            this._changed(/*#=*/Change.STYLE);
        }

        if (url) {
            function emit(event) {
                var view = that.getView(),
                    type = event && event.type || 'load';
                if (view && that.responds(type)) {
                    paper = view._scope;
                    that.emit(type, new Event(event));
                }
            }

            // Check if image is already cached
            var cachedImage = ImageCache.get(url);
            if (cachedImage) {
                that._loaded = true;
                that._fillImage = cachedImage;
                that._changed(/*#=*/Change.STYLE);
                // Emit load event for cached image
                emit({ type: 'load' });
                return;
            }

            var image = new self.Image();
            image.crossOrigin = 'anonymous';
            image.src = url;

            that._loaded = (image && image.src && image.complete);

            // Trigger the load event on the image once it's loaded
            DomEvent.add(image, {
                load: function (event) {
                    that._loaded = true;
                    that._fillImage = image;
                    // Cache the loaded image
                    ImageCache.set(url, image);
                    that._changed(/*#=*/Change.STYLE);
                    emit(event);
                },
                error: emit
            });

            this._changed(/*#=*/Change.STYLE);
        }
    },

    getFillImageSettings: function () {
        return this._fillImageSettings;
    },

    setFillImageSettings: function (textureOptions) {
        this._fillImageSettings = textureOptions;
        this._changed(/*#=*/Change.STYLE);
    },

    insertChildren: function insertChildren(index, items) {
        // If we're passed a segment array describing a simple path instead of a
        // compound-path, wrap it in another array to turn it into the array
        // notation for compound-paths.
        var list = items,
            first = list[0];
        if (first && typeof first[0] === 'number')
            list = [list];
        // Perform some conversions depending on the type of item passed:
        // Convert array-notation to paths, and expand compound-paths in the
        // items list by adding their children to the it replacing their parent.
        for (var i = items.length - 1; i >= 0; i--) {
            var item = list[i];
            // Clone the list array before modifying it, as it may be a passed
            // children array from another item.
            if (list === items && !(item instanceof Path))
                list = Base.slice(list);
            if (Array.isArray(item)) {
                list[i] = new Path({ segments: item, insert: false });
            } else if (item instanceof CompoundPath) {
                list.splice.apply(list, [i, 1].concat(item.removeChildren()));
                item.remove();
            }
        }
        return insertChildren.base.call(this, index, list);
    },

    // DOCS: reduce()
    // TEST: reduce()
    reduce: function reduce(options) {
        var children = this._children;
        for (var i = children.length - 1; i >= 0; i--) {
            var path = children[i].reduce(options);
            if (path.isEmpty())
                path.remove();
        }
        if (!children.length) { // Replace with a simple empty Path
            var path = new Path(Item.NO_INSERT);
            path.copyAttributes(this);
            path.insertAbove(this);
            this.remove();
            return path;
        }
        return reduce.base.call(this);
    },

    /**
     * Specifies whether the compound-path is fully closed, meaning all its
     * contained sub-paths are closed path.
     *
     * @bean
     * @type Boolean
     * @see Path#closed
     */
    isClosed: function() {
        var children = this._children;
        for (var i = 0, l = children.length; i < l; i++) {
            if (!children[i]._closed)
                return false;
        }
        return true;
    },

    setClosed: function(closed) {
        var children = this._children;
        for (var i = 0, l = children.length; i < l; i++) {
            children[i].setClosed(closed);
        }
    },

    /**
     * The first Segment contained within the compound-path, a short-cut to
     * calling {@link Path#firstSegment} on {@link Item#firstChild}.
     *
     * @bean
     * @type Segment
     */
    getFirstSegment: function() {
        var first = this.getFirstChild();
        return first && first.getFirstSegment();
    },

    /**
     * The last Segment contained within the compound-path, a short-cut to
     * calling {@link Path#lastSegment} on {@link Item#lastChild}.
     *
     * @bean
     * @type Segment
     */
    getLastSegment: function() {
        var last = this.getLastChild();
        return last && last.getLastSegment();
    },

    /**
     * All the curves contained within the compound-path, from all its child
     * {@link Path} items.
     *
     * @bean
     * @type Curve[]
     */
    getCurves: function() {
        var children = this._children,
            curves = [];
        for (var i = 0, l = children.length; i < l; i++) {
            Base.push(curves, children[i].getCurves());
        }
        return curves;
    },

    /**
     * The first Curve contained within the compound-path, a short-cut to
     * calling {@link Path#firstCurve} on {@link Item#firstChild}.
     *
     * @bean
     * @type Curve
     */
    getFirstCurve: function() {
        var first = this.getFirstChild();
        return first && first.getFirstCurve();
    },

    /**
     * The last Curve contained within the compound-path, a short-cut to
     * calling {@link Path#lastCurve} on {@link Item#lastChild}.
     *
     * @bean
     * @type Curve
     */
    getLastCurve: function() {
        var last = this.getLastChild();
        return last && last.getLastCurve();
    },

    /**
     * The area that the compound-path's geometry is covering, calculated by
     * getting the {@link Path#area} of each sub-path and it adding up.
     * Note that self-intersecting paths and sub-paths of different orientation
     * can result in areas that cancel each other out.
     *
     * @bean
     * @type Number
     */
    getArea: function() {
        var children = this._children,
            area = 0;
        for (var i = 0, l = children.length; i < l; i++)
            area += children[i].getArea();
        return area;
    },

    /**
     * The total length of all sub-paths in this compound-path, calculated by
     * getting the {@link Path#length} of each sub-path and it adding up.
     *
     * @bean
     * @type Number
     */
    getLength: function() {
        var children = this._children,
            length = 0;
        for (var i = 0, l = children.length; i < l; i++)
            length += children[i].getLength();
        return length;
    },

    getPathData: function(_matrix, _precision) {
        // NOTE: #setPathData() is defined in PathItem.
        var children = this._children,
            paths = [];
        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i],
                mx = child._matrix;
            paths.push(child.getPathData(_matrix && !mx.isIdentity()
                    ? _matrix.appended(mx) : _matrix, _precision));
        }
        return paths.join('');
    },

    _hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
        return _hitTestChildren.base.call(this, point,
                // If we're not specifically asked to returns paths through
                // options.class == Path, do not test children for fill, since a
                // compound path forms one shape.
                // Also support legacy format `type: 'path'`.
                options.class === Path || options.type === 'path' ? options
                    : Base.set({}, options, { fill: false }),
                viewMatrix);
    },

    _draw: function(ctx, param, viewMatrix, strokeMatrix) {
        var children = this._children;
        // Return early if the compound path doesn't have any children:
        if (!children.length)
            return;

        param = param.extend({ dontStart: true, dontFinish: true });
        ctx.beginPath();
        for (var i = 0, l = children.length; i < l; i++){
            children[i].draw(ctx, param, strokeMatrix);
        }

        if (!param.clip && !this._fillImage) {
            this._setStyles(ctx, param, viewMatrix);
            var style = this._style;
            if (style.hasFill()) {
                ctx.fill(style.getFillRule());
                ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            if (style.hasStroke())
                ctx.stroke();
        }

        if(this._fillImage){
			var bounds = this.bounds;
			const textWidth = bounds.width;
			var scaling = Math.max(5, textWidth / 50);
            
			var canvasWidth = Math.round(textWidth * scaling);
			var canvasHeight = Math.round(bounds.height * scaling * 1.5);

			if (canvasWidth <= 0 || canvasHeight <= 0) {
				return;
			}
            // canvasWidth e canvasHeight creano problemi di performance
            // (va a scatti)
            // 100 valore arbitrario per fare spazio allo stroke (va cambiato)
			canvasWidth = bounds.width + 100;
			canvasHeight = bounds.height + 100;
			var newCtx = CanvasProvider.getContext(canvasWidth, canvasHeight);

			this._setStyles(newCtx, param, viewMatrix);

			let myTest = () => {
				return false;
			}
			var DEBUG = myTest();

			if (DEBUG) {
				document.body.append(newCtx.canvas);
				newCtx.canvas.style.position = 'fixed';
				newCtx.canvas.style.left = '0px';
				newCtx.canvas.style.top = '0px';
				newCtx.canvas.style.zIndex = '1000';

				CanvasProvider.release(newCtx);
			}

			var style = this._style;
			newCtx.shadowColor = null;
			newCtx.font = ctx.font;

			const positionX = canvasWidth/2 - bounds.center.x;
			const positionY = canvasHeight/2 - bounds.center.y;

			newCtx.translate(positionX, positionY);

			for (var i = 0, l = children.length; i < l; i++){
				const child = children[i];
				child.draw(newCtx, param, strokeMatrix);
			}
			var imageRatio = this._fillImage.width / this._fillImage.height;

			if (style.hasFill()) {
				newCtx.fill(style.getFillRule());
				newCtx.shadowColor = 'rgba(0,0,0,0)';
			}


			newCtx.globalCompositeOperation = "source-in";
			const imagePositionX = -bounds.width/2 + bounds.center.x;
			const imagePositionY = -bounds.height/2 + bounds.center.y;
			newCtx.translate(imagePositionX,imagePositionY);

			let leftImage = 0;
			let topImage = 0;
			let widthImage = textWidth;
			let heightImage = textWidth / imageRatio;

			if (bounds.height > bounds.width) {
				heightImage = bounds.height;
				widthImage = bounds.height * imageRatio;
			}

			if (this._fillImageSettings && widthImage > 0 && heightImage > 0) {
				if (this._fillImageSettings.syncRatio) {
					if (this._fillImageSettings.hasOwnProperty("scaling")) {
						widthImage *= this._fillImageSettings.scaling;
						heightImage *= this._fillImageSettings.scaling;
					}
				} else {
					if (this._fillImageSettings.hasOwnProperty("scalingX")) {
						widthImage *= this._fillImageSettings.scalingX;
					}
					if (this._fillImageSettings.hasOwnProperty("scalingY")) {
						heightImage *= this._fillImageSettings.scalingY;
					}
				}
				if (this._fillImageSettings.hasOwnProperty("leftPosition")) {
					leftImage += this._fillImageSettings.leftPosition;
				}
				if (this._fillImageSettings.hasOwnProperty("topPosition")) {
					topImage -= this._fillImageSettings.topPosition;
				}
			}

			newCtx.translate(leftImage, topImage);

			if (this._fillImageSettings && widthImage > 0 && heightImage > 0) {

				if (this._fillImageSettings.horizontalFlip) {
					newCtx.translate(widthImage, 0);
					newCtx.scale(-1, 1);
				}
				if (this._fillImageSettings.verticalFlip) {
					newCtx.translate(0, heightImage);
					newCtx.scale(1, -1);
				}
				if (this._fillImageSettings.hasOwnProperty("rotation")) {
					newCtx.translate(widthImage / 2, heightImage / 2);
					var radiants = (this._fillImageSettings.rotation * Math.PI) / 180;
					newCtx.rotate(radiants);
					newCtx.translate(-widthImage / 2, -heightImage / 2);
				}
			}

			if (widthImage > 0 && heightImage > 0 && bounds.height > 0) {
				newCtx.drawImage(this._fillImage, 0, 0, widthImage, heightImage);
			}

			newCtx.globalCompositeOperation = "source-over";

			if (style.hasStroke()){
				newCtx.stroke();
			}

			ctx.drawImage(newCtx.canvas, -positionX, -positionY);
		}
    },

    _drawSelected: function(ctx, matrix, selectionItems) {
        var children = this._children;
        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i],
                mx = child._matrix;
            // Do not draw this child now if it's separately marked as selected,
            // as it would be drawn twice otherwise.
            if (!selectionItems[child._id]) {
                child._drawSelected(ctx, mx.isIdentity() ? matrix
                        : matrix.appended(mx));
            }
        }
    }
},
new function() { // Injection scope for PostScript-like drawing functions
    /**
     * Helper method that returns the current path and checks if a moveTo()
     * command is required first.
     */
    function getCurrentPath(that, check) {
        var children = that._children;
        if (check && !children.length)
            throw new Error('Use a moveTo() command first');
        return children[children.length - 1];
    }

    // Redirect all other drawing commands to the current path
    return Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
            'arcTo', 'lineBy', 'cubicCurveBy', 'quadraticCurveBy', 'curveBy',
            'arcBy'],
        function(key) {
            this[key] = function() {
                var path = getCurrentPath(this, true);
                path[key].apply(path, arguments);
            };
        }, {
            // NOTE: Documentation for these methods is found in PathItem, as
            // they are considered abstract methods of PathItem and need to be
            // defined in all implementing classes.
            moveTo: function(/* point */) {
                var current = getCurrentPath(this),
                    // Reuse current path if nothing was added yet
                    path = current && current.isEmpty() ? current
                            : new Path(Item.NO_INSERT);
                if (path !== current)
                    this.addChild(path);
                path.moveTo.apply(path, arguments);
            },

            moveBy: function(/* point */) {
                var current = getCurrentPath(this, true),
                    last = current && current.getLastSegment(),
                    point = Point.read(arguments);
                this.moveTo(last ? point.add(last._point) : point);
            },

            closePath: function(tolerance) {
                getCurrentPath(this, true).closePath(tolerance);
            }
        }
    );
}, Base.each(['reverse', 'flatten', 'simplify', 'smooth'], function(key) {
    // Injection scope for methods forwarded to the child paths.
    // NOTE: Documentation is in PathItem
    this[key] = function(param) {
        var children = this._children,
            res;
        for (var i = 0, l = children.length; i < l; i++) {
            res = children[i][key](param) || res;
        }
        return res;
    };
}, {}));
