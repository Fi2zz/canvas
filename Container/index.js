/// modify  from https://unpkg.com/browse/react-art@18.2.0/umd/react-art.development.js
import {
	Delete,
	Inject,
	InjectBefore,
	commitInstanceUpdate,
	commitUpdate,
	createInstance,
	shouldSetTextContent,
} from "./options";
const HostRoot = 0;
const HostComponent = 1;
const HostText = 2;
const NoFlags = 0;
const Placement = 2;
const Update = 4;
const ChildDeletion = 16;
const Incomplete = 32768;
const MutationMask = Placement | Update | ChildDeletion;
const StaticMask = 4194304;

export const currentQueue = { current: null };
var workInProgress = null;
function childIsObject(child) {
	return typeof child == "object" && child != null;
}
function childIsText(child) {
	return typeof child == "number" || (typeof child == "string" && child != "");
}

function childIsArray(child) {
	return Array.isArray(child);
}

function ChildReconciler(shouldTrackSideEffects) {
	function deleteChild(returnFiber, childToDelete) {
		if (!shouldTrackSideEffects) return;
		var deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletions.push(childToDelete);
		}
	}

	function deleteRemainingChildren(returnFiber, currentFirstChild) {
		if (!shouldTrackSideEffects) {
			// Noop.
			return null;
		}
		// TODO: For the shouldClone case, this could be micro-optimized a bit by
		// assuming that after the first child we've already added everything.

		var childToDelete = currentFirstChild;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}

		return null;
	}
	function mapRemainingChildren(currentFirstChild) {
		// Add the remaining children to a temporary map so that we can find them by
		// keys quickly. Implicit (null) keys get added to this set with their index
		// instead.
		var existingChildren = new Map();
		var existingChild = currentFirstChild;
		while (existingChild !== null) {
			if (existingChild.key !== null) {
				existingChildren.set(existingChild.key, existingChild);
			} else {
				existingChildren.set(existingChild.index, existingChild);
			}
			existingChild = existingChild.sibling;
		}

		return existingChildren;
	}

	function cloneFiber(fiber, pendingProps, returnFiber) {
		const clone = createWorkInProgress(fiber, pendingProps);
		clone.index = 0;
		clone.sibling = null;
		clone.return = returnFiber;
		return clone;
	}

	function placeChild(newFiber, lastPlacedIndex, newIndex) {
		newFiber.index = newIndex;
		if (!shouldTrackSideEffects) return lastPlacedIndex;
		var current = newFiber.alternate;

		if (current !== null) {
			var oldIndex = current.index;

			if (oldIndex < lastPlacedIndex) {
				// This is a move.
				newFiber.flags |= Placement;
				return lastPlacedIndex;
			} else {
				// This item can stay in place.
				return oldIndex;
			}
		} else {
			// This is an insertion.
			newFiber.flags |= Placement;
			return lastPlacedIndex;
		}
	}
	function placeSingleChild(newFiber) {
		// This is simpler for the single child case. We only need to do a
		// placement for inserting new children.
		if (shouldTrackSideEffects && newFiber.alternate === null)
			newFiber.flags |= Placement;
		return newFiber;
	}

	function updateTextNode(returnFiber, current, textContent) {
		if (current === null || current.tag !== HostText) {
			// Insert
			return createFiberFromText(textContent, returnFiber);
		} else {
			// Update
			return cloneFiber(current, textContent, returnFiber);
		}
	}

	function updateElement(returnFiber, current = null, element) {
		if (current !== null) {
			if (current.elementType === element.type) {
				// Move based on index
				return cloneFiber(current, element.props, returnFiber);
			}
		} // Insert
		return createFiberFromElement(element, returnFiber);
	}

	function createChild(returnFiber, newChild) {
		if (childIsText(newChild)) {
			// Text nodes don't have keys. If the previous node is implicitly keyed
			// we can continue to replace it without aborting even if it is not a text
			// node.
			return createFiberFromText("" + newChild, returnFiber);
		}
		if (childIsObject(newChild)) {
			return createFiberFromElement(newChild, returnFiber);
		}
		return null;
	}

	function updateSlot(returnFiber, oldFiber, newChild) {
		// Update the fiber if the keys match, otherwise return null.
		var key = oldFiber !== null ? oldFiber.key : null;

		if (childIsText(newChild)) {
			// Text nodes don't have keys. If the previous node is implicitly keyed
			// we can continue to replace it without aborting even if it is not a text
			// node.
			if (key !== null) return null;
			return updateTextNode(returnFiber, oldFiber, "" + newChild);
		}

		if (childIsObject(newChild)) {
			if (newChild.key === key)
				return updateElement(returnFiber, oldFiber, newChild);
			return null;
		}

		return null;
	}

	function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
		if (childIsText(newChild)) {
			// Text nodes don't have keys, so we neither have to check the old nor
			// new node for the key. If both are text nodes, they match.
			var matchedFiber = existingChildren.get(newIdx) || null;
			return updateTextNode(returnFiber, matchedFiber, "" + newChild);
		}
		if (childIsObject(newChild)) {
			var matched = existingChildren.get(
				newChild.key === null ? newIdx : newChild.key
			);
			return updateElement(returnFiber, matched, newChild);
		}
		return null;
	}
	function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
		// This algorithm can't optimize by searching from both ends since we
		// don't have backpointers on fibers. I'm trying to see how far we can get
		// with that model. If it ends up not being worth the tradeoffs, we can
		// add it later.
		// Even with a two ended optimization, we'd want to optimize for the case
		// where there are few changes and brute force the comparison instead of
		// going for the Map. It'd like to explore hitting that path first in
		// forward-only mode and only go for the Map once we notice that we need
		// lots of look ahead. This doesn't handle reversal as well as two ended
		// search but that's unusual. Besides, for the two ended optimization to
		// work on Iterables, we'd need to copy the whole set.
		// In this first iteration, we'll just live with hitting the bad case
		// (adding everything to a Map) in for every insert/move.
		// If you change this code, also update reconcileChildrenIterator() which
		// uses the same algorithm.

		var resultingFirstChild = null;
		var previousNewFiber = null;
		var oldFiber = currentFirstChild;
		var lastPlacedIndex = 0;
		var newIdx = 0;
		var nextOldFiber = null;

		for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
			if (oldFiber.index > newIdx) {
				nextOldFiber = oldFiber;
				oldFiber = null;
			} else {
				nextOldFiber = oldFiber.sibling;
			}

			var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
			if (newFiber === null) {
				// TODO: This breaks on empty slots like null children. That's
				// unfortunate because it triggers the slow path all the time. We need
				// a better way to communicate whether this was a miss or null,
				// boolean, undefined, etc.
				if (oldFiber === null) oldFiber = nextOldFiber;
				break;
			}

			if (shouldTrackSideEffects) {
				if (oldFiber && newFiber.alternate === null) {
					// We matched the slot, but we didn't reuse the existing fiber, so we
					// need to delete the existing child.
					deleteChild(returnFiber, oldFiber);
				}
			}

			lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

			if (previousNewFiber === null) {
				// TODO: Move out of the loop. This only happens for the first run.
				resultingFirstChild = newFiber;
			} else {
				// TODO: Defer siblings if we're not at the right index for this slot.
				// I.e. if we had null values before, then we want to defer this
				// for each null value. However, we also don't want to call updateSlot
				// with the previous one.
				previousNewFiber.sibling = newFiber;
			}

			previousNewFiber = newFiber;
			oldFiber = nextOldFiber;
		}

		if (newIdx === newChildren.length) {
			// We've reached the end of the new children. We can delete the rest.
			deleteRemainingChildren(returnFiber, oldFiber);

			return resultingFirstChild;
		}

		if (oldFiber === null) {
			// If we don't have any more existing children we can choose a fast path
			// since the rest will all be insertions.
			for (; newIdx < newChildren.length; newIdx++) {
				var newFiber = createChild(returnFiber, newChildren[newIdx]);
				if (newFiber === null) continue;
				lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

				if (previousNewFiber === null) {
					// TODO: Move out of the loop. This only happens for the first run.
					resultingFirstChild = newFiber;
				} else {
					previousNewFiber.sibling = newFiber;
				}

				previousNewFiber = newFiber;
			}

			return resultingFirstChild;
		} // Add all children to a key map for quick lookups.

		var existingChildren = mapRemainingChildren(oldFiber); // Keep scanning and use the map to restore deleted items as moves.

		for (; newIdx < newChildren.length; newIdx++) {
			var newFiber = updateFromMap(
				existingChildren,
				returnFiber,
				newIdx,
				newChildren[newIdx]
			);

			if (newFiber !== null) {
				if (shouldTrackSideEffects) {
					if (newFiber.alternate !== null) {
						// The new fiber is a work in progress, but if there exists a
						// current, that means that we reused the fiber. We need to delete
						// it from the child list so that we don't add it to the deletion
						// list.
						existingChildren.delete(
							newFiber.key === null ? newIdx : newFiber.key
						);
					}
				}

				lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

				if (previousNewFiber === null) {
					resultingFirstChild = newFiber;
				} else {
					previousNewFiber.sibling = newFiber;
				}

				previousNewFiber = newFiber;
			}
		}

		if (shouldTrackSideEffects) {
			// Any existing children that weren't consumed above were deleted. We need
			// to add them to the deletion list.
			existingChildren.forEach(function (child) {
				return deleteChild(returnFiber, child);
			});
		}

		return resultingFirstChild;
	}

	function reconcileSingleTextNode(
		returnFiber,
		currentFirstChild,
		textContent
	) {
		// There's no need to check for keys on text nodes since we don't have a
		// way to define them.
		if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
			// We already have an existing node so let's just update it and delete
			// the rest.
			deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
			return cloneFiber(currentFirstChild, textContent, returnFiber);
		} // The existing first child is not a text node so we need to create one
		// and delete the existing ones.

		deleteRemainingChildren(returnFiber, currentFirstChild);
		return createFiberFromText(textContent, returnFiber);
	}

	function reconcileSingleElement(returnFiber, currentFirstChild, element) {
		var key = element.key;
		var child = currentFirstChild;

		while (child !== null) {
			// TODO: If key === null and child.key === null, then this only applies to
			// the first item in the list.
			if (child.key === key) {
				if (child.elementType === element.type) {
					deleteRemainingChildren(returnFiber, child.sibling);
					return cloneFiber(child, element.props, returnFiber);
				}

				deleteRemainingChildren(returnFiber, child);
				break;
			} else {
				deleteChild(returnFiber, child);
			}

			child = child.sibling;
		}

		return createFiberFromElement(element, returnFiber);
	}

	// itself. They will be added to the side-effect list as we pass through the
	// children and the parent.

	return function (returnFiber, currentFirstChild, newChild) {
		// This function is not recursive.
		// If the top level item is an array, we treat it as a set of children,
		// not as a fragment. Nested arrays on the other hand will be treated as
		// fragment nodes. Recursion happens at the normal flow.
		// Handle top level unkeyed fragments as if they were arrays.
		// This leads to an ambiguity between <>{[...]}</> and <>...</>.
		// We treat the ambiguous cases above the same.

		if (childIsObject(newChild)) {
			if (childIsArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
			}

			return placeSingleChild(
				reconcileSingleElement(returnFiber, currentFirstChild, newChild)
			);
		}
		if (childIsText(newChild)) {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFirstChild, "" + newChild)
			);
		}

		return deleteRemainingChildren(returnFiber, currentFirstChild);
	};
}

