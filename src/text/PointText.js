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
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = TextItem.extend(/** @lends PointText# */{
	_class: 'PointText',

	/**
	 * Creates a point text item
	 *
	 * @name PointText#initialize
	 * @param {Point} point the position where the text will start
	 * @return {PointText} the newly created point text
	 *
	 * @example {@paperscript}
	 * var text = new PointText(new Point(200, 50));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 */
	/**
	 * Creates a point text item from the properties described by an object
	 * literal.
	 *
	 * @name PointText#initialize
	 * @param {Object} object an object containing properties describing the
	 *     path's attributes
	 * @return {PointText} the newly created point text
	 *
	 * @example {@paperscript}
	 * var text = new PointText({
	 *     point: [50, 50],
	 *     content: 'The contents of the point text',
	 *     fillColor: 'black',
	 *     fontFamily: 'Courier New',
	 *     fontWeight: 'bold',
	 *     fontSize: 25
	 * });
	 */
	initialize: function PointText() {
		TextItem.apply(this, arguments);
	},

	/**
	 * The PointText's anchor point
	 *
	 * @bean
	 * @type Point
	 */
	getPoint: function () {
		// Se Item#getPosition for an explanation why we create new LinkedPoint
		// objects each time.
		var point = this._matrix.getTranslation();
		return new LinkedPoint(point.x, point.y, this, 'setPoint');
	},

	setPoint: function (/* point */) {
		var point = Point.read(arguments);
		this.translate(point.subtract(this._matrix.getTranslation()));
	},

	_draw: function (ctx, param, viewMatrix) {
		if (!this._content)
			return;
		this._setStyles(ctx, param, viewMatrix);
		var lines = this._lines,
			style = this._style,
			hasFill = style.hasFill(),
			hasStroke = style.hasStroke(),
			leading = style.getLeading(),
			shadowColor = ctx.shadowColor;
		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();

		for (var i = 0, l = lines.length; i < l; i++) {
			ctx.shadowColor = shadowColor;

			var line = lines[i];

			if (!this._textureFill) {
				if (hasFill) {
					ctx.fillText(line, 0, 0);
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}

				if (hasStroke) {
					ctx.strokeText(line, 0, 0);
				}
			} else {
				var bounds = this._getBounds();
				var scaling = this._matrix.scaling.x
				var newCtx = CanvasProvider.getContext(bounds.width * scaling, bounds.height * scaling * 1.5);
				this._setStyles(newCtx, param, viewMatrix);
				newCtx.shadowColor = 'rgba(0,0,0,0)';
				newCtx.scale(scaling, scaling);
				newCtx.translate(0, bounds.height);
				newCtx.font = ctx.font;

				// newCtx.textAlign = ctx.textAlign;


				if (hasFill) {
					newCtx.fillText(line, 0, 0);
				}

				if (this._textureFill) {
					var dx = 0;
					if (ctx.textAlign == "center") {
						dx = -bounds.width / 2;
					}
					newCtx.translate(bounds.x - dx, bounds.y);
					newCtx.globalCompositeOperation = "source-atop";
					var imageRatio = this._textureFill.width / this._textureFill.height;


					var leftImage = 0;
					var topImage = 0;
					var widthImage = bounds.width;
					var heightImage = bounds.width / imageRatio;

					if (bounds.height > bounds.width) {
						heightImage = bounds.height;
						widthImage = bounds.height * imageRatio;
					}

					if (this._textureOptions && widthImage > 0 && heightImage > 0) {
						var hasTextWidth = this._textureOptions.hasOwnProperty("textWidth");
						var hasTextHeight = this._textureOptions.hasOwnProperty("textHeight");

						if (hasTextWidth) {
							widthImage = this._textureOptions.textWidth;
							heightImage = widthImage / imageRatio;
						}

						if (hasTextWidth && hasTextHeight && this._textureOptions.textHeight > this._textureOptions.textWidth) {
							heightImage = this._textureOptions.textHeight;
							widthImage = this._textureOptions.textHeight * imageRatio;
						}

						if (this._textureOptions.hasOwnProperty("offsetLeft")) {
							leftImage = -this._textureOptions.offsetLeft;
						}
						if (this._textureOptions.hasOwnProperty("offsetTop")) {
							topImage = -this._textureOptions.offsetTop;
						}

						if (this._textureOptions.syncRatio) {
							if (this._textureOptions.hasOwnProperty("scaling")) {
								widthImage *= this._textureOptions.scaling;
								heightImage *= this._textureOptions.scaling;
							}
						} else {
							if (this._textureOptions.hasOwnProperty("scalingX")) {
								widthImage *= this._textureOptions.scalingX;
							}
							if (this._textureOptions.hasOwnProperty("scalingY")) {
								heightImage *= this._textureOptions.scalingY;
							}
						}


						if (this._textureOptions.hasOwnProperty("leftPosition")) {
							leftImage += this._textureOptions.leftPosition;
						}
						if (this._textureOptions.hasOwnProperty("topPosition")) {
							topImage -= this._textureOptions.topPosition;
						}
					}

					newCtx.translate(leftImage, topImage);

					if (this._textureOptions && widthImage > 0 && heightImage > 0) {

						if (this._textureOptions.horizontalFlip) {
							newCtx.translate(widthImage, 0);
							newCtx.scale(-1, 1);
						}
						if (this._textureOptions.verticalFlip) {
							newCtx.translate(0, heightImage);
							newCtx.scale(1, -1);
						}

						if (this._textureOptions.hasOwnProperty("rotation")) {
							newCtx.translate(widthImage / 2, heightImage / 2);
							var radiants = (this._textureOptions.rotation * Math.PI) / 180;
							newCtx.rotate(radiants);
							newCtx.translate(-widthImage / 2, -heightImage / 2);
						}

					}

					if (widthImage > 0 && heightImage > 0 && bounds.height > 0) {
						newCtx.drawImage(this._textureFill, 0, 0, widthImage, heightImage);

						// newCtx is bigger then the main, so to avoid a double scaling
						ctx.translate(0, -bounds.height);
						// we need to scale it down the main ctx for a moment.
						ctx.scale(1 / scaling, 1 / scaling);
						ctx.drawImage(newCtx.canvas, dx, 0);
						ctx.scale(scaling, scaling);
						ctx.translate(0, bounds.height);

						if (hasStroke) {
							newCtx.strokeText(line, 0, 0);
						}

						var DEBUG = false;

						if (DEBUG) {
							document.body.append(newCtx.canvas);
							newCtx.canvas.style.position = 'fixed';
							newCtx.canvas.style.left = '0px';
							newCtx.canvas.style.top = '0px';
							newCtx.canvas.style.zIndex = '1000';
							CanvasProvider.release(newCtx);
						}
					}
				}
			}

			ctx.translate(0, leading);
		}
	},

	_getBounds: function (matrix, options) {
		var style = this._style,
			lines = this._lines,
			numLines = lines.length,
			justification = style.getJustification(),
			leading = style.getLeading(),
			width = this.getView().getTextWidth(style.getFontStyle(), lines),
			x = 0;
		// Adjust for different justifications.
		if (justification !== 'left')
			x -= width / (justification === 'center' ? 2 : 1);
		// Until we don't have baseline measuring, assume 1 / 4 leading as a
		// rough guess:
		var rect = new Rectangle(x,
			numLines ? - 0.75 * leading : 0,
			width, numLines * leading);
		return matrix ? matrix._transformBounds(rect, rect) : rect;
	}
});
