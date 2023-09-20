import { withPointInPath } from "./Mixins";
import { Drawable } from "./Base";
import { Path } from "./Path";
export class Shape extends withPointInPath(Drawable) {
	render(context) {
		if (!this.invalidatale) return;
		context.beginPath();
		if (this._path instanceof Path) this._path.commands(context);
		this.applyFill(context);
		this.applyStroke(context, (ctx) => ctx.stroke());
	}

	hitTest(x, y) {
		if (!this.invalidatale) return null;
		if (x < 0 && y < 0) return null;
		const point = this.inversePoint(x, y);
		if (!point) return null;
		return this.isPointInPath(point.x, point.y) ? this : null;
	}
	get invalidatale() {
		const invalidatale = super.invalidatale;
		if (invalidatale) return this._path instanceof Path;
		return false;
	}
}
