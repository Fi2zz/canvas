export class Transform {
	constructor(scaleX = 1, skewY = 0, skewX = 0, scaleY = 1, x = 0, y = 0) {
		this.scaleX = scaleX;
		this.skewY = skewY;
		this.skewX = skewX;
		this.scaleY = scaleY;
		this.x = x;
		this.y = y;
		return this;
	}

	reset() {
		const transform = new Transform();
		this.scaleX = transform.scaleX;
		this.scaleY = transform.scaleY;
		this.skewX = transform.skewX;
		this.skewY = transform.skewY;
		this.x = transform.x;
		this.y = transform.y;
		return this;
	}

	_transform(scaleX, skewY, skewX, scaleY, x, y) {
		this.scaleX = +scaleX || 1;
		this.skewY = +skewY || 0;
		this.skewX = +skewX || 0;
		this.scaleY = +scaleY || 1;
		this.skewX = +skewX || 0;
		this.x = +x || 0;
		this.y = +y || 0;
		return this;
	}

	invalidate() {}
	transform(scaleX, skewY, skewX, scaleY, x = 0, y = 0) {
		return this._transform(
			this.scaleX * scaleX + this.skewX * skewY,
			this.skewY * scaleX + this.scaleY * skewY,
			this.scaleX * skewX + this.skewX * scaleY,
			this.skewY * skewX + this.scaleY * scaleY,
			this.scaleX * x + this.skewX * y + this.x,
			this.skewY * x + this.scaleY * y + this.y
		);
	}
	translate(x, y) {
		return this.transform(1, 0, 0, 1, x, y);
	}
	move(x, y) {
		this.x += x || 0;
		this.y += y || 0;
		this.invalidate();
		return this;
	}
	scale(x, y) {
		return this.transform(x, 0, 0, y == null ? x : y, 0, 0);
	}
	rotate(angle, x, y) {
		if (x == null || y == null) {
			x = this.x || 0;
			y = this.y || 0;
		}
		var deg = (angle * Math.PI) / 180,
			sin = Math.sin(deg),
			cos = Math.cos(deg);
		this.transform(1, 0, 0, 1, x, y);
		this._transform(
			cos * this.scaleX - sin * this.skewY,
			sin * this.scaleX + cos * this.skewY,
			cos * this.skewX - sin * this.scaleY,
			sin * this.skewX + cos * this.scaleY,
			this.x,
			this.y
		);
		this.transform(1, 0, 0, 1, -x, -y);
		return this;
	}
	moveTo(x, y) {
		this.x = x;
		this.y = y;
		return this;
	}
	rotateTo(angle, x, y) {
		var flip = this.skewY / this.scaleX > this.scaleY / this.skewX ? -1 : 1;
		if (this.scaleX < 0 ? this.skewX >= 0 : this.skewX < 0) flip = -flip;
		const skewY = flip * this.skewY;
		const scaleX = flip * this.scaleX;
		angle -= (Math.atan2(skewY, scaleX) * 180) / Math.PI;
		return this.rotate(angle, x, y);
	}
	scaleTo(x, y) {
		var h = Math.sqrt(this.scaleX * this.scaleX + this.skewY * this.skewY);
		this.scaleX /= h;
		this.skewY /= h;
		h = Math.sqrt(this.scaleY * this.scaleY + this.skewX * this.skewX);
		this.scaleY /= h;
		this.skewX /= h;
		return this.scale(x, y);
	}
	resizeTo(width, height) {
		var w = this.width,
			h = this.height;
		if (!w || !h) return this;
		return this.scaleTo(width / w, height / h);
	}
	inversePoint(x, y) {
		var scaleX = this.scaleX,
			skewY = this.skewY,
			skewX = this.skewX,
			scaleY = this.scaleY,
			e = this.x,
			f = this.y;
		var det = skewY * skewX - scaleX * scaleY;
		if (det == 0) return null;
		return {
			x: (scaleY * (e - x) + skewX * (y - f)) / det,
			y: (scaleX * (f - y) + skewY * (x - e)) / det,
		};
	}
	point(x, y) {
		return {
			x: this.scaleX * x + this.skewX * y + this.x,
			y: this.skewY * x + this.scaleY * y + this.y,
		};
	}
}
