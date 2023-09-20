import { Base } from "./Base";
import { withRecursiveRender } from "./Mixins";
import { Path } from "./Path";
export class ClipPath extends withRecursiveRender(Base) {
	renderTo(context, scaleX, skewY, skewX, scaleY, x, y) {
		if (this._hidden) return;

		if (!this.clipable) {
			this.render(context, scaleX, skewY, skewX, scaleY, x, y);
			return;
		}
		this.reTransform(context, scaleX, skewY, skewX, scaleY, x, y);
		context.save();
		context.beginPath();
		this._path.commands(context);
		context.clip();
		this.render(context, scaleX, skewY, skewX, scaleY, x, y);
		context.restore();
	}
	get clipable() {
		return this._path instanceof Path;
	}
}
