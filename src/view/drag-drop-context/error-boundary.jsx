// @flow
import React, { type Node } from 'react';
import { warning } from '../../dev-warning';
import { noop } from '../../empty';
import bindEvents from '../event-bindings/bind-events';
import { RbdInvariant } from '../../invariant';
import type { AppCallbacks, ErrorMode } from './drag-drop-context-types';

type Props = {|
  mode: ErrorMode,
  children: (setCallbacks: (callbacks: AppCallbacks) => void) => Node,
|};

export default class ErrorBoundary extends React.Component<Props> {
  callbacks: ?AppCallbacks = null;
  unbind: () => void = noop;

  componentDidMount() {
    this.unbind = bindEvents(window, [
      {
        eventName: 'error',
        fn: this.onWindowError,
      },
    ]);
  }
  componentWillUnmount() {
    this.unbind();
  }

  componentDidCatch(error: Error) {
    console.log('DID CATCH');
    const callbacks: AppCallbacks = this.getCallbacks();
    const mode: ErrorMode = this.props.mode;
    console.log('is dragging?', callbacks.isDragging());
    if (callbacks.isDragging()) {
      console.log('TRY ABORT: componentDidCatch');
      warning(`
        An error was thrown in the React tree while a drag was occurring.
        The active drag has been aborted.
      `);
      callbacks.tryAbort();
    }

    if (mode === 'recover' && error instanceof RbdInvariant) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('rbd error', error);
      }

      console.log('RECOVERING');
      this.setState({});
      return;
    }

    // 1. mode === 'recover' and not an RbdInvariant
    // 2. mode === 'abort'
    // eslint-disable-next-line no-restricted-syntax
    throw error;
  }

  onWindowError = (error: Error) => {
    const callbacks: AppCallbacks = this.getCallbacks();

    if (callbacks.isDragging()) {
      console.log('TRY ABORT: onWindowError');
      warning(`
        An error was caught by our window 'error' event listener while a drag was occurring.
        The active drag has been aborted.
      `);
      callbacks.tryAbort();
    }

    if (error instanceof RbdInvariant) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('rbd error', error);
      }
    }
  };

  getCallbacks = (): AppCallbacks => {
    if (!this.callbacks) {
      // eslint-disable-next-line no-restricted-syntax
      throw new Error('Unable to find AppCallbacks in ErrorBoundary');
    }
    return this.callbacks;
  };

  setCallbacks = (callbacks: AppCallbacks) => {
    this.callbacks = callbacks;
  };

  render() {
    return this.props.children(this.setCallbacks);
  }
}