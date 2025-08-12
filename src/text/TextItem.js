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

// ImageCache for texture fills - maintains up to 10 cached images
var ImageCache = {
    _cache: new Map(),
    _order: [],
    _maxSize: 10,

    get: function (url) {
        var cachedEntry = this._cache.get(url);
        if (cachedEntry) {
            // Move to end to mark as recently used
            var index = this._order.indexOf(url);
            if (index > -1) {
                this._order.splice(index, 1);
            }
            this._order.push(url);
            return cachedEntry.image;
        }
        return null;
    },

    set: function (url, image) {
        // Remove oldest entries if cache is full
        while (this._order.length >= this._maxSize) {
            var oldest = this._order.shift();
            this._cache.delete(oldest);
        }

        this._cache.set(url, { image: image, timestamp: Date.now() });
        this._order.push(url);
    },

    has: function (url) {
        return this._cache.has(url);
    }
};

/**
 * @name TextItem
 *
 * @class The TextItem type allows you to create typography. Its functionality
 *     is inherited by different text item types such as {@link PointText}, and
 *     {@link AreaText} (coming soon). They each add a layer of functionality
 *     that is unique to their type, but share the underlying properties and
 *     functions that they inherit from TextItem.
 *
 * @extends Item
 */
var TextItem = Item.extend(/** @lends TextItem# */{
    _class: 'TextItem',
    _applyMatrix: false,
    _canApplyMatrix: false,
    _serializeFields: {
        content: null,
        textureFill: null,
        textureOptions: null,
    },
    // TextItem doesn't make the distinction between the different bounds,
    // so use the same name for all of them
    _boundsOptions: { stroke: false, handle: false },

    initialize: function TextItem(arg) {
        this._content = '';
        this._lines = [];
        this._textureFill = null;
        this._textureFillUrl = null;
        this._loaded = false;
        this._textureOptions = null;
        // Support two forms of item initialization: Passing one object literal
        // describing all the different properties to be set, or a point where
        // it should be placed (arg).
        // See if a point is passed, and if so, pass it on to _initialize().
        // If not, it might be a properties object literal.
        var hasProps = arg && Base.isPlainObject(arg)
            && arg.x === undefined && arg.y === undefined;
        this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
    },

    _equals: function (item) {
        return this._content === item._content;
    },

    copyContent: function (source) {
        this.setContent(source._content);
    },

    /**
     * The text contents of the text item.
     *
     * @bean
     * @type String
     *
     * @example {@paperscript}
     * // Setting the content of a PointText item:
     *
     * // Create a point-text item at {x: 30, y: 30}:
     * var text = new PointText(new Point(30, 30));
     * text.fillColor = 'black';
     *
     * // Set the content of the text item:
     * text.content = 'Hello world';
     *
     * @example {@paperscript}
     * // Interactive example, move your mouse over the view below:
     *
     * // Create a point-text item at {x: 30, y: 30}:
     * var text = new PointText(new Point(30, 30));
     * text.fillColor = 'black';
     *
     * text.content = 'Move your mouse over the view, to see its position';
     *
     * function onMouseMove(event) {
     *     // Each time the mouse is moved, set the content of
     *     // the point text to describe the position of the mouse:
     *     text.content = 'Your position is: ' + event.point.toString();
     * }
     */
    getContent: function () {
        return this._content;
    },

    setContent: function (content) {
        this._content = '' + content;
        this._lines = this._content.split(/\r\n|\n|\r/mg);
        this._changed(/*#=*/Change.CONTENT);
    },

    getLoaded: function () {
        return this._loaded;
    },

    setLoaded: function (loaded) {
        this._loaded = loaded;
    },

    getTextureFill: function () {
        return this._textureFillUrl;
    },

    setTextureFill: function (url) {
        var that = this;

        if (!url && that._textureFill) {
            that._loaded = true;
            that._textureFill = null;
            this._changed(/*#=*/Change.STYLE);
        }

        this._textureFillUrl = url;

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
                that._textureFill = cachedImage;
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
                    that._textureFill = image;
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

    getTextureOptions: function () {
        return this._textureOptions;
    },

    setTextureOptions: function (textureOptions) {
        this._textureOptions = textureOptions;
        this._changed(/*#=*/Change.STYLE);
    },

    isEmpty: function () {
        return !this._content;
    },

    /**
     * {@grouptitle Character Style}
     *
     * The font-family to be used in text content.
     *
     * @name TextItem#fontFamily
     * @type String
     * @default 'sans-serif'
     */

    /**
     *
     * The font-weight to be used in text content.
     *
     * @name TextItem#fontWeight
     * @type String|Number
     * @default 'normal'
     */

    /**
     * The font size of text content, as a number in pixels, or as a string with
     * optional units `'px'`, `'pt'` and `'em'`.
     *
     * @name TextItem#fontSize
     * @type Number|String
     * @default 10
     */

    /**
     *
     * The font-family to be used in text content, as one string.
     * @deprecated use {@link #fontFamily} instead.
     *
     * @name TextItem#font
     * @type String
     * @default 'sans-serif'
     */

    /**
     * The text leading of text content.
     *
     * @name TextItem#leading
     * @type Number|String
     * @default fontSize * 1.2
     */

    /**
     * {@grouptitle Paragraph Style}
     *
     * The justification of text paragraphs.
     *
     * @name TextItem#justification
     * @type String
     * @values 'left', 'right', 'center'
     * @default 'left'
     */

    /**
     * @bean
     * @private
     * @deprecated use {@link #style} instead.
     */
    getCharacterStyle: '#getStyle',
    setCharacterStyle: '#setStyle',

    /**
     * @bean
     * @private
     * @deprecated use {@link #style} instead.
     */
    getParagraphStyle: '#getStyle',
    setParagraphStyle: '#setStyle'
});
