export class Path {
	constructor() {
		this.reset();
	}

	push(fn) {
		this.path.push((ctx) => fn(ctx));
		return this;
	}
	reset() {
		this.penX = this.penY = 0;
		this._pivotX = this._pivotY = 0;
		this.path = [];
		return this;
	}
	move(x, y) {
		this.penX += Number(x);
		this.penY += Number(y);
		this._pivotX = this.penX;
		this._pivotY = this.penY;
		x = this.penX;
		y = this.penY;
		this.push((ctx) => ctx.moveTo(x, y));
		return this;
	}
	moveTo(x, y) {
		this.penX = Number(x);
		this.penY = Number(y);
		this._pivotX = this.penX;
		this._pivotY = this.penY;
		this.push((ctx) => ctx.moveTo(x, y));
		return this;
	}
	line(x, y) {
		x = Number(x);
		y = Number(y);
		this.lineTo(this.penX + x, this.penY + y);
		return this;
	}
	lineTo(x, y) {
		this._pivotX = this.penX = +x;
		this._pivotY = this.penY = +y;
		this.push((ctx) => ctx.lineTo(+x, +y));
		return this;
	}
	curve(c1x, c1y, c2x, c2y, ex, ey) {
		var x = this.penX;
		var y = this.penY;
		return this.curveTo(
			x + Number(c1x),
			y + Number(c1y),
			c2x == null ? null : x + Number(c2x),
			c2y == null ? null : y + Number(c2y),
			ex == null ? null : x + Number(ex),
			ey == null ? null : y + Number(ey)
		);
	}

	curveTo(c1x, c1y, c2x, c2y, ex, ey) {
		var x = this.penX,
			y = this.penY;
		if (c2x == null) {
			c2x = +c1x;
			c2y = +c1y;
			c1x = x * 2 - (this._pivotX || 0);
			c1y = y * 2 - (this._pivotY || 0);
		}
		if (ex == null) {
			this._pivotX = +c1x;
			this._pivotY = +c1y;
			ex = +c2x;
			ey = +c2y;
			c2x = (ex + +c1x * 2) / 3;
			c2y = (ey + +c1y * 2) / 3;
			c1x = (x + +c1x * 2) / 3;
			c1y = (y + +c1y * 2) / 3;
		} else {
			this._pivotX = +c2x;
			this._pivotY = +c2y;
		}
		this.penX = +ex;
		this.penY = +ey;
		this.push((ctx) => ctx.bezierCurveTo(+c1x, +c1y, +c2x, +c2y, +ex, +ey));
		return this;
	}

	arc(x, y, rx, ry, outer, counterClockwise, rotation) {
		return this.arcTo(
			this.penX + +x,
			this.penY + +y,
			rx,
			ry,
			outer,
			counterClockwise,
			rotation
		);
	}
	arcTo(x, y, rx, ry, outer, counterClockwise, rotation) {
		ry = Math.abs(+ry || +rx || +y - this.penY);
		rx = Math.abs(+rx || +x - this.penX);
		if (!rx || !ry || (x == this.penX && y == this.penY))
			return this.lineTo(x, y);
		var tX = this.penX,
			tY = this.penY,
			clockwise = !+counterClockwise,
			large = !!+outer;
		var rad = rotation ? (rotation * Math.PI) / 180 : 0,
			cos = Math.cos(rad),
			sin = Math.sin(rad);
		x -= tX;
		y -= tY;
		var cx = (cos * x) / 2 + (sin * y) / 2,
			cy = (-sin * x) / 2 + (cos * y) / 2,
			rxry = rx * rx * ry * ry,
			rycx = ry * ry * cx * cx,
			rxcy = rx * rx * cy * cy,
			a = rxry - rxcy - rycx;
		if (a < 0) {
			a = Math.sqrt(1 - a / rxry);
			rx *= a;
			ry *= a;
			cx = x / 2;
			cy = y / 2;
		} else {
			a = Math.sqrt(a / (rxcy + rycx));
			if (large == clockwise) a = -a;
			var cxd = (-a * cy * rx) / ry,
				cyd = (a * cx * ry) / rx;
			cx = cos * cxd - sin * cyd + x / 2;
			cy = sin * cxd + cos * cyd + y / 2;
		}
		var xx = cos / rx,
			yx = sin / rx,
			xy = -sin / ry,
			yy = cos / ry;
		var sa = Math.atan2(xy * -cx + yy * -cy, xx * -cx + yx * -cy),
			ea = Math.atan2(
				xy * (x - cx) + yy * (y - cy),
				xx * (x - cx) + yx * (y - cy)
			);
		cx += tX;
		cy += tY;
		x += tX;
		y += tY;

		this._pivotX = this.penX = x;
		this._pivotY = this.penY = y;
		if (rx != ry || rotation) {
			const bezierCurveTo = (...args) => {
				this.push((ctx) => ctx.bezierCurveTo(...args));
			};
			const arcToBezier = createArcToBezier(bezierCurveTo);
			arcToBezier(cx, cy, rx, ry, sa, ea, !clockwise, rotation);
		} else {
			this.push((ctx) => ctx.arc(cx, cy, rx, sa, ea, !clockwise));
		}
		return this;
	}
	close() {
		return this.push((context) => context.closePath());
	}

	commands(context) {
		for (let command of this.path) {
			command(context);
		}
	}

	get length() {
		return this.path.length;
	}
}

function createArcToBezier(handler) {
	return function arcToBezier(cx, cy, rx, ry, sa, ea, clockwise, rotation) {
		// Inverse Rotation + Scale Transform
		var rad = rotation ? (rotation * Math.PI) / 180 : 0,
			cos = Math.cos(rad),
			sin = Math.sin(rad),
			xx = cos * rx,
			yx = -sin * ry,
			xy = sin * rx,
			yy = cos * ry;

		// Bezier Curve Approximation
		var arc = ea - sa;
		if (arc < 0 && !clockwise) arc += Math.PI * 2;
		else if (arc > 0 && clockwise) arc -= Math.PI * 2;

		var n = Math.ceil(Math.abs(arc / (Math.PI / 2))),
			step = arc / n,
			k = (4 / 3) * Math.tan(step / 4);

		var x = Math.cos(sa),
			y = Math.sin(sa);

		for (var i = 0; i < n; i++) {
			var cp1x = x - k * y;
			var cp1y = y + k * x;

			sa += step;
			x = Math.cos(sa);
			y = Math.sin(sa);

			var cp2x = x + k * y;
			var cp2y = y - k * x;

			let p1x = cx + xx * cp1x + yx * cp1y;
			let p1y = cy + xy * cp1x + yy * cp1y;
			let p2x = cx + xx * cp2x + yx * cp2y;
			let p2y = cy + xy * cp2x + yy * cp2y;
			let ex = cx + xx * x + yx * y;
			let ey = cy + xy * x + yy * y;
			handler(p1x, p1y, p2x, p2y, ex, ey);
		}
	};
}
