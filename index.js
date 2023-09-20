import {
	Children,
	cloneElement,
	createElement,
	useCallback,
	useEffect,
	useRef,
	useState,
	Component,
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

export class Canvas extends Component {
	constructor(props) {
		super(props);
		this.ref = createRef();
	}

	componentDidMount() {
		this.container = new Container(this.ref.current);
		this.componentDidUpdate(this.props, this.state);
	}

	componentDidUpdate(prevProps, prevState) {

		console.log('y')
		const children = normalize(this.props.children, null);
		this.container.update(children);
		this.container.resize(this.props);
		this.container.invalidate();
	}

	componentWillUnmount() {
		this.container.destroy();
	}

	render() {
		const props = this.props;

		return createElement("canvas", {
			accessKey: props.accessKey,
			className: props.className,
			draggable: props.draggable,
			role: props.role,
			tabIndex: props.tabIndex,
			title: props.title,
			style: props.style,
			ref: this.ref,
		});
	}
}

Canvas.defaultProps = {
	resolution: window.devicePixelRatio || 1,
};
