import {
	Children,
	Component,
	cloneElement,
	createElement,
	createRef,
} from "react";
import { Container } from "./Container";
import * as Types from "./Container/Types";
export * from "./Container/Types";
const isValidType = (type) => typeof Types[type] == "string";
const isFragmentLike = (type) => type == Types.Group || type == Types.ClipPath;
const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
/// remove plain text/number/function/fragment and non-valid types
function normalize(children, parent) {
	if (!children) return children;
	return Children.map(children, (child) => {
		if (typeof child != "object") return parent == null ? null : child;
		if (!child) return null;
		if (child.type == REACT_FRAGMENT_TYPE)
			return normalize(child.props.children, null);
		if (!isValidType(child.type)) return null;
		if (isFragmentLike(child.type)) {
			return cloneElement(child, {
				...child.props,
				children: normalize(child.props.children, child),
			});
		}
		return child;
	});
}

export class Surface extends Component {
	static displayName = "Surface";
	static defaultProps = { resolution: window.devicePixelRatio || 1 };
	ref = createRef();
	componentDidMount() {
		this.container = new Container(this.ref.current);
		this.componentDidUpdate();
	}
	componentWillUnmount = () => this.container.detroy();
	componentDidUpdate = () => {
		const children = normalize(this.props.children, null);
		this.container.invalidate(children, this.props);
	};
	get _props() {
		const { accessKey, className, draggable, role, tabIndex, title, style } =
			this.props;
		return {
			accessKey,
			className,
			draggable,
			role,
			tabIndex,
			title,
			style,
			ref: this.ref,
		};
	}
	render = () => createElement("canvas", this._props);
}
