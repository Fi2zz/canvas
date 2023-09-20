import shallowEqual from "shallowequal";
import {
	Circle,
	ClipPath,
	Ellipse,
	Group,
	Image,
	Line,
	Polygon,
	Polyline,
	Rect,
	Shape,
	Surface,
	Text,
	Transform,
	getScale,
	Inject,
	Delete,
	InjectBefore,
} from "../canvas";
import * as Types from "./Types";

export { Delete, InjectBefore, Inject };
export const shouldSetTextContent = (props) =>
	typeof props.children == "string" || typeof props.children == "number";
const EVENT_TYPES = {
	onClick: "click",
	onMouseMove: "mousemove",
	onMouseOver: "mouseover",
	onMouseOut: "mouseout",
	onMouseUp: "mouseup",
	onMouseDown: "mousedown",
};
export function commitInstanceUpdate(instance, { parent, before, tag }) {
	switch (tag) {
		case InjectBefore:
			return instance.injectBefore(before);
		case Inject:
			return instance.inject(parent);
		case Delete:
			instance.unsubscribeAll();
			return instance.remove();
	}
}
export function createInstance(type, props) {
	let instance = null;
	switch (type) {
		case Types.ClipPath:
			instance = new ClipPath();
			break;
		case Types.Group:
			instance = new Group();
			break;
		case Types.Shape:
			instance = new Shape();
			break;
		case Types.Text:
			instance = new Text();
			break;
		case Types.Image:
			instance = new Image();
			break;
		case Types.Circle:
			instance = new Circle();
			break;
		case Types.Ellipse:
			instance = new Ellipse();
			break;
		case Types.Rect:
			instance = new Rect();
			break;
		case Types.Line:
			instance = new Line();
			break;
		case Types.Polyline:
			instance = new Polyline();
			break;
		case Types.Polygon:
			instance = new Polygon();
			break;
		default:
			throw `Unsupported type ` + type;
	}
	instance.type = type;
	commitUpdate(instance, props);
	return instance;
}

const pooledTransform = new Transform();

export function commitUpdate(instance, props, prevProps = {}) {
	if (shallowEqual(props, prevProps)) return;
	const scaleX = getScale(props, "x");
	const scaleY = getScale(props, "y");
	instance.id = props.id;
	instance.width = props.width || null;
	instance.height = props.height || null;
	pooledTransform._transform(1, 0, 0, 1, 0, 0);
	pooledTransform.move(props.x, props.y);
	pooledTransform.rotate(props.rotate || 0, props.originX, props.originY);
	pooledTransform.scale(scaleX, scaleY, props.originX, props.originY);
	const transform = props.transform;
	if (transform instanceof Transform) {
		pooledTransform.transform(
			transform.scaleX,
			transform.skewY,
			transform.skewX,
			transform.scaleY,
			transform.x,
			transform.y
		);
	}

	if (
		instance.scaleX !== pooledTransform.scaleX ||
		instance.skewY !== pooledTransform.skewY ||
		instance.skewX !== pooledTransform.skewX ||
		instance.scaleY !== pooledTransform.scaleY ||
		instance.x !== pooledTransform.x ||
		instance.y !== pooledTransform.y
	) {
		instance._transform(
			pooledTransform.scaleX,
			pooledTransform.skewY,
			pooledTransform.skewX,
			pooledTransform.scaleY,
			pooledTransform.x,
			pooledTransform.y
		);
	}
	pooledTransform.reset();
	if (props.cursor !== prevProps.cursor || props.title !== prevProps.title) {
		instance.indicate(props.cursor, props.title);
	}
	if (props.hidden !== prevProps.hidden) instance.visibility(props.hidden);
	if (instance.blend && props.opacity != prevProps.opacity)
		instance.blend(props.opacity);
	const match = createMatch(instance.type, instance, props, prevProps);
	const not = createNotMatch(instance.type, instance, props, prevProps);
	not([Types.Group, Types.ClipPath], applyRenderable);
	match(Types.ClipPath, applClipPathProps);
	applyDraw(instance, () => {
		match(Types.Polygon, applyPolygonProps);
		match(Types.Polyline, applyPolygonProps);
		match(Types.Ellipse, applyEllipseProps);
		match(Types.Rect, applRectProps);
		match(Types.Circle, applyCircleProps);
		match(Types.Image, applyImageProps);
		match(Types.Line, applyLineProps);
		match(Types.Text, applTextProps);
		match(Types.Shape, applyShapeProps);
	});

	for (const reactEventType in EVENT_TYPES) {
		const type = EVENT_TYPES[reactEventType];
		instance.listen(type, props[reactEventType]);
	}
}

