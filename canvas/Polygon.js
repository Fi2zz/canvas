import { withPath, extractPoints } from "./Mixins";
import { Shape } from "./Shape";
export class Polygon extends withPath(Shape) {
	draw({ points }) {
		const path = this._path;
		this.points = extractPoints(points);
		this.points.forEach((point) => {
			path.line(point.x, point.y);
		});
		path.close();
	}
}

export class Polyline extends withPath(Shape) {
	draw({ points }) {
		const path = this._path;
		this._stoke = this._fill;
		this._fill = null;
		this.points = extractPoints(points);
		this.points.forEach((point) => {
			path.line(point.x, point.y);
		});
	}
}
