import {
	withDrawable,
	withNode,
	withRecursiveRender,
	withRenderTo,
} from "./Mixins";
import { Transform } from "./Transform";
export const Base = withNode(Transform);
export const Element = withRenderTo(Base);
export const Group = withRecursiveRender(Base);
export const Drawable = withDrawable(Base);