function applyDraw(instance, fn) {
	if (instance.draw) fn();
}

function applyShapeProps(instance, props, prevProps) {
	if (props.path != prevProps.path) {
		instance._path = props.path;
	}
}

function createMatch(type, instance, props, prevProps) {
	return (target, handle) => {
		if (target == type) handle(instance, props, prevProps);
	};
}

function createNotMatch(type, instance, props, prevProps) {
	return (targets, handle) => {
		if (targets.every((x) => x != type)) handle(instance, props, prevProps);
	};
}

function applyImageProps(instance, props, prevProps) {
	if (
		props.src != prevProps.src ||
		props.height != prevProps.height ||
		props.width != prevProps.width
	) {
		instance.draw(props);
	}
}

function applClipPathProps(instance, props, prevProps) {
	if (props.path != prevProps.path) instance._path = props.path;
}
function applyEllipseProps(instance, props, prevProps) {
	if (props.width != prevProps.width || props.height != prevProps.height)
		instance.draw(props);
}

function applTextProps(instance, props, prevProps) {
	if (
		prevProps.letterSpacing != props.letterSpacing ||
		prevProps.textAlign != props.textAlign ||
		prevProps.textBaseline != props.textBaseline ||
		!shallowEqual(prevProps.font, props.font) ||
		instance._currentText != props.children
	) {
		instance.draw(props);
		instance._currentText = props.children;
	}
}

function applRectProps(instance, props, prevProps) {
	if (
		!shallowEqual(props.radius, prevProps.radius) ||
		props.height != prevProps.height ||
		props.width != prevProps.width
	) {
		instance.draw(props);
	}
}

function applyPolygonProps(instance, props, prevProps) {
	if (shallowEqual(props.points, prevProps.points)) return;
	instance.draw(props);
}

function applyCircleProps(instance, props, prevProps) {
	if (props.radius != prevProps.radius) instance.draw(props);
}
function applyLineProps(instance, props, prevProps) {
	if (props.width != prevProps.width || props.height != prevProps.height)
		instance.draw(props);
}

function applyRenderable(instance, props, prevProps) {
	if (props.shadow != prevProps.shadow) {
		instance.shadow(props.shadow);
	}
	applyFill(instance, props, prevProps);
	applyStroke(instance, props, prevProps);
}
function applyFill(instance, props, prevProps) {
	if (!instance.fill) return;
	if (prevProps.fill != props.fill || prevProps.fillRule != props.fillRule) {
		instance.fill(props.fill, props.fillRule);
	}
}

function applyStroke(instance, props, prevProps) {
	if (!instance.stroke) return;
	if (
		prevProps.stroke !== props.stroke ||
		prevProps.strokeWidth !== props.strokeWidth ||
		prevProps.strokeCap !== props.strokeCap ||
		prevProps.strokeJoin !== props.strokeJoin ||
		!shallowEqual(prevProps.strokeDash, props.strokeDash)
	) {
		instance.stroke(
			props.stroke,
			props.strokeWidth,
			props.strokeCap,
			props.strokeJoin,
			props.strokeDash
		);
	}
}

import { createContainer } from ".";
export function Container(element) {
	const surface = new Surface(element);
	const { update, destroy } = createContainer(surface);
	this.invalidate = surface.invalidate.bind(surface);
	this.resize = surface.resize.bind(surface);
	this.update = (children) => {
		update(children);
		surface.invalidate();
	};
	this.destroy = destroy;
}
