import { Path } from "./Path";

import { Transform } from "./Transform";

export function extractPoints(points) {
	if (typeof points == "string") {
		const matched = points.match(/(\-?)\d+\,(\-?)\d+/g);
		if (!matched) return [];
		return Array.from(matched, (p) => p.split(",")).map(([x, y]) => ({ x, y }));
	}
	if (Array.isArray(points)) {
		return points.reduce((result, point) => {
			if (point && typeof point == "object") {
				if ("x" in point || "y" in point) {
					const { x, y } = point;
					result.push({ x: +x, y: +y });
				}
			}
			return result;
		}, []);
	}
	return [];
}

export function withDefaultValue(...values) {
	const map = {};
	const defaultValue = values[0];
	values.forEach((value) => (map[value] = value));
	return {
		get: (key) => map[key] || defaultValue,
		get default() {
			return defaultValue;
		},
	};
}
export const genericCanvas = createGenericCanvas();

const genericContext = genericCanvas.getContext("2d");
export const getGenericContext = () => genericContext;
export function withNode(Target) {
	return class extends Target {
		constructor(...args) {
			super(...args);
			this.previousSibling = null;
			this.nextSibling = null;
			this.parentNode = null;
			this._invalidatale = true;
		}

		get invalidatale() {
			return this._invalidatale;
		}
		set invalidatale(value) {
			this._invalidatale = value;
		}
		invalidate() {
			if (!this.invalidatale || !this.parentNode) return;
			this.parentNode.invalidate();
		}
		reset() {
			var container = this.parentNode;
			if (container) {
				var previous = this.previousSibling,
					next = this.nextSibling;
				if (previous) previous.nextSibling = next;
				else container.firstChild = next;
				if (next) next.previousSibling = previous;
				else container.lastChild = this.previousSibling;
			}
			this.previousSibling = null;
			this.nextSibling = null;
			this.parentNode = null;
			return this;
		}
		injectBefore(sibling) {
			if (sibling == this)
				throw new Error(" Can not insert node before itself");
			this.reset();
			var container = sibling.parentNode;
			if (!container) return this;
			var previous = sibling.previousSibling;
			if (previous) {
				previous.nextSibling = this;
				this.previousSibling = previous;
			} else {
				container.firstChild = this;
			}
			sibling.previousSibling = this;
			this.nextSibling = sibling;
			this.parentNode = container;
			return this;
		}
		remove = () => this.reset();
		inject(container) {
			if (container && this.parentNode == container) this.reset();
			var last = container.lastChild;
			if (last) {
				last.nextSibling = this;
				this.previousSibling = last;
			} else {
				container.firstChild = this;
			}
			container.lastChild = this;
			this.parentNode = container;
			return this;
		}
	};
}

export function updateGenricCanvas({ width, height }) {
	genericCanvas.height = height;
	genericCanvas.width = width;
}

function createGenericCanvas() {
	const Canvas =
		typeof OffscreenCanvas != "undefined"
			? OffscreenCanvas
			: function (width, height) {
					const canvas = document.createElement("canvas");
					canvas.height = height;
					canvas.width = width;
					return canvas;
			  };
	return new Canvas(1, 1);
}
class Fill {
	constructor(...args) {
		this._args = args;
		this.transform = null;
		this.context = genericContext;
	}
	static create(fill, instance) {
		fill = fill instanceof Fill ? fill : new Fill(fill);
		fill.fill(instance);
	}

	static fill(instance, fill) {
		fill = fill instanceof Fill ? fill : new Fill(fill);
		fill.fill(instance);
	}

	fill(instance) {
		instance._fill = this._args.join("");
	}
}

export function withFill(gradientType) {
	const ctx = genericContext;
	return class extends Fill {
		fillGradient(instance) {
			let gradient;
			switch (gradientType) {
				case "linear":
					gradient = ctx.createLinearGradient;
					break;
				case "radial":
					gradient = ctx.createRadialGradient;
					break;
			}
			gradient = gradient.apply(ctx, this._args);
			const stops = this._args.at(-1);
			if (!Array.isArray(stops)) return null;
			const length = stops.length;
			for (let index = 0; index < stops.length; index++) {
				const percent = index / length;
				const color = stops[index];
				gradient.addColorStop(percent, color);
			}

			instance._fill = gradient;
			return gradient;
		}
		fillPattern(instance) {
			if (instance._pending) return null;
			instance._fillTransform = null;
			instance._pending = true;
			var image = new Image();
			let [url, width, height, x, y, repeat = "repeat"] = this._args;
			// Not yet loaded
			const fill = () => {
				let scaleX = width ? width / image.width : 1;
				let scaleY = height ? height / image.height : 1;
				instance._fillTransform = new Transform(
					scaleX,
					0,
					0,
					scaleY,
					x || 0,
					y || 0
				);

				instance._fill = ctx.createPattern(image, repeat);
				instance._pending = false;
				return instance.invalidate();
			};
			instance._pendingFill = () => {
				image.removeEventListener("load", fill, false);
				instance._pendingFill = null;
			};
			image.addEventListener("load", fill, false);
			image.src = url;

			return null;
		}
		fill(instance) {
			switch (gradientType) {
				case "radial":
				case "linear":
					return this.fillGradient(instance);
				case "pattern":
					return this.fillPattern(instance);
			}
		}
	};
}

