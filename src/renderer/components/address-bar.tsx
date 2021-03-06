import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';

import { INDEX_HTML_NAME, MAIN_JS_NAME, RENDERER_JS_NAME } from '../../constants';
import { classNames } from '../../utils/classnames';
import { getTitle } from '../../utils/get-title';
import { idFromUrl } from '../../utils/gist';
import { getOctokit } from '../../utils/octokit';
import { AppState } from '../state';

export interface AddressBarProps {
  appState: AppState;
}

export interface AddressBarState {
  value: string;
}

@observer
export class AddressBar extends React.Component<AddressBarProps, AddressBarState> {
  constructor(props: AddressBarProps) {
    super(props);

    this.loadFiddle = this.loadFiddle.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      value: this.props.appState.gistId
    };
  }

  /**
   * Handle the form's submit event, trying to load whatever
   * URL was entered.
   *
   * @param {React.SyntheticEvent<HTMLFormElement>} event
   */
  public async handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    this.props.appState.gistId = idFromUrl(this.state.value) || this.state.value;

    console.log('Loading');

    if (this.state.value) {
      this.loadFiddle();
    }
  }

  /**
   * Once the component mounts, we'll subscribe to gistId changes
   */
  public componentDidMount() {
    reaction(
      () => this.props.appState.gistId,
      (gistId: string) => this.setState({ value: gistId })
    );
  }

  /**
   * Handle the change event, which usually just updates the address bar's value
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event
   */
  public handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ value: event.target.value });
  }

  /**
   * Handles invalid input to the address bar
   *
   * @param {React.InvalidEvent<HTMLInputElement>} event
   */
  public handleInvalid(event: React.InvalidEvent<HTMLInputElement>) {
    event.target.setCustomValidity('URL should begin with https://gist.github.com');
  }

  /**
   * Load a fiddle
   *
   * @returns {Promise<boolean>}
   * @memberof AddressBar
   */
  public async loadFiddle(): Promise<boolean> {
    const { appState } = this.props;

    if (!confirm('Are you sure you want to load a new fiddle, all current progress will be lost?')) {
      return false;
    }

    try {
      const octo = await getOctokit();
      const gist = await octo.gists.get({
        gist_id: appState.gistId,
        id: appState.gistId,
      });

      await window.ElectronFiddle.app.setValues({
        html: gist.data.files[INDEX_HTML_NAME].content,
        main: gist.data.files[MAIN_JS_NAME].content,
        renderer: gist.data.files[RENDERER_JS_NAME].content,
      });

      document.title = getTitle(appState);
      appState.localPath = null;
    } catch (error) {
      console.warn(`Loading Fiddle failed`, error);
      return false;
    }

    return true;
  }

  public render() {
    const { isUnsaved } = this.props.appState;
    const { value } = this.state;
    const isEmpty = /https:\/\/gist\.github\.com\/(.+)$/.test(value);
    const className = classNames('address-bar', isUnsaved, { empty: !isEmpty });

    return (
      <form className={className} onSubmit={this.handleSubmit}>
        <input
          key='addressbar'
          pattern='https:\/\/gist\.github\.com\/(.+)$'
          placeholder='https://gist.github.com/...'
          value={value}
          onChange={this.handleChange}
          onInvalid={this.handleInvalid}
        />
      </form>
    );
  }
}