var reconcileChildFibers = ChildReconciler(true);
var mountChildFibers = ChildReconciler(false);
function cloneChildFibers(current, workInProgress) {
	if (current !== null && workInProgress.child !== current.child) {
		throw new Error("Resuming work not yet implemented.");
	}
	if (workInProgress.child === null) return;
	var currentChild = workInProgress.child;
	var newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
	workInProgress.child = newChild;
	newChild.return = workInProgress;

	while (currentChild.sibling !== null) {
		currentChild = currentChild.sibling;
		newChild = newChild.sibling = createWorkInProgress(
			currentChild,
			currentChild.pendingProps
		);
		newChild.return = workInProgress;
	}

	newChild.sibling = null;
} // Reset a workInProgress child set to prepare it for a second pass.

function reconcileChildren(current, workInProgress, nextChildren) {
	if (current === null) {
		// If this is a fresh new component that hasn't been rendered yet, we
		// won't update its child set by applying minimal side-effects. Instead,
		// we will add them all to the child before it gets rendered. That means
		// we can optimize this reconciliation pass by not tracking side-effects.
		workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
	} else {
		// If the current child is the same as the work in progress, it means that
		// we haven't yet started any work on these children. Therefore, we use
		// the clone algorithm to create a copy of all the current children.
		// If we had any progressed work already, that is invalid at this point so
		// let's throw it out.
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current.child,
			nextChildren
		);
	}
}