const FillRules = withDefaultValue("nonzero", "evenodd");
const LineCap = withDefaultValue("butt", "roud", "square");
const LineJoin = withDefaultValue("miter", "round", "bevel");
export function renderRecursivly(
	node,
	context,
	scaleX,
	skewY,
	skewX,
	scaleY,
	x,
	y
) {
	while (node) {
		node.renderTo(context, scaleX, skewY, skewX, scaleY, x, y);
		node = node.nextSibling;
	}
}
export function recursivelyHitTest(node, x, y) {
	while (node) {
		var hit = node.hitTest(x, y);
		if (hit) return hit;
		node = node.previousSibling;
	}
	return null;
}
export function withRecursiveRender(Target) {
	return class Render extends withEvents(Target) {
		hitTest(x, y) {
			const point = this.inversePoint(x, y);
			if (!point) return null;
			return recursivelyHitTest(this.lastChild, point.x, point.y);
		}

		reTransform(context, scaleX, skewY, skewX, scaleY, x, y) {
			context.setTransform(scaleX, skewY, skewX, scaleY, x, y);
			context.transform(
				this.scaleX,
				this.skewY,
				this.skewX,
				this.scaleY,
				this.x,
				this.y
			);
		}
		cacluateTransform(scaleX, skewY, skewX, scaleY, x, y) {
			x = scaleX * this.x + skewX * this.y + x;
			y = skewY * this.x + scaleY * this.y + y;
			scaleX = scaleX * this.scaleX + skewX * this.skewY;
			skewX = scaleX * this.skewX + skewX * this.scaleY;
			skewY = skewY * this.scaleX + scaleY * this.skewY;
			scaleY = skewY * this.skewX + scaleY * this.scaleY;
			return [scaleX, skewY, skewX, scaleY, x, y];
		}

		render(context, scaleX, skewY, skewX, scaleY, x, y) {
			[scaleX, skewY, skewX, scaleY, x, y] = this.cacluateTransform(
				scaleX,
				skewY,
				skewX,
				scaleY,
				x,
				y
			);
			renderRecursivly(
				this.firstChild,
				context,
				scaleX,
				skewY,
				skewX,
				scaleY,
				x,
				y
			);
		}
		renderTo(context, scaleX, skewY, skewX, scaleY, x, y) {
			if (this._hidden) return;
			this.render(context, scaleX, skewY, skewX, scaleY, x, y);
		}
	};
}

export function withDrawable(Target) {
	return class Drawable extends withRenderTo(Target) {
		constructor(...args) {
			super(...args);
			this._stroke = null;
			this._strokeDash = [];
			this._strokeWidth = 1;
			this._strokeCap = LineCap.default;
			this._strokeJoin = LineJoin.default;
			this._fillRule = FillRules.default;
			this._strokeMiterLimit = 10;
			this._path = null;
			this._pendingFill = null;
			this._pending = false;
			this._width = null;
			this._height = null;
			this._fill = null;
			this._shadowBlur = 0;
			this._shadowColor = null;
			this._shadowOffsetX = 0;
			this._shadowOffsetY = 0;
			this._opacity = 1;

			this._shadows = [];
		}

		get width() {
			return this._width;
		}
		set width(value) {
			this._width = value || null;
		}

		set height(value) {
			this._height = value || null;
		}
		get height() {
			return this._height;
		}

		get invalidatale() {
			if (this._hidden) return false;
			if (!this._fill && !this._stroke) return false;
			return true;
		}
		fill(fill, fillRule) {
			if (fill == null) return;
			this._pending = false;
			if (typeof this._pendingFill == "function") this._pendingFill();
			this._fill = null;
			this._fillRule = FillRules.get(fillRule);
			Fill.fill(this, fill);
		}
		stroke(
			stroke,
			strokeWidth,
			strokeCap,
			strokeJoin,
			strokeDash,
			strokeMiterLimit
		) {
			this._stroke = stroke;
			this._strokeWidth = strokeWidth || 1;
			this._strokeCap = LineCap.get(strokeCap);
			this._strokeJoin = LineJoin.get(strokeJoin);
			this._strokeDash = Array.isArray(strokeDash) ? strokeDash : [];
			this._strokeMiterLimit = strokeMiterLimit;
		}
		applyStroke(context, stroke) {
			if (!this._stroke) return;
			context.setLineDash(this._strokeDash);
			context.dashOffset = this._strokeDashOffset;
			context.strokeStyle = this._stroke;
			context.lineWidth = this._strokeWidth;
			context.lineCap = this._strokeCap;
			context.lineJoin = this._strokeJoin;
			context.miterLimit = this._strokeMiterLimit;
			stroke?.(context);
		}

		applyFill(context) {
			if (!this._fill) return;
			var transform = this._fillTransform;
			context.save(); // TODO: Optimize away this by restoring the transform before stroking
			if (transform)
				context.transform(
					transform.scaleX,
					transform.skewY,
					transform.skewX,
					transform.scaleY,
					transform.x,
					transform.y
				);
			context.fillStyle = this._fill;
			context.fill(this._fillRule);
		}
	};
}

