import { Shape } from "./Shape";
import { withPath } from "./Mixins";

const defaultRadius = [0, 0, 0, 0];
function getRadius(radius) {
	if (!Array.isArray(radius)) radius = [radius, radius, radius, radius];
	else if (radius.length <= 0) return defaultRadius;
	radius = radius.filter((x) => +x === x && x >= 0);
	return [...radius, ...defaultRadius].slice(0, 4);
}

export class Line extends withPath(Shape) {
	draw({ width = 0, height = 0 }) {
		this._path.moveTo(0, 0);
		this._path.line(width, 0);
		this._path.line(0, height);
		this._path.close();
	}
}

export class Rect extends withPath(Shape) {
	draw({ radius, width = 0, height = 0 }) {
		let [tl, tr, br, bl] = getRadius(radius);
		const path = this._path;
		// for negative width/height, offset the rectangle in the negative x/y
		// direction. for negative radius, just default to 0.
		if (width < 0) {
			path.move(width, 0);
			width = -width;
		}
		if (height < 0) {
			path.move(0, height);
			height = -height;
		}

		// disable border radius if it doesn't fit within the specified
		// width/height
		if (tl + tr > width) {
			tl = 0;
			tr = 0;
		}
		if (bl + br > width) {
			bl = 0;
			br = 0;
		}
		if (tl + bl > height) {
			tl = 0;
			bl = 0;
		}
		if (tr + br > height) {
			tr = 0;
			br = 0;
		}

		path.move(0, tl);
		if (tl > 0) path.arc(tl, -tl);
		path.line(width - (tr + tl), 0);
		if (tr > 0) path.arc(tr, tr);
		path.line(0, height - (tr + br));
		if (br > 0) path.arc(-br, br);
		path.line(-width + (br + bl), 0);
		if (bl > 0) path.arc(-bl, -bl);
		path.line(0, -height + (bl + tl));

		path.close()
	}
}
