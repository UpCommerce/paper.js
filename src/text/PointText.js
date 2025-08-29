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

			if (!this._fillImage) {
				if (hasFill) {
					ctx.fillText(line, 0, 0);
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}

				if (hasStroke) {
					ctx.strokeText(line, 0, 0);
				}
			} /*else if (this.data.fillImageStrokedText) {

				// Render the normal text for the shadows
				if (ctx.shadowColor && ctx.shadowColor !== 'rgba(0,0,0,0)') {
					ctx.fillText(line, 0, 0);
				}

				// Draw a stroke with the text shape as hole
				var bounds = this._getBounds(null, { actualText: true });
				const textWidth = bounds.width + style.strokeWidth * 2;
				var scaling = Math.max(5, textWidth / 50); // GEneric good quality for the rendering
				var canvasWidth = Math.round(textWidth * scaling);
				var canvasHeight = Math.round(bounds.height * scaling * 1.5);

				if (canvasWidth <= 0 || canvasHeight <= 0) {
					// If the text is too small, we don't render it.
					continue;
				}

				var newCtx = CanvasProvider.getContext(canvasWidth, canvasHeight);
				this._setStyles(newCtx, param, viewMatrix);
				newCtx.shadowColor = 'rgba(0,0,0,0)';
				newCtx.scale(scaling, scaling);
				newCtx.translate(style.strokeWidth, bounds.height);
				newCtx.font = ctx.font;

				if (hasStroke) {
					newCtx.strokeText(line, 0, 0);
				}

				newCtx.globalCompositeOperation = "destination-out";

				if (hasFill) {
					newCtx.fillText(line, 0, 0);
				}

				var metrics = ctx.measureText(line);

				// newCtx is bigger then the main, so to avoid a double scaling
				let boundingBoxLeft = metrics.actualBoundingBoxLeft;
				if (ctx.textAlign == "center") {
					const halfWidth = metrics.width / 2;
					boundingBoxLeft = halfWidth;
					newCtx.translate(halfWidth, 0);
				}

				ctx.translate(-boundingBoxLeft - style.strokeWidth, -bounds.height);
				// we need to scale it down the main ctx for a moment.
				ctx.scale(1 / scaling, 1 / scaling);
				ctx.drawImage(newCtx.canvas, 0, 0);
				ctx.scale(scaling, scaling);
				ctx.translate(0, bounds.height);

			} */     else {
				var metrics = ctx.measureText(line);
				var bounds = this._getBounds(null, { actualText: true });
				const textWidth = bounds.width;
				var scaling = Math.ceil(Math.max(5, textWidth / 50)); // Generic good quality for the rendering
				const extraSpaceWidth = 10 * scaling; // Sembra che la larghezza non sia precisa
				var canvasWidth = Math.round(textWidth * scaling + extraSpaceWidth);
				var canvasHeight = Math.round(bounds.height * scaling * 1.5);

				if (canvasWidth <= 0 || canvasHeight <= 0) {
					// If the text is too small, we don't render it.
					continue;
				}

				var newCtx = CanvasProvider.getContext(canvasWidth, canvasHeight);
				this._setStyles(newCtx, param, viewMatrix);
				newCtx.shadowColor = 'rgba(0,0,0,0)';
				//ctx.shadowColor = 'rgba(0,0,0,0)';
				newCtx.scale(scaling, scaling);
				newCtx.translate(0, bounds.height);
				newCtx.font = ctx.font;

				if (hasFill) {
					newCtx.fillText(line, 0, 0);
				}

				newCtx.translate(bounds.x, bounds.y);
				newCtx.globalCompositeOperation = "source-atop";
				var imageRatio = this._fillImage.width / this._fillImage.height;


				var leftImage = 0;
				var topImage = 0;
				var widthImage = textWidth;
				var heightImage = textWidth / imageRatio;

				// if (bounds.height > bounds.width) {
				// 	heightImage = bounds.height;
				// 	widthImage = bounds.height * imageRatio;
				// }

				if(heightImage < bounds.height){
					heightImage = bounds.height;
					widthImage = bounds.height * imageRatio;
				}

				if (this._fillImageSettings && widthImage > 0 && heightImage > 0) {
					var hasTextWidth = this._fillImageSettings.hasOwnProperty("textWidth");
					var hasTextHeight = this._fillImageSettings.hasOwnProperty("textHeight");

					if (hasTextWidth) {
						widthImage = Math.ceil(this._fillImageSettings.textWidth);
						heightImage = Math.ceil(widthImage / imageRatio);
					}

					if (hasTextWidth && hasTextHeight && heightImage < this._fillImageSettings.textHeight) {
						heightImage = Math.ceil(this._fillImageSettings.textHeight);
						widthImage = Math.ceil(this._fillImageSettings.textHeight * imageRatio);
					}

					if (this._fillImageSettings.hasOwnProperty("offsetLeft")) {
						leftImage = -this._fillImageSettings.offsetLeft;
					}
					if (this._fillImageSettings.hasOwnProperty("offsetTop")) {
						topImage = -this._fillImageSettings.offsetTop;
					}

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
					let boundingBoxLeft = 0;
					let imageLeftOffset = metrics.actualBoundingBoxLeft;
					if (ctx.textAlign == "center") {
						const halfWidth = metrics.width / 2;
						boundingBoxLeft = halfWidth;
						newCtx.translate(halfWidth, 0);
						imageLeftOffset = 0;
					}
					newCtx.drawImage(this._fillImage, -imageLeftOffset, 0, widthImage, heightImage);
					// newCtx is bigger then the main, so to avoid a double scaling

					ctx.translate(-boundingBoxLeft, -bounds.height);
					// we need to scale it down the main ctx for a moment.
					ctx.scale(1 / scaling, 1 / scaling);
					ctx.drawImage(newCtx.canvas, 0, 0);
					ctx.scale(scaling, scaling);
					ctx.translate(0, bounds.height);

					var DEBUG = false;

					if (DEBUG) {
						document.body.append(newCtx.canvas);
						newCtx.canvas.style.position = 'fixed';
						newCtx.canvas.style.left = '0px';
						newCtx.canvas.style.top = '0px';
						newCtx.canvas.style.zIndex = '1000';
						CanvasProvider.release(newCtx);
					}

					CanvasProvider.release(newCtx);
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
			width = options && options.actualText ? this.getView().getActualTextWidth(style.getFontStyle(), lines) : this.getView().getTextWidth(style.getFontStyle(), lines),
		//baseLine = this.getView().getBaseLine(style.getFontStyle(), lines),
		//height = this.getView().getTextHeight(style.getFontStyle(), lines),
			x = 0;
		// Adjust for different justifications.
		if (justification !== 'left')
			x -= width / (justification === 'center' ? 2 : 1);
		// Until we don't have baseline measuring, assume 1 / 4 leading as a
		// rough guess:
		var rect = new Rectangle(x,
			numLines ? -0.75 * leading : 0,
			width, numLines * leading);
		return matrix ? matrix._transformBounds(rect, rect) : rect;
	}
});
