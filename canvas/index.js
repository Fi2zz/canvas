import {
	renderRecursivly,
	withFill,
	updateGenricCanvas,
	recursivelyHitTest,
} from "./Mixins";
export * from "./Transform";
export * from "./Path";
export * from "./Text";
export * from "./Polygon";
export * from "./Rect";
export * from "./Image";
export * from "./Shape";
export * from "./Circle";
export * from "./ClipPath";
export * from "./Base";
export const LinearGradient = withFill("linear");
export const RadialGradient = withFill("radial");
export const Pattern = withFill("pattern");
function getSurface() {
	var previousHit = null,
		previousHitSurface = null;

	const createRequestAnimationFrame = (callback) => {
		let handle = null;
		return () => {
			handle = requestAnimationFrame(() => {
				cancelAnimationFrame(handle);
				callback();
			});
		};
	};

	class Canvas {
		constructor(element) {
			this.element = element;
			const context = this.element.getContext("2d");
			element.addEventListener("mousemove", this, false);
			element.addEventListener("mouseout", this, false);
			element.addEventListener("mouseover", this, false);
			element.addEventListener("mouseup", this, false);
			element.addEventListener("mousedown", this, false);
			element.addEventListener("click", this, false);
			this.invalidate = createRequestAnimationFrame(() => this.render(context));
		}

		resize({ width, height, resolution }) {
			if (
				width != this._width ||
				height != this._height ||
				resolution != this.resolution
			) {
				if (isNaN(width) && isNaN(height)) return;
				this.resolution = resolution;
				this.width = width * resolution;
				this.height = height * resolution;
				this.element.height = this.height;
				this.element.width = this.width;
				updateGenricCanvas(this);
			}
			this._width = width;
			this._height = height;
		}
		handleEvent(event) {
			if (event.clientX == null || event.clientY == null) return;
			var element = this.element;
			var rect = element.getBoundingClientRect();
			const point = {};
			point.x = event.clientX - rect.left - element.clientLeft;
			point.y = event.clientY - rect.top - element.clientTop;

			if (point.x < 0 || point.y < 0) {
				return;
			}
			if (point.x > this.width || point.y > this.height) return;
			const hit = recursivelyHitTest(this.lastChild, point.x, point.y);
			if (hit !== previousHit) {
				if (previousHit) {
					previousHit.dispatch({
						type: "mouseout",
						target: previousHit,
						relatedTarget: hit,
						sourceEvent: event,
					});
				}
				if (hit) {
					hit.dispatch({
						type: "mouseover",
						target: hit,
						relatedTarget: previousHit,
						sourceEvent: event,
					});
				}
				previousHit = hit;
				previousHitSurface = this;
				this.refreshCursor();
			}
			if (hit) hit.dispatch(event);
		}

		refreshCursor() {
			if (previousHitSurface !== this) return;
			var hit = previousHit,
				hitCursor = "",
				hitTooltip = "";
			while (hit) {
				if (!hitCursor && hit._cursor) {
					hitCursor = hit._cursor;
					if (hitTooltip) break;
				}
				if (!hitTooltip && hit._tooltip) {
					hitTooltip = hit._tooltip;
					if (hitCursor) break;
				}
				hit = hit.parentNode;
			}
			// TODO: No way to set cursor/title on the surface
			this.element.style.cursor = hitCursor;
			this.element.title = hitTooltip;
		}

		render(context) {
			const scale = this.resolution;
			context.setTransform(scale, 0, 0, scale, 0, 0);
			context.clearRect(0, 0, this.width, this.height);
			renderRecursivly(this.firstChild, context, scale, 0, 0, scale, 0, 0);
		}
	}
	return Canvas;
}
export const Surface = getSurface();