export function withPath(Target) {
	return class extends Target {
		constructor() {
			super(arguments);
			this._path = new Path();
		}
	};
}

export function withPointInPath(Target) {
	Target.prototype.isPointInPath = function (x, y) {
		if (this._path instanceof Path) {
			genericContext.beginPath();
			this._path.commands(genericContext);
			return genericContext.isPointInPath(x, y);
		}
		return false;
	};
	return Target;
}

export function withEvents(Target) {
	return class extends Target {
		constructor(...args) {
			super(...args);

			this._tooltip = null;

			this._cursor = null;
			this._events = {};
			this._subscriptions = {};
		}

		unlisten(type) {
			if (!this._subscriptions[type]) return;
			this._subscriptions[type]();
			delete this._subscriptions[type];
		}
		unsubscribeAll() {
			for (let type in this._subscriptions) this.unlisten(type);
			this._subscriptions = {};
		}

		listen(type, fn) {
			if (typeof fn != "function") return this.unlisten(type);
			if (this._subscriptions[type]) return;
			fn = fn.bind(this);
			const events = this._events;
			if (!events[type]) events[type] = [];
			const listeners = events[type];
			listeners.push(fn.bind(this));
			this._subscriptions[type] = function () {
				// unsubscribe
				for (var i = 0, l = listeners.length; i < l; i++) {
					if (listeners[i] === fn) {
						listeners.splice(i, 1);
						break;
					}
				}
			};
		}

		dispatch(event) {
			const events = this._events;
			const listeners = events[event.type];
			if (listeners) listeners.slice(0).forEach((fn) => fn.call(this, event));
			if (this.parentNode && this.parentNode.dispatch)
				this.parentNode.dispatch(event);
		}

		indicate(cursor, tooltip) {
			this._cursor = cursor;
			this._tooltip = tooltip;
			return this.invalidate();
		}
	};
}

export function withRenderTo(Target) {
	return class extends withEvents(Target) {
		constructor(...args) {
			super(...args);
			this._opacity = 1;
			this._shadows = [];
			this._hidden = false;
		}

		hide = () => (this._hidden = true);
		show = () => (this._hidden = false);
		hitTest(x, y) {
			const point = this.inversePoint(x, y);
			if (!point) return null;
			if (
				point.x > 0 &&
				point.y > 0 &&
				point.x < this.width &&
				point.y < this.height
			) {
				return this;
			}
			return null;
		}

		visibility(hidden) {
			this._hidden = Boolean(hidden);
		}

		shadow(shadow) {
			if (!shadow) return;
			this._shadows = Array.isArray(shadow) ? shadow : [shadow];
		}
		blend(opacity) {
			opacity = Math.abs(opacity);
			this._opacity = opacity > 1 ? 1 : opacity;
		}
		renderTo(context, scaleX, skewY, skewX, scaleY, x, y) {
			if (!this.invalidatale) return;
			context.setTransform(scaleX, skewY, skewX, scaleY, x, y);
			context.globalAlpha = this._opacity;
			this.applyTransform(context);
			if (this._shadows.length) {
				this.renderShadow(context);
			} else {
				this.render(context);
			}

			this.resetShadow(context);
			context.globalAlpha = 1;
		}
		resetShadow(context) {
			if (context.shadowColor) {
				context.shadowBlur = 0;
				context.shadowOffsetX = 0;
				context.shadowOffsetY = 0;
				context.shadowColor = undefined;
			}
		}

		applyShadow(context, shadow) {
			if (shadow.color) {
				context.shadowOffsetY = shadow.offsetY || 0;
				context.shadowOffsetX = shadow.offsetX || 0;
				context.shadowBlur = shadow.blur || 0;
				context.shadowColor = shadow.color;
			}
		}
		renderShadow(context) {
			this._shadows.forEach((shadow) => {
				if (typeof shadow == "object") this.applyShadow(context, shadow);
				this.render(context);
			});
		}

		applyTransform(context) {
			context.transform(
				this.scaleX,
				this.skewY,
				this.skewX,
				this.scaleY,
				this.x,
				this.y
			);
		}
	};
}
