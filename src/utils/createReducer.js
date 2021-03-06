import { get as g, isUndefined, isObject, merge, isArray, isFunction } from 'lodash';
import typeInvariant from 'utils/typeInvariant';
import invariant from 'invariant';
import t from 'tcomb';
import { INIT } from 'utils/actions';

/**
 * Creates reducer function in an unobtrusive way
 *
 * @param {?Function} stateType tcomb type to test state against after action
 * @param {any} initialState state to start with, can be seamless-immutable structure
 * @param {Object} handlers
 * @param {?string} name
 * @returns {Function} reducer function
 */
export default function createReducer(...params) {
	let stateType;
	let initialState = params[0];
	let handlers = params[1];
	let name = params[2];

	if (t.isType(params[0])) {
		// we have state type
		stateType = params[0];
		initialState = params[1];
		handlers = params[2];
		name = params[3];
	}

	invariant(!isUndefined(initialState), 'undefined passed to `createReducer` as initial state.');
	invariant(
		isUndefined(handlers) || isObject(handlers),
		'Invalid handlers object passed to `createReducer`'
	);

	return function reducer(state = initialState, action) {
		let resultState = state;
		if (action.type === INIT) {
			if (initialState.asMutable) {
				if (initialState.merge) {
					resultState = initialState.merge(state, { deep: true });
				} else if (initialState.concat) {
					resultState = initialState.concat(state);
				}
			} else {
				resultState = merge({}, initialState, state);
			}

			if (stateType && process.env.NODE_ENV !== 'production') {
				typeInvariant(resultState, stateType, `Invalid state after ${INIT}`);
			}
			return resultState;
		}

		if (handlers && handlers.hasOwnProperty(action.type)) {
			const handlerDefinition = handlers[action.type];
			let handler = handlerDefinition;
			let actionPayloadType = null;
			if (isArray(handler)) {
				handler = handlerDefinition[1] || (x => x);
				actionPayloadType = handlerDefinition[0];
			}
			if (actionPayloadType && process.env.NODE_ENV !== 'production') {
				typeInvariant(
					action.payload,
					actionPayloadType,
					`Action ${action.type} has invalid payload`
				);
			}

			resultState = handler(state, action);

			if (stateType && process.env.NODE_ENV !== 'production') {
				invariant(
					isFunction(resultState.asMutable) && isFunction(initialState.asMutable),
					'Reducer returned mutable state for action %s.',
					action.type
				);
				typeInvariant(
					resultState,
					stateType,
					`Reducer "${(name || 'unknown')}" returned invalid state for action ${action.type}`
				);
			}
		}
		return resultState;
	};
}
