import { Shape } from "./Shape";
import { withPath } from "./Mixins";
export class Circle extends withPath(Shape) {
	draw(props) {
		const R = +props.radius;
		this.width = this.height = R * 2;
		this._path
			.moveTo(0, -R)
			.arc(0, R * 2, R)
			.arc(0, R * -2, R)
			.close();
	}
}

export class Ellipse extends withPath(Shape) {
	draw() {
		const width = this.width;
		const height = this.height;
		const rx = width / 2;
		const ry = height / 2;
		this._path
			.moveTo(0, ry)
			.arc(width, 0, rx, ry)
			.arc(-width, 0, rx, ry)
			.close();
	}
}
