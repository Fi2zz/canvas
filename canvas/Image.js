import { Element } from "./Base";
const GlobalImage = window.Image;
export class Image extends Element {
	draw({ src }) {
		this._pending = true;

		if (this._hidden) return;
		this.invalidatale = false;
		this._image = new GlobalImage();
		this._image.onload = () => {
			this.invalidatale = true;
			this._pending = false;
			this.invalidate();
		};
		this._image.src = src;
	}
	render(context) {
		if (this._pending) return;
		context.drawImage(this._image, this.x, this.y, this.width, this.height);
	}
}