function updateHostRoot(current, workInProgress) {
	var prevState = workInProgress.memoizedState;
	var prevChildren = prevState.element;
	cloneUpdateQueue(current, workInProgress);
	processUpdateQueue(workInProgress);
	var nextState = workInProgress.memoizedState;
	var nextChildren = nextState.element;
	if (nextChildren === prevChildren) {
		cloneChildFibers(current, workInProgress);
	} else reconcileChildren(current, workInProgress, nextChildren);
	return workInProgress.child;
}

function updateHostComponent(current, workInProgress) {
	var nextProps = workInProgress.pendingProps;
	var nextChildren = nextProps.children;
	if (typeof workInProgress.type == "function") {
		workInProgress.child = null;
		return workInProgress.child;
	}
	if (shouldSetTextContent(nextProps)) {
		// We special case a direct text child of a host node. This is a common
		// case. We won't handle it as a reified child. We will instead handle
		// this in the host environment that also has access to this prop. That
		// avoids allocating another HostText fiber and traversing it.
		nextChildren = null;
	}
	reconcileChildren(current, workInProgress, nextChildren);
	return workInProgress.child;
}

function beginWork(current, workInProgress) {
	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(current, workInProgress);
		case HostComponent:
			return updateHostComponent(current, workInProgress);
		case HostText:
			return null;
	}
	throw new Error(
		"Unknown unit of work tag (" +
			workInProgress.tag +
			"). This error is likely caused by a bug in " +
			"React. Please file an issue."
	);
}

