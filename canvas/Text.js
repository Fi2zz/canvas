import { Drawable } from "./Base";
import { TextHelper } from "./TextHelper";
const helper = new TextHelper();
export class Text extends Drawable {
	get width() {
		return this._width || Infinity;
	}
	set width(value) {
		return (this._width = value || Infinity);
	}
	get height() {
		return this._height || Infinity;
	}
	set height(value) {
		return (this._height = value || Infinity);
	}

	get invalidatale() {
		const invalidatale = super.invalidatale;
		if (!invalidatale) return false;
		if (!Array.isArray(this.characters)) return false;
		return this.characters.length > 0;
	}

	draw({ children, font, textBaseline, letterSpacing, textAlign }) {
		this.characters = [];
		this.textBaseline = TextHelper.TextBaseline.get(textBaseline);
		this.textAlign = TextHelper.TextAlign.get(textAlign);
		this.letterSpacing = letterSpacing || 0;
		this.font = helper.parseFont(font);
		this.characters = helper.getCharacters(children, this);
	}
	applyFill(context) {
		if (!this._fill) return;
		context.fillStyle = this._fill;
		context.textBaseline = this.textBaseline;
		context.textAlign = this.textAlign;
		context.font = this.font;
	}
	render(context) {
		if (!this.invalidatale) return;
		this.applyFill(context);
		this.applyStroke(context);
		for (const { x, y, character } of this.characters) {
			if (this._fill) context.fillText(character, x, y);
			if (this._stroke) context.strokeText(character, x, y);
		}
	}
	drawText() {}
}