function markUpdate(workInProgress) {
	// Tag the fiber with an update effect. This turns a Placement into
	// a PlacementAndUpdate.
	workInProgress.flags |= Update;
}

function appendAllChildren(parent, workInProgress) {
	// We only have the top Fiber that was created but we need recurse down its
	// children to find all the terminal nodes.
	var node = workInProgress.child;

	while (node !== null) {
		if (node.tag === HostComponent) {
			commitInstanceUpdate(node.stateNode, { parent, tag: Inject });
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		if (node === workInProgress) return;
		while (node.sibling === null) {
			if (node.return === null || node.return === workInProgress) return;
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(completedWork) {
	var subtreeFlags = NoFlags;
	var child = completedWork.child;
	while (child !== null) {
		subtreeFlags |= child.subtreeFlags;
		subtreeFlags |= child.flags; // Update the return pointer so the tree is consistent. This is a code
		// smell because it assumes the commit phase is never concurrent with
		// the render phase. Will address during refactor to alternate model.

		child.return = completedWork;
		child = child.sibling;
	}

	completedWork.subtreeFlags |= subtreeFlags;
}

function completeWork(current, workInProgress) {
	var newProps = workInProgress.pendingProps; // Note: This intentionally doesn't check if we're hydrating because comparing
	// to the current tree provider fiber is just as fast and less error-prone.
	// Ideally we would have a special version of the work loop only
	// for hydration.

	switch (workInProgress.tag) {
		case HostRoot: {
			bubbleProperties(workInProgress);
			return null;
		}

		case HostComponent: {
			var type = workInProgress.type;
			if (typeof type == "function") return null;
			if (current !== null && workInProgress.stateNode != null) {
				// If we have an alternate, that means this is an update and we need to
				// schedule a side-effect to do the updates.
				var oldProps = current.memoizedProps;
				if (oldProps !== newProps) {
					// If we get updated because one of our children updated, we don't
					// have newProps so we'll have to reuse them.
					// TODO: Split the update API as separate for the props vs. children.
					// Even better would be if children weren't special cased at all tho.
					// component is hitting the resume path. Figure out why. Possibly
					// related to `hidden`.
					workInProgress.updateQueue = {};
					markUpdate(workInProgress);
				}
			} else {
				if (!newProps) {
					if (workInProgress.stateNode === null) {
						throw new Error(
							"We must have new props for new mounts. This error is likely " +
								"caused by a bug in React. Please file an issue."
						);
					} // This can happen when we abort work.

					bubbleProperties(workInProgress);
					return null;
				}

				const instance = createInstance(type, newProps);

				if (instance == null) return null;

				if (instance != null) {
					appendAllChildren(instance, workInProgress);
					workInProgress.stateNode = instance;
				}
			}
			bubbleProperties(workInProgress);
			return null;
		}

		case HostText: {
			var newText = newProps;

			if (current && workInProgress.stateNode != null) {
				var oldText = current.memoizedProps;
				// If we have an alternate, that means this is an update and we need
				// to schedule a side-effect to do the updates.
				if (oldText != newText) markUpdate(workInProgress);
			} else {
				if (typeof newText !== "string") {
					if (workInProgress.stateNode === null) {
						throw new Error(
							"We must have new props for new mounts. This error is likely " +
								"caused by a bug in React. Please file an issue."
						);
					}
					// This can happen when we abort work.
				}
				workInProgress.stateNode = newText;
			}
			bubbleProperties(workInProgress);
			return null;
		}
	}

	throw new Error(
		"Unknown unit of work tag (" +
			workInProgress.tag +
			"). This error is likely caused by a bug in " +
			"React. Please file an issue."
	);
}

function getHostParentFiber(fiber) {
	var parent = fiber.return;
	while (parent !== null) {
		if (isHostParent(parent)) return parent;
		parent = parent.return;
	}
}

function isHostParent(fiber) {
	return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function getHostSibling(fiber) {
	// We're going to search forward into the tree until we find a sibling host
	// node. Unfortunately, if multiple insertions are done in a row we have to
	// search past them. This leads to exponential search for the next sibling.
	// TODO: Find a more efficient way to do this.
	var node = fiber;

	siblings: while (true) {
		// If we didn't find anything, let's try the next sibling.
		while (node.sibling === null) {
			if (node.return === null || isHostParent(node.return)) {
				// If we pop out of the root or hit the parent the fiber we are the
				// last sibling.
				return null;
			}

			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;

		while (node.tag !== HostComponent && node.tag !== HostText) {
			// If it is not host node and, we might have a host node inside it.
			// Try to search down until we find one.
			if (node.flags & Placement) {
				// If we don't have a child, try the siblings instead.
				continue siblings;
			} // If we don't have a child, try the siblings instead.
			// We also skip portals because they are not part of this host tree.

			if (node.child === null) {
				continue siblings;
			} else {
				node.child.return = node;
				node = node.child;
			}
		} // Check if this host node is stable or about to be placed.

		if (!(node.flags & Placement)) {
			// Found it!
			return node.stateNode;
		}
	}
}

function commitPlacement(finishedWork) {
	var parentFiber = getHostParentFiber(finishedWork); // Note: these two variables *must* always be updated together.

	if (HostComponent != parentFiber.tag && HostRoot != parentFiber.tag)
		throw new Error(
			"Invalid host parent fiber. This error is likely caused by a bug " +
				"in React. Please file an issue."
		);
	const before = getHostSibling(finishedWork);
	const parent =
		parentFiber.tag == HostComponent
			? parentFiber.stateNode
			: parentFiber.stateNode.containerInfo;
	insertOrAppendPlacementNode(finishedWork, before, parent);
	return;
}

function insertOrAppendPlacementNode(node, before, parent) {
	if (node.tag != HostComponent) {
		var child = node.child;
		if (child !== null) {
			insertOrAppendPlacementNode(child, before, parent);
			var sibling = child.sibling;

			while (sibling !== null) {
				insertOrAppendPlacementNode(sibling, before, parent);
				sibling = sibling.sibling;
			}
		}
		return;
	}
	const tag = Boolean(before) ? InjectBefore : Inject;
	commitInstanceUpdate(node.stateNode, { parent, before, tag });
}

function commitDeletionEffects(root, returnFiber, deletedFiber) {
	commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
	deletedFiber.return = null;
}

function recursivelyTraverseDeletionEffects(
	finishedRoot,
	nearestMountedAncestor,
	parent
) {
	var child = parent.child;
	while (child !== null) {
		commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child);
		child = child.sibling;
	}
}

function commitDeletionEffectsOnFiber(
	finishedRoot,
	nearestMountedAncestor,
	deletedFiber
) {
	recursivelyTraverseDeletionEffects(
		finishedRoot,
		nearestMountedAncestor,
		deletedFiber
	);
	if (deletedFiber.tag == HostComponent)
		commitInstanceUpdate(deletedFiber.stateNode, { tag: Delete });
}

function commitMutationEffects(root, finishedWork) {
	commitMutationEffectsOnFiber(finishedWork, root);
}

function recursivelyTraverseMutationEffects(root, parentFiber) {
	// Deletions effects can be scheduled on any fiber type. They need to happen
	// before the children effects hae fired.
	var deletions = parentFiber.deletions;

	if (deletions !== null) {
		for (var i = 0; i < deletions.length; i++) {
			var childToDelete = deletions[i];
			try {
				commitDeletionEffects(root, parentFiber, childToDelete);
			} catch (error) {}
		}
	}

	if (parentFiber.subtreeFlags & MutationMask) {
		var child = parentFiber.child;

		while (child !== null) {
			commitMutationEffectsOnFiber(child, root);
			child = child.sibling;
		}
	}
}

function commitHostComponentMutations(finishedWork) {
	var current = finishedWork.alternate;
	var flags = finishedWork.flags;
	if (flags & Update) {
		var instance = finishedWork.stateNode;
		if (instance == null) return;
		// Commit the work prepared earlier.
		var newProps = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
		// as the newProps. The updatePayload will contain the real change in
		// this case.
		var oldProps = current !== null ? current.memoizedProps : newProps;
		var updatePayload = finishedWork.updateQueue;
		finishedWork.updateQueue = null;
		if (updatePayload !== null) commitUpdate(instance, newProps, oldProps);
	}
}

function commitMutationEffectsOnFiber(finishedWork, root) {
	// The effect flag should be checked *after* we refine the type of fiber,
	// because the fiber tag is more specific. An exception is any flag related
	// to reconcilation, because those can be set on all fiber types.

	recursivelyTraverseMutationEffects(root, finishedWork);
	// Placement effects (insertions, reorders) can be scheduled on any fiber
	// type. They needs to happen after the children effects have fired, but
	// before the effects on this fiber have fired.
	if (finishedWork.flags & Placement) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if (finishedWork.tag == HostComponent) {
		commitHostComponentMutations(finishedWork);
	}
}

function performUnitOfWork(unitOfWork) {
	// The current, flushed, state of this fiber is the alternate. Ideally
	// nothing should rely on this, but relying on it here means that we don't
	// need an additional field on the work in progress.
	var current = unitOfWork.alternate;
	var next = beginWork(current, unitOfWork);
	unitOfWork.memoizedProps = unitOfWork.pendingProps;
	if (next === null) {
		// If this doesn't spawn new work, complete the current work.
		completeUnitOfWork(unitOfWork);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(unitOfWork) {
	// Attempt to complete the current unit of work, then move to the next
	// sibling. If there are no more siblings, return to the parent fiber.
	var completedWork = unitOfWork;
	do {
		// The current, flushed, state of this fiber is the alternate. Ideally
		// nothing should rely on this, but relying on it here means that we don't
		// need an additional field on the work in progress.
		var current = completedWork.alternate;
		var returnFiber = completedWork.return; // Check if the work completed or if something threw.

		if ((completedWork.flags & Incomplete) === NoFlags) {
			var next = completeWork(current, completedWork);

			if (next !== null) {
				// Completing this fiber spawned new work. Work on that next.
				workInProgress = next;
				return;
			}
		} else {
			if (returnFiber !== null) {
				// Mark the parent fiber as incomplete and clear its subtree flags.
				returnFiber.flags |= Incomplete;
				returnFiber.subtreeFlags = NoFlags;
				returnFiber.deletions = null;
			} else {
				// We've unwound all the way to the root.
				workInProgress = null;
				return;
			}
		}
		var siblingFiber = completedWork.sibling;
		if (siblingFiber !== null) {
			// If there is more work to do in this returnFiber, do that next.
			workInProgress = siblingFiber;
			return;
		} // Otherwise, return to the parent

		completedWork = returnFiber; // Update the next thing we're working on in case something throws.

		workInProgress = completedWork;
	} while (completedWork !== null); // We've reached the root.
}

function isMutation({ flags, subtreeFlags }) {
	return (
		(flags & MutationMask) != NoFlags ||
		(subtreeFlags & MutationMask) != NoFlags
	);
}

function FiberNode(tag, pendingProps, key) {
	// Instance
	this.tag = tag;
	this.key = key;
	this.elementType = null;
	this.type = null;
	this.stateNode = null;
	this.return = null;
	this.child = null;
	this.sibling = null;
	this.index = 0;

	this.pendingProps = pendingProps;
	this.memoizedProps = null;
	this.updateQueue = null;
	this.memoizedState = null;
	this.flags = NoFlags;
	this.subtreeFlags = NoFlags;
	this.deletions = null;
	this.alternate = null;
}
function createFiber(tag, pendingProps, key, returnFiber = null) {
	const fiber = new FiberNode(tag, pendingProps, key);
	fiber.return = returnFiber;
	return fiber;
}

function createWorkInProgress(current, pendingProps) {
	var workInProgress = current.alternate;

	if (workInProgress === null) {
		// We use a double buffering pooling technique because we know that we'll
		// only ever need at most two versions of a tree. We pool the "other" unused
		// node that we're free to reuse. This is lazily created to avoid allocating
		// extra objects for things that are never updated. It also allow us to
		// reclaim the extra memory if needed.
		workInProgress = createFiber(current.tag, pendingProps, current.key);
		workInProgress.elementType = current.elementType;
		workInProgress.type = current.type;
		workInProgress.stateNode = current.stateNode;

		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		workInProgress.pendingProps = pendingProps;
		// Needed because Blocks store data on type.
		workInProgress.type = current.type; // We already have an alternate.
		workInProgress.flags = NoFlags; // The effects are no longer valid.
		workInProgress.subtreeFlags = NoFlags;
		workInProgress.deletions = null;
	} // Reset all effects except static ones.
	// Static effects are not specific to a render.

	workInProgress.flags = current.flags & StaticMask;
	workInProgress.childLanes = current.childLanes;
	workInProgress.child = current.child;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;
	workInProgress.updateQueue = current.updateQueue;
	workInProgress.sibling = current.sibling;
	workInProgress.index = current.index;

	return workInProgress;
} // Used to reuse a Fiber for a second pass.

function createFiberFromElement(element, returnFiber) {
	var fiber = createFiber(
		HostComponent,
		element.props,
		element.key,
		returnFiber
	);
	fiber.elementType = element.type;
	fiber.type = element.type;
	return fiber;
}
function createFiberFromText(content, returnFiber) {
	return createFiber(HostText, content, null, returnFiber);
}

function cloneUpdateQueue(current, workInProgress) {
	// Clone the update queue from current. Unless it's already a clone.
	var currentQueue = current.updateQueue;
	if (workInProgress.updateQueue === currentQueue) {
		workInProgress.updateQueue = {
			baseState: currentQueue.baseState,
			firstBaseUpdate: currentQueue.firstBaseUpdate,
			lastBaseUpdate: currentQueue.lastBaseUpdate,
			pending: currentQueue.pending,
		};
	}
}

function processUpdateQueue(workInProgress) {
	// This is always non-null on a ClassComponent or HostRoot
	var queue = workInProgress.updateQueue;
	var firstBaseUpdate = queue.firstBaseUpdate;
	var lastBaseUpdate = queue.lastBaseUpdate;
	// Check if there are pending updates. If so, transfer them to the base queue.
	var pendingQueue = queue.pending;
	if (pendingQueue !== null) {
		queue.pending = null; // The pending queue is circular. Disconnect the pointer between first
		// and last so that it's non-circular.

		var lastPendingUpdate = pendingQueue;
		var firstPendingUpdate = lastPendingUpdate.next;
		lastPendingUpdate.next = null; // Append pending updates to base queue
		if (lastBaseUpdate === null) {
			firstBaseUpdate = firstPendingUpdate;
		} else {
			lastBaseUpdate.next = firstPendingUpdate;
		}
	}
	// These values may change as we process the queue.

	if (firstBaseUpdate !== null) {
		var newState = queue.baseState;
		var update = firstBaseUpdate;

		do {
			// Process this update.
			if (update.payload != null && update.payload != undefined)
				newState = Object.assign(newState, update.payload);
			update = update.next;
			if (update === null) {
				pendingQueue = queue.pending;

				if (pendingQueue === null) {
					break;
				} else {
					// An update was scheduled from inside a reducer. Add the new
					// pending updates to the end of the list and keep processing.
					var _lastPendingUpdate = pendingQueue; // Intentionally unsound. Pending updates form a circular list, but we
					// unravel them when transferring them to the base queue.

					var _firstPendingUpdate = _lastPendingUpdate.next;
					_lastPendingUpdate.next = null;
					update = _firstPendingUpdate;
					queue.lastBaseUpdate = _lastPendingUpdate;
					queue.pending = null;
				}
			}
		} while (true);
		queue.baseState = newState;
		queue.firstBaseUpdate = null;
		queue.lastBaseUpdate = null;
		queue.pending = null;
		workInProgress.memoizedState = newState;
	}
}

export function createContainer(surface) {
	const fiber = createFiber(HostRoot, null, null);
	fiber.memoizedState = { element: null };
	fiber.updateQueue = {
		baseState: fiber.memoizedState,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
		pending: null,
	};

	const container = {
		containerInfo: surface,
		current: fiber,
		finishedWork: null,
	};
	container.current.stateNode = container;
	const destroy = () => {
		console.log("call destrory");
		// container.current.updateQueue = null;
		// currentQueue.current = null;
	};
	const update = (children) => updateContainer(container, children);

	return Object.assign(container, { update, destroy });
}

export function cleanContainer(container) {
	container.current.updateQueue = null;
	currentQueue.current = null;
}

export function updateContainer(container, children) {
	var current = container.current;
	var updateQueue = current.updateQueue;
	var update = { next: null, payload: { element: children } };
	update.next = update;
	currentQueue.current = updateQueue;
	currentQueue.current.pending = update;

	if (current.tag == HostRoot) {
		const root = current.stateNode;
		root.finishedWork = null;
		workInProgress = createWorkInProgress(root.current, null);
		while (workInProgress !== null) performUnitOfWork(workInProgress);
		root.finishedWork = root.current.alternate;
		var finishedWork = root.finishedWork;
		root.finishedWork = null;
		if (isMutation(finishedWork)) commitMutationEffects(root, finishedWork);
		root.current = finishedWork;
	}
	currentQueue.current = null;
}
export { Container } from "./options";
